from types import SimpleNamespace

import pytest

from app.workflow.ai_service import AiInterpretationService, DEFAULT_OPENAI_MODEL
from app.workflow.engine import run_workflow
from app.workflow.models import (
    DecisionReason,
    DocumentReference,
    Documents,
    VendorSubmission,
    WorkflowExplanationFacts,
)

BASE = dict(
    legal_name="Acme Technologies Private Limited",
    country="India",
    registered_address="Pune, Maharashtra",
    pan="ABCDE1234F",
    gstin="27ABCDE1234F1Z5",
    bank_account_holder="ACME TECHNOLOGIES PVT LTD",
    bank_account_number="1234567890",
    ifsc="ABCD0123456",
    documents=Documents(pan=True, gst_certificate=True, bank_proof=True, incorporation=True),
)


class FakeResponses:
    def __init__(self, outputs=None, error=None):
        self.outputs = list(outputs or [])
        self.error = error
        self.calls = []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        if self.outputs:
            return SimpleNamespace(output_parsed=self.outputs.pop(0))
        if kwargs.get("text_format") and kwargs["text_format"].__name__ == "AiExplanation":
            return SimpleNamespace(output_parsed={"explanation": "Mocked workflow explanation."})
        raise IndexError("pop from empty list")


class FakeOpenAIClient:
    def __init__(self, outputs=None, error=None):
        self.responses = FakeResponses(outputs, error)


def service_with(outputs=None, error=None):
    client = FakeOpenAIClient(outputs, error)
    return AiInterpretationService(api_key="test-key", client=client), client


def make(**changes):
    return VendorSubmission(**(BASE | changes))


def fixture_references(scenario):
    filenames = {
        "PAN": "pan.pdf",
        "GST_CERTIFICATE": "gst_certificate.pdf",
        "BANK_PROOF": "bank_proof.pdf",
        "INCORPORATION": "incorporation.pdf",
    }
    return [
        DocumentReference(
            document_type=document_type,
            filename=filename,
            storage_reference=f"test-data/{scenario}/{filename}",
        )
        for document_type, filename in filenames.items()
    ]


def test_ai_extraction_returns_schema_valid_typed_data():
    service, client = service_with([{
        "extracted_fields": {
            "account_holder_name": "Acme Technologies Pvt Ltd",
            "masked_account_number": "XXXXXXXX5678",
            "ifsc": "ABCD0123456",
            "bank_name": "Fictional Bank Limited",
        },
        "explanation": "The labeled bank fields were present in the document text.",
    }])

    attempt = service.extract_document_fields("BANK_PROOF", "Account holder and IFSC labels")

    assert attempt.status == "SUCCEEDED"
    assert attempt.interpretation.extracted_fields.ifsc == "ABCD0123456"
    assert client.responses.calls[0]["model"] == DEFAULT_OPENAI_MODEL
    assert client.responses.calls[0]["text_format"].__name__ == "AiDocumentInterpretation"


def test_ai_extraction_failure_is_safe():
    service, _ = service_with(error=RuntimeError("service unavailable"))

    attempt = service.extract_document_fields("BANK_PROOF", "partial bank text")

    assert attempt.status == "FAILED"
    assert attempt.interpretation is None


def test_malformed_ai_extraction_output_is_safe():
    service, _ = service_with([{"unexpected": "shape"}])

    attempt = service.extract_document_fields("BANK_PROOF", "partial bank text")

    assert attempt.status == "INVALID_OUTPUT"
    assert attempt.interpretation is None


@pytest.mark.parametrize("outcome", ["MATCH", "MISMATCH", "UNCERTAIN"])
def test_ai_identity_comparison_returns_typed_outcome(outcome):
    service, _ = service_with([{
        "outcome": outcome,
        "confidence": 0.82,
        "explanation": f"Mocked {outcome.lower()} comparison.",
    }])

    attempt = service.compare_identity_names("Acme Holdings Pvt Ltd", "Acme Trading Pvt Ltd")

    assert attempt.status == "SUCCEEDED"
    assert attempt.comparison.outcome == outcome
    assert attempt.comparison.confidence == 0.82


def test_ai_document_fallback_can_complete_insufficient_extraction():
    service, _ = service_with([{
        "extracted_fields": {
            "account_holder_name": "Acme Technologies Pvt Ltd",
            "ifsc": "ABCD0123456",
            "bank_name": "Fictional Bank Limited",
        },
        "explanation": "The bank holder and IFSC were interpreted from the available text.",
    }])
    references = fixture_references("clean_vendor")
    references[2] = DocumentReference(
        document_type="BANK_PROOF",
        filename="bank_proof.pdf",
        storage_reference="test-data/extraction_required/bank_proof.pdf",
    )

    result = run_workflow(make(document_references=references), ai_service=service)
    bank_proof = next(document for document in result.processed_documents if document.document_type == "BANK_PROOF")

    assert result.status == "APPROVED"
    assert bank_proof.processing_status == "EXTRACTED"
    assert bank_proof.ai_assistance.status == "SUCCEEDED"
    assert bank_proof.extracted_fields.account_holder_name == "Acme Technologies Pvt Ltd"


def test_ai_document_failure_remains_pending():
    service, _ = service_with(error=RuntimeError("service unavailable"))
    references = fixture_references("clean_vendor")
    references[2] = DocumentReference(
        document_type="BANK_PROOF",
        filename="bank_proof.pdf",
        storage_reference="test-data/extraction_required/bank_proof.pdf",
    )

    result = run_workflow(make(document_references=references), ai_service=service)

    assert result.status == "PENDING"
    assert result.reason_code == "DOCUMENT_EXTRACTION_REQUIRED"
    assert result.ai_assistance[0].status == "FAILED"


@pytest.mark.parametrize(
    ("outcome", "expected_status", "expected_identity_status"),
    [
        ("MATCH", "APPROVED", "PASSED"),
        ("MISMATCH", "REJECTED", "FAILED"),
        ("UNCERTAIN", "PENDING", "WARNING"),
    ],
)
def test_ai_identity_fallback_drives_only_identity_interpretation(
    outcome, expected_status, expected_identity_status
):
    service, _ = service_with([{
        "outcome": outcome,
        "confidence": 0.76,
        "explanation": f"Mocked {outcome.lower()} identity result.",
    }])
    result = run_workflow(make(
        legal_name="Acme Holdings Private Limited",
        bank_account_holder="Acme Trading Pvt Ltd",
    ), ai_service=service)
    identity_step = next(step for step in result.steps if step.key == "identity")

    assert result.status == expected_status
    assert identity_step.status == expected_identity_status
    assert identity_step.details["comparison_method"] == "AI_FALLBACK"
    assert any(a.capability == "IDENTITY_COMPARISON" for a in result.ai_assistance)


def test_deterministic_extraction_sufficient_never_calls_ai():
    service, client = service_with([])

    result = run_workflow(
        make(document_references=fixture_references("clean_vendor")), ai_service=service
    )

    assert result.status == "APPROVED"
    assert not any(call["text_format"].__name__ == "AiDocumentInterpretation" for call in client.responses.calls)
    assert any(trace.capability == "EXPLANATION" for trace in result.ai_assistance)


def test_hard_rejection_overrides_ambiguous_identity_without_ai_call():
    service, client = service_with([])

    result = run_workflow(make(
        legal_name="Acme Holdings Private Limited",
        bank_account_holder="Acme Trading Pvt Ltd",
        pan="INVALID123",
    ), ai_service=service)

    assert result.status == "REJECTED"
    assert result.reason_code == "VALIDATION_FAILED"
    assert not any(call["text_format"].__name__ == "AiIdentityComparison" for call in client.responses.calls)


def test_missing_information_remains_pending_without_ai():
    service, client = service_with([])

    result = run_workflow(make(documents=Documents(
        pan=True, gst_certificate=True, bank_proof=False, incorporation=True
    )), ai_service=service)

    assert result.status == "PENDING"
    assert result.reason_code == "MISSING_DOCUMENTS"
    assert not any(call["text_format"].__name__ == "AiIdentityComparison" for call in client.responses.calls)


def test_ai_explanation_returns_schema_valid_typed_data():
    service, client = service_with([{
        "explanation": "Vendor onboarding submission approved."
    }])
    facts = WorkflowExplanationFacts(
        status="APPROVED",
        reason="All required information is present.",
        reasons=[DecisionReason(code="APPROVED", message="All required information is present.")],
        required_actions=[],
    )

    attempt = service.generate_explanation(facts)

    assert attempt.status == "SUCCEEDED"
    assert attempt.explanation.explanation == "Vendor onboarding submission approved."
    assert client.responses.calls[0]["model"] == DEFAULT_OPENAI_MODEL
    assert client.responses.calls[0]["text_format"].__name__ == "AiExplanation"


def test_ai_explanation_unavailable_is_safe():
    service = AiInterpretationService(api_key="")
    facts = WorkflowExplanationFacts(
        status="APPROVED",
        reason="All required information is present.",
        reasons=[DecisionReason(code="APPROVED", message="All required information is present.")],
        required_actions=[],
    )

    attempt = service.generate_explanation(facts)

    assert attempt.status == "UNAVAILABLE"
    assert attempt.explanation is None
    assert attempt.error == "OPENAI_API_KEY is not configured."

    result = run_workflow(make(), ai_service=service)
    assert result.status == "APPROVED"
    assert result.reason_code == "APPROVED"
    assert any(a.capability == "EXPLANATION" and a.status == "UNAVAILABLE" for a in result.ai_assistance)


def test_ai_explanation_failure_is_safe():
    service, _ = service_with(error=RuntimeError("explanation service error"))
    facts = WorkflowExplanationFacts(
        status="APPROVED",
        reason="All required information is present.",
        reasons=[DecisionReason(code="APPROVED", message="All required information is present.")],
        required_actions=[],
    )

    attempt = service.generate_explanation(facts)

    assert attempt.status == "FAILED"
    assert attempt.explanation is None
    assert "explanation service error" in attempt.error

    result = run_workflow(make(), ai_service=service)
    assert result.status == "APPROVED"
    assert result.reason_code == "APPROVED"
    assert any(a.capability == "EXPLANATION" and a.status == "FAILED" for a in result.ai_assistance)


def test_malformed_ai_explanation_output_is_safe():
    service, _ = service_with([{"unexpected": "shape"}, {"unexpected": "shape"}])
    facts = WorkflowExplanationFacts(
        status="APPROVED",
        reason="All required information is present.",
        reasons=[DecisionReason(code="APPROVED", message="All required information is present.")],
        required_actions=[],
    )

    attempt = service.generate_explanation(facts)

    assert attempt.status == "INVALID_OUTPUT"
    assert attempt.explanation is None

    result = run_workflow(make(), ai_service=service)
    assert result.status == "APPROVED"
    assert result.reason_code == "APPROVED"
    assert any(a.capability == "EXPLANATION" and a.status == "INVALID_OUTPUT" for a in result.ai_assistance)


def test_deterministic_decision_unchanged_when_ai_explanation_succeeds():
    service, _ = service_with([{"explanation": "Submission approved cleanly."}])

    result = run_workflow(make(), ai_service=service)

    assert result.status == "APPROVED"
    assert result.reason_code == "APPROVED"
    assert result.reasons[0].code == "APPROVED"
    assert result.required_actions == []
    explanation_trace = next(a for a in result.ai_assistance if a.capability == "EXPLANATION")
    assert explanation_trace.status == "SUCCEEDED"
    assert explanation_trace.summary == "Submission approved cleanly."


def test_deterministic_decision_unchanged_when_ai_explanation_fails():
    service, _ = service_with(error=RuntimeError("AI backend down"))

    result = run_workflow(make(), ai_service=service)

    assert result.status == "APPROVED"
    assert result.reason_code == "APPROVED"
    assert result.reasons[0].code == "APPROVED"
    assert result.required_actions == []
    explanation_trace = next(a for a in result.ai_assistance if a.capability == "EXPLANATION")
    assert explanation_trace.status == "FAILED"


def test_no_real_openai_api_calls_during_pytest():
    service = AiInterpretationService(api_key="")
    assert service.client is None
    attempt = service.generate_explanation(
        WorkflowExplanationFacts(
            status="APPROVED",
            reason="All info present.",
            reasons=[],
            required_actions=[],
        )
    )
    assert attempt.status == "UNAVAILABLE"

