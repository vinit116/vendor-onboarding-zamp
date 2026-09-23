'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  Search,
  ArrowRight,
  RotateCcw,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import { getStoredRuns, clearStoredRuns } from '@/lib/storage';
import { WorkflowResult, Status } from '@/lib/types';
import { StatusBadge } from './Badges';

export function RunHistoryView() {
  const router = useRouter();
  const [runs, setRuns] = useState<WorkflowResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL');

  useEffect(() => {
    setRuns(getStoredRuns());
  }, []);

  const handleClear = () => {
    if (confirm('Clear stored vendor onboarding run history?')) {
      clearStoredRuns();
      setRuns([]);
    }
  };

  const filteredRuns = runs.filter((run) => {
    const matchesStatus =
      statusFilter === 'ALL' || run.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (run.vendor_name && run.vendor_name.toLowerCase().includes(q)) ||
      run.run_id.toLowerCase().includes(q) ||
      run.reason.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e7e5e4]">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1917] tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-[#d97706]" />
            Vendor Onboarding Run History
          </h1>
          <p className="text-sm text-[#78716c] mt-1">
            Operational record of vendor compliance reviews and onboarding decisions.
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#e7e5e4] shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#f5f4ef] p-1 rounded-lg text-xs font-semibold">
          {(['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  statusFilter === status
                    ? 'bg-white text-[#1c1917] shadow-sm font-bold'
                    : 'text-[#78716c] hover:text-[#1c1917]'
                }`}
              >
                {status === 'ALL' ? 'All Reviews' : status}
              </button>
            )
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#a8a29e] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search vendor name or reference ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#e7e5e4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d97706] w-64 text-[#1c1917]"
            />
          </div>

          {runs.length > 0 && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#78716c] hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Clear stored run history"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e7e5e4] shadow-sm overflow-hidden">
        {filteredRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e7e5e4] bg-[#faf9f5] text-[11px] font-semibold text-[#78716c] uppercase tracking-wider">
                  <th className="py-3 px-4">Vendor Entity</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Decision Outcome</th>
                  <th className="py-3 px-4">Reason Summary</th>
                  <th className="py-3 px-4">Executed Date</th>
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
                      {run.vendor_name || 'Vendor Submission'}
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
                        ? new Date(run.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recent'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#d97706] group-hover:translate-x-0.5 transition-transform">
                        Review Details <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#faf9f5] border border-[#e7e5e4] flex items-center justify-center text-[#d97706] mx-auto shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-[#1c1917]">
                No history records found
              </h3>
              <p className="text-xs text-[#78716c] mt-1">
                No stored runs match the selected filter. Try adjusting your search query or submit a new vendor onboarding verification.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
