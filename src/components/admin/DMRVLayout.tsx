'use client';
// src/components/admin/DMRVLayout.tsx — Shared sidebar layout for all dMRV pages
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity, BarChart2, Shield, FileText, Leaf, Archive,
  GitBranch, Bell, CheckCircle2, LayoutDashboard, ChevronRight,
  Zap
} from 'lucide-react';

const NAV = [
  { href:'/admin/dmrv/dashboard', label:'Overview',         icon: LayoutDashboard },
  { href:'/admin/dmrv/measure',   label:'Measure',          icon: Activity },
  { href:'/admin/dmrv/monitor',   label:'Monitor',          icon: BarChart2 },
  { href:'/admin/dmrv/report',    label:'Report',           icon: FileText },
  { href:'/admin/dmrv/verify',    label:'Verify',           icon: Shield },
  { href:'/admin/dmrv/carbon',    label:'Carbon Estimation',icon: Leaf },
  { href:'/admin/dmrv/evidence',  label:'Evidence Vault',   icon: Archive },
  { href:'/admin/dmrv/audit',     label:'Audit Trail',      icon: GitBranch },
  { href:'/admin/dmrv/alerts',    label:'AI Alerts',        icon: Bell },
  { href:'/admin/dmrv/readiness', label:'dMRV Readiness',   icon: CheckCircle2 },
];

export default function DMRVLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Module header */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-emerald-400"/>
            </div>
            <span className="text-white font-bold text-sm">Digital MRV</span>
          </div>
          <p className="text-gray-500 text-[10px] ml-9">Trust Engine</p>
        </div>
        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(n => {
            const active = path === n.href || (n.href !== '/admin/dmrv/dashboard' && path.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}>
                <n.icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`}/>
                {n.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-emerald-500"/>}
              </Link>
            );
          })}
        </nav>
        {/* Back link */}
        <div className="p-3 border-t border-gray-800">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1.5">
            ← Back to Admin
          </Link>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
