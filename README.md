# Zamp AI Solutions Associate — Vendor Onboarding

Case study implementation for PS-2: vendor onboarding from submission to approval.

## Current milestone

The deterministic workflow engine is implemented first. It handles:

- completeness checks
- PAN/GSTIN/IFSC format validation
- legal-name vs bank-account-holder normalization
- duplicate-check placeholder
- APPROVED / PENDING / REJECTED decisioning
- explainable workflow steps and required actions

AI-assisted document extraction and ambiguous identity resolution will be added as the next milestone.

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
pytest -q
```

## Environment

Copy `.env.example` to `.env` and add your OpenAI API key when we enable the AI layer.
