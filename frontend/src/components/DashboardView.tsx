'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  FileCheck,
  Clock,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Search,
  RotateCcw,
} from 'lucide-react';
import { getStoredRuns, clearStoredRuns } from '@/lib/storage';
import { WorkflowResult } from '@/lib/types';
import { StatusBadge } from './Badges';

export function DashboardView() {
  const router = useRouter();
  const [runs, setRuns] = useState<WorkflowResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setRuns(getStoredRuns());
  }, []);

  const totalRuns = runs.length;
  const approvedCount = runs.filter((r) => r.status === 'APPROVED').length;
  const pendingCount = runs.filter((r) => r.status === 'PENDING').length;
  const rejectedCount = runs.filter((r) => r.status === 'REJECTED').length;

  const filteredRuns = runs.filter((run) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (run.vendor_name && run.vendor_name.toLowerCase().includes(q)) ||
      run.run_id.toLowerCase().includes(q) ||
      run.status.toLowerCase().includes(q) ||
      run.reason_code.toLowerCase().includes(q)
    );
  });

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear local run history?')) {
      clearStoredRuns();
      setRuns([]);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e7e5e4]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1c1917] tracking-tight">
              Vendor Operations
            </h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-[#d97706]/10 text-[#b45309] px-2 py-0.5 rounded border border-[#d97706]/20">
              India MVP
            </span>
          </div>
          <p className="text-sm text-[#78716c] mt-1">
            Automated vendor onboarding review, format validation & identity verification console.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/submissions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#1c1917] text-white hover:bg-[#292524] transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#d97706]" />
            <span>New Submission</span>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#e7e5e4] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#78716c]">Total Runs</p>
            <p className="text-2xl font-bold text-[#1c1917] mt-1">{totalRuns}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#f5f4ef] flex items-center justify-center text-[#78716c]">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#e7e5e4] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#78716c]">Approved</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#e7e5e4] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#78716c]">Pending Review</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#e7e5e4] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#78716c]">Rejected</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Runs Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#1c1917] tracking-tight">
              Recent Onboarding Runs
            </h2>
            <p className="text-xs text-[#78716c]">
              Recent workflow executions stored in local operator history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#a8a29e] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vendor or run ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] w-64 text-[#1c1917]"
              />
            </div>

            {runs.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#78716c] hover:text-[#1c1917] hover:bg-[#e7e5e4]/50 transition-colors"
                title="Clear local history"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden">
          {filteredRuns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e7e5e4] bg-[#faf9f5] text-[11px] font-semibold text-[#78716c] uppercase tracking-wider">
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Run ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Decision Summary</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e5e4] text-xs">
                  {filteredRuns.map((run) => (
                    <tr
                      key={run.run_id}
                      onClick={() => router.push(`/runs/${run.run_id}`)}
                      className="hover:bg-[#fcfcf9] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#1c1917]">
                        {run.vendor_name || 'Unknown Vendor'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#78716c] font-medium text-[11px]">
                        {run.run_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="py-3.5 px-4 text-[#44403c] max-w-xs truncate">
                        {run.reason}
                      </td>
                      <td className="py-3.5 px-4 text-[#78716c] text-[11px]">
                        {run.timestamp
                          ? new Date(run.timestamp).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recent'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#d97706] group-hover:translate-x-0.5 transition-transform">
                          View <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#f5f4ef] flex items-center justify-center text-[#a8a29e] mx-auto">
                <Sparkles className="w-6 h-6 text-[#d97706]" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-sm font-semibold text-[#1c1917]">
                  No vendor runs recorded yet
                </h3>
                <p className="text-xs text-[#78716c] mt-1">
                  Start a new vendor onboarding verification or run a demo scenario to see live workflow results here.
                </p>
              </div>
              <div>
                <Link
                  href="/submissions/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#1c1917] text-white hover:bg-[#292524] transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-[#d97706]" />
                  <span>Start New Submission</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
