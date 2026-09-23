from app.workflow.engine import run_workflow
from app.workflow.models import DocumentReference, Documents, VendorSubmission

BASE = dict(
    legal_name="Acme Technologies Private Limited",
    trade_name="Acme Technologies",
    country="India",
    registered_address="Pune, Maharashtra",
    pan="ABCDE1234F",
    gstin="27ABCDE1234F1Z5",
    bank_account_holder="ACME TECHNOLOGIES PVT LTD",
    bank_account_number="1234567890",
    ifsc="ABCD0123456",
)

COMPLETE_DOCUMENTS = Documents(
    pan=True,
    gst_certificate=True,
    bank_proof=True,
    incorporation=True,
)

DOCUMENT_FILENAMES = {
    "PAN": "pan.pdf",
    "GST_CERTIFICATE": "gst_certificate.pdf",
    "BANK_PROOF": "bank_proof.pdf",
    "INCORPORATION": "incorporation.pdf",
}


def make(**changes):
    data = BASE | changes
    data["documents"] = changes.get("documents", COMPLETE_DOCUMENTS)
    return VendorSubmission(**data)


def steps_by_key(result):
    return {step.key: step for step in result.steps}


def fixture_references(scenario, document_types=None):
    document_types = document_types or DOCUMENT_FILENAMES.keys()
    return [
        DocumentReference(
            document_type=document_type,
            filename=DOCUMENT_FILENAMES[document_type],
            storage_reference=f"test-data/{scenario}/{DOCUMENT_FILENAMES[document_type]}",
        )
        for document_type in document_types
    ]


def test_valid_vendor_is_approved_with_structured_reason():
    result = run_workflow(make())

    assert result.status == "APPROVED"
    assert result.reason_code == "APPROVED"
    assert result.reasons[0].code == "APPROVED"
    assert result.required_actions == []


def test_missing_required_document_is_pending_with_action():
    result = run_workflow(make(documents=Documents(
        pan=True, gst_certificate=True, bank_proof=False, incorporation=True
    )))

    assert result.status == "PENDING"
    assert result.reason_code == "MISSING_DOCUMENTS"
    assert result.reasons[0].fields == ["bank_proof"]
    assert result.required_actions == ["Provide: Bank Proof."]


def test_empty_documents_are_not_treated_as_complete():
    result = run_workflow(make(documents=Documents()))

    assert result.status == "PENDING"
    assert result.reason_code == "MISSING_DOCUMENTS"
    assert result.required_actions == [
        "Provide: Pan, Gst Certificate, Bank Proof, Incorporation."
    ]


def test_omitted_documents_default_to_missing():
    submission = VendorSubmission(**BASE)
    result = run_workflow(submission)

    assert result.status == "PENDING"
    assert result.reasons[0].fields == [
        "pan", "gst_certificate", "bank_proof", "incorporation"
    ]


def test_company_name_variation_is_normalized_and_approved():
    result = run_workflow(make(bank_account_holder="acme technologies pvt. ltd."))

    assert result.status == "APPROVED"
    assert steps_by_key(result)["identity"].status == "PASSED"


def test_invalid_pan_is_rejected():
    result = run_workflow(make(pan="INVALID123"))

    assert result.status == "REJECTED"
    assert result.reason_code == "VALIDATION_FAILED"
    assert {reason.code for reason in result.reasons} == {"INVALID_PAN"}
    assert result.required_actions == ["PAN format is invalid."]


def test_non_india_submission_is_rejected_clearly():
    result = run_workflow(make(country="Singapore"))

    assert result.status == "REJECTED"
    assert result.reason_code == "VALIDATION_FAILED"
    assert result.reasons[0].code == "UNSUPPORTED_COUNTRY"


def test_identity_conflict_takes_precedence_over_missing_documents():
    result = run_workflow(make(
        bank_account_holder="Rahul Kumar",
        documents=Documents(pan=True, gst_certificate=True, bank_proof=False, incorporation=True),
    ))

    assert result.status == "REJECTED"
    assert result.reason_code == "IDENTITY_CONFLICT"
    assert {reason.code for reason in result.reasons} == {
        "MISSING_DOCUMENTS", "IDENTITY_CONFLICT"
    }
    assert "Provide: Bank Proof." in result.required_actions
    assert "Submit corrected banking information or supporting documentation." in result.required_actions


def test_workflow_steps_are_visible_and_duplicate_check_is_truthful():
    result = run_workflow(make())
    steps = steps_by_key(result)

    assert [step.key for step in result.steps] == [
        "intake", "completeness", "format", "documents", "identity", "duplicate", "decision"
    ]
    assert steps["intake"].summary == "Vendor submission accepted for deterministic review."
    assert steps["duplicate"].status == "WARNING"
    assert steps["duplicate"].result == "SKIPPED"
    assert steps["duplicate"].details["availability"] == "UNAVAILABLE"


def test_gstin_requires_india_specific_structure():
    result = run_workflow(make(gstin="27ABCDE1234F1Y5"))

    assert result.status == "REJECTED"
    assert result.reasons[0].code == "INVALID_GSTIN"


def test_gstin_embedded_pan_mismatch_is_rejected():
    result = run_workflow(make(pan="ABCDE1234F", gstin="27XYZAB9876C1Z5"))

    assert result.status == "REJECTED"
    assert result.reason_code == "VALIDATION_FAILED"
    assert any(reason.code == "INVALID_GSTIN" and "embedded PAN" in reason.message for reason in result.reasons)



def test_machine_readable_documents_are_extracted_and_approved():
    result = run_workflow(make(document_references=fixture_references("clean_vendor")))
    documents_step = steps_by_key(result)["documents"]

    assert result.status == "APPROVED"
    assert documents_step.status == "PASSED"
    assert documents_step.details["processing_mode"] == "LOCAL_PDF_EXTRACTION"
    assert {document.processing_status for document in result.processed_documents} == {"EXTRACTED"}
    bank_proof = next(document for document in result.processed_documents if document.document_type == "BANK_PROOF")
    assert bank_proof.extracted_fields.masked_account_number == "XXXXXXXX5678"


def test_missing_fixture_document_is_pending():
    result = run_workflow(make(
        legal_name="Harbor Supplies Private Limited",
        bank_account_holder="Harbor Supplies Pvt Ltd",
        document_references=fixture_references(
            "missing_bank_proof", ["PAN", "GST_CERTIFICATE", "INCORPORATION"]
        ),
    ))

    assert result.status == "PENDING"
    assert result.reason_code == "MISSING_DOCUMENTS"
    missing_bank_proof = next(
        document for document in result.processed_documents if document.document_type == "BANK_PROOF"
    )
    assert missing_bank_proof.processing_status == "MISSING"


def test_document_name_variation_is_approved():
    result = run_workflow(make(document_references=fixture_references("name_variation")))

    assert result.status == "APPROVED"
    assert steps_by_key(result)["identity"].status == "PASSED"


def test_document_identity_conflict_is_rejected():
    result = run_workflow(make(document_references=fixture_references("identity_conflict")))

    assert result.status == "REJECTED"
    assert result.reason_code == "IDENTITY_CONFLICT"
    assert steps_by_key(result)["identity"].details["bank_account_holder"] == "Rival Trading Pvt Ltd"


def test_extraction_required_is_pending_and_visible():
    references = fixture_references("clean_vendor")
    references[2] = DocumentReference(
        document_type="BANK_PROOF",
        filename="bank_proof.pdf",
        storage_reference="test-data/extraction_required/bank_proof.pdf",
    )
    result = run_workflow(make(document_references=references))
    documents_step = steps_by_key(result)["documents"]

    assert result.status == "PENDING"
    assert result.reason_code == "DOCUMENT_EXTRACTION_REQUIRED"
    assert documents_step.status == "WARNING"
    bank_proof = next(document for document in result.processed_documents if document.document_type == "BANK_PROOF")
    assert bank_proof.processing_status == "EXTRACTION_REQUIRED"
    assert bank_proof.extraction_errors


def test_extracted_identifiers_are_used_for_validation():
    result = run_workflow(make(
        pan="ZZZZZ9999Z",
        gstin="27ZZZZZ9999Z1Z2",
        ifsc="WXYZ0987654",
        document_references=fixture_references("clean_vendor"),
    ))

    assert result.status == "APPROVED"
    assert steps_by_key(result)["format"].details["validated_from"] == "documents"
