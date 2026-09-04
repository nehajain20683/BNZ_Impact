'use client';
// src/app/admin/users/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Shield, Calendar,
  DollarSign, TreePine, Sprout, CheckCircle, Clock, XCircle, Lock, Unlock,
  Search, Link2, FileText,
} from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-[var(--admin-primary)]/10 text-[var(--admin-primary)]',
  DONOR: 'bg-green-100 text-green-700',
};

const TREE_STATUS_COLOR: Record<string, string> = {
  PLANTED: 'bg-green-100 text-green-700', GROWING: 'bg-blue-100 text-blue-700',
  MATURE: 'bg-emerald-100 text-emerald-800', PENDING: 'bg-amber-100 text-amber-700',
};

const DONATION_STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700', PENDING: 'bg-amber-100 text-amber-700', FAILED: 'bg-red-100 text-red-700',
};

export default function AdminUserDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'donations'|'trees'|'sites'>('donations');

  // Trees tab — separate paginated/filtered state, fetched from the new
  // dedicated endpoint (mirrors the donor dashboard's own trees API).
  const [treeList, setTreeList] = useState<any[]>([]);
  const [treePage, setTreePage] = useState(1);
  const [treeTotalPages, setTreeTotalPages] = useState(1);
  const [treeTotal, setTreeTotal] = useState(0);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [treeFilters, setTreeFilters] = useState({ status: '', siteId: '', search: '', sort: 'newest', linked: '' });

  async function loadTrees(page: number, reset = false, overrideFilters?: typeof treeFilters) {
    const f = overrideFilters || treeFilters;
    setTreeLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: '24', sort: f.sort });
    if (f.status) qs.set('status', f.status);
    if (f.siteId) qs.set('siteId', f.siteId);
    if (f.search) qs.set('search', f.search);
    if (f.linked) qs.set('linked', f.linked);
    const res = await fetch(`/api/admin/users/${id}/trees?${qs}`);
    const d = await res.json();
    setTreeList(reset || page === 1 ? (d.trees || []) : [...treeList, ...(d.trees || [])]);
    setTreeTotalPages(d.totalPages || 1);
    setTreeTotal(d.total || 0);
    setTreePage(page);
    setTreeLoading(false);
    setTreeLoaded(true);
  }

  function openTreesTab() {
    setTab('trees');
    if (!treeLoaded) loadTrees(1, true);
  }

  function applyTreeFilters() {
    loadTrees(1, true);
  }

  function jumpToLinkedTrees(linked: 'true' | 'false') {
    const next = { ...treeFilters, linked, status: '' };
    setTreeFilters(next);
    setTab('trees');
    setTreeLoaded(true);
    loadTrees(1, true, next);
  }

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  if (!data || data.error) return <div className="min-h-screen flex items-center justify-center text-gray-500">{data?.error || 'User not found'}</div>;

  const { user, summary, donations, trees, sites, verifiedVisits } = data;

  return (
    <div>
      <PageHeader title={user.name || 'Unnamed User'} subtitle={user.email}>
        <div className="flex items-center gap-3">
          {summary.totalTrees > 0 && (
            <a href={`/api/admin/users/${id}/csr-report`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold bg-[var(--admin-primary)] text-white px-4 py-2 rounded-xl hover:opacity-90">
              <FileText className="w-4 h-4"/> Generate CSR Report
            </a>
          )}
          <button onClick={() => router.push('/admin/users')}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4"/> Back to Users
          </button>
        </div>
      </PageHeader>

      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Identity card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ backgroundColor: 'var(--admin-primary)' }}>
              {user.image ? <img src={user.image} alt="" className="w-full h-full rounded-2xl object-cover"/> : (user.name?.charAt(0) || '?')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-gray-900 text-lg">{user.name || 'Unnamed User'}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLOR[user.role] || ROLE_COLOR.DONOR}`}>{user.role}</span>
                {user.isLocked && <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3"/> Locked</span>}
                {!user.isActive && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600"><Mail className="w-3.5 h-3.5 text-gray-400"/> {user.email} {user.emailVerified ? <CheckCircle className="w-3 h-3 text-green-500"/> : <span className="text-[10px] text-amber-500">(unverified)</span>}</div>
                <div className="flex items-center gap-2 text-gray-600"><Phone className="w-3.5 h-3.5 text-gray-400"/> {user.mobile || '—'}</div>
                <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-3.5 h-3.5 text-gray-400"/> {user.address || '—'}</div>
                <div className="flex items-center gap-2 text-gray-600"><Shield className="w-3.5 h-3.5 text-gray-400"/> PAN: {user.pan || '—'}</div>
                <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-3.5 h-3.5 text-gray-400"/> Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                <div className="flex items-center gap-2 text-gray-600"><Clock className="w-3.5 h-3.5 text-gray-400"/> Last login {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Donated', value: `₹${summary.totalDonated.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
            { label: 'Trees Sponsored', value: summary.totalTrees, icon: TreePine, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Plantation Sites', value: summary.sitesCount, icon: MapPin, color: 'text-blue-600 bg-blue-50' },
            { label: 'CO₂ Offset', value: `${summary.co2OffsetKg.toLocaleString('en-IN')} kg`, icon: Sprout, color: 'text-teal-600 bg-teal-50' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}><s.icon className="w-4 h-4"/></div>
              <div className="font-bold text-gray-900 text-lg">{s.value}</div>
              <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Linked vs Not Yet Linked — jumps straight into the Trees tab, pre-filtered */}
        {summary.totalTrees > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => jumpToLinkedTrees('true')}
              className="flex items-center gap-3 bg-green-50 hover:bg-green-100 border border-green-100 rounded-2xl p-4 text-left transition-colors">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-4 h-4 text-green-700"/>
              </div>
              <div>
                <div className="font-bold text-green-900 text-lg leading-none">{summary.linkedTreeCount}</div>
                <div className="text-green-600 text-xs mt-0.5">Linked to a Farmer's Land</div>
              </div>
            </button>
            <button onClick={() => jumpToLinkedTrees('false')}
              className="flex items-center gap-3 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-2xl p-4 text-left transition-colors">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-700"/>
              </div>
              <div>
                <div className="font-bold text-amber-900 text-lg leading-none">{summary.unlinkedTreeCount}</div>
                <div className="text-amber-600 text-xs mt-0.5">Not Yet Linked</div>
              </div>
            </button>
          </div>
        )}

        {/* Donation status + campaigns */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Donation Activity</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-green-50 rounded-xl p-2.5"><div className="font-bold text-green-700 text-lg">{summary.completedDonations}</div><div className="text-green-500">Completed</div></div>
              <div className="bg-amber-50 rounded-xl p-2.5"><div className="font-bold text-amber-700 text-lg">{summary.pendingDonations}</div><div className="text-amber-500">Pending</div></div>
              <div className="bg-red-50 rounded-xl p-2.5"><div className="font-bold text-red-700 text-lg">{summary.failedDonations}</div><div className="text-red-500">Failed</div></div>
            </div>
            <div className="text-gray-400 text-xs mt-3">
              First donation: {summary.firstDonationAt ? new Date(summary.firstDonationAt).toLocaleDateString('en-IN') : '—'} · Last: {summary.lastDonationAt ? new Date(summary.lastDonationAt).toLocaleDateString('en-IN') : '—'}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Campaigns Supported</h3>
            {summary.campaignsSupported.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {summary.campaignsSupported.map((c: string) => (
                  <span key={c} className="bg-gray-50 text-gray-700 text-xs px-2.5 py-1 rounded-full border border-gray-100">{c}</span>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm">No completed donations yet.</p>}
            {verifiedVisits?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500 mb-1.5">Verified Field Evidence</div>
                {verifiedVisits.slice(0, 3).map((v: any) => (
                  <div key={v.id} className="text-xs text-gray-500">{v.site.siteName} — {v.survivalPct != null ? `${v.survivalPct}% survival` : ''} ({new Date(v.visitDate).toLocaleDateString('en-IN')})</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs: Donations / Trees / Sites */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { id: 'donations', label: `Donations (${donations.length})` },
              { id: 'trees', label: `Trees (${summary.totalTrees})` },
              { id: 'sites', label: `Plantation Sites (${sites.length})` },
            ].map(t => (
              <button key={t.id} onClick={() => t.id === 'trees' ? openTreesTab() : setTab(t.id as any)}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t.id ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'donations' && (
              donations.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No donations yet.</p> : (
                <table className="w-full text-sm">
                  <thead className="text-gray-400 text-xs uppercase">
                    <tr>{['Receipt','Campaign','Trees','Amount','Status','Date'].map(h => <th key={h} className="text-left font-semibold pb-2">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {donations.map((d: any) => (
                      <tr key={d.id} className="border-t border-gray-50">
                        <td className="py-2.5 font-mono text-xs text-gray-500">{d.receiptNumber || '—'}</td>
                        <td className="py-2.5 text-gray-700">{d.campaignName || '—'}</td>
                        <td className="py-2.5 text-gray-700">{d.numberOfTrees}</td>
                        <td className="py-2.5 font-semibold text-gray-900">₹{d.amount.toLocaleString('en-IN')}</td>
                        <td className="py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DONATION_STATUS_COLOR[d.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>{d.paymentStatus}</span></td>
                        <td className="py-2.5 text-gray-400 text-xs">{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {tab === 'trees' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                    <input value={treeFilters.search} onChange={e => setTreeFilters(p => ({ ...p, search: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && applyTreeFilters()}
                      placeholder="Search tag ID…" className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/30"/>
                  </div>
                  <select value={treeFilters.linked} onChange={e => setTreeFilters(p => ({ ...p, linked: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl">
                    <option value="">Linked or Not</option>
                    <option value="true">Linked only</option>
                    <option value="false">Not yet linked</option>
                  </select>
                  <select value={treeFilters.status} onChange={e => setTreeFilters(p => ({ ...p, status: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl">
                    <option value="">All Statuses</option>
                    {['PENDING','PLANTED','GROWING','MATURE'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={treeFilters.siteId} onChange={e => setTreeFilters(p => ({ ...p, siteId: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl">
                    <option value="">All Sites</option>
                    {sites.map((s: any) => <option key={s.id} value={s.id}>{s.siteName}</option>)}
                  </select>
                  <select value={treeFilters.sort} onChange={e => setTreeFilters(p => ({ ...p, sort: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl">
                    <option value="newest">Newest planted</option>
                    <option value="oldest">Oldest planted</option>
                  </select>
                  <button onClick={applyTreeFilters} className="px-4 py-2 text-sm font-semibold bg-[var(--admin-primary)] text-white rounded-xl">
                    Apply
                  </button>
                </div>

                {treeLoading && treeList.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Loading…</p>
                ) : treeList.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No trees match these filters.</p>
                ) : (
                  <>
                    <p className="text-gray-400 text-xs mb-3">{treeTotal} tree{treeTotal === 1 ? '' : 's'} found</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {treeList.map((t: any) => (
                        <div key={t.id} className="bg-gray-50 rounded-xl p-3 flex gap-3">
                          <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {t.latestPhoto ? (
                              <img src={t.latestPhoto} alt="" className="w-full h-full object-cover"/>
                            ) : (
                              <TreePine className="w-6 h-6 text-gray-400"/>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-xs text-gray-500 truncate">{t.treeTagId || 'Tag pending'}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${TREE_STATUS_COLOR[t.status] || 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                            </div>
                            <div className="text-sm font-semibold text-gray-800 truncate">{t.species || 'Species TBA'}</div>
                            {t.plantationSite && <div className="text-xs text-gray-400 truncate">{t.plantationSite.siteName}</div>}
                            {t.photoCapturedAt && (
                              <div className="text-[10px] text-gray-400">Last updated {new Date(t.photoCapturedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                            )}
                            {t.farmerName ? (
                              <div className="flex items-center gap-1 text-[10px] text-green-700 font-semibold mt-0.5">
                                <Link2 className="w-2.5 h-2.5"/> {t.farmerName}
                              </div>
                            ) : (
                              <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Not yet linked</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {treePage < treeTotalPages && (
                      <button onClick={() => loadTrees(treePage + 1)} disabled={treeLoading}
                        className="w-full mt-4 text-gray-600 hover:text-gray-800 text-sm font-semibold py-2.5 border border-gray-200 rounded-xl disabled:opacity-50">
                        {treeLoading ? 'Loading…' : 'Load more trees'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === 'sites' && (
              sites.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No plantation sites associated yet.</p> : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {sites.map((s: any) => (
                    <Link key={s.id} href={`/admin/plantation-sites/${s.id}`}
                      className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors">
                      <div className="font-semibold text-gray-900 text-sm">{s.siteName}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{s.district}{s.district && s.state ? ', ' : ''}{s.state}</div>
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
