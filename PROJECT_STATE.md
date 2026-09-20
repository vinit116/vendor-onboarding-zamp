# PROJECT STATE

Last updated: 2026-09-19

## Assignment

Zamp AI Solutions Associate — Case Study

Selected problem:

PS-2 — Operations / Vendor Onboarding

Goal:

Build a working automated vendor onboarding process that accepts a realistic vendor submission and produces APPROVED, PENDING, or REJECTED with visible reasoning.

---

## Current Architecture

Frontend:

* Not implemented yet
* `frontend/` currently empty

Backend:

* FastAPI
* Python
* Pydantic
* Deterministic workflow engine
* Deterministic PDF extraction
* Isolated AI service with typed inputs/outputs
* AI is used only as an optional fallback/interpretation layer

Database:

* Not implemented yet

AI:

* Implemented as an isolated service
* Mocked in tests
* Runtime model is configurable through environment variables
* AI does not control the final workflow decision

Deployment:

* Not implemented yet

---

## Existing Backend

Current files include:

backend/app/main.py

backend/app/workflow/models.py

backend/app/workflow/validators.py

backend/app/workflow/normalizer.py

backend/app/workflow/engine.py

backend/app/workflow/document_extractor.py

backend/app/workflow/ai_service.py

backend/app/workflow/**init**.py

Tests include:

backend/tests/test_engine.py

backend/tests/test_api.py

backend/tests/test_document_extractor.py

backend/tests/test_ai_service.py

backend/tests/conftest.py

---

## Current Workflow

1. Intake / vendor submission
2. Completeness validation
3. Local PDF document processing and deterministic field extraction
4. PAN/GSTIN/IFSC validation using available structured/document-extracted values
5. Name normalization and identity consistency
6. Duplicate-check stage (truthfully skipped in the stateless MVP)
7. Decision
8. Workflow result / explanation

AI can be invoked as an interpretation/fallback layer when deterministic extraction or identity comparison is insufficient.

---

## Current Decision Policy

APPROVED:

* submission is complete
* required documents are present
* no hard validation failures
* identity information is consistent
* no unresolved duplicate or identity conflict

PENDING:

* missing information/document
* ambiguous identity relationship
* extraction requires follow-up
* AI extraction/comparison is unavailable or uncertain and human review is required

REJECTED:

* hard validation failure
* critical identity conflict
* duplicate/identity conflict according to defined rule

Final workflow status is determined by deterministic business rules.

---

## AI Responsibilities

Implemented AI responsibilities:

1. Fallback document extraction when deterministic extraction is insufficient
2. Semantic/company-name interpretation when deterministic normalization is insufficient
3. Ambiguous identity comparison
4. Human-readable workflow explanation based on structured workflow facts

AI must not directly determine the final APPROVED / PENDING / REJECTED status.

AI output is schema-validated and isolated behind an injectable service so tests do not require real API calls.

AI failures are handled safely and do not crash the workflow.

Deterministic hard failures continue to take precedence over AI ambiguity.

---

## Planned Demo Cases

### Case 1 — Clean Vendor

Expected: APPROVED

### Case 2 — Missing Bank Proof

Expected: PENDING

### Case 3 — Company Name Variation

Expected: handled through deterministic normalization and/or AI-assisted comparison when appropriate

### Case 4 — Material Identity Conflict

Expected: REJECTED

---

## Current Implementation

### Milestone 1 — Deterministic Backend Workflow

Completed and verified.

Implemented:

* FastAPI vendor-onboarding endpoint
* seven visible workflow stages
* deterministic validation and decision logic
* explicit decision precedence
* structured `reason_code` and `reasons`
* required actions
* truthful duplicate-check status
* API-level and engine-level tests

Milestone 1 result:

* 13 tests passed

### Milestone 2 — Real Document Inputs

Completed and verified.

Implemented:

* typed `DocumentReference`
* typed extracted document fields
* local machine-readable PDF extraction using `pypdf`
* PAN/GST/bank/incorporation extraction
* fictional PDF fixtures under `test-data/`
* document extraction status and errors
* document-backed validation and identity checks
* explicit handling of missing, unsupported, and extraction-required documents

Milestone 2 result:

* 23 tests passed

### Milestone 3 — AI-Assisted Interpretation & Explanation

Completed and verified.

Implemented:

* isolated `ai_service.py`
* typed AI extraction result
* typed AI identity-comparison result
* typed AI explanation result
* AI-assisted document interpretation fallback
* AI-assisted identity comparison for ambiguous names
* AI explanation generation based on workflow facts integrated into the workflow execution
* safe AI failure handling (unavailable, failure, invalid output handled without failing workflow)
* AI does not control or override final deterministic decisions
* mocked AI test coverage (automated tests make no real OpenAI API calls)

Milestone 3 result:

* 44 tests passed
* 1 upstream Starlette/AnyIO deprecation warning

---

## Current API Behavior

`POST /api/workflows/vendor-onboarding` accepts a vendor submission and returns:

* `run_id`
* `status`
* `reason`
* `reason_code`
* `reasons`
* `required_actions`
* `processed_documents`
* visible workflow steps
* vendor-facing message

The workflow exposes the stages:

* intake
* completeness
* format
* documents
* identity
* duplicate
* decision

AI-related processing is represented separately from the final decision logic.

Decision precedence remains deterministic:

1. Hard scope/identifier validation failures → REJECTED
2. Critical identity conflict → REJECTED
3. Missing required documents / extraction follow-up / unresolved ambiguity → PENDING
4. Otherwise → APPROVED

---

## Known Issues

* No frontend
* No database persistence
* No durable audit history
* No real duplicate registry
* Document references are currently limited to local `test-data/` fixtures
* No controlled document upload flow yet
* Only machine-readable PDFs with expected labels are handled deterministically
* Scanned/image-only documents require a future OCR/AI pathway
* No document authenticity verification
* No external PAN/GST/bank verification
* AI has been tested with mocks but the end-to-end production/runtime AI path still needs one controlled real API smoke test
* No deployment yet

---

## Next Milestone

Build the operator-facing frontend and connect it to the existing backend workflow.

The first UI should provide:

1. Vendor submission
2. Document selection/upload experience
3. Start verification
4. Live workflow execution view
5. Final decision with reasoning
6. Run details suitable for the demo

Keep the existing deterministic decision boundaries and AI service architecture unchanged.

---

## Important Decisions

Keep business rules deterministic.

Use AI only where it provides value in interpreting messy or ambiguous input.

Do not allow an LLM to directly approve or reject a vendor.

Prefer observable workflow steps over hidden automation.

Optimize for a reliable live demo rather than excessive feature scope.

Do not add unnecessary production infrastructure.

---

## Baseline

2026-09-18:

* Python 3.12
* Node 18.20.8
* Backend dependencies installed
* pytest installed
* Milestone 1 test result: 13 passed, 1 dependency deprecation warning
* Milestone 2 dependency: `pypdf==6.10.0`
* Milestone 2 test result: 23 passed, 1 dependency deprecation warning

2026-09-20:

* Milestone 3 AI explanation generation integrated into workflow
* AI tests use mocks; automated tests make no real OpenAI API calls
* Full test result: 44 passed, 1 dependency deprecation warning
