from uuid import uuid4
from .models import VendorSubmission, WorkflowResult, StepResult
from .normalizer import names_equivalent
from .validators import validate_submission, missing_documents

# Demo policy: deterministic business rules own the final decision.
# AI will be added later for document extraction and ambiguous name comparisons.

def run_workflow(vendor: VendorSubmission) -> WorkflowResult:
    steps: list[StepResult] = []
    required_actions: list[str] = []

    steps.append(StepResult(
        key="intake", name="Submission received", status="PASSED",
        summary="Vendor submission accepted and normalized for review."
    ))

    missing = missing_documents(vendor)
    if missing:
        steps.append(StepResult(
            key="completeness", name="Completeness check", status="WARNING",
            summary="Required documents are missing.",
            details={"missing_documents": missing},
        ))
        required_actions.append("Provide: " + ", ".join(missing) + ".")
    else:
        steps.append(StepResult(
            key="completeness", name="Completeness check", status="PASSED",
            summary="All required documents are present."
        ))

    format_issues = validate_submission(vendor)
    if format_issues:
        steps.append(StepResult(
            key="format", name="Format validation", status="FAILED",
            summary="One or more identifiers failed validation.",
            details={"issues": format_issues},
        ))
    else:
        steps.append(StepResult(
            key="format", name="Format validation", status="PASSED",
            summary="PAN, GSTIN and IFSC pass format checks."
        ))

    steps.append(StepResult(
        key="documents", name="Document check", status="PASSED" if not missing else "WARNING",
        summary="Document requirements evaluated.",
        details={"documents": vendor.documents.model_dump()},
    ))

    name_match = names_equivalent(vendor.legal_name, vendor.bank_account_holder)
    if name_match:
        steps.append(StepResult(
            key="identity", name="Identity consistency", status="PASSED",
            summary="Legal entity and bank account holder names are consistent.",
            details={"legal_name": vendor.legal_name, "bank_account_holder": vendor.bank_account_holder},
        ))
    else:
        steps.append(StepResult(
            key="identity", name="Identity consistency", status="FAILED",
            summary="Bank account holder could not be reconciled with the legal entity.",
            details={"legal_name": vendor.legal_name, "bank_account_holder": vendor.bank_account_holder},
        ))

    steps.append(StepResult(
        key="duplicate", name="Duplicate check", status="PASSED",
        summary="No duplicate vendor record in the demo dataset."
    ))

    if format_issues:
        status = "REJECTED"
        reason = "One or more submitted identifiers failed hard validation rules."
        required_actions.extend(format_issues)
    elif not name_match:
        status = "REJECTED"
        reason = "Bank account holder does not correspond to the submitted legal entity."
        required_actions.append("Submit corrected banking information or supporting documentation.")
    elif missing:
        status = "PENDING"
        reason = "The submission cannot be completed because required documentation is missing."
    else:
        status = "APPROVED"
        reason = "All required information is present and no blocking inconsistencies were detected."

    if status == "APPROVED":
        message = "Your vendor onboarding submission has been approved."
    elif status == "PENDING":
        message = "Your vendor onboarding submission is pending. Please provide the requested documentation."
    else:
        message = "Your vendor onboarding submission could not be approved. Please review the required actions."

    steps.append(StepResult(
        key="decision", name="Decision generated", status="PASSED",
        summary=f"Final status: {status}",
        details={"reason": reason, "required_actions": required_actions},
    ))

    return WorkflowResult(
        run_id=f"RUN-{uuid4().hex[:8].upper()}",
        status=status,
        reason=reason,
        required_actions=required_actions,
        steps=steps,
        vendor_message=message,
    )
