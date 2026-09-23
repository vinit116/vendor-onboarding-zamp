import {
  DocumentReference,
  DocumentType,
  StepResult,
  SystemStatus,
  VendorSubmissionPayload,
  WorkflowResult,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000';

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/system/status`);
    if (!res.ok) throw new Error(`Status HTTP error ${res.status}`);
    return await res.json();
  } catch {
    return {
      status: 'offline',
      ai_provider: 'unavailable',
      ai_model: 'none',
    };
  }
}

export async function uploadDocument(
  file: File,
  documentType: DocumentType
): Promise<DocumentReference> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(errorData.detail || 'Failed to upload document');
  }

  return await res.json();
}

export async function submitWorkflow(
  payload: VendorSubmissionPayload
): Promise<WorkflowResult> {
  const res = await fetch(`${API_BASE_URL}/api/workflows/vendor-onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Submission failed' }));
    throw new Error(errorData.detail || 'Vendor onboarding submission failed');
  }

  return await res.json();
}

export async function streamWorkflow(
  payload: VendorSubmissionPayload,
  onStep: (step: StepResult) => void,
  onComplete: (result: WorkflowResult) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/workflows/vendor-onboarding/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const directResult = await submitWorkflow(payload);
      for (const step of directResult.steps) {
        onStep(step);
      }
      onComplete(directResult);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const line = part.trim();
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.substring(6));
            if (parsed.type === 'step') {
              onStep(parsed.step);
            } else if (parsed.type === 'complete') {
              onComplete(parsed.result);
            }
          } catch {
            console.warn('Malformed SSE event:', line);
          }
        }
      }
    }
  } catch (err: unknown) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
