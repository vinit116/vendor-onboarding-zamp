#!/usr/bin/env python3
"""
Developer-only smoke test script for testing real Gemini API integration.
This script is NOT run during automated tests.

Usage:
    PYTHONPATH=backend backend/.venv/bin/python scripts/smoke_test_gemini.py
"""

import sys
import os
from pathlib import Path

# Add backend directory to python path if not present
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / "backend" / ".env")

from app.workflow.ai_service import AiInterpretationService


def run_smoke_test():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[SMOKE TEST ERROR] GEMINI_API_KEY is not configured in backend/.env")
        sys.exit(1)

    print("==================================================")
    print("      REAL GEMINI PROVIDER SMOKE TEST             ")
    print("==================================================")

    service = AiInterpretationService(provider_name="gemini")
    print(f"Active Provider : {service.provider_name}")
    print(f"Configured Model: {service.model}")
    print("Executing capability: compare_identity_names...")

    attempt = service.compare_identity_names(
        legal_name="Acme Technologies Private Limited",
        bank_account_holder="ACME TECHNOLOGIES PVT LTD",
    )

    print("--------------------------------------------------")
    print(f"Status     : {attempt.status}")

    if attempt.status == "SUCCEEDED" and attempt.comparison:
        print(f"Outcome    : {attempt.comparison.outcome}")
        print(f"Confidence : {attempt.comparison.confidence}")
        print(f"Explanation: {attempt.comparison.explanation}")
        print("--------------------------------------------------")
        print("RESULT     : SUCCESS - Real Gemini API call succeeded!")
        print("==================================================")
    else:
        print(f"Error      : {attempt.error or 'Unknown error'}")
        print("--------------------------------------------------")
        print("RESULT     : FAILED - Gemini call did not succeed.")
        print("==================================================")
        sys.exit(1)


if __name__ == "__main__":
    run_smoke_test()
