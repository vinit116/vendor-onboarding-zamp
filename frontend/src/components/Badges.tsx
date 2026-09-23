'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileCheck,
  FileX,
  FileWarning,
  Cpu,
} from 'lucide-react';
import {
  Status,
  DocumentProcessingStatus,
  AiCallStatus,
} from '@/lib/types';

export function StatusBadge({ status }: { status: Status }) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        APPROVED
      </span>
    );
  }

  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        PENDING
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
      <XCircle className="w-3.5 h-3.5 text-rose-600" />
      REJECTED
    </span>
  );
}

export function DocumentStatusBadge({ status }: { status: DocumentProcessingStatus }) {
  switch (status) {
    case 'EXTRACTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <FileCheck className="w-3 h-3 text-emerald-600" /> Extracted
        </span>
      );
    case 'MISSING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <FileX className="w-3 h-3 text-amber-600" /> Missing
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <FileWarning className="w-3 h-3 text-rose-600" /> Failed
        </span>
      );
    case 'EXTRACTION_REQUIRED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> Follow-up Required
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
          {status}
        </span>
      );
  }
}

export function AiStatusBadge({ status }: { status: AiCallStatus }) {
  switch (status) {
    case 'SUCCEEDED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Cpu className="w-3 h-3 text-emerald-600" /> AI Succeeded
        </span>
      );
    case 'UNAVAILABLE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
          <Cpu className="w-3 h-3 text-stone-500" /> AI Unavailable
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <Cpu className="w-3 h-3 text-rose-600" /> AI Failed
        </span>
      );
    case 'INVALID_OUTPUT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Cpu className="w-3 h-3 text-amber-600" /> AI Invalid Output
        </span>
      );
  }
}
