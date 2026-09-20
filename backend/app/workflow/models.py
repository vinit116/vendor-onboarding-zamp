from typing import Any, Literal
from pydantic import BaseModel, Field

Status = Literal["APPROVED", "PENDING", "REJECTED"]
DocumentType = Literal["PAN", "GST_CERTIFICATE", "BANK_PROOF", "INCORPORATION"]
DocumentProcessingStatus = Literal[
    "PENDING",
    "EXTRACTED",
    "MISSING",
    "FAILED",
    "UNSUPPORTED",
    "EXTRACTION_REQUIRED",
]
AiCallStatus = Literal["SUCCEEDED", "UNAVAILABLE", "FAILED", "INVALID_OUTPUT"]
AiIdentityOutcome = Literal["MATCH", "MISMATCH", "UNCERTAIN"]
AiCapability = Literal["DOCUMENT_EXTRACTION", "IDENTITY_COMPARISON", "EXPLANATION"]
ReasonCode = Literal[
    "APPROVED",
    "MISSING_DOCUMENTS",
    "VALIDATION_FAILED",
    "INVALID_PAN",
    "INVALID_GSTIN",
    "INVALID_IFSC",
    "UNSUPPORTED_COUNTRY",
    "IDENTITY_CONFLICT",
    "IDENTITY_UNCERTAIN",
    "DOCUMENT_EXTRACTION_REQUIRED",
]

class Documents(BaseModel):
    """Required-document declarations. Omitted flags are treated as not provided."""

    pan: bool = False
    gst_certificate: bool = False
    bank_proof: bool = False
    incorporation: bool = False


class ExtractedDocumentFields(BaseModel):
    holder_name: str | None = None
    legal_name: str | None = None
    pan: str | None = None
    gstin: str | None = None
    registered_address: str | None = None
    account_holder_name: str | None = None
    masked_account_number: str | None = None
    ifsc: str | None = None
    bank_name: str | None = None


class AiAssistanceTrace(BaseModel):
    capability: AiCapability
    status: AiCallStatus
    model: str | None = None
    summary: str


class AiDocumentInterpretation(BaseModel):
    extracted_fields: ExtractedDocumentFields
    explanation: str = Field(min_length=1, max_length=500)


class AiDocumentExtractionAttempt(BaseModel):
    status: AiCallStatus
    interpretation: AiDocumentInterpretation | None = None
    error: str | None = None


class AiIdentityComparison(BaseModel):
    outcome: AiIdentityOutcome
    confidence: float = Field(ge=0, le=1)
    explanation: str = Field(min_length=1, max_length=500)


class AiIdentityComparisonAttempt(BaseModel):
    status: AiCallStatus
    comparison: AiIdentityComparison | None = None
    error: str | None = None


class AiExplanation(BaseModel):
    explanation: str = Field(min_length=1, max_length=750)


class AiExplanationAttempt(BaseModel):
    status: AiCallStatus
    explanation: AiExplanation | None = None
    error: str | None = None


class DocumentReference(BaseModel):
    document_type: DocumentType
    filename: str | None = None
    storage_reference: str | None = None
    processing_status: DocumentProcessingStatus = "PENDING"
    extracted_fields: ExtractedDocumentFields = Field(default_factory=ExtractedDocumentFields)
    extraction_errors: list[str] = Field(default_factory=list)
    ai_assistance: AiAssistanceTrace | None = None


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
    documents: Documents = Field(default_factory=Documents)
    document_references: list[DocumentReference] = Field(default_factory=list)

class DecisionReason(BaseModel):
    code: ReasonCode
    message: str
    fields: list[str] = Field(default_factory=list)


class WorkflowExplanationFacts(BaseModel):
    status: Status
    reason: str
    reasons: list[DecisionReason]
    required_actions: list[str]

class StepResult(BaseModel):
    key: str
    name: str
    status: Literal["PASSED", "WARNING", "FAILED"]
    result: Literal["COMPLETED", "SKIPPED"] = "COMPLETED"
    summary: str
    details: dict[str, Any] = Field(default_factory=dict)

class WorkflowResult(BaseModel):
    run_id: str
    status: Status
    reason: str
    reason_code: ReasonCode
    reasons: list[DecisionReason]
    required_actions: list[str]
    processed_documents: list[DocumentReference] = Field(default_factory=list)
    ai_assistance: list[AiAssistanceTrace] = Field(default_factory=list)
    steps: list[StepResult]
    vendor_message: str
