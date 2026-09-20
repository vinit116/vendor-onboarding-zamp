from pathlib import Path
import re

from pypdf import PdfReader

from .ai_service import AiInterpretationService
from .models import AiAssistanceTrace, DocumentReference, ExtractedDocumentFields

REQUIRED_DOCUMENT_TYPES = ("PAN", "GST_CERTIFICATE", "BANK_PROOF", "INCORPORATION")
PROJECT_ROOT = Path(__file__).resolve().parents[3]
TEST_DATA_ROOT = PROJECT_ROOT / "test-data"

FIELD_PATTERNS = {
    "PAN": {
        "holder_name": r"PAN Holder Name:\s*(.+)",
        "pan": r"PAN:\s*([A-Z0-9]+)",
    },
    "GST_CERTIFICATE": {
        "legal_name": r"Legal Name:\s*(.+)",
        "gstin": r"GSTIN:\s*([A-Z0-9]+)",
        "registered_address": r"Registered Address:\s*(.+)",
    },
    "BANK_PROOF": {
        "account_holder_name": r"Account Holder Name:\s*(.+)",
        "account_number": r"Account Number:\s*([A-Z0-9]+)",
        "ifsc": r"IFSC:\s*([A-Z0-9]+)",
        "bank_name": r"Bank Name:\s*(.+)",
    },
    "INCORPORATION": {
        "legal_name": r"Legal Name:\s*(.+)",
    },
}

REQUIRED_EXTRACTED_FIELDS = {
    "PAN": ("holder_name", "pan"),
    "GST_CERTIFICATE": ("legal_name", "gstin"),
    "BANK_PROOF": ("account_holder_name", "ifsc"),
    "INCORPORATION": ("legal_name",),
}


def process_documents(
    references: list[DocumentReference], ai_service: AiInterpretationService | None = None
) -> list[DocumentReference]:
    """Extract supported local PDF fixtures and materialize any missing required type."""
    processed = [_process_document(reference, ai_service) for reference in references]
    supplied_types = {document.document_type for document in references}
    for document_type in REQUIRED_DOCUMENT_TYPES:
        if document_type not in supplied_types:
            processed.append(DocumentReference(
                document_type=document_type,
                processing_status="MISSING",
                extraction_errors=["Required document was not supplied."],
            ))
    return processed


def _process_document(
    reference: DocumentReference, ai_service: AiInterpretationService | None
) -> DocumentReference:
    document = reference.model_copy(deep=True)
    document.extracted_fields = ExtractedDocumentFields()
    document.extraction_errors = []

    path, path_error = _resolve_fixture_path(document.storage_reference)
    if path_error:
        document.processing_status = "FAILED"
        document.extraction_errors.append(path_error)
        return document
    if path.suffix.lower() != ".pdf":
        document.processing_status = "UNSUPPORTED"
        document.extraction_errors.append("Only machine-readable PDF documents are supported in this milestone.")
        return document

    try:
        text = "\n".join(page.extract_text() or "" for page in PdfReader(path).pages).strip()
    except Exception as error:  # pypdf exceptions vary by malformed input.
        document.processing_status = "FAILED"
        document.extraction_errors.append(f"PDF extraction failed: {error}")
        return document

    if not text:
        document.processing_status = "EXTRACTION_REQUIRED"
        document.extraction_errors.append(
            "No machine-readable text was found; OCR or manual extraction is required."
        )
        return document

    values = _extract_labeled_values(document.document_type, text)
    missing_fields = [field for field in REQUIRED_EXTRACTED_FIELDS[document.document_type] if not values.get(field)]
    if missing_fields and ai_service:
        attempt = ai_service.extract_document_fields(document.document_type, text)
        document.ai_assistance = AiAssistanceTrace(
            capability="DOCUMENT_EXTRACTION",
            status=attempt.status,
            model=ai_service.model,
            summary=(
                attempt.interpretation.explanation
                if attempt.interpretation
                else attempt.error or "AI fallback did not return an interpretation."
            ),
        )
        if attempt.interpretation:
            for field, value in attempt.interpretation.extracted_fields.model_dump(
                exclude_none=True
            ).items():
                values.setdefault(field, value)
            missing_fields = [
                field for field in REQUIRED_EXTRACTED_FIELDS[document.document_type]
                if not values.get(field)
            ]

    if account_number := values.pop("account_number", None):
        values["masked_account_number"] = _mask_account_number(account_number)
    document.extracted_fields = ExtractedDocumentFields(**values)
    if missing_fields:
        document.processing_status = "EXTRACTION_REQUIRED"
        document.extraction_errors.append(
            "Expected fields were not found: " + ", ".join(missing_fields) + "."
        )
        return document

    document.processing_status = "EXTRACTED"
    return document


def _resolve_fixture_path(storage_reference: str | None) -> tuple[Path | None, str | None]:
    if not storage_reference:
        return None, "Document storage reference is required."

    candidate = Path(storage_reference)
    path = candidate.resolve() if candidate.is_absolute() else (PROJECT_ROOT / candidate).resolve()
    try:
        path.relative_to(TEST_DATA_ROOT.resolve())
    except ValueError:
        return None, "Document storage reference must be inside test-data/."
    if not path.is_file():
        return None, "Document file was not found."
    return path, None


def _extract_labeled_values(document_type: str, text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for field, pattern in FIELD_PATTERNS[document_type].items():
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            values[field] = match.group(1).strip()
    return values


def _mask_account_number(account_number: str) -> str:
    normalized = re.sub(r"\s+", "", account_number)
    return "X" * max(0, len(normalized) - 4) + normalized[-4:]
