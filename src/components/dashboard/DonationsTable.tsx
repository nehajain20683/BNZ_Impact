'use client';
// src/components/dashboard/DonationsTable.tsx
// Collapses to the 3 most recent donations by default with a "Show all"
// expand — donors with a long donation history no longer scroll through
// a long table just to see their most recent activity first.
import { useState } from 'react';
import Link from 'next/link';
import { Download, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING:   'bg-amber-100 text-amber-700',
  FAILED:    'bg-red-100 text-red-700',
};

export default function DonationsTable({ donations }: { donations: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? donations : donations.slice(0, 3);

  return (
    <div className="bg-white border border-sage-100 rounded-2xl overflow-hidden mb-8">
      <div className="p-6 border-b border-sage-100 flex items-center justify-between">
        <h2 className="font-display text-xl text-sage-900">My Donations</h2>
        {donations.length > 3 && (
          <span className="text-sage-400 text-xs">{expanded ? donations.length : 3} of {donations.length} shown</span>
        )}
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm table-responsive min-w-[650px]">
          <thead className="bg-sage-50 text-sage-600">
            <tr>
              {['Receipt', 'Date', 'Campaign', 'Trees', 'Amount', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.id} className="border-t border-forest-50 hover:bg-sage-50/50">
                <td className="px-4 py-3 font-mono text-sage-600 text-xs">{d.receiptNumber ? `#${d.receiptNumber}` : '—'}</td>
                <td className="px-4 py-3 text-sage-700">{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3 text-sage-800 font-medium">{d.campaign.name}</td>
                <td className="px-4 py-3"><span className="bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-semibold">{d.numberOfTrees}</span></td>
                <td className="px-4 py-3 font-semibold text-sage-900">{formatCurrency(d.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[d.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {d.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {d.paymentStatus === 'COMPLETED' ? (
                    <div className="flex gap-2">
                      <a href={`/api/receipts/${d.id}/pdf`} target="_blank" className="text-xs text-sage-600 hover:text-sage-800 flex items-center gap-1">
                        <Download className="w-3 h-3" /> Receipt
                      </a>
                      <a href={`/api/certificates/${d.id}/pdf`} target="_blank" className="text-xs text-sage-600 hover:text-sage-800 flex items-center gap-1">
                        <Download className="w-3 h-3" /> Cert
                      </a>
                    </div>
                  ) : d.paymentStatus === 'PENDING' ? (
                    <Link href={`/donate`} className="text-xs text-amber-600 hover:text-amber-800">Retry payment</Link>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {donations.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-sage-400">No donations yet. <Link href="/donate" className="text-sage-600 underline">Donate now</Link></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {donations.length > 3 && (
        <button onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 text-sage-600 hover:text-sage-800 text-sm font-semibold py-3 border-t border-sage-100">
          {expanded ? 'Show fewer' : `Show all ${donations.length} donations`}
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}/>
        </button>
      )}
    </div>
  );
}
