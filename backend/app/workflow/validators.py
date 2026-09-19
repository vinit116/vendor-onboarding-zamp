import re
from .models import VendorSubmission

PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z0-9]{13}$")
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")

def validate_submission(vendor: VendorSubmission) -> list[str]:
    issues: list[str] = []
    if not PAN_RE.match(vendor.pan.upper()):
        issues.append("PAN format is invalid.")
    if not GSTIN_RE.match(vendor.gstin.upper()):
        issues.append("GSTIN format is invalid.")
    if not IFSC_RE.match(vendor.ifsc.upper()):
        issues.append("IFSC format is invalid.")
    return issues

def missing_documents(vendor: VendorSubmission) -> list[str]:
    missing = []
    docs = vendor.documents.model_dump()
    for key, present in docs.items():
        if not present:
            missing.append(key.replace("_", " ").title())
    return missing
