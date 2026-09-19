from typing import Literal
from pydantic import BaseModel, Field

Status = Literal["APPROVED", "PENDING", "REJECTED"]

class Documents(BaseModel):
    pan: bool = True
    gst_certificate: bool = True
    bank_proof: bool = True
    incorporation: bool = True

class VendorSubmission(BaseModel):
    legal_name: str = Field(min_length=1)
    trade_name: str | None = None
    country: str = "India"
    registered_address: str = Field(min_length=1)
    pan: str = Field(min_length=10, max_length=10)
    gstin: str = Field(min_length=15, max_length=15)
    bank_account_holder: str = Field(min_length=1)
    bank_account_number: str = Field(min_length=4)
    ifsc: str = Field(min_length=11, max_length=11)
    documents: Documents

class StepResult(BaseModel):
    key: str
    name: str
    status: Literal["PASSED", "WARNING", "FAILED"]
    summary: str
    details: dict = {}

class WorkflowResult(BaseModel):
    run_id: str
    status: Status
    reason: str
    required_actions: list[str]
    steps: list[StepResult]
    vendor_message: str
