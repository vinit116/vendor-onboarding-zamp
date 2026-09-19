# PROJECT STATE

Last updated: 2026-09-18

## Assignment

Zamp AI Solutions Associate — Case Study

Selected problem:
PS-2 — Operations / Vendor Onboarding

Goal:
Build a working automated vendor onboarding process that accepts a realistic
vendor submission and produces APPROVED, PENDING, or REJECTED with visible reasoning.

---

## Current Architecture

Frontend:
- Not implemented yet
- `frontend/` currently empty

Backend:
- FastAPI
- Python
- Pydantic
- Existing workflow engine

Database:
- Not implemented yet

AI:
- Not implemented yet

Deployment:
- Not implemented yet

---

## Existing Backend

Current files:

backend/app/main.py
backend/app/workflow/models.py
backend/app/workflow/validators.py
backend/app/workflow/normalizer.py
backend/app/workflow/engine.py
backend/app/workflow/__init__.py

Tests:

backend/tests/test_engine.py

---

## Current Workflow

1. Intake / vendor submission
2. Completeness validation
3. PAN/GSTIN/IFSC validation
4. Name normalization
5. Identity consistency
6. Duplicate-check placeholder
7. Decision
8. Workflow result / explanation

---

## Current Decision Policy

APPROVED:
- submission is complete
- required documents are present
- no hard validation failures
- identity information is consistent
- no unresolved duplicate or identity conflict

PENDING:
- missing information/document
- ambiguous identity relationship
- human review required

REJECTED:
- hard validation failure
- critical identity conflict
- duplicate/identity conflict according to defined rule

---

## AI Responsibilities

Planned AI usage:

1. Document extraction
2. Semantic/company-name normalization when deterministic normalization
   is insufficient
3. Ambiguous identity comparison
4. Human-readable explanation
5. Vendor communication draft

AI does not make the final decision.

---

## Planned Demo Cases

### Case 1 — Clean Vendor
Expected: APPROVED

### Case 2 — Missing Bank Proof
Expected: PENDING

### Case 3 — Company Name Variation
Expected: APPROVED or PENDING depending on evidence and rule

### Case 4 — Material Identity Conflict
Expected: REJECTED

---

## Current Implementation

Initial deterministic workflow exists.

Need to verify:
- tests
- API behavior
- workflow output
- edge-case coverage

---

## Known Issues

- No frontend
- No database
- No AI integration
- Duplicate detection is currently a placeholder
- No document upload/extraction yet

---

## Next Milestone

Make the deterministic backend workflow fully runnable and testable through
the API before adding AI functionality.

---

## Important Decisions

Keep business rules deterministic.

Use AI only where it provides value in interpreting messy or ambiguous input.

Optimize for a reliable live demo rather than excessive feature scope.

## Baseline

2026-09-18:
- Python 3.12
- Node 18.20.8
- Backend dependencies installed
- pytest installed
- Baseline test result: 4 passed