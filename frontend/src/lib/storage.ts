import { WorkflowResult } from './types';

const STORAGE_KEY = 'zamp_vendor_runs';

export function getStoredRuns(): WorkflowResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored runs:', error);
    return [];
  }
}

export function saveRun(run: WorkflowResult, vendorName: string): WorkflowResult {
  if (typeof window === 'undefined') return run;
  const runs = getStoredRuns();
  
  const enrichedRun: WorkflowResult = {
    ...run,
    vendor_name: vendorName || 'Unknown Vendor',
    timestamp: run.timestamp || new Date().toISOString(),
  };

  // Prevent duplicate runs with same run_id
  const filtered = runs.filter((r) => r.run_id !== run.run_id);
  const updated = [enrichedRun, ...filtered];
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save run to localStorage:', error);
  }

  return enrichedRun;
}

export function getRunById(runId: string): WorkflowResult | undefined {
  const runs = getStoredRuns();
  return runs.find((r) => r.run_id === runId);
}

export function clearStoredRuns(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
