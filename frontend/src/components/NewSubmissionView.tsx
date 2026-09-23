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
} from 'lucide-react';
import { DEMO_SCENARIOS, DemoScenario } from '@/lib/demoScenarios';
import { uploadDocument, submitWorkflow } from '@/lib/api';
import { saveRun } from '@/lib/storage';
import {
  DocumentReference,
  DocumentType,
  VendorSubmissionPayload,
} from '@/lib/types';

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

  // Load a Demo Scenario
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
      // Replace existing ref of same docType or append
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

  // Submit & Run Verification
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
      setErrorMsg('PAN must be exactly 10 characters.');
      return;
    }
    if (gstin.length !== 15) {
      setErrorMsg('GSTIN must be exactly 15 characters.');
      return;
    }
    if (ifsc.length !== 11) {
      setErrorMsg('IFSC code must be exactly 11 characters.');
      return;
    }

    setSubmitting(true);

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
      const result = await submitWorkflow(payload);
      saveRun(result, payload.legal_name);
      router.push(`/runs/${result.run_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute onboarding workflow';
      setErrorMsg(msg);
      setSubmitting(false);
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
          Enter vendor onboarding declarations and attach machine-readable PDF verification documents.
        </p>
      </div>

      {/* Demo Scenario Preset Selector */}
      <div className="bg-[#faf9f5] p-5 rounded-xl border border-[#e7e5e4] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#d97706]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1c1917]">
              Rehearsal Demo Scenarios
            </h2>
          </div>
          <span className="text-[11px] text-[#78716c]">
            Click a scenario to auto-fill fictional test data
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1c1917]">
                    {scenario.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
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
                <p className="text-[11px] text-[#78716c] mt-1.5 line-clamp-2 leading-tight">
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
                Country
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
                placeholder="Full registered address..."
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

        {/* Section 4: Required Documents */}
        <div className="bg-white p-6 rounded-xl border border-[#e7e5e4] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#e7e5e4] pb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#d97706]" />
              <h2 className="text-sm font-semibold text-[#1c1917]">
                Verification Documents (PDF)
              </h2>
            </div>
            <span className="text-[11px] text-[#78716c]">
              Machine-readable PDF documents
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                { type: 'PAN', label: 'PAN Card Document' },
                { type: 'GST_CERTIFICATE', label: 'GST Registration Certificate' },
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
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Loaded
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
                <span>Running Workflow...</span>
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
