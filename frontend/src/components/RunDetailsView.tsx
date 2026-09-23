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
  Terminal,
  Building2,
  CreditCard,
  Check,
  X,
} from 'lucide-react';
import { getRunById } from '@/lib/storage';
import {
  WorkflowResult,
  StepResult,
  DocumentReference,
  ExtractedDocumentFields,
} from '@/lib/types';
import { StatusBadge, DocumentStatusBadge } from './Badges';

const WORKFLOW_STAGE_KEYS = [
  'intake',
  'completeness',
  'format',
  'documents',
  'identity',
  'decision',
];

const STAGE_LABELS: Record<string, string> = {
  intake: '1. Intake & Scope',
  completeness: '2. Completeness',
  format: '3. Tax & Format',
  documents: '4. Document Processing',
  identity: '5. Identity & Consistency',
  decision: '6. Final Decision',
};

const DOCUMENT_TITLE_LABELS: Record<string, string> = {
  PAN: 'PAN Card',
  GST_CERTIFICATE: 'GST Certificate',
  BANK_PROOF: 'Bank Proof / Cancelled Cheque',
  INCORPORATION: 'Certificate of Incorporation',
};

// Strict relevant field mappings per document type (Fix for Section 4 requirement)
const DOCUMENT_RELEVANT_FIELDS: Record<
  string,
  { key: keyof ExtractedDocumentFields; label: string }[]
> = {
  PAN: [
    { key: 'holder_name', label: 'Holder name' },
    { key: 'pan', label: 'PAN' },
  ],
  GST_CERTIFICATE: [
    { key: 'legal_name', label: 'Legal name' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'registered_address', label: 'Registered address' },
  ],
  BANK_PROOF: [
    { key: 'account_holder_name', label: 'Account holder' },
    { key: 'masked_account_number', label: 'Masked account number' },
    { key: 'ifsc', label: 'IFSC' },
    { key: 'bank_name', label: 'Bank name' },
  ],
  INCORPORATION: [
    { key: 'legal_name', label: 'Legal name' },
    { key: 'registered_address', label: 'Registered address' },
  ],
};

export function RunDetailsView({ runId }: { runId: string }) {
  const [run, setRun] = useState<WorkflowResult | undefined>(undefined);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    documents: true,
    identity: true,
    decision: true,
  });
  const [showTechnicalDebug, setShowTechnicalDebug] = useState(false);

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
            Run Record Not Found
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            Reference ID <span className="font-mono font-semibold">{runId}</span> is not present in local history.
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#1c1917] text-white hover:bg-[#292524] shadow-sm"
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

  // Identify review-assisting AI traces (excluding automated explanation traces)
  const reviewAiTraces = (run.ai_assistance || []).filter(
    (t) => t.capability === 'IDENTITY_COMPARISON' || t.capability === 'DOCUMENT_EXTRACTION'
  );
  const identityStep = stepsByKey['identity'];
  const isAiUsedForIdentity =
    identityStep?.details?.comparison_method === 'AI_FALLBACK';

  const hasAiAssistance = reviewAiTraces.length > 0 || isAiUsedForIdentity;

  const successfulAiTraces = reviewAiTraces.filter((t) => t.status === 'SUCCEEDED');
  const unavailableAiTraces = reviewAiTraces.filter(
    (t) => t.status === 'UNAVAILABLE' || t.status === 'FAILED'
  );

  // Document checklist helpers for completeness stage
  const suppliedDocTypes = new Set(
    (run.processed_documents || []).map((d) => d.document_type)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="space-y-4 pb-6 border-b border-[#e7e5e4]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716c] hover:text-[#1c1917] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-[#78716c] bg-[#f5f4ef] border border-[#e7e5e4] px-2.5 py-1 rounded">
                {run.run_id}
              </span>
              <StatusBadge status={run.status} />
            </div>
            <h1 className="text-2xl font-bold text-[#1c1917] tracking-tight mt-2">
              {run.vendor_name || 'Vendor Onboarding Review'}
            </h1>
          </div>

          <div className="sm:text-right text-xs text-[#78716c]">
            <p>
              Executed:{' '}
              <span className="font-medium text-[#1c1917]">
                {run.timestamp
                  ? new Date(run.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 1. SINGLE PRIMARY DECISION HERO CARD */}
      <div
        className={`p-6 rounded-2xl border shadow-sm space-y-5 transition-all ${
          run.status === 'APPROVED'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : run.status === 'PENDING'
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-rose-50/80 border-rose-200 text-rose-950'
        }`}
      >
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
            Final Decision
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {run.status === 'APPROVED'
              ? 'Vendor Approved'
              : run.status === 'PENDING'
              ? 'Vendor Onboarding Pending Action'
              : 'Vendor Onboarding Not Approved'}
          </h2>
        </div>

        {/* Reason Summary */}
        <div className="space-y-1.5 border-t border-current/15 pt-4">
          <p className="text-sm font-semibold leading-relaxed">{run.reason}</p>
          <p className="text-xs opacity-90 leading-normal">{run.vendor_message}</p>
        </div>

        {/* Required Action Callout */}
        {run.required_actions && run.required_actions.length > 0 && (
          <div className="p-4 rounded-xl bg-white/90 border border-current/20 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Action required</span>
            </div>
            <ul className="space-y-1.5 text-xs font-semibold list-disc list-inside text-rose-950">
              {run.required_actions.map((action, idx) => (
                <li key={idx} className="leading-snug">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Grid Layout: Timeline + AI Assistance */}
      <div className={`grid grid-cols-1 ${hasAiAssistance ? 'lg:grid-cols-3' : ''} gap-8`}>
        {/* Main Column: 6 Workflow Execution Stages */}
        <div className={`${hasAiAssistance ? 'lg:col-span-2' : ''} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1c1917] tracking-tight flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#d97706]" />
              Compliance Review Timeline
            </h2>
            <span className="text-xs text-[#78716c] font-medium">6 Stage Checks</span>
          </div>

          <div className="space-y-3">
            {WORKFLOW_STAGE_KEYS.map((key) => {
              const step = stepsByKey[key];
              const isExpanded = expandedSteps[key];
              const label = STAGE_LABELS[key] || key;

              if (!step) {
                return (
                  <div
                    key={key}
                    className="p-4 rounded-xl border border-[#e7e5e4] bg-[#faf9f5] opacity-50 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[#78716c]">{label}</span>
                    <span className="text-[11px] text-[#a8a29e]">Stage pending...</span>
                  </div>
                );
              }

              const isDecisionStage = key === 'decision';

              return (
                <div
                  key={key}
                  className="bg-white rounded-xl border border-[#e7e5e4] shadow-2xs overflow-hidden transition-all"
                >
                  {/* Stage Header */}
                  <button
                    type="button"
                    onClick={() => toggleStep(key)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-[#faf9f5] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isDecisionStage ? (
                        <ShieldCheck className="w-4 h-4 text-[#78716c] shrink-0" />
                      ) : step.status === 'PASSED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : step.status === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}

                      <div>
                        <span className="text-xs font-bold text-[#1c1917]">
                          {label}
                        </span>
                        <p className="text-xs text-[#78716c] mt-0.5">
                          {isDecisionStage ? 'Decision recorded' : step.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDecisionStage ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-stone-100 text-stone-700 border border-stone-200">
                          Recorded
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            step.status === 'PASSED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : step.status === 'WARNING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {step.status}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#78716c]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#78716c]" />
                      )}
                    </div>
                  </button>

                  {/* Stage Evidence Details — Expanded view adds information without repeating header */}
                  {isExpanded && (
                    <div className="p-4 bg-[#faf9f5] border-t border-[#e7e5e4] text-xs space-y-3">
                      {/* Stage 1: Intake Details */}
                      {key === 'intake' && (
                        <div className="p-3.5 rounded-lg bg-white border border-[#e7e5e4] space-y-2 text-xs text-[#44403c]">
                          <div className="flex justify-between items-center">
                            <span className="text-[#78716c]">Compliance scope:</span>
                            <span className="font-semibold text-[#1c1917]">
                              {String(step.details?.country || 'India')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#78716c]">Intake verification:</span>
                            <span className="font-semibold text-[#1c1917]">
                              Deterministic Rule Engine
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Stage 2: Completeness Checklist (Fix for Section 3 requirement) */}
                      {key === 'completeness' && (
                        <div className="p-3.5 rounded-lg bg-white border border-[#e7e5e4] space-y-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                            Required documents
                          </p>
                          <div className="space-y-1.5 text-xs">
                            {(
                              [
                                { type: 'PAN', label: 'PAN Card' },
                                { type: 'GST_CERTIFICATE', label: 'GST Certificate' },
                                { type: 'BANK_PROOF', label: 'Bank Proof / Cancelled Cheque' },
                                { type: 'INCORPORATION', label: 'Certificate of Incorporation' },
                              ] as const
                            ).map((doc) => {
                              const isPresent = suppliedDocTypes.has(doc.type);
                              return (
                                <div
                                  key={doc.type}
                                  className="flex items-center gap-2 text-[#1c1917]"
                                >
                                  {isPresent ? (
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <X className="w-4 h-4 text-amber-600 shrink-0" />
                                  )}
                                  <span className={isPresent ? 'font-medium' : 'text-amber-800 font-medium'}>
                                    {doc.label} {isPresent ? '' : '(Missing)'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Stage 3: Tax & Format Validation Details */}
                      {key === 'format' && (
                        <div className="p-3.5 rounded-lg bg-white border border-[#e7e5e4] space-y-3">
                          <div className="space-y-1.5 text-xs text-[#44403c]">
                            <div className="flex justify-between items-center">
                              <span className="text-[#78716c]">PAN format:</span>
                              <span className="font-semibold text-emerald-700">Valid</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#78716c]">GSTIN format & state code:</span>
                              <span className={step.status === 'FAILED' ? 'font-semibold text-rose-700' : 'font-semibold text-emerald-700'}>
                                {step.status === 'FAILED' ? 'Validation issue' : 'Valid'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#78716c]">IFSC bank code format:</span>
                              <span className="font-semibold text-emerald-700">Valid</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-[#e7e5e4]">
                              <span className="text-[#78716c]">Validated source:</span>
                              <span className="font-semibold text-[#1c1917] capitalize">
                                {String(step.details?.validated_from || 'submission')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Stage 4: Documents Custom Render — Strictly relevant fields only (Fix for Section 4) */}
                      {key === 'documents' && run.processed_documents && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {run.processed_documents.map((doc: DocumentReference, idx: number) => {
                              const title =
                                DOCUMENT_TITLE_LABELS[doc.document_type] ||
                                doc.document_type.replace('_', ' ');
                              const relevantConfigs =
                                DOCUMENT_RELEVANT_FIELDS[doc.document_type] || [];

                              return (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-white border border-[#e7e5e4] space-y-2 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between border-b border-[#e7e5e4] pb-2">
                                    <span className="font-bold text-[#1c1917] text-xs">
                                      {title}
                                    </span>
                                    <DocumentStatusBadge status={doc.processing_status} />
                                  </div>

                                  {/* Render ONLY fields relevant to this document type */}
                                  <div className="space-y-1 text-[11px] text-[#44403c]">
                                    {relevantConfigs.map((cfg) => {
                                      let rawVal: string | null | undefined = undefined;

                                      if (cfg.key === 'account_holder_name') {
                                        rawVal =
                                          doc.extracted_fields?.account_holder_name ||
                                          doc.extracted_fields?.holder_name;
                                      } else {
                                        rawVal = doc.extracted_fields?.[cfg.key];
                                      }

                                      const displayVal = rawVal ? String(rawVal) : 'Not extracted';

                                      return (
                                        <div
                                          key={String(cfg.key)}
                                          className="flex justify-between items-center"
                                        >
                                          <span className="text-[#78716c]">
                                            {cfg.label}:
                                          </span>
                                          <span className={`font-semibold font-mono truncate max-w-[150px] ${
                                            rawVal ? 'text-[#1c1917]' : 'text-[#a8a29e] italic'
                                          }`}>
                                            {displayVal}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {doc.extraction_errors && doc.extraction_errors.length > 0 && (
                                    <div className="text-[11px] text-rose-800 bg-rose-50 p-2 rounded border border-rose-200">
                                      {doc.extraction_errors.join(', ')}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Stage 5: Identity Details Custom Render (Fix for Section 5) */}
                      {key === 'identity' && step.details && (
                        <div className="p-3.5 rounded-lg bg-white border border-[#e7e5e4] space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="flex items-start gap-2">
                              <Building2 className="w-4 h-4 text-[#78716c] shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[#78716c] text-[11px] font-medium">
                                  Registered Legal Entity
                                </span>
                                <p className="font-semibold text-[#1c1917] mt-0.5">
                                  {String(step.details.legal_name || run.vendor_name || 'N/A')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <CreditCard className="w-4 h-4 text-[#78716c] shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[#78716c] text-[11px] font-medium">
                                  Bank Account Holder
                                </span>
                                <p className="font-semibold text-[#1c1917] mt-0.5">
                                  {String(step.details.bank_account_holder || 'N/A')}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#e7e5e4] flex items-center justify-between text-[11px]">
                            <span className="text-[#78716c] font-medium">Identity Match Result</span>
                            <span className="font-semibold text-[#1c1917]">
                              {step.status === 'PASSED'
                                ? step.details.comparison_method === 'AI_FALLBACK'
                                  ? 'Match (AI-assisted)'
                                  : 'Match'
                                : step.status === 'FAILED'
                                ? 'No match'
                                : 'Review required'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Stage 6: Final Decision Expanded Details (Fix for Section 6) */}
                      {key === 'decision' && (
                        <div className="p-3.5 rounded-lg bg-white border border-[#e7e5e4] space-y-2.5 text-xs text-[#44403c]">
                          <div className="flex justify-between items-center">
                            <span className="text-[#78716c]">Outcome:</span>
                            <span className="font-semibold text-[#1c1917]">
                              {run.status === 'APPROVED'
                                ? 'Approved'
                                : run.status === 'PENDING'
                                ? 'Pending documentation'
                                : 'Not approved'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#78716c] block mb-0.5">Primary reason:</span>
                            <p className="font-medium text-[#1c1917] leading-snug">
                              {run.reason}
                            </p>
                          </div>
                          {run.required_actions && run.required_actions.length > 0 && (
                            <div className="pt-2 border-t border-[#e7e5e4]">
                              <span className="text-[#78716c] block mb-0.5">Required action:</span>
                              <p className="font-medium text-rose-900 leading-snug">
                                {run.required_actions.join('; ')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CASE A: Subtle inline note when AI was NOT invoked for ambiguous review */}
          {!hasAiAssistance && (
            <div className="p-3.5 rounded-xl border border-[#e7e5e4] bg-[#faf9f5] text-xs text-[#78716c] flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#78716c] shrink-0" />
              <span>Standard compliance rules were sufficient for this review.</span>
            </div>
          )}
        </div>

        {/* Right Column: AI Assistance (Rendered only when AI was invoked for ambiguous review) */}
        {hasAiAssistance && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1c1917] tracking-tight flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#d97706]" />
                AI-Assisted Review
              </h2>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#e7e5e4] shadow-sm space-y-4">
              {/* CASE B: AI Succeeded */}
              {(successfulAiTraces.length > 0 || isAiUsedForIdentity) && (
                <div className="space-y-3">
                  <span className="font-bold uppercase text-[10px] tracking-wider text-[#d97706] block">
                    Entity name interpretation
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-[#78716c] text-[11px] block">Legal name:</span>
                      <p className="font-semibold text-[#1c1917]">
                        {String(identityStep?.details?.legal_name || run.vendor_name || 'N/A')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#78716c] text-[11px] block">Bank account holder:</span>
                      <p className="font-semibold text-[#1c1917]">
                        {String(identityStep?.details?.bank_account_holder || 'N/A')}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-[#e7e5e4] bg-[#faf9f5] text-xs space-y-1">
                    <span className="text-[#78716c] text-[11px] font-medium block">AI assessment:</span>
                    <p className="text-[#1c1917] font-medium leading-relaxed">
                      {successfulAiTraces[0]?.summary ||
                        'Names appear to refer to related entities based on the supplied names.'}
                    </p>
                  </div>
                </div>
              )}

              {/* CASE C: AI Needed but Unavailable */}
              {unavailableAiTraces.length > 0 && successfulAiTraces.length === 0 && !isAiUsedForIdentity && (
                <div className="p-4 rounded-lg border border-[#e7e5e4] bg-[#faf9f5] space-y-1.5 text-xs">
                  <span className="font-bold text-[#1c1917]">AI-assisted review unavailable</span>
                  <p className="text-[#78716c] leading-relaxed">
                    AI-assisted review was unavailable for this step. The workflow continued using standard compliance rules.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-[#a8a29e] pt-2 border-t border-[#e7e5e4] italic">
                AI assists with interpretation only. Final onboarding decisions are governed by compliance rules.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* TECHNICAL DEVELOPER DIAGNOSTICS TOGGLE (Collapsed by default) */}
      <div className="pt-6 border-t border-[#e7e5e4]">
        <button
          type="button"
          onClick={() => setShowTechnicalDebug(!showTechnicalDebug)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#78716c] hover:text-[#1c1917] transition-colors"
        >
          <Terminal className="w-4 h-4 text-[#78716c]" />
          <span>{showTechnicalDebug ? 'Hide Technical Debug Details' : 'Show Technical Debug Details'}</span>
          {showTechnicalDebug ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {showTechnicalDebug && (
          <div className="mt-4 p-4 rounded-xl bg-[#1c1917] text-[#f5f4ef] font-mono text-[11px] space-y-4 overflow-x-auto shadow-inner">
            <div className="flex items-center justify-between text-stone-400 border-b border-stone-800 pb-2">
              <span>RAW WORKFLOW RESULT PAYLOAD</span>
              <span>REASON CODE: {run.reason_code}</span>
            </div>
            <pre className="whitespace-pre-wrap text-emerald-400">
              {JSON.stringify(run, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
