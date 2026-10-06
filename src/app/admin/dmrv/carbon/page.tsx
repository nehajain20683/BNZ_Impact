'use client';
// src/app/admin/dmrv/carbon/page.tsx
// Replaces the honest "coming soon" placeholder with the real thing —
// an org-wide rollup of every CarbonCredit record, linking into each
// site's own detailed, actionable ledger (CarbonCreditsPanel).
import { useEffect, useState } from 'react';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { Leaf, Coins } from 'lucide-react';

export default function CarbonEstimationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/carbon-credits').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-lime-400"/>
          <h1 className="text-lg font-bold">Carbon Estimation</h1>
          <span className="text-xs text-gray-500 ml-1">Org-wide credit lifecycle rollup — manage individual records from each site's own page</span>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : !data?.summary ? (
            <p className="text-gray-500 text-sm">Could not load carbon credit data.</p>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-4 mb-6">
                {[
                  { label: 'Total Records', value: data.summary.totalRecords, unit: '' },
                  { label: 'Issued', value: data.summary.totalIssued.toFixed(1), unit: 'tCO2e' },
                  { label: 'Sold', value: data.summary.totalSold.toFixed(1), unit: 'tCO2e' },
                  { label: 'Retired', value: data.summary.totalRetired.toFixed(1), unit: 'tCO2e' },
                  { label: 'Revenue Shared', value: `₹${data.summary.totalRevenueShared.toLocaleString('en-IN')}`, unit: '' },
                ].map((s: any) => (
                  <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                    <div className="font-display text-xl text-white">{s.value}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5">{s.label} {s.unit}</div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-4 h-4 text-gray-400"/>
                  <h3 className="font-semibold text-white text-sm">By Site</h3>
                </div>
                {data.bySite.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No carbon credit records yet — create one from a plantation site's own page.</p>
                ) : (
                  <div className="space-y-2">
                    {data.bySite.map((s: any) => (
                      <a key={s.siteId || 'unassigned'} href={s.siteId ? `/admin/plantation-sites/${s.siteId}` : '#'}
                        className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 hover:border-gray-600">
                        <span className="text-sm text-gray-200">{s.siteName}</span>
                        <span className="text-xs text-gray-400">{s.count} record(s) · {s.totalIssued.toFixed(1)} issued · {s.totalSold.toFixed(1)} sold</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DMRVLayout>
  );
}
