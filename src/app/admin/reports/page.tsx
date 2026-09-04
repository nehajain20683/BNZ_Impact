'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Download, FileText } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role   = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!['ADMIN','SUPER_ADMIN'].includes(role)) router.push('/');
  }, [status, role]);

  // Each report pairs an explanatory HTML version (narrative, context,
  // ready to hand to someone outside the org) with the raw CSV export that
  // already existed — the CSV never goes away, it's just no longer the
  // only option.
  const reports = [
    { label:'Fundraising & Donor Report', desc:'Totals, campaign breakdown, monthly trend — explained, not just listed', explanatoryType:'fundraising', csvType:'donations',  icon:'💰' },
    { label:'Land Owner Onboarding Report', desc:'Registration and verification status, by district',                    explanatoryType:'land-owners', csvType:'farmers',    icon:'🌾' },
    { label:'Plantation Progress Report', desc:'Site-by-site status against planned targets',                            explanatoryType:'plantation',  csvType:'plantation', icon:'🌳' },
    { label:'Environmental Impact Report', desc:'Estimated CO₂ sequestration, with methodology stated up front',         explanatoryType:'carbon',      csvType:'carbon',     icon:'🌿' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Reports" subtitle="Formatted reports for external audiences, plus raw data exports"/>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5 text-sm text-blue-800">
          Looking for a <strong>CSR Impact Report</strong> for a specific corporate donor? That one's generated
          per-donor with their real evidence photos and site breakdown — open <strong>Users → that donor</strong> and
          use "Generate CSR Report" there, rather than as a bulk export.
        </div>

        <div className="space-y-3 mb-8">
          {reports.map(r => (
            <div key={r.label} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
              <span className="text-3xl">{r.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{r.label}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{r.desc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`/api/admin/explanatory-report?type=${r.explanatoryType}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs bg-[var(--admin-primary)] text-white px-3 py-2 rounded-xl hover:opacity-90 font-medium">
                  <FileText className="w-3.5 h-3.5"/> View Report
                </a>
                <a href={`/api/admin/export-csv?type=${r.csvType}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 font-medium">
                  <Download className="w-3.5 h-3.5"/> Raw CSV
                </a>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-sm font-bold text-gray-900 mb-3">Compliance &amp; Audit</h2>
        <div className="bg-white border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-3xl">📋</span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">BRSR Environmental Data Extract</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              Principle 6 data points for a company's BRSR filing — current financial year, mapped to the exact disclosure references.
              Not a full BRSR filing — see the note inside the report.
            </p>
          </div>
          <a href="/api/admin/explanatory-report?type=brsr" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-amber-600 text-white px-3 py-2 rounded-xl hover:opacity-90 font-medium flex-shrink-0">
            <FileText className="w-3.5 h-3.5"/> View Extract
          </a>
        </div>
      </div>
    </div>
  );
}
