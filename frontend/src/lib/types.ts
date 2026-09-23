export type Status = 'APPROVED' | 'PENDING' | 'REJECTED';

export type DocumentType = 'PAN' | 'GST_CERTIFICATE' | 'BANK_PROOF' | 'INCORPORATION';

export type DocumentProcessingStatus =
  | 'PENDING'
  | 'EXTRACTED'
  | 'MISSING'
  | 'FAILED'
  | 'UNSUPPORTED'
  | 'EXTRACTION_REQUIRED';

export type AiCallStatus = 'SUCCEEDED' | 'UNAVAILABLE' | 'FAILED' | 'INVALID_OUTPUT';

export type AiCapability = 'DOCUMENT_EXTRACTION' | 'IDENTITY_COMPARISON' | 'EXPLANATION';

export type ReasonCode =
  | 'APPROVED'
  | 'MISSING_DOCUMENTS'
  | 'VALIDATION_FAILED'
  | 'INVALID_PAN'
  | 'INVALID_GSTIN'
  | 'INVALID_IFSC'
  | 'UNSUPPORTED_COUNTRY'
  | 'IDENTITY_CONFLICT'
  | 'IDENTITY_UNCERTAIN'
  | 'DOCUMENT_EXTRACTION_REQUIRED';

export interface DecisionReason {
  code: ReasonCode;
  message: string;
  fields: string[];
}

export interface ExtractedDocumentFields {
  holder_name?: string | null;
  legal_name?: string | null;
  pan?: string | null;
  gstin?: string | null;
  registered_address?: string | null;
  account_holder_name?: string | null;
  masked_account_number?: string | null;
  ifsc?: string | null;
  bank_name?: string | null;
}

export interface AiAssistanceTrace {
  capability: AiCapability;
  status: AiCallStatus;
  model?: string | null;
  summary: string;
}

export interface DocumentReference {
  document_type: DocumentType;
  filename?: string | null;
  storage_reference?: string | null;
  processing_status: DocumentProcessingStatus;
  extracted_fields: ExtractedDocumentFields;
  extraction_errors: string[];
  ai_assistance?: AiAssistanceTrace | null;
}

export interface VendorSubmissionPayload {
  legal_name: string;
  trade_name?: string | null;
  country: string;
  registered_address: string;
  pan: string;
  gstin: string;
  bank_account_holder: string;
  bank_account_number: string;
  ifsc: string;
  document_references: DocumentReference[];
}

export interface StepResult {
  key: string;
  name: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  result?: 'COMPLETED' | 'SKIPPED';
  summary: string;
  details: Record<string, unknown>;
}

export interface WorkflowResult {
  run_id: string;
  status: Status;
  reason: string;
  reason_code: ReasonCode;
  reasons: DecisionReason[];
  required_actions: string[];
  processed_documents: DocumentReference[];
  ai_assistance: AiAssistanceTrace[];
  steps: StepResult[];
  vendor_message: string;
  timestamp?: string;
  vendor_name?: string;
}

export interface SystemStatus {
  status: string;
  ai_provider: string;
  ai_model: string;
}
