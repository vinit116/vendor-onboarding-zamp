import asyncio
import json
from pathlib import Path
from uuid import uuid4
from typing import AsyncGenerator

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.workflow.ai_service import AiInterpretationService
from app.workflow.engine import run_workflow
from app.workflow.models import DocumentReference, VendorSubmission, WorkflowResult

import os

app = FastAPI(title="Zamp Vendor Onboarding Operations Console", version="0.1.0")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

allow_all = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if not allow_all else ["*"],
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOADS_DIR = PROJECT_ROOT / "test-data" / "uploads"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/system/status")
def system_status():
    ai_service = AiInterpretationService()
    return {
        "status": "healthy",
        "ai_provider": ai_service.provider_name,
        "ai_model": ai_service.model,
    }


@app.post("/api/workflows/vendor-onboarding", response_model=WorkflowResult)
def vendor_onboarding(submission: VendorSubmission):
    return run_workflow(submission)


@app.post("/api/workflows/vendor-onboarding/stream")
async def vendor_onboarding_stream(submission: VendorSubmission):
    """Streams Server-Sent Events (SSE) representing workflow stage progress and final decision."""
    
    async def event_generator() -> AsyncGenerator[str, None]:
        # Run workflow in backend thread pool to prevent blocking the event loop
        result = await asyncio.to_thread(run_workflow, submission)
        
        for step in result.steps:
            event_data = {
                "type": "step",
                "step": step.model_dump(),
            }
            yield f"data: {json.dumps(event_data)}\n\n"
            await asyncio.sleep(0.12)  # Controlled pace for UI progress visibility
            
        complete_data = {
            "type": "complete",
            "result": result.model_dump(),
        }
        yield f"data: {json.dumps(complete_data)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/documents/upload", response_model=DocumentReference)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    
    safe_filename = f"{uuid4().hex[:8]}_{Path(file.filename).name}"
    target_path = UPLOADS_DIR / safe_filename
    
    with open(target_path, "wb") as f:
        f.write(content)

    storage_reference = f"test-data/uploads/{safe_filename}"

    return DocumentReference(
        document_type=document_type,  # type: ignore
        filename=file.filename,
        storage_reference=storage_reference,
        processing_status="PENDING",
    )
