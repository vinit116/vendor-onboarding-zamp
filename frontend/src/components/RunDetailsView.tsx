'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Cpu,
  ListChecks,
} from 'lucide-react';
import { getRunById } from '@/lib/storage';
import { WorkflowResult, StepResult, AiAssistanceTrace } from '@/lib/types';
import { StatusBadge, DocumentStatusBadge, AiStatusBadge } from './Badges';

const WORKFLOW_STAGE_KEYS = [
  'intake',
  'completeness',
  'format',
  'documents',
  'identity',
  'duplicate',
  'decision',
];

export function RunDetailsView({ runId }: { runId: string }) {
  const [run, setRun] = useState<WorkflowResult | undefined>(undefined);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    documents: true,
    identity: true,
    decision: true,
  });

  useEffect(() => {
    const found = getRunById(runId);
    if (found) {
      setRun(found);
    }
  }, [runId]);

  const toggleStep = (key: string) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!run) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 text-center py-20">
        <div className="w-12 h-12 rounded-full bg-[#f5f4ef] flex items-center justify-center text-[#78716c] mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#1c1917]">
            Run details not found
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            Run ID <span className="font-mono">{runId}</span> was not found in your local operator history.
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#1c1917] text-white hover:bg-[#292524]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const stepsByKey = (run.steps || []).reduce<Record<string, StepResult>>(
    (acc, step) => {
      acc[step.key] = step;
      return acc;
    },
    {}
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Back Link & Header */}
      <div className="space-y-4 pb-6 border-b border-[#e7e5e4]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716c] hover:text-[#1c1917] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-[#78716c] bg-[#f5f4ef] border border-[#e7e5e4] px-2.5 py-0.5 rounded">
                {run.run_id}
              </span>
              <StatusBadge status={run.status} />
            </div>
            <h1 className="text-2xl font-bold text-[#1c1917] tracking-tight mt-1.5">
              {run.vendor_name || 'Vendor Submission'}
            </h1>
          </div>

          <div className="text-right text-xs text-[#78716c]">
            <p>
              Executed:{' '}
              {run.timestamp
                ? new Date(run.timestamp).toLocaleString()
                : 'Recent'}
            </p>
            <p className="font-mono mt-0.5">Decision: {run.reason_code}</p>
          </div>
        </div>
      </div>

      {/* Prominent Final Decision Banner */}
      <div
        className={`p-6 rounded-xl border shadow-sm space-y-4 ${
          run.status === 'APPROVED'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : run.status === 'PENDING'
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-rose-50/70 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={run.status} />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                Deterministic Decision
              </span>
            </div>
            <p className="text-sm font-medium mt-1">{run.reason}</p>
            <p className="text-xs opacity-90">{run.vendor_message}</p>
          </div>
        </div>

        {/* Required Actions (if Pending or Rejected) */}
        {run.required_actions && run.required_actions.length > 0 && (
          <div className="pt-3 border-t border-current/15 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Required Actions</span>
            </div>
            <ul className="list-disc list-inside text-xs space-y-1 font-medium">
              {run.required_actions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Grid Layout: Timeline + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: 7 Workflow Execution Stages (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1c1917] tracking-tight flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#d97706]" />
              Workflow Execution Timeline
            </h2>
            <span className="text-xs text-[#78716c]">7 Visible Stages</span>
          </div>

          <div className="space-y-3">
            {WORKFLOW_STAGE_KEYS.map((key) => {
              const step = stepsByKey[key];
              const isExpanded = expandedSteps[key];

              if (!step) {
                return (
                  <div
                    key={key}
                    className="p-4 rounded-xl border border-[#e7e5e4] bg-white opacity-50 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold capitalize text-[#78716c]">
                      {key}
                    </span>
                    <span className="text-[11px] text-[#a8a29e]">Pending stage...</span>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden transition-all"
                >
                  {/* Stage Header */}
                  <button
                    type="button"
                    onClick={() => toggleStep(key)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-[#faf9f5] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Indicator Icon */}
                      {step.status === 'PASSED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : step.status === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1c1917]">
                            {step.name}
                          </span>
                          {step.result === 'SKIPPED' && (
                            <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200 px-1.5 py-0.2 rounded">
                              SKIPPED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#78716c] mt-0.5">
                          {step.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          step.status === 'PASSED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : step.status === 'WARNING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {step.status}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#78716c]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#78716c]" />
                      )}
                    </div>
                  </button>

                  {/* Stage Details (Expanded) */}
                  {isExpanded && step.details && (
                    <div className="p-4 bg-[#faf9f5] border-t border-[#e7e5e4] text-xs space-y-3">
                      {/* Document Details Custom Render */}
                      {key === 'documents' && run.processed_documents && (
                        <div className="space-y-2">
                          <p className="font-semibold text-[#44403c] text-[11px] uppercase tracking-wider">
                            Processed Verification Documents
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {run.processed_documents.map((doc, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg bg-white border border-[#e7e5e4] space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[#1c1917]">
                                    {doc.document_type}
                                  </span>
                                  <DocumentStatusBadge status={doc.processing_status} />
                                </div>

                                {doc.extracted_fields &&
                                  Object.keys(doc.extracted_fields).length > 0 && (
                                    <div className="pt-1.5 border-t border-[#e7e5e4] space-y-1 text-[11px] font-mono text-[#44403c]">
                                      {Object.entries(doc.extracted_fields).map(
                                        ([k, v]) =>
                                          v && (
                                            <div
                                              key={k}
                                              className="flex justify-between"
                                            >
                                              <span className="text-[#78716c]">
                                                {k}:
                                              </span>
                                              <span className="font-semibold truncate max-w-[140px]">
                                                {String(v)}
                                              </span>
                                            </div>
                                          )
                                      )}
                                    </div>
                                  )}

                                {doc.extraction_errors &&
                                  doc.extraction_errors.length > 0 && (
                                    <div className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
                                      {doc.extraction_errors.join(', ')}
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Identity Details Custom Render */}
                      {key === 'identity' && step.details && (
                        <div className="p-3 rounded-lg bg-white border border-[#e7e5e4] space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-[#78716c] uppercase">
                              Comparison Method
                            </span>
                            <span className="font-mono text-[#1c1917] font-bold">
                              {String(step.details.comparison_method || 'N/A')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-[#e7e5e4]">
                            <div>
                              <span className="text-[#78716c] text-[11px]">
                                Legal Entity Name:
                              </span>
                              <p className="font-semibold text-[#1c1917] mt-0.5">
                                {String(step.details.legal_name || 'N/A')}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#78716c] text-[11px]">
                                Bank Account Holder:
                              </span>
                              <p className="font-semibold text-[#1c1917] mt-0.5">
                                {String(step.details.bank_account_holder || 'N/A')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Raw Details JSON for completeness/duplicate/format */}
                      {key !== 'documents' && key !== 'identity' && (
                        <pre className="p-3 rounded-lg bg-white border border-[#e7e5e4] text-[11px] font-mono text-[#44403c] overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(step.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Assistance Traces (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1c1917] tracking-tight flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#d97706]" />
              AI Assistance Traces
            </h2>
            <span className="text-xs text-[#78716c]">Interpretation Only</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#e7e5e4] shadow-sm space-y-4">
            <p className="text-xs text-[#78716c]">
              Structured AI interpretation traces for document fallback, identity matching, and explanation generation.
            </p>

            {run.ai_assistance && run.ai_assistance.length > 0 ? (
              <div className="space-y-3">
                {run.ai_assistance.map((trace: AiAssistanceTrace, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-[#e7e5e4] bg-[#faf9f5] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase text-[11px] tracking-wider text-[#1c1917]">
                        {trace.capability}
                      </span>
                      <AiStatusBadge status={trace.status} />
                    </div>

                    <p className="text-[#44403c] leading-relaxed">
                      {trace.summary}
                    </p>

                    {trace.model && (
                      <div className="text-[10px] font-mono text-[#78716c] pt-1.5 border-t border-[#e7e5e4]">
                        Model: {trace.model}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-[#e7e5e4] bg-[#faf9f5] text-xs text-[#78716c] text-center">
                AI assistance was not triggered for this run. Decision was established entirely using deterministic business rules.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
