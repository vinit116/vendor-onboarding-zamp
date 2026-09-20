import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import ValidationError

from .models import (
    AiCallStatus,
    AiDocumentExtractionAttempt,
    AiDocumentInterpretation,
    AiExplanation,
    AiExplanationAttempt,
    AiIdentityComparison,
    AiIdentityComparisonAttempt,
    DocumentType,
    WorkflowExplanationFacts,
)

DEFAULT_OPENAI_MODEL = "gpt-5.6-luna"


class AiInterpretationService:
    """Optional OpenAI fallback for interpretation; it never makes workflow decisions."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        client: Any | None = None,
    ):
        load_dotenv()
        self.api_key = api_key if api_key is not None else os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)
        self.client = client

    def extract_document_fields(
        self, document_type: DocumentType, document_text: str
    ) -> AiDocumentExtractionAttempt:
        unavailable = self._unavailable_extraction_attempt()
        if unavailable:
            return unavailable

        try:
            response = self._client().responses.parse(
                model=self.model,
                instructions=(
                    "Extract only fields explicitly present in the supplied vendor document. "
                    "Do not infer values. Return the requested structured schema and a concise explanation. "
                    "Do not make onboarding or approval decisions."
                ),
                input=f"Document type: {document_type}\n\nDocument text:\n{document_text}",
                text_format=AiDocumentInterpretation,
            )
            interpretation = AiDocumentInterpretation.model_validate(response.output_parsed)
            return AiDocumentExtractionAttempt(status="SUCCEEDED", interpretation=interpretation)
        except ValidationError as error:
            return AiDocumentExtractionAttempt(status="INVALID_OUTPUT", error=str(error))
        except Exception as error:
            return AiDocumentExtractionAttempt(status="FAILED", error=str(error))

    def compare_identity_names(
        self, legal_name: str, bank_account_holder: str
    ) -> AiIdentityComparisonAttempt:
        unavailable = self._unavailable_identity_attempt()
        if unavailable:
            return unavailable

        try:
            response = self._client().responses.parse(
                model=self.model,
                instructions=(
                    "Compare the legal entity name and bank account holder name. "
                    "Return MATCH only when the names refer to the same entity, MISMATCH when clearly different, "
                    "or UNCERTAIN when evidence is insufficient. Give a concise explanation. "
                    "Do not make onboarding or approval decisions."
                ),
                input=(
                    f"Legal entity name: {legal_name}\n"
                    f"Bank account holder name: {bank_account_holder}"
                ),
                text_format=AiIdentityComparison,
            )
            comparison = AiIdentityComparison.model_validate(response.output_parsed)
            return AiIdentityComparisonAttempt(status="SUCCEEDED", comparison=comparison)
        except ValidationError as error:
            return AiIdentityComparisonAttempt(status="INVALID_OUTPUT", error=str(error))
        except Exception as error:
            return AiIdentityComparisonAttempt(status="FAILED", error=str(error))

    def generate_explanation(self, facts: WorkflowExplanationFacts) -> AiExplanationAttempt:
        unavailable = self._unavailable_explanation_attempt()
        if unavailable:
            return unavailable

        try:
            response = self._client().responses.parse(
                model=self.model,
                instructions=(
                    "Write a concise vendor-facing explanation using only the structured workflow facts provided. "
                    "Do not introduce new facts, do not alter the supplied status, and do not make a decision."
                ),
                input=facts.model_dump_json(),
                text_format=AiExplanation,
            )
            explanation = AiExplanation.model_validate(response.output_parsed)
            return AiExplanationAttempt(status="SUCCEEDED", explanation=explanation)
        except ValidationError as error:
            return AiExplanationAttempt(status="INVALID_OUTPUT", error=str(error))
        except Exception as error:
            return AiExplanationAttempt(status="FAILED", error=str(error))

    def _client(self) -> Any:
        if self.client is None:
            self.client = OpenAI(api_key=self.api_key)
        return self.client

    def _unavailable_extraction_attempt(self) -> AiDocumentExtractionAttempt | None:
        if self.client is None and not self.api_key:
            return AiDocumentExtractionAttempt(
                status="UNAVAILABLE", error="OPENAI_API_KEY is not configured."
            )
        return None

    def _unavailable_identity_attempt(self) -> AiIdentityComparisonAttempt | None:
        if self.client is None and not self.api_key:
            return AiIdentityComparisonAttempt(
                status="UNAVAILABLE", error="OPENAI_API_KEY is not configured."
            )
        return None

    def _unavailable_explanation_attempt(self) -> AiExplanationAttempt | None:
        if self.client is None and not self.api_key:
            return AiExplanationAttempt(
                status="UNAVAILABLE", error="OPENAI_API_KEY is not configured."
            )
        return None
