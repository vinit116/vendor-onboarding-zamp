'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  FileText,
  CreditCard,
  UploadCloud,
  FileCheck,
  Trash2,
  Play,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { DEMO_SCENARIOS, DemoScenario } from '@/lib/demoScenarios';
import { uploadDocument, streamWorkflow, submitWorkflow } from '@/lib/api';
import { saveRun } from '@/lib/storage';
import {
  DocumentReference,
  DocumentType,
  StepResult,
  VendorSubmissionPayload,
  WorkflowResult,
} from '@/lib/types';

const STAGE_LABELS: Record<string, string> = {
  intake: '1. Intake & Scope Review',
  completeness: '2. Completeness Check',
  format: '3. Tax Identifier & Format Validation',
  documents: '4. Verification Document Processing',
  identity: '5. Legal Entity vs Banking Identity',
  decision: '6. Final Onboarding Decision',
};

export function NewSubmissionView() {
  const router = useRouter();

  // Form State
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [country, setCountry] = useState('India');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');

  // Document References
  const [documentRefs, setDocumentRefs] = useState<DocumentReference[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<DocumentType | null>(null);

  // Status & Error States
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Live SSE Stage Streaming State
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, StepResult>>({});
  const [currentRunningStage, setCurrentRunningStage] = useState<string | null>(null);

  // Load a Quick Start Scenario
  const handleSelectDemo = (scenario: DemoScenario) => {
    setSelectedDemoId(scenario.id);
    const p = scenario.payload;
    setLegalName(p.legal_name);
    setTradeName(p.trade_name || '');
    setCountry(p.country);
    setRegisteredAddress(p.registered_address);
    setPan(p.pan);
    setGstin(p.gstin);
    setBankAccountHolder(p.bank_account_holder);
    setBankAccountNumber(p.bank_account_number);
    setIfsc(p.ifsc);
    setDocumentRefs(p.document_references);
    setErrorMsg(null);
  };

  // Custom File Upload
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: DocumentType
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Only machine-readable PDF files are supported for document processing.');
      return;
    }

    setUploadingDoc(docType);
    setErrorMsg(null);

    try {
      const docRef = await uploadDocument(file, docType);
      setDocumentRefs((prev) => [
        ...prev.filter((d) => d.document_type !== docType),
        docRef,
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document';
      setErrorMsg(msg);
    } finally {
      setUploadingDoc(null);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = (docType: DocumentType) => {
    setDocumentRefs((prev) => prev.filter((d) => d.document_type !== docType));
  };

  const getDocRef = (docType: DocumentType) =>
    documentRefs.find((d) => d.document_type === docType);

  // Submit & Run Verification via SSE Stream
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!legalName.trim()) {
      setErrorMsg('Legal Company Name is required.');
      return;
    }
    if (!registeredAddress.trim()) {
      setErrorMsg('Registered Address is required.');
      return;
    }
    if (pan.length !== 10) {
      setErrorMsg('PAN must be exactly 10 characters (e.g. ABCDE1234F).');
      return;
    }
    if (gstin.length !== 15) {
      setErrorMsg('GSTIN must be exactly 15 characters (e.g. 27ABCDE1234F1Z5).');
      return;
    }
    if (ifsc.length !== 11) {
      setErrorMsg('IFSC code must be exactly 11 characters (e.g. ABCD0123456).');
      return;
    }

    setSubmitting(true);
    setLiveStreamActive(true);
    setCompletedSteps({});
    setCurrentRunningStage('intake');

    const payload: VendorSubmissionPayload = {
      legal_name: legalName.trim(),
      trade_name: tradeName.trim() || undefined,
      country: country.trim(),
      registered_address: registeredAddress.trim(),
      pan: pan.trim().toUpperCase(),
      gstin: gstin.trim().toUpperCase(),
      bank_account_holder: bankAccountHolder.trim(),
      bank_account_number: bankAccountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      document_references: documentRefs,
    };

    try {
      await streamWorkflow(
        payload,
        (step: StepResult) => {
          setCompletedSteps((prev) => ({ ...prev, [step.key]: step }));
          // Set next stage as running
          const keys = Object.keys(STAGE_LABELS);
          const idx = keys.indexOf(step.key);
          if (idx !== -1 && idx < keys.length - 1) {
            setCurrentRunningStage(keys[idx + 1]);
          } else {
            setCurrentRunningStage(null);
          }
        },
        (result: WorkflowResult) => {
          saveRun(result, payload.legal_name);
          setTimeout(() => {
            router.push(`/runs/${result.run_id}`);
          }, 400);
        },
        async (error: Error) => {
          console.warn('SSE stream fallback to direct POST:', error.message);
          const directResult = await submitWorkflow(payload);
          saveRun(directResult, payload.legal_name);
          router.push(`/runs/${directResult.run_id}`);
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute onboarding workflow';
      setErrorMsg(msg);
      setSubmitting(false);
      setLiveStreamActive(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="pb-6 border-b border-[#e7e5e4]">
        <h1 className="text-2xl font-bold text-[#1c1917] tracking-tight">
          New Vendor Submission
        </h1>
        <p className="text-sm text-[#78716c] mt-1">
          Submit vendor details and required verification documents for compliance review.
        </p>
      </div>

      {/* Quick Start Demo Data Selector */}
      <div className="bg-[#faf9f5] p-5 rounded-xl border border-[#e7e5e4] space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#d97706]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1c1917]">
            QUICK START
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {DEMO_SCENARIOS.map((scenario) => {
            const isSelected = selectedDemoId === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => handleSelectDemo(scenario)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-[#d97706] bg-white shadow-sm ring-1 ring-[#d97706]'
                    : 'border-[#e7e5e4] bg-white hover:border-[#a8a29e]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-[#1c1917]">
                    {scenario.name}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      scenario.expectedOutcome === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : scenario.expectedOutcome === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {scenario.expectedOutcome}
                  </span>
                </div>
                <p className="text-[10px] text-[#78716c] mt-1.5 line-clamp-2 leading-tight">
                  {scenario.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Workflow Stage Execution Overlay */}
      {liveStreamActive && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#e7e5e4] shadow-2xl p-6 max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#e7e5e4]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1c1917] flex items-center justify-center text-white">
                  <Loader2 className="w-4 h-4 animate-spin text-[#d97706]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1c1917]">
                    Verification in progress
                  </h3>
                  <p className="text-[11px] text-[#78716c]">
                    Executing compliance verification checks...
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {Object.entries(STAGE_LABELS).map(([key, label]) => {
                const step = completedSteps[key];
                const isRunning = currentRunningStage === key;

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                      step
                        ? step.status === 'PASSED'
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : step.status === 'WARNING'
                          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                          : 'bg-rose-50/60 border-rose-200 text-rose-950'
                        : isRunning
                        ? 'bg-amber-50/40 border-[#d97706] ring-1 ring-[#d97706]/30 text-[#1c1917]'
                        : 'bg-[#faf9f5] border-[#e7e5e4] text-[#a8a29e]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {step ? (
                        step.status === 'PASSED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : step.status === 'WARNING' ? (
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )
                      ) : isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#d97706] shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-current shrink-0 opacity-40" />
                      )}

                      <span className="font-semibold text-xs">{label}</span>
                    </div>

                    <span className="text-[10px] font-mono uppercase font-bold">
                      {step
                        ? key === 'decision'
                          ? 'Completed'
                          : step.status === 'PASSED'
                          ? 'Passed'
                          : 'Needs attention'
                        : isRunning
                        ? 'Checking'
                        : 'Waiting'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Company Information */}
        <div className="bg-white p-6 rounded-xl border border-[#e7e5e4] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e7e5e4] pb-3">
            <Building2 className="w-4 h-4 text-[#d97706]" />
            <h2 className="text-sm font-semibold text-[#1c1917]">
              Company Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                Legal Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Acme Technologies Private Limited"
                className="w-full px-3 py-2 text-xs border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] text-[#1c1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                Trade Name (Optional)
              </label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="e.g. Acme Tech"
                className="w-full px-3 py-2 text-xs border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] text-[#1c1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                Country Scope
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#e7e5e4] rounded-lg bg-[#faf9f5] text-[#1c1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                Registered Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                placeholder="Full registered office address..."
                className="w-full px-3 py-2 text-xs border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] text-[#1c1917]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tax & Registration */}
        <div className="bg-white p-6 rounded-xl border border-[#e7e5e4] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e7e5e4] pb-3">
            <FileText className="w-4 h-4 text-[#d97706]" />
            <h2 className="text-sm font-semibold text-[#1c1917]">
              Tax & Registration Identifiers
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                PAN (Permanent Account Number) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="e.g. ABCDE1234F"
                className="w-full px-3 py-2 text-xs font-mono border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] text-[#1c1917] uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                GSTIN (GST Identification Number) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 27ABCDE1234F1Z5"
                className="w-full px-3 py-2 text-xs font-mono border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] text-[#1c1917] uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Banking */}
        <div className="bg-white p-6 rounded-xl border border-[#e7e5e4] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e7e5e4] pb-3">
            <CreditCard className="w-4 h-4 text-[#d97706]" />
            <h2 className="text-sm font-semibold text-[#1c1917]">
              Banking Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                Bank Account Holder Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="e.g. ACME TECHNOLOGIES PVT LTD"
                className="w-full px-3 py-2 text-xs border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] text-[#1c1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                Bank Account Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="e.g. 1234567890"
                className="w-full px-3 py-2 text-xs font-mono border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] text-[#1c1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#44403c] mb-1">
                IFSC Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD0123456"
                className="w-full px-3 py-2 text-xs font-mono border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] text-[#1c1917] uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Verification Documents */}
        <div className="bg-white p-6 rounded-xl border border-[#e7e5e4] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#e7e5e4] pb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#d97706]" />
              <h2 className="text-sm font-semibold text-[#1c1917]">
                Verification Documents
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                { type: 'PAN', label: 'PAN Card' },
                { type: 'GST_CERTIFICATE', label: 'GST Certificate' },
                { type: 'BANK_PROOF', label: 'Bank Proof / Cancelled Cheque' },
                { type: 'INCORPORATION', label: 'Certificate of Incorporation' },
              ] as const
            ).map((item) => {
              const docRef = getDocRef(item.type);
              const isUploading = uploadingDoc === item.type;

              return (
                <div
                  key={item.type}
                  className="p-4 rounded-lg border border-[#e7e5e4] bg-[#faf9f5] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1c1917]">
                      {item.label}
                    </span>
                    {docRef && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Attached
                      </span>
                    )}
                  </div>

                  {docRef ? (
                    <div className="flex items-center justify-between p-2.5 rounded bg-white border border-[#e7e5e4] text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium text-[#1c1917]">
                          {docRef.filename || docRef.storage_reference}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(item.type)}
                        className="text-[#78716c] hover:text-rose-600 p-1 transition-colors"
                        title="Remove document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-[#d6d3d1] bg-white hover:bg-[#faf9f5] transition-colors cursor-pointer text-center">
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-xs text-[#78716c]">
                          <Loader2 className="w-4 h-4 animate-spin text-[#d97706]" />
                          <span>Uploading PDF...</span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-5 h-5 text-[#a8a29e] mb-1" />
                          <span className="text-xs font-medium text-[#d97706]">
                            Upload PDF
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleFileUpload(e, item.type)}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Verification Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e7e5e4]">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[#78716c] hover:text-[#1c1917]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-semibold bg-[#1c1917] text-white hover:bg-[#292524] transition-all shadow-md disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#d97706]" />
                <span>Processing Checks...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-[#d97706] fill-current" />
                <span>Start Verification</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
