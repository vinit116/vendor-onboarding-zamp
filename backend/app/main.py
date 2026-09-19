from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.workflow.engine import run_workflow
from app.workflow.models import VendorSubmission, WorkflowResult

app = FastAPI(title="Zamp Vendor Onboarding", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/workflows/vendor-onboarding", response_model=WorkflowResult)
def vendor_onboarding(submission: VendorSubmission):
    return run_workflow(submission)
