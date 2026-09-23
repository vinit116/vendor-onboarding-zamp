# Zamp AI Solutions Associate — Vendor Onboarding Operations Console

Case study implementation for **PS-2: Vendor Onboarding Operations Console** from submission intake to final decisioning.

## Overview

This application provides an automated vendor onboarding verification system with a modern, high-density operations console.

### Key Capabilities
- **Deterministic Workflow Engine**: Business rules strictly govern decisions (`APPROVED`, `PENDING`, `REJECTED`).
- **Deterministic PDF Document Extractor**: Machine-readable document parser extracting PAN, GSTIN, Bank details, and Address from PDF files.
- **Provider-Agnostic AI Service**: Uses Google Gemini API with `gemma-4-31b-it` as the active runtime model for interpretation and explanation generation, with safe fallback handling when AI is unavailable.
- **Real-Time Live Workflow Streaming**: Server-Sent Events (SSE) stream 7 distinct workflow execution stages live to the console.
- **High-Density Operations Console**: Built with Next.js 14, TypeScript, and Tailwind CSS. Offers Dashboard analytics, New Submission form, Demo Scenario selection, Live Verification view, and Run History (browser `localStorage`).

---

## Running the Application Live

### Environment Configuration

Configure `backend/.env` with your model and API key:

```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemma-4-31b-it
GEMINI_API_KEY=your_gemini_api_key
```

### 1. Backend (FastAPI)

```bash
# From repository root
PYTHONPATH=backend backend/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will be available at `http://127.0.0.1:8000`.
Swagger API documentation: `http://127.0.0.1:8000/docs`.

### 2. Frontend (Next.js Operations Console)

```bash
cd frontend
npm install # if not already installed
npm run dev -- -p 3000
```
Open `http://localhost:3000` in your web browser to interact with the Vendor Operations Console.

---

## Running Tests

### Backend Unit & Integration Tests (59 tests)

```bash
# From repository root
PYTHONPATH=backend backend/.venv/bin/python -m pytest -q
```

### Frontend Typecheck & Production Build

```bash
cd frontend
npm run build
```

---

## Demo Scenarios for Interview Review

In the **New Submission** screen, use the **Demo Scenarios** selector to quickly test:
1. **Clean Vendor** $\rightarrow$ Expected outcome: `APPROVED`
2. **Missing Bank Proof** $\rightarrow$ Expected outcome: `PENDING`
3. **Company Name Variation** $\rightarrow$ Expected outcome: `APPROVED` (via identity normalization & AI comparison)
4. **Material Identity Conflict** $\rightarrow$ Expected outcome: `REJECTED`