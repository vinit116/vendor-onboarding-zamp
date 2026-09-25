# Vendor Onboarding Automation

A production-ready case study implementation for **PS-2 — Vendor Onboarding** from the Zamp AI Solutions Associate case study.

## Live Application

- **Application:** https://vendor-onboarding-zamp.vercel.app
- **API:** https://vendor-onboarding-zamp.onrender.com
- **Health:** https://vendor-onboarding-zamp.onrender.com/health
- **System Status:** https://vendor-onboarding-zamp.onrender.com/api/system/status
- **Demo Video:** https://www.loom.com/share/03043518fdee4ef08cdf52efbca9eb06

---

## What It Does

The workflow automates vendor onboarding from submission to decision.

It accepts:

- Company information
- Banking information
- Tax information
- Supporting compliance documents

It then produces one of three operational outcomes:

### APPROVED

Required information is present and the relevant checks are consistent.

### PENDING

The submission cannot be completed yet and the operator is shown what is missing or needs attention.

### REJECTED

A material inconsistency or validation failure prevents approval, with the reason exposed to the operator.

The UI shows the workflow progressing through its verification stages in real time and keeps a history of previous runs.

---

## Workflow

The onboarding process runs through the following stages:

1. **Intake & Scope**  
   Accept and normalize the vendor submission.

2. **Completeness**  
   Verify required information and documents are present.

3. **Tax & Format**  
   Validate PAN, GSTIN, IFSC, and other relevant formats and cross-field rules.

4. **Document Processing**  
   Process the supplied PDFs and extract relevant fields.

5. **Identity & Consistency**  
   Cross-check names and other fields across the submission and supporting documents.

6. **Final Decision**  
   Apply deterministic business rules and produce **APPROVED**, **PENDING**, or **REJECTED** with reasoning and required actions.

---

## AI Usage

AI is deliberately used as an **interpretation layer** rather than as the final decision-maker.

In production, the application uses **Gemma 4 31B IT** through Google's Gemini API for cases where model-based interpretation is useful, including:

- Structured extraction from supporting documents when required
- Interpretation of ambiguous identity/name variations
- Structured explanations where appropriate

The final business decision remains deterministic.

AI output is treated as evidence or an interpretation that the workflow rules can use; it does not independently approve or reject a vendor.

---

## Edge Cases

The implemented scenarios include:

| Scenario | Expected Outcome | What It Demonstrates |
|---|---|---|
| Clean Vendor | **APPROVED** | Happy path / complete and consistent submission |
| Missing Bank Proof | **PENDING** | Incomplete submission and required follow-up |
| Material Identity Conflict | **REJECTED** | Cross-document identity inconsistency |
| Tax Identifier Mismatch | **REJECTED** | Cross-field validation |
| Company Name Variation | Scenario-dependent | AI-assisted identity interpretation |

These scenarios are intended to demonstrate that the process behaves differently when submissions are incomplete or internally inconsistent rather than simply following the happy path.

---

## Architecture

```text
Next.js Frontend (Vercel)
        |
        | HTTPS / SSE
        v
FastAPI Backend (Render)
        |
        +--> Deterministic Workflow Engine
        |
        +--> PDF Field Extraction
        |
        +--> AI Interpretation Service
        |       |
        |       +--> Gemini / Gemma 4 31B IT
        |
        +--> Final Decision + Reasoning
```

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- FastAPI
- Python
- Pydantic

### Documents

- PDF processing with `pypdf`

### AI

- Google Gemini API
- Gemma 4 31B IT

### Streaming

- Server-Sent Events (SSE) for live workflow progress

### Deployment

- Vercel
- Render

---

## Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── workflow/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── test-data/
│   └── ... prepared demo documents / scenarios
├── render.yaml
└── README.md
```

---

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Backend Environment

Create `backend/.env` from the example file and configure the values needed for local AI execution:

```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemma-4-31b-it
GEMINI_API_KEY=your_gemini_api_key
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

For the local frontend, set:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Tests

The backend test suite covers:

- Workflow rules
- API behavior
- Document extraction
- AI-service behavior

Submission verification:

```bash
cd backend
python -m pytest -q
```

**Verified result at submission:**

```text
60 passed, 1 warning
```

---

## Production Configuration

The deployed frontend uses:

```env
NEXT_PUBLIC_API_URL=https://vendor-onboarding-zamp.onrender.com
```

The production backend uses Gemini as its AI provider and allows the deployed Vercel origin through `ALLOWED_ORIGINS`.

---

## Assumptions and Scope

The workflow is designed for an India-focused vendor onboarding flow.

Required verification documents for the prepared scenarios include:

- PAN
- GST certificate
- Bank proof
- Incorporation documentation

The prepared document fixtures are machine-readable PDFs.

"Credibility" is evaluated through internal consistency and the configured workflow rules; this implementation does not connect to external government, banking, KYC, or business-registry systems.

A persistent external duplicate registry is out of scope for this case study; duplicate handling remains an internal workflow stage for compatibility and future extension.

Runtime uploads are temporary on the deployed backend; prepared demo fixtures are version-controlled with the project.

The final approval decision is deterministic even when AI interpretation is involved.

---

## Demo Scenarios

For a live walkthrough, the prepared scenarios are:

| Scenario | Expected Outcome | Purpose |
|---|---|---|
| **Clean Vendor** | APPROVED | Happy path / complete and consistent submission |
| **Missing Bank Proof** | PENDING | Incomplete submission and required follow-up |
| **Material Identity Conflict** | REJECTED | Cross-document identity inconsistency |
| **Tax Identifier Mismatch** | REJECTED | Cross-field validation |
| **Company Name Variation** | Scenario-dependent | AI-assisted identity interpretation |

---

## Why This Design

The process is intentionally structured around **operator visibility and controlled automation**:

- Every major verification stage is visible while a run executes.
- Decisions expose reasoning and required actions.
- AI is used where interpretation adds value rather than replacing deterministic controls.
- The run history provides an operational record of previous submissions and outcomes.

The goal is to turn a manual vendor-review process into a workflow that an operations team can run, inspect, and act on.

---

## Production Links

- **Live Application:** https://vendor-onboarding-zamp.vercel.app
- **Backend API:** https://vendor-onboarding-zamp.onrender.com
- **Health Check:** https://vendor-onboarding-zamp.onrender.com/health
- **System Status:** https://vendor-onboarding-zamp.onrender.com/api/system/status
- **GitHub:** https://github.com/vinit116/vendor-onboarding-zamp