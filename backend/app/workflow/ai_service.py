from abc import ABC, abstractmethod
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
DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"


class BaseAiProvider(ABC):
    """Abstract interface for AI interpretation providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def model(self) -> str:
        pass

    @abstractmethod
    def extract_document_fields(
        self, document_type: DocumentType, document_text: str
    ) -> AiDocumentExtractionAttempt:
        pass

    @abstractmethod
    def compare_identity_names(
        self, legal_name: str, bank_account_holder: str
    ) -> AiIdentityComparisonAttempt:
        pass

    @abstractmethod
    def generate_explanation(
        self, facts: WorkflowExplanationFacts
    ) -> AiExplanationAttempt:
        pass


class OpenAIProvider(BaseAiProvider):
    """OpenAI provider implementation using structured outputs."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        client: Any | None = None,
    ):
        load_dotenv()
        self.api_key = api_key if api_key is not None else os.getenv("OPENAI_API_KEY")
        self.model_name = model or os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)
        self.client = client

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model(self) -> str:
        return self.model_name

    def _client(self) -> Any:
        if self.client is None:
            self.client = OpenAI(api_key=self.api_key)
        return self.client

    def extract_document_fields(
        self, document_type: DocumentType, document_text: str
    ) -> AiDocumentExtractionAttempt:
        if self.client is None and not self.api_key:
            return AiDocumentExtractionAttempt(
                status="UNAVAILABLE", error="OPENAI_API_KEY is not configured."
            )

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
        if self.client is None and not self.api_key:
            return AiIdentityComparisonAttempt(
                status="UNAVAILABLE", error="OPENAI_API_KEY is not configured."
            )

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
        if self.client is None and not self.api_key:
            return AiExplanationAttempt(
                status="UNAVAILABLE", error="OPENAI_API_KEY is not configured."
            )

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


class GeminiProvider(BaseAiProvider):
    """Google Gemini provider implementation using google-genai structured outputs."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        client: Any | None = None,
    ):
        load_dotenv()
        self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY")
        self.model_name = model or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
        self.client = client

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model(self) -> str:
        return self.model_name

    def _client(self) -> Any:
        if self.client is None:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
        return self.client

    def extract_document_fields(
        self, document_type: DocumentType, document_text: str
    ) -> AiDocumentExtractionAttempt:
        if self.client is None and not self.api_key:
            return AiDocumentExtractionAttempt(
                status="UNAVAILABLE", error="GEMINI_API_KEY is not configured."
            )

        instructions = (
            "Extract only fields explicitly present in the supplied vendor document. "
            "Do not infer values. Return the requested structured schema and a concise explanation. "
            "Do not make onboarding or approval decisions."
        )
        contents = f"Document type: {document_type}\n\nDocument text:\n{document_text}"

        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                system_instruction=instructions,
                response_mime_type="application/json",
                response_schema=AiDocumentInterpretation,
            )
            response = self._client().models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )
            interpretation = self._parse_response(response, AiDocumentInterpretation)
            return AiDocumentExtractionAttempt(status="SUCCEEDED", interpretation=interpretation)
        except ValidationError as error:
            return AiDocumentExtractionAttempt(status="INVALID_OUTPUT", error=str(error))
        except Exception as error:
            return AiDocumentExtractionAttempt(status="FAILED", error=str(error))

    def compare_identity_names(
        self, legal_name: str, bank_account_holder: str
    ) -> AiIdentityComparisonAttempt:
        if self.client is None and not self.api_key:
            return AiIdentityComparisonAttempt(
                status="UNAVAILABLE", error="GEMINI_API_KEY is not configured."
            )

        instructions = (
            "Compare the legal entity name and bank account holder name. "
            "Return MATCH only when the names refer to the same entity, MISMATCH when clearly different, "
            "or UNCERTAIN when evidence is insufficient. Give a concise explanation. "
            "Do not make onboarding or approval decisions."
        )
        contents = (
            f"Legal entity name: {legal_name}\n"
            f"Bank account holder name: {bank_account_holder}"
        )

        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                system_instruction=instructions,
                response_mime_type="application/json",
                response_schema=AiIdentityComparison,
            )
            response = self._client().models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )
            comparison = self._parse_response(response, AiIdentityComparison)
            return AiIdentityComparisonAttempt(status="SUCCEEDED", comparison=comparison)
        except ValidationError as error:
            return AiIdentityComparisonAttempt(status="INVALID_OUTPUT", error=str(error))
        except Exception as error:
            return AiIdentityComparisonAttempt(status="FAILED", error=str(error))

    def generate_explanation(self, facts: WorkflowExplanationFacts) -> AiExplanationAttempt:
        if self.client is None and not self.api_key:
            return AiExplanationAttempt(
                status="UNAVAILABLE", error="GEMINI_API_KEY is not configured."
            )

        instructions = (
            "Write a concise vendor-facing explanation using only the structured workflow facts provided. "
            "Do not introduce new facts, do not alter the supplied status, and do not make a decision."
        )
        contents = facts.model_dump_json()

        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                system_instruction=instructions,
                response_mime_type="application/json",
                response_schema=AiExplanation,
            )
            response = self._client().models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )
            explanation = self._parse_response(response, AiExplanation)
            return AiExplanationAttempt(status="SUCCEEDED", explanation=explanation)
        except ValidationError as error:
            return AiExplanationAttempt(status="INVALID_OUTPUT", error=str(error))
        except Exception as error:
            return AiExplanationAttempt(status="FAILED", error=str(error))

    @staticmethod
    def _parse_response(response: Any, schema: type[Any]) -> Any:
        if hasattr(response, "output_parsed") and response.output_parsed is not None:
            raw = response.output_parsed
            if isinstance(raw, schema):
                return raw
            return schema.model_validate(raw)
        if hasattr(response, "text") and response.text:
            return schema.model_validate_json(response.text)
        if hasattr(response, "parsed") and response.parsed is not None:
            raw = response.parsed
            if isinstance(raw, schema):
                return raw
            return schema.model_validate(raw)
        raise ValueError("Empty or unparsable response from Gemini provider.")


class AiInterpretationService:
    """Facade service for AI capabilities delegating to configured provider."""

    def __init__(
        self,
        provider: BaseAiProvider | None = None,
        api_key: str | None = None,
        model: str | None = None,
        client: Any | None = None,
        provider_name: str | None = None,
    ):
        load_dotenv()
        if provider is not None:
            self.provider = provider
        else:
            resolved_provider = (
                provider_name
                or self._detect_provider_from_client(client)
                or os.getenv("AI_PROVIDER")
                or self._detect_default_provider()
            ).lower()

            if resolved_provider == "openai":
                self.provider = OpenAIProvider(api_key=api_key, model=model, client=client)
            elif resolved_provider == "gemini":
                self.provider = GeminiProvider(api_key=api_key, model=model, client=client)
            else:
                self.provider = GeminiProvider(api_key=api_key, model=model, client=client)

    @staticmethod
    def _detect_provider_from_client(client: Any | None) -> str | None:
        if client is None:
            return None
        if hasattr(client, "responses"):
            return "openai"
        if hasattr(client, "models"):
            return "gemini"
        return None

    @staticmethod
    def _detect_default_provider() -> str:
        if os.getenv("GEMINI_API_KEY"):
            return "gemini"
        if os.getenv("OPENAI_API_KEY"):
            return "openai"
        return "gemini"

    @property
    def provider_name(self) -> str:
        return self.provider.provider_name

    @property
    def model(self) -> str:
        return self.provider.model

    def extract_document_fields(
        self, document_type: DocumentType, document_text: str
    ) -> AiDocumentExtractionAttempt:
        return self.provider.extract_document_fields(document_type, document_text)

    def compare_identity_names(
        self, legal_name: str, bank_account_holder: str
    ) -> AiIdentityComparisonAttempt:
        return self.provider.compare_identity_names(legal_name, bank_account_holder)

    def generate_explanation(
        self, facts: WorkflowExplanationFacts
    ) -> AiExplanationAttempt:
        return self.provider.generate_explanation(facts)
