import re
from .models import DecisionReason, VendorSubmission

PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
# India GSTIN structure: state code, PAN, entity number, Z, checksum character.
GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[A-Z0-9]$")
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")

def validate_submission(vendor: VendorSubmission) -> list[DecisionReason]:
    issues: list[DecisionReason] = []
    if vendor.country.strip().casefold() != "india":
        issues.append(DecisionReason(
            code="UNSUPPORTED_COUNTRY",
            message="Vendor onboarding is currently available only for India.",
            fields=["country"],
        ))
    if not PAN_RE.match(vendor.pan.upper()):
        issues.append(DecisionReason(
            code="INVALID_PAN", message="PAN format is invalid.", fields=["pan"]
        ))
    if not GSTIN_RE.match(vendor.gstin.upper()):
        issues.append(DecisionReason(
            code="INVALID_GSTIN", message="GSTIN format is invalid.", fields=["gstin"]
        ))
    if not IFSC_RE.match(vendor.ifsc.upper()):
        issues.append(DecisionReason(
            code="INVALID_IFSC", message="IFSC format is invalid.", fields=["ifsc"]
        ))
    return issues

def missing_documents(vendor: VendorSubmission) -> list[str]:
    missing = []
    docs = vendor.documents.model_dump()
    for key, present in docs.items():
        if not present:
            missing.append(key.replace("_", " ").title())
    return missing
