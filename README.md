# Zamp AI Solutions Associate — Vendor Onboarding

Case study implementation for PS-2: vendor onboarding from submission to approval.

## Current milestone

Milestone 2 adds deterministic local-PDF document extraction to the workflow.
It handles:

- completeness checks
- PAN/GSTIN/IFSC format validation
- legal-name vs bank-account-holder normalization
- machine-readable PAN, GST, bank-proof, and incorporation PDF extraction
- explicit missing, failed, unsupported, and extraction-required document states
- duplicate checks transparently skipped in the stateless MVP
- APPROVED / PENDING / REJECTED decisioning
- explainable workflow steps and required actions

Use `document_references` to submit local fixture paths under `test-data/`. The
legacy `documents` boolean object remains supported for backwards compatibility.
Document extraction is deterministic; scanned or unsupported documents are
reported for follow-up rather than treated as successfully extracted.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then open `http://localhost:8000/docs`.

## Tests

```bash
cd backend
python -m pytest -q
```

## Environment

Copy `.env.example` to `.env` and add your OpenAI API key when we enable the AI layer.
