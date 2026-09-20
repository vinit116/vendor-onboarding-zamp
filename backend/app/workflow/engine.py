from uuid import uuid4
from .ai_service import AiInterpretationService
from .document_extractor import process_documents
from .models import (
    AiAssistanceTrace,
    DecisionReason,
    DocumentReference,
    StepResult,
    VendorSubmission,
    WorkflowExplanationFacts,
    WorkflowResult,
)
from .normalizer import names_are_ambiguous, names_equivalent
from .validators import validate_submission, missing_documents

# Demo policy: deterministic business rules own the final decision.
# AI will be added later for document extraction and ambiguous name comparisons.

DOCUMENT_LABELS = {
    "PAN": "Pan",
    "GST_CERTIFICATE": "Gst Certificate",
    "BANK_PROOF": "Bank Proof",
    "INCORPORATION": "Incorporation",
}


def _apply_extracted_fields(
    vendor: VendorSubmission, documents: list[DocumentReference]
) -> VendorSubmission:
    extracted = {
        document.document_type: document.extracted_fields
        for document in documents
        if document.processing_status == "EXTRACTED"
    }
    updates: dict[str, str] = {}

    if pan_document := extracted.get("PAN"):
        if pan_document.pan:
            updates["pan"] = pan_document.pan
    if gst_document := extracted.get("GST_CERTIFICATE"):
        if gst_document.gstin:
            updates["gstin"] = gst_document.gstin
        if gst_document.registered_address:
            updates["registered_address"] = gst_document.registered_address
    if bank_document := extracted.get("BANK_PROOF"):
        if bank_document.account_holder_name:
            updates["bank_account_holder"] = bank_document.account_holder_name
        if bank_document.ifsc:
            updates["ifsc"] = bank_document.ifsc

    legal_document = extracted.get("INCORPORATION") or extracted.get("GST_CERTIFICATE")
    if legal_document and legal_document.legal_name:
        updates["legal_name"] = legal_document.legal_name

    return vendor.model_copy(update=updates)

def run_workflow(
    vendor: VendorSubmission, ai_service: AiInterpretationService | None = None
) -> WorkflowResult:
    steps: list[StepResult] = []
    required_actions: list[str] = []
    reasons: list[DecisionReason] = []
    ai_service = ai_service or AiInterpretationService()

    steps.append(StepResult(
        key="intake", name="Submission received", status="PASSED",
        summary="Vendor submission accepted for deterministic review.",
        details={"country": vendor.country},
    ))

    processed_documents = (
        process_documents(vendor.document_references, ai_service)
        if vendor.document_references
        else []
    )
    ai_assistance = [
        document.ai_assistance for document in processed_documents if document.ai_assistance
    ]
    document_references_supplied = bool(vendor.document_references)
    if document_references_supplied:
        missing = [
            DOCUMENT_LABELS[document.document_type]
            for document in processed_documents
            if document.processing_status == "MISSING"
        ]
    else:
        missing = missing_documents(vendor)

    extraction_problems = [
        document for document in processed_documents
        if document.processing_status in {"FAILED", "UNSUPPORTED", "EXTRACTION_REQUIRED"}
    ]
    if missing:
        missing_reason = DecisionReason(
            code="MISSING_DOCUMENTS",
            message="Required documents are missing.",
            fields=[document.lower().replace(" ", "_") for document in missing],
        )
        reasons.append(missing_reason)
        steps.append(StepResult(
            key="completeness", name="Completeness check", status="WARNING",
            summary="Required documents are missing.",
            details={"missing_documents": missing, "required_document_behavior": "omitted means missing"},
        ))
        required_actions.append("Provide: " + ", ".join(missing) + ".")
    else:
        steps.append(StepResult(
            key="completeness", name="Completeness check", status="PASSED",
            summary="All required documents are present."
        ))

    effective_vendor = _apply_extracted_fields(vendor, processed_documents)
    validation_issues = validate_submission(effective_vendor)
    reasons.extend(validation_issues)
    if validation_issues:
        steps.append(StepResult(
            key="format", name="Format validation", status="FAILED",
            summary="One or more scope or identifier rules failed validation.",
            details={"issues": [issue.model_dump() for issue in validation_issues]},
        ))
    else:
        steps.append(StepResult(
            key="format", name="Format validation", status="PASSED",
            summary="PAN, GSTIN and IFSC pass format checks.",
            details={"validated_from": "documents" if document_references_supplied else "submission"},
        ))

    if document_references_supplied:
        document_status = "WARNING" if missing or extraction_problems else "PASSED"
        document_summary = (
            "One or more documents require extraction follow-up."
            if extraction_problems
            else "Required document references are missing."
            if missing
            else "All required documents were extracted successfully."
        )
        document_details = {
            "processing_mode": "LOCAL_PDF_EXTRACTION",
            "documents": [document.model_dump() for document in processed_documents],
        }
    else:
        document_status = "WARNING" if missing else "PASSED"
        document_summary = "Legacy document declarations evaluated; no document references were provided."
        document_details = {
            "processing_mode": "LEGACY_DECLARATIONS",
            "documents": vendor.documents.model_dump(),
        }
    steps.append(StepResult(
        key="documents", name="Document processing", status=document_status,
        summary=document_summary,
        details=document_details,
    ))

    identity_trace: AiAssistanceTrace | None = None
    if names_equivalent(effective_vendor.legal_name, effective_vendor.bank_account_holder):
        name_match: bool | None = True
        identity_summary = "Legal entity and bank account holder names are consistent."
        identity_details = {"comparison_method": "DETERMINISTIC_NORMALIZATION"}
    elif names_are_ambiguous(effective_vendor.legal_name, effective_vendor.bank_account_holder):
        if validation_issues:
            name_match = None
            identity_summary = "Identity comparison is ambiguous; AI comparison was skipped because hard validation already failed."
            identity_details = {"comparison_method": "DETERMINISTIC_AMBIGUOUS", "ai_fallback": "SKIPPED"}
        else:
            attempt = ai_service.compare_identity_names(
                effective_vendor.legal_name, effective_vendor.bank_account_holder
            )
            identity_trace = AiAssistanceTrace(
                capability="IDENTITY_COMPARISON",
                status=attempt.status,
                model=ai_service.model,
                summary=(
                    attempt.comparison.explanation
                    if attempt.comparison
                    else attempt.error or "AI comparison did not return a result."
                ),
            )
            ai_assistance.append(identity_trace)
            if attempt.comparison and attempt.comparison.outcome == "MATCH":
                name_match = True
                identity_summary = "Legal entity and bank account holder names match after AI-assisted comparison."
            elif attempt.comparison and attempt.comparison.outcome == "MISMATCH":
                name_match = False
                identity_summary = "AI-assisted comparison found a material identity mismatch."
            else:
                name_match = None
                identity_summary = "Identity relationship remains uncertain and requires review."
            identity_details = {
                "comparison_method": "AI_FALLBACK",
                "outcome": attempt.comparison.outcome if attempt.comparison else "UNAVAILABLE",
                "confidence": attempt.comparison.confidence if attempt.comparison else None,
            }
    else:
        name_match = False
        identity_summary = "Bank account holder could not be reconciled with the legal entity."
        identity_details = {"comparison_method": "DETERMINISTIC_MISMATCH"}

    identity_details.update({
        "legal_name": effective_vendor.legal_name,
        "bank_account_holder": effective_vendor.bank_account_holder,
    })
    if name_match is True:
        steps.append(StepResult(
            key="identity", name="Identity consistency", status="PASSED",
            summary=identity_summary,
            details=identity_details,
        ))
    elif name_match is False:
        identity_reason = DecisionReason(
            code="IDENTITY_CONFLICT",
            message="Bank account holder does not correspond to the submitted legal entity.",
            fields=["legal_name", "bank_account_holder"],
        )
        reasons.append(identity_reason)
        steps.append(StepResult(
            key="identity", name="Identity consistency", status="FAILED",
            summary=identity_summary,
            details=identity_details,
        ))
    else:
        identity_reason = DecisionReason(
            code="IDENTITY_UNCERTAIN",
            message="Identity relationship requires human review.",
            fields=["legal_name", "bank_account_holder"],
        )
        reasons.append(identity_reason)
        steps.append(StepResult(
            key="identity", name="Identity consistency", status="WARNING",
            summary=identity_summary,
            details=identity_details,
        ))

    steps.append(StepResult(
        key="duplicate", name="Duplicate check", status="WARNING", result="SKIPPED",
        summary="Duplicate checking was skipped because this stateless MVP has no vendor registry.",
        details={
            "availability": "UNAVAILABLE",
            "next_requirement": "A vendor registry is required for database-backed duplicate detection.",
        },
    ))

    if extraction_problems:
        extraction_reason = DecisionReason(
            code="DOCUMENT_EXTRACTION_REQUIRED",
            message="One or more supplied documents could not be extracted automatically.",
            fields=[document.document_type.lower() for document in extraction_problems],
        )
        reasons.append(extraction_reason)
        required_actions.append(
            "Provide machine-readable replacements or request manual extraction for: "
            + ", ".join(DOCUMENT_LABELS[document.document_type] for document in extraction_problems)
            + "."
        )

    if validation_issues:
        status = "REJECTED"
        reason_code = "VALIDATION_FAILED"
        reason = "One or more submitted scope or identifier rules failed hard validation."
        required_actions.extend(issue.message for issue in validation_issues)
    elif name_match is False:
        status = "REJECTED"
        reason_code = "IDENTITY_CONFLICT"
        reason = "Bank account holder does not correspond to the submitted legal entity."
        required_actions.append("Submit corrected banking information or supporting documentation.")
    elif missing:
        status = "PENDING"
        reason_code = "MISSING_DOCUMENTS"
        reason = "The submission cannot be completed because required documentation is missing."
    elif extraction_problems:
        status = "PENDING"
        reason_code = "DOCUMENT_EXTRACTION_REQUIRED"
        reason = "The submission requires document extraction follow-up before it can be completed."
    elif name_match is None:
        status = "PENDING"
        reason_code = "IDENTITY_UNCERTAIN"
        reason = "The submission requires human review because identity information is ambiguous."
    else:
        status = "APPROVED"
        reason_code = "APPROVED"
        reason = "All required information is present and no blocking inconsistencies were detected."
        reasons.append(DecisionReason(code="APPROVED", message=reason))

    if status == "APPROVED":
        message = "Your vendor onboarding submission has been approved."
    elif status == "PENDING":
        message = "Your vendor onboarding submission is pending. Please provide the requested documentation."
    else:
        message = "Your vendor onboarding submission could not be approved. Please review the required actions."

    explanation_facts = WorkflowExplanationFacts(
        status=status,
        reason=reason,
        reasons=reasons,
        required_actions=required_actions,
    )
    explanation_attempt = ai_service.generate_explanation(explanation_facts)
    if explanation_attempt:
        explanation_trace = AiAssistanceTrace(
            capability="EXPLANATION",
            status=explanation_attempt.status,
            model=ai_service.model,
            summary=(
                explanation_attempt.explanation.explanation
                if explanation_attempt.explanation
                else explanation_attempt.error or "AI explanation did not return a result."
            ),
        )
        ai_assistance.append(explanation_trace)

    steps.append(StepResult(
        key="decision", name="Decision generated", status="PASSED",
        summary=f"Final status: {status}",
        details={
            "reason_code": reason_code,
            "reason": reason,
            "reasons": [item.model_dump() for item in reasons],
            "required_actions": required_actions,
            "ai_assistance": [item.model_dump() for item in ai_assistance],
        },
    ))

    return WorkflowResult(
        run_id=f"RUN-{uuid4().hex[:8].upper()}",
        status=status,
        reason=reason,
        reason_code=reason_code,
        reasons=reasons,
        required_actions=required_actions,
        processed_documents=processed_documents,
        ai_assistance=ai_assistance,
        steps=steps,
        vendor_message=message,
    )
