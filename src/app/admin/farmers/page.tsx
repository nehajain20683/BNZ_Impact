'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, TreePine, MapPin, FileText } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';

const STATUS_COLORS: Record<string,string> = {
  REGISTERED:          'bg-blue-100 text-blue-700',
  DOCUMENTS_PENDING:   'bg-amber-100 text-amber-700',
  VERIFIED_LAND_OWNER: 'bg-green-100 text-green-700',
  SUSPENDED:           'bg-red-100 text-red-700',
};

// Matches the real (simplified) FarmerStatus enum — inspection/approval/
// activation stages now belong to LandStatus, not the farmer entity itself.
const STATUSES = ['REGISTERED','DOCUMENTS_PENDING','VERIFIED_LAND_OWNER','SUSPENDED'];

export default function AdminFarmersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [farmers, setFarmers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'loading') return;
    if (!['ADMIN','SUPER_ADMIN'].includes(role)) { router.push('/'); return; }
    load();
  }, [status, role]);

  async function load(s = search, fs = filterStatus) {
    setLoading(true);
    const params = new URLSearchParams();
    if (s)  params.set('search', s);
    if (fs) params.set('status', fs);
    const res  = await fetch(`/api/admin/farmers?${params}`);
    const data = await res.json();
    setFarmers(data.farmers || []);
    setLoading(false);
  }

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((window as any)._farmerSearch);
    (window as any)._farmerSearch = setTimeout(() => load(val, filterStatus), 400);
  }

  function handleFilter(val: string) {
    setFilterStatus(val);
    load(search, val);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Land Owner Registry" subtitle={`${farmers.length} registered land owners`}>
        <Link href="/farmer/register"
          className="flex items-center gap-2 bg-[var(--admin-primary)] hover:opacity-90 text-white font-bold px-4 py-2 rounded-xl text-sm">
          + Register Land Owner
        </Link>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, mobile, farmer ID…"
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40 bg-white"/>
          </div>
          <select value={filterStatus} onChange={e => handleFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/40 bg-white">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Farmer ID','Name','Mobile','Location','Lands','Status','Registered','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : farmers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <TreePine className="w-8 h-8 text-gray-200 mx-auto mb-2"/>
                  <p className="text-gray-400">No land owners registered yet</p>
                  <Link href="/farmer/register" className="text-[var(--admin-primary)] text-sm hover:underline mt-1 inline-block">
                    Register first land owner →
                  </Link>
                </td></tr>
              ) : farmers.map(f => (
                <tr key={f.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[var(--admin-primary)] font-semibold">
                      {f.farmerIdGenerated || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{f.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{f.mobile}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {[f.village, f.district, f.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="w-3 h-3"/>
                      {f.lands?.length || 0} parcel{f.lands?.length !== 1 ? 's' : ''}
                    </div>
                    {f.lands?.map((l: any) => (
                      <div key={l.id} className="text-[10px] text-gray-400">{l.areaAcres}ac · {l.surveyGutNumber}</div>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[f.status] || 'bg-gray-100 text-gray-600'}`}>
                      {f.status?.replace(/_/g,' ')}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Step {f.registrationStep || 0}/8
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(f.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/farmers/${f.id}`}
                      className="flex items-center gap-1 text-xs text-[var(--admin-primary)] border border-[var(--admin-primary)]/25 bg-[var(--admin-primary)]/10 hover:bg-[var(--admin-primary)]/15 px-2 py-1 rounded-lg">
                      <FileText className="w-3 h-3"/> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
