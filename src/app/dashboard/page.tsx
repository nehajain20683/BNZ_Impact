// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Download, TreePine } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { computeDonorImpactMetrics } from '@/lib/impact-metrics';
import ImpactStatCard from '@/components/dashboard/ImpactStatCard';
import MyTreesSection from '@/components/dashboard/MyTreesSection';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  FAILED:    'bg-red-100 text-red-700',
  REFUNDED:  'bg-gray-100 text-gray-600',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/login?callbackUrl=/dashboard');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      // Show every donation, not just COMPLETED ones — a donor whose
      // payment is pending or failed should still be able to see that,
      // rather than it silently disappearing.
      donations: {
        include: { campaign: true, _count: { select: { trees: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!user) redirect('/auth/login');

  const completedDonations = user.donations.filter(d => d.paymentStatus === 'COMPLETED');
  const totalTrees  = completedDonations.reduce((s, d) => s + d.numberOfTrees, 0);
  const totalAmount = completedDonations.reduce((s, d) => s + d.amount, 0);
  const co2 = totalTrees * 22;

  // Group trees by plantation site (for proportional impact-metric attribution
  // and for the site filter dropdown) — aggregate query, never loads full tree rows.
  const treeSiteGroups = await prisma.tree.groupBy({
    by: ['siteId'],
    where: { donation: { userId: user.id, paymentStatus: 'COMPLETED' } },
    _count: { _all: true },
  });
  const treeCountsBySite: Record<string, number> = {};
  for (const g of treeSiteGroups) {
    if (g.siteId) treeCountsBySite[g.siteId] = g._count._all;
  }
  const siteIds = Object.keys(treeCountsBySite);
  const sites = siteIds.length
    ? await prisma.plantationSite.findMany({ where: { id: { in: siteIds } }, select: { id: true, siteName: true } })
    : [];

  const impactMetrics = await computeDonorImpactMetrics((user as any).orgId, treeCountsBySite);

  // Phase 8 — verified field evidence. Only PUBLISHED monitoring visits are
  // donor-visible; community updates and unverified visits are never shown
  // here, per the explicit "raw operational records must not reach donors" rule.
  // Wrapped defensively — a newer field (donorVisible) must never break the
  // whole dashboard if that migration hasn't landed yet.
  const verifiedVisits = siteIds.length
    ? await (prisma as any).monitoringVisit.findMany({
        where: { siteId: { in: siteIds }, donorVisible: true },
        include: { site: { select: { siteName: true } } },
        orderBy: { visitDate: 'desc' },
        take: 12,
      }).catch((e: any) => { console.error('verifiedVisits query failed:', e.message); return []; })
    : [];
  const latestVerified = verifiedVisits[0];
  const verifiedSurvivalRate = verifiedVisits.length
    ? Math.round((verifiedVisits.reduce((s: number, v: any) => s + (v.survivalPct || 0), 0) / verifiedVisits.length) * 10) / 10
    : null;
  const verifiedPhotos = verifiedVisits.flatMap((v: any) => (v.photos || []).map((p: string) => ({ url: p, site: v.site.siteName, date: v.visitDate })));

  const donationGroups = completedDonations.map(d => ({
    id: d.id,
    receiptNumber: d.receiptNumber,
    campaignName: d.campaign.name,
    createdAt: d.createdAt,
    treeCount: (d as any)._count.trees,
  }));

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-10">
            <h1 className="font-display text-4xl text-sage-950 mb-1">My Dashboard</h1>
            <p className="text-sage-600">Welcome back, {user.name || 'Donor'}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Donated', value: formatCurrency(totalAmount), icon: '💰' },
              { label: 'Trees Sponsored', value: `${totalTrees}`, icon: '🌳' },
              { label: 'Donations Made', value: `${user.donations.length}`, icon: '📋' },
              { label: 'Plantation Sites', value: `${siteIds.length}`, icon: '📍' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-sage-100 rounded-2xl p-5">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="font-display text-2xl font-bold text-sage-900">{stat.value}</div>
                <div className="text-sage-500 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Impact stat cards — CO2 plus any admin-defined metrics with recorded data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <ImpactStatCard icon="🌍" value={co2.toLocaleString('en-IN')} unit="kg" label="CO₂ Offset/yr" color="#1a3a1a"/>
            {impactMetrics.map(m => (
              <ImpactStatCard key={m.id} icon={m.icon}
                value={m.value.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                unit={m.unit} label={m.name} color={m.color}/>
            ))}
          </div>

          {/* Verified Field Evidence — only officially published monitoring, never raw/community data */}
          {verifiedVisits.length > 0 && (
            <div className="bg-white border border-sage-100 rounded-2xl overflow-hidden mb-8 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-sage-900">Verified Field Evidence</h2>
                <span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 px-2 py-1 rounded-full">Officer Verified</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-sage-50 rounded-xl p-4 text-center">
                  <div className="font-display text-2xl font-bold text-sage-900">
                    {verifiedSurvivalRate !== null ? `${verifiedSurvivalRate}%` : '—'}
                  </div>
                  <div className="text-sage-500 text-xs mt-1">Verified Survival Rate</div>
                </div>
                <div className="bg-sage-50 rounded-xl p-4 text-center">
                  <div className="font-display text-2xl font-bold text-sage-900">
                    {latestVerified ? new Date(latestVerified.visitDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : '—'}
                  </div>
                  <div className="text-sage-500 text-xs mt-1">Last Verified Visit</div>
                </div>
                <div className="bg-sage-50 rounded-xl p-4 text-center">
                  <div className="font-display text-2xl font-bold text-sage-900">{verifiedVisits.length}</div>
                  <div className="text-sage-500 text-xs mt-1">Published Visits</div>
                </div>
                <div className="bg-sage-50 rounded-xl p-4 text-center">
                  <div className="font-display text-2xl font-bold text-sage-900">{verifiedPhotos.length}</div>
                  <div className="text-sage-500 text-xs mt-1">Verified Photos</div>
                </div>
              </div>
              {verifiedPhotos.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {verifiedPhotos.slice(0, 12).map((p: any, i: number) => (
                    <div key={i} className="flex-shrink-0">
                      <img src={p.url} alt="" className="w-28 h-28 rounded-xl object-cover"/>
                      <p className="text-sage-400 text-[10px] mt-1 max-w-28 truncate">{p.site}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white border border-sage-100 rounded-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-sage-100">
              <h2 className="font-display text-xl text-sage-900">My Donations</h2>
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
                  {user.donations.map((d) => (
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
                  {user.donations.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-sage-400">No donations yet. <Link href="/donate" className="text-sage-600 underline">Donate now</Link></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <MyTreesSection donations={donationGroups} sites={sites} />
        </div>
      </div>
    </div>
  );
}
