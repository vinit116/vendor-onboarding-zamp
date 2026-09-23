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

### Real AI Provider Milestone — Provider-Agnostic AI Layer (Gemini & Gemma 4 31B IT Integration)

Completed and verified.

Implemented:

* Provider-neutral AI architecture (`BaseAiProvider` interface with `GeminiProvider` and `OpenAIProvider`)
* Active runtime AI provider configured via `AI_PROVIDER=gemini` using `google-genai` SDK
* Active default runtime model set to `gemma-4-31b-it` via `GEMINI_MODEL=gemma-4-31b-it`
* Configurable Gemini key via `GEMINI_API_KEY`
* Optional OpenAI provider retained for backwards compatibility (`AI_PROVIDER=openai`)
* Structured outputs validated using existing Pydantic schemas (`AiDocumentInterpretation`, `AiIdentityComparison`, `AiExplanation`)
* Safe typed failure handling (`SUCCEEDED`, `UNAVAILABLE`, `FAILED`, `INVALID_OUTPUT`)
* Isolated automated test suite using mock clients (`FakeGeminiClient`, `FakeOpenAIClient`), guaranteeing zero real API calls during pytest
* Standalone developer smoke test script (`scripts/smoke_test_gemini.py`) for real-world connectivity verification with `gemma-4-31b-it`
* Deterministic decision engine remains in full control of final decisions

Provider Milestone result:

* 59 tests passed
* Real Gemma 4 31B IT application call verified successfully (`gemma-4-31b-it`)
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

### Milestone 4 — Modern Operations Console & Full Integration

Completed and verified.

Implemented:

* **Next.js 14 App Router + TypeScript + Tailwind CSS Frontend**: Modern, high-density B2B operations console styled with restrained warm off-white background (`#fcfcf9`), dark charcoal text (`#1c1917`), gold/amber accents (`#d97706`), and clean operational status badges.
* **Primary Navigation & Views**:
  1. `Dashboard` (`/`): Key operations metrics (Total Runs, Approved, Pending, Rejected), search bar, and recent runs table.
  2. `New Submission` (`/submissions/new`): High-density vendor form, demo scenario selector (Clean Vendor, Missing Bank Proof, Company Name Variation, Material Identity Conflict), and real PDF document drag-and-drop file upload.
  3. `Run Details` (`/runs/[id]`): High-impact decision card, required actions banner, 7-stage workflow step timeline with detailed expanders, and AI assistance trace cards.
  4. `Run History` (`/history`): Searchable and filterable history table powered by browser `localStorage` (`zamp_vendor_runs`).
* **Document Upload Endpoint**: Added `POST /api/documents/upload` accepting multipart PDF files, validating size and format, generating safe server-side storage references (`test-data/uploads/`), and avoiding exposure of client filesystem paths.
* **Real-time Event Streaming**: Added `POST /api/workflows/vendor-onboarding/stream` Server-Sent Events (SSE) endpoint to stream actual backend stage execution progress (`intake`, `completeness`, `format`, `documents`, `identity`, `duplicate`, `decision`) live to the UI without faking or artificial delays.
* **System Status Indicator**: Persistent status indicator showing backend health, active AI provider (`gemini`), and model (`gemma-4-31b-it`).
* **Testing & Verification**:
  * 59 passed backend pytest tests (`PYTHONPATH=backend backend/.venv/bin/python -m pytest -q`).
  * 0 build/lint/TypeScript errors on Next.js production build (`npm run build`).

Milestone 4 result:

* 59 backend tests passed
* 0 frontend build errors
* Verified end-to-end in browser with real Fast-API backend and Next.js operations console.

---

## Current API Behavior

`POST /api/workflows/vendor-onboarding` and `POST /api/workflows/vendor-onboarding/stream` accept a vendor submission and return:

* `run_id`
* `status`
* `reason`
* `reason_code`
* `reasons`
* `required_actions`
* `processed_documents`
* visible workflow steps
* vendor-facing message

`POST /api/documents/upload` accepts a PDF file upload and returns:

* `filename`
* `storage_reference`
* `size`

`GET /api/system/status` returns:

* `status` ("healthy")
* `ai_provider` ("gemini" | "openai" | "none")
* `ai_model` ("gemma-4-31b-it")

---

## Known Limitations & Future Improvements

* Persistence uses browser `localStorage` (no server database or PostgreSQL yet).
* Duplicate check stage is explicitly marked as SKIPPED due to lack of historical database.
* File upload stored in local `test-data/uploads/` directory rather than S3/cloud storage.
* OCR/multimodal image processing for scanned document images is planned for future iterations.
* Multi-country compliance logic excluded (focused strictly on India-based vendor onboarding).

---

### Milestone 5 — Final Operator UI/UX Refinement Pass

Completed and verified.

Implemented:

* **Single Primary Decision Representation**:
  * Fixed Run Details hierarchy to feature ONE primary decision presentation in the top hero banner (`APPROVED`, `PENDING`, `REJECTED`).
  * Removed repetitive status badges and duplicate decision statements across stages.
  * Neutralized alert callout title to `"Action required"` for all non-approved runs.
  * Fixed final stage timeline badge: uses neutral/completed state ("Recorded") instead of a misleading green "PASSED" badge on rejected runs.
* **Developer Jargon & Reason Code Removal**:
  * Removed technical reason codes (e.g., `IDENTITY_CONFLICT`) from header, dashboard, and primary UI tables.
  * Moved all raw reason codes, run IDs, and JSON payloads into a collapsible "Technical Debug Details" drawer.
* **Refined AI Presentation & Contextual Exposure**:
  * AI is presented strictly as an "AI-assisted interpretation" supporting capability, not a decision-maker or workflow stage.
  * Prominent AI cards render ONLY when AI actually ran/contributed to the run (CASE B).
  * Deterministic runs display a subtle inline compliance note ("Review completed using standard compliance rules") without forcing a large AI sidebar (CASE A).
  * AI failure/unavailability uses clean fallback language ("The workflow continued using deterministic validation") without exposing HTTP 503, raw stack traces, or API error objects (CASE C).
* **6-Stage Visible Operator Timeline**:
  * Removed "Vendor Registry Duplicate Check" stage from the visible operator-facing workflow timeline and live SSE modal.
  * Documented limitation: Duplicate vendor detection is a future production enhancement that requires a persistent vendor registry.
* **Human-Readable Document & Identity Evidence**:
  * Extracted document labels mapped to natural capitalized names ("Account holder", "Masked account number", "IFSC", "PAN", "GSTIN", "Registered address").
  * Formatted identity evidence cleanly ("Registered legal entity", "Bank account holder", "Match" / "No match" / "AI-assisted review").
* **Unified Visual Language & Quality Verification**:
  * Consistent typography, spacing, and neutral color system across Dashboard, New Submission, Live Run SSE overlay, Run Details, and History.
  * Verified 60 passed backend tests (`PYTHONPATH=backend backend/.venv/bin/python -m pytest -q`).
  * Verified Next.js production build (`npm run build` — 0 errors).

---

## Baseline

2026-09-23:

* Final UI/UX Refinement Pass Complete & Verified (`gemma-4-31b-it`).
* Python 3.12 (`backend/.venv`)
* Node 18.20.8 / Next.js 14.2.35
* Full backend test result: 60 passed, 1 dependency deprecation warning
* Real Gemma application-level smoke test: SUCCEEDED
* Next.js production build: 0 errors