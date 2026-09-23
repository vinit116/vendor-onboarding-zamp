'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { fetchSystemStatus } from '@/lib/api';
import { SystemStatus } from '@/lib/types';

export function Sidebar() {
  const pathname = usePathname();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'checking',
    ai_provider: 'gemini',
    ai_model: 'gemma-4-31b-it',
  });

  useEffect(() => {
    fetchSystemStatus().then(setSystemStatus);
    const interval = setInterval(() => {
      fetchSystemStatus().then(setSystemStatus);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'New Submission', href: '/submissions/new', icon: PlusCircle },
    { name: 'Run History', href: '/history', icon: History },
  ];

  return (
    <aside className="w-64 bg-[#fbfbfa] border-r border-[#e7e5e4] flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div>
        {/* Header Branding */}
        <div className="p-5 border-b border-[#e7e5e4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#1c1917] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-[#d97706]" />
            </div>
            <div>
              <h1 className="font-semibold text-sm text-[#1c1917] tracking-tight leading-none">
                Vendor Operations
              </h1>
              <p className="text-[11px] text-[#78716c] font-normal mt-0.5">
                Onboarding Console
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1c1917] text-white shadow-sm'
                    : 'text-[#44403c] hover:bg-[#f5f4ef] hover:text-[#1c1917]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#d97706]' : 'text-[#78716c]'
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#e7e5e4] bg-[#faf9f5]">
        <div className="space-y-2">
          {/* Operations Engine Status */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#78716c] font-medium">Compliance Engine</span>
            <div className="flex items-center gap-1.5 font-medium">
              {systemStatus.status === 'healthy' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700 font-semibold">Operational</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-700 font-semibold">Offline</span>
                </>
              )}
            </div>
          </div>

          {/* AI Assistance Status */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#78716c] font-medium flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#d97706]" /> AI Review
            </span>
            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">
              Available
            </span>
          </div>

          {/* Business Policy Note */}
          <div className="text-[10px] text-[#a8a29e] pt-1 border-t border-[#e7e5e4]/60 leading-tight">
            Rules govern approval; AI assists review.
          </div>
        </div>
      </div>
    </aside>
  );
}
