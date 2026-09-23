import io
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "legal_name": "Acme Technologies Private Limited",
    "trade_name": "Acme Technologies",
    "country": "India",
    "registered_address": "Pune, Maharashtra",
    "pan": "ABCDE1234F",
    "gstin": "27ABCDE1234F1Z5",
    "bank_account_holder": "ACME TECHNOLOGIES PVT LTD",
    "bank_account_number": "1234567890",
    "ifsc": "ABCD0123456",
    "documents": {
        "pan": True,
        "gst_certificate": True,
        "bank_proof": True,
        "incorporation": True,
    },
}


def test_system_status_endpoint():
    response = client.get("/api/system/status")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert "ai_provider" in body
    assert "ai_model" in body


def test_vendor_onboarding_returns_complete_workflow_response():
    response = client.post("/api/workflows/vendor-onboarding", json=VALID_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "APPROVED"
    assert body["reason_code"] == "APPROVED"
    assert body["reasons"] == [{
        "code": "APPROVED",
        "message": "All required information is present and no blocking inconsistencies were detected.",
        "fields": [],
    }]
    assert body["required_actions"] == []
    assert [step["key"] for step in body["steps"]] == [
        "intake", "completeness", "format", "documents", "identity", "duplicate", "decision"
    ]
    duplicate = next(step for step in body["steps"] if step["key"] == "duplicate")
    assert duplicate["result"] == "SKIPPED"
    assert duplicate["details"]["availability"] == "UNAVAILABLE"


def test_vendor_onboarding_streaming_endpoint():
    response = client.post("/api/workflows/vendor-onboarding/stream", json=VALID_PAYLOAD)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    lines = response.text.split("\n\n")
    assert any("data: " in line and '"type": "step"' in line for line in lines)
    assert any("data: " in line and '"type": "complete"' in line for line in lines)


def test_omitted_documents_are_processed_as_pending_not_complete():
    payload = VALID_PAYLOAD.copy()
    payload.pop("documents")

    response = client.post("/api/workflows/vendor-onboarding", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PENDING"
    assert body["reason_code"] == "MISSING_DOCUMENTS"
    assert body["required_actions"] == [
        "Provide: Pan, Gst Certificate, Bank Proof, Incorporation."
    ]


def test_invalid_request_returns_fastapi_validation_error():
    payload = VALID_PAYLOAD.copy()
    payload.pop("legal_name")

    response = client.post("/api/workflows/vendor-onboarding", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "legal_name"]


def test_vendor_onboarding_accepts_local_document_references():
    payload = VALID_PAYLOAD.copy()
    payload.pop("documents")
    payload["document_references"] = [
        {
            "document_type": document_type,
            "filename": filename,
            "storage_reference": f"test-data/clean_vendor/{filename}",
        }
        for document_type, filename in {
            "PAN": "pan.pdf",
            "GST_CERTIFICATE": "gst_certificate.pdf",
            "BANK_PROOF": "bank_proof.pdf",
            "INCORPORATION": "incorporation.pdf",
        }.items()
    ]

    response = client.post("/api/workflows/vendor-onboarding", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "APPROVED"
    assert {document["processing_status"] for document in body["processed_documents"]} == {"EXTRACTED"}


def test_document_upload_endpoint_accepts_pdf():
    fake_pdf = io.BytesIO(b"%PDF-1.4 Fake PDF Content")
    response = client.post(
        "/api/documents/upload",
        files={"file": ("test_pan.pdf", fake_pdf, "application/pdf")},
        data={"document_type": "PAN"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["document_type"] == "PAN"
    assert body["filename"] == "test_pan.pdf"
    assert body["storage_reference"].startswith("test-data/uploads/")


def test_document_upload_rejects_non_pdf():
    fake_txt = io.BytesIO(b"Hello text file")
    response = client.post(
        "/api/documents/upload",
        files={"file": ("test_pan.txt", fake_txt, "text/plain")},
        data={"document_type": "PAN"},
    )
    assert response.status_code == 400
    assert "Only PDF files are supported" in response.json()["detail"]
