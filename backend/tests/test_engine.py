from app.workflow.engine import run_workflow
from app.workflow.models import VendorSubmission, Documents

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

def make(**changes):
    data = BASE | changes
    data["documents"] = changes.get("documents", Documents())
    return VendorSubmission(**data)

def test_clean_submission_is_approved():
    result = run_workflow(make())
    assert result.status == "APPROVED"

def test_missing_bank_proof_is_pending():
    result = run_workflow(make(documents=Documents(bank_proof=False)))
    assert result.status == "PENDING"

def test_identity_conflict_is_rejected():
    result = run_workflow(make(bank_account_holder="Rahul Kumar"))
    assert result.status == "REJECTED"

def test_invalid_pan_is_rejected():
    result = run_workflow(make(pan="INVALID123"))
    assert result.status == "REJECTED"
