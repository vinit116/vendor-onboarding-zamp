from app.workflow.document_extractor import process_documents
from app.workflow.models import DocumentReference


def test_extracts_expected_fields_from_machine_readable_pdf():
    documents = process_documents([
        DocumentReference(
            document_type="PAN",
            filename="pan.pdf",
            storage_reference="test-data/clean_vendor/pan.pdf",
        ),
    ])

    pan_document = documents[0]
    assert pan_document.processing_status == "EXTRACTED"
    assert pan_document.extracted_fields.holder_name == "Acme Technologies Private Limited"
    assert pan_document.extracted_fields.pan == "ABCDE1234F"
    assert {document.processing_status for document in documents[1:]} == {"MISSING"}


def test_unsupported_file_type_is_reported_honestly():
    document = process_documents([
        DocumentReference(
            document_type="BANK_PROOF",
            filename="generate_fixtures.py",
            storage_reference="test-data/generate_fixtures.py",
        ),
    ])[0]

    assert document.processing_status == "UNSUPPORTED"
    assert document.extraction_errors == [
        "Only machine-readable PDF documents are supported in this milestone."
    ]


def test_missing_file_is_reported_as_extraction_failure():
    document = process_documents([
        DocumentReference(
            document_type="BANK_PROOF",
            filename="missing.pdf",
            storage_reference="test-data/clean_vendor/missing.pdf",
        ),
    ])[0]

    assert document.processing_status == "FAILED"
    assert document.extraction_errors == ["Document file was not found."]
