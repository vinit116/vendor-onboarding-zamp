import os
from types import SimpleNamespace

import pytest

from app.workflow.ai_service import (
    DEFAULT_GEMINI_MODEL,
    DEFAULT_OPENAI_MODEL,
    AiInterpretationService,
    GeminiProvider,
    OpenAIProvider,
)
from app.workflow.engine import run_workflow
from app.workflow.models import (
    AiDocumentInterpretation,
    AiExplanation,
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
            return SimpleNamespace(output_parsed={"explanation": "Mocked OpenAI explanation."})
        raise IndexError("pop from empty list")


class FakeOpenAIClient:
    def __init__(self, outputs=None, error=None):
        self.responses = FakeResponses(outputs, error)


class FakeGeminiModels:
    def __init__(self, outputs=None, error=None):
        self.outputs = list(outputs or [])
        self.error = error
        self.calls = []

    def generate_content(self, model, contents, config=None):
        self.calls.append({"model": model, "contents": contents, "config": config})
        if self.error:
            raise self.error
        if self.outputs:
            out = self.outputs.pop(0)
            if isinstance(out, str):
                return SimpleNamespace(text=out)
            import json
            return SimpleNamespace(text=json.dumps(out))
        if config and hasattr(config, "response_schema") and config.response_schema == AiExplanation:
            import json
            return SimpleNamespace(text=json.dumps({"explanation": "Mocked Gemini explanation."}))
        raise IndexError("pop from empty list")


class FakeGeminiClient:
    def __init__(self, outputs=None, error=None):
        self.models = FakeGeminiModels(outputs, error)


def service_with(outputs=None, error=None):
    client = FakeOpenAIClient(outputs, error)
    return AiInterpretationService(api_key="test-key", client=client), client


def gemini_service_with(outputs=None, error=None):
    client = FakeGeminiClient(outputs, error)
    return AiInterpretationService(provider_name="gemini", api_key="test-key", client=client), client


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


# ============================================================================
# OpenAI Provider Tests
# ============================================================================

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


def test_openai_explanation_returns_schema_valid_typed_data():
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


def test_openai_explanation_unavailable_is_safe():
    provider = OpenAIProvider(api_key="")
    service = AiInterpretationService(provider=provider)
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


# ============================================================================
# Gemini Provider Tests (Required for Provider Architecture)
# ============================================================================

def test_gemini_provider_receives_expected_request():
    service, client = gemini_service_with([{
        "extracted_fields": {
            "legal_name": "Acme Technologies Pvt Ltd",
            "gstin": "27ABCDE1234F1Z5",
        },
        "explanation": "GST fields extracted.",
    }])

    attempt = service.extract_document_fields("GST_CERTIFICATE", "GSTIN: 27ABCDE1234F1Z5")

    assert attempt.status == "SUCCEEDED"
    assert client.models.calls[0]["model"] == DEFAULT_GEMINI_MODEL
    assert "GST_CERTIFICATE" in client.models.calls[0]["contents"]
    assert client.models.calls[0]["config"].response_schema == AiDocumentInterpretation


def test_gemini_structured_output_is_parsed_into_pydantic_model():
    service, _ = gemini_service_with([{
        "extracted_fields": {"pan": "ABCDE1234F"},
        "explanation": "PAN extracted successfully.",
    }])

    attempt = service.extract_document_fields("PAN", "PAN: ABCDE1234F")

    assert attempt.status == "SUCCEEDED"
    assert attempt.interpretation.extracted_fields.pan == "ABCDE1234F"


def test_gemini_document_extraction_succeeds():
    service, _ = gemini_service_with([{
        "extracted_fields": {"holder_name": "Acme Tech", "pan": "ABCDE1234F"},
        "explanation": "Extracted labeled fields.",
    }])

    attempt = service.extract_document_fields("PAN", "PAN Holder Name: Acme Tech\nPAN: ABCDE1234F")

    assert attempt.status == "SUCCEEDED"
    assert attempt.interpretation.extracted_fields.holder_name == "Acme Tech"


def test_gemini_identity_comparison_succeeds():
    service, _ = gemini_service_with([{
        "outcome": "MATCH",
        "confidence": 0.95,
        "explanation": "Entities are identical.",
    }])

    attempt = service.compare_identity_names("Acme Tech Pvt Ltd", "Acme Tech Private Limited")

    assert attempt.status == "SUCCEEDED"
    assert attempt.comparison.outcome == "MATCH"
    assert attempt.comparison.confidence == 0.95


def test_gemini_explanation_succeeds():
    service, _ = gemini_service_with([{
        "explanation": "Gemini explanation: Vendor onboarding is approved."
    }])
    facts = WorkflowExplanationFacts(
        status="APPROVED",
        reason="All required info present.",
        reasons=[DecisionReason(code="APPROVED", message="All required info present.")],
        required_actions=[],
    )

    attempt = service.generate_explanation(facts)

    assert attempt.status == "SUCCEEDED"
    assert attempt.explanation.explanation == "Gemini explanation: Vendor onboarding is approved."


def test_gemini_api_failure_becomes_failed():
    service, _ = gemini_service_with(error=RuntimeError("Gemini quota exceeded"))

    attempt = service.extract_document_fields("PAN", "some text")

    assert attempt.status == "FAILED"
    assert "Gemini quota exceeded" in attempt.error


def test_gemini_invalid_structured_output_becomes_invalid_output():
    service, _ = gemini_service_with([{"invalid_key": "unexpected_schema"}])

    attempt = service.extract_document_fields("PAN", "some text")

    assert attempt.status == "INVALID_OUTPUT"
    assert attempt.interpretation is None


def test_missing_gemini_key_becomes_unavailable():
    provider = GeminiProvider(api_key="")
    service = AiInterpretationService(provider=provider)

    attempt = service.extract_document_fields("PAN", "some text")

    assert attempt.status == "UNAVAILABLE"
    assert attempt.error == "GEMINI_API_KEY is not configured."


def test_provider_selection_chooses_gemini_when_ai_provider_is_gemini(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    service = AiInterpretationService()

    assert service.provider_name == "gemini"
    assert service.model == DEFAULT_GEMINI_MODEL


def test_existing_openai_behavior_is_not_broken(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")

    service = AiInterpretationService()

    assert service.provider_name == "openai"
    assert service.model == DEFAULT_OPENAI_MODEL


def test_deterministic_workflow_decisions_remain_unchanged_on_gemini_failure():
    service, _ = gemini_service_with(error=RuntimeError("Gemini unavailable"))

    result = run_workflow(make(), ai_service=service)

    assert result.status == "APPROVED"
    assert result.reason_code == "APPROVED"
    assert result.reasons[0].code == "APPROVED"
    assert result.required_actions == []
    explanation_trace = next(a for a in result.ai_assistance if a.capability == "EXPLANATION")
    assert explanation_trace.status == "FAILED"


def test_no_real_openai_or_gemini_api_calls_during_pytest():
    openai_provider = OpenAIProvider(api_key="")
    openai_service = AiInterpretationService(provider=openai_provider)
    assert openai_service.extract_document_fields("PAN", "text").status == "UNAVAILABLE"

    gemini_provider = GeminiProvider(api_key="")
    gemini_service = AiInterpretationService(provider=gemini_provider)
    assert gemini_service.extract_document_fields("PAN", "text").status == "UNAVAILABLE"
