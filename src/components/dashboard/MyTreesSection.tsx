'use client';
// src/components/dashboard/MyTreesSection.tsx
// Handles potentially large tree counts: grouped-by-donation by default
// (collapsible, paginated on expand), with a separate filterable/searchable
// "All Trees" view for cross-donation browsing.
import { useState } from 'react';
import { MapPin, TreePine, ChevronDown, Search } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  PLANTED: 'bg-green-100 text-green-700',
  GROWING: 'bg-blue-100 text-blue-700',
  MATURE:  'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

function TreeCard({ tree }: { tree: any }) {
  return (
    <a href={`/dashboard/tree/${tree.id}`} className="block bg-white border border-sage-100 rounded-2xl p-4 hover:shadow-md hover:border-sage-200 transition-all">
      <div className="w-full h-24 bg-sage-50 rounded-xl flex items-center justify-center mb-4">
        {tree.imageUrl
          ? <img src={tree.imageUrl} alt="tree" className="w-full h-full object-cover rounded-xl" />
          : <TreePine className="w-10 h-10 text-sage-400" />}
      </div>
      <div className="font-mono text-xs text-sage-500 mb-1">{tree.treeTagId || 'Tag pending'}</div>
      <div className="font-semibold text-sage-900 text-sm">{tree.species || 'Species TBA'}</div>
      <div className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[tree.status] || 'bg-gray-100 text-gray-700'}`}>
        {tree.status}
      </div>
      {tree.plantedDate && (
        <div className="text-xs text-sage-500 mt-2">Planted {new Date(tree.plantedDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
      )}
      {tree.plantationSite && (
        <div className="text-xs text-sage-500 mt-1">{tree.plantationSite.siteName}{tree.plantationSite.district ? ` · ${tree.plantationSite.district}` : ''}</div>
      )}
      {tree.geoLatitude && (
        <div className="flex items-center gap-1 mt-2 text-xs text-sage-500">
          <MapPin className="w-3 h-3" />
          {tree.geoLatitude.toFixed(4)}, {tree.geoLongitude?.toFixed(4)}
        </div>
      )}
    </a>
  );
}

function DonationTreeGroup({ donation }: { donation: any }) {
  const [expanded, setExpanded] = useState(false);
  const [trees, setTrees]       = useState<any[]>([]);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(false);

  async function loadPage(p: number) {
    setLoading(true);
    const res = await fetch(`/api/dashboard/trees?donationId=${donation.id}&page=${p}&pageSize=24`);
    const data = await res.json();
    setTrees(p === 1 ? (data.trees || []) : [...trees, ...(data.trees || [])]);
    setTotalPages(data.totalPages || 1);
    setPage(p);
    setLoading(false);
  }

  function toggle() {
    if (!expanded && trees.length === 0) loadPage(1);
    setExpanded(!expanded);
  }

  if (donation.treeCount === 0) return null;

  return (
    <div className="bg-white border border-sage-100 rounded-2xl overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between p-5 text-left hover:bg-sage-50/50 transition-colors">
        <div>
          <div className="font-semibold text-sage-900 text-sm">{donation.treeCount} Trees · {donation.campaignName}</div>
          <div className="text-sage-400 text-xs mt-0.5">{new Date(donation.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })} · Receipt #{donation.receiptNumber}</div>
        </div>
        <ChevronDown className={`w-5 h-5 text-sage-400 transition-transform ${expanded ? 'rotate-180' : ''}`}/>
      </button>
      {expanded && (
        <div className="p-5 pt-0 border-t border-sage-50">
          {loading && trees.length === 0 ? (
            <p className="text-sage-400 text-sm py-4">Loading trees…</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                {trees.map(t => <TreeCard key={t.id} tree={t} />)}
              </div>
              {page < totalPages && (
                <button onClick={() => loadPage(page + 1)} disabled={loading}
                  className="w-full mt-4 text-sage-600 hover:text-sage-800 text-sm font-semibold py-2 border border-sage-200 rounded-xl disabled:opacity-50">
                  {loading ? 'Loading…' : 'Load more trees'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyTreesSection({ donations, sites }: { donations: any[]; sites: { id: string; siteName: string }[] }) {
  const [view, setView] = useState<'byDonation' | 'all'>('byDonation');
  const [trees, setTrees] = useState<any[]>([]);
  const [page, setPage]   = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', siteId: '', search: '', sort: 'newest' });
  const [loaded, setLoaded] = useState(false);

  async function loadAll(p: number, reset = false) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: '24', sort: filters.sort });
    if (filters.status) params.set('status', filters.status);
    if (filters.siteId) params.set('siteId', filters.siteId);
    if (filters.search) params.set('search', filters.search);
    const res = await fetch(`/api/dashboard/trees?${params}`);
    const data = await res.json();
    setTrees(reset || p === 1 ? (data.trees || []) : [...trees, ...(data.trees || [])]);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    setPage(p);
    setLoading(false);
    setLoaded(true);
  }

  function switchToAll() {
    setView('all');
    if (!loaded) loadAll(1, true);
  }

  function applyFilters() {
    loadAll(1, true);
  }

  const totalTreeCount = donations.reduce((s, d) => s + d.treeCount, 0);
  if (totalTreeCount === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-sage-950">My Trees ({totalTreeCount})</h2>
        <div className="flex bg-sage-100 rounded-xl p-1">
          <button onClick={() => setView('byDonation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${view==='byDonation' ? 'bg-white text-sage-900 shadow-sm' : 'text-sage-500'}`}>
            By Donation
          </button>
          <button onClick={switchToAll}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${view==='all' ? 'bg-white text-sage-900 shadow-sm' : 'text-sage-500'}`}>
            All Trees
          </button>
        </div>
      </div>

      {view === 'byDonation' ? (
        <div className="space-y-3">
          {donations.map(d => <DonationTreeGroup key={d.id} donation={d} />)}
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2 mb-5">
            <div className="relative">
              <Search className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="Search tag ID…" className="pl-9 pr-3 py-2 text-sm border border-sage-200 rounded-xl focus:outline-none focus:border-sage-500"/>
            </div>
            <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
              className="px-3 py-2 text-sm border border-sage-200 rounded-xl">
              <option value="">All Statuses</option>
              {['PENDING','PLANTED','GROWING','MATURE'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.siteId} onChange={e => setFilters(p => ({ ...p, siteId: e.target.value }))}
              className="px-3 py-2 text-sm border border-sage-200 rounded-xl">
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
            </select>
            <select value={filters.sort} onChange={e => setFilters(p => ({ ...p, sort: e.target.value }))}
              className="px-3 py-2 text-sm border border-sage-200 rounded-xl">
              <option value="newest">Newest planted</option>
              <option value="oldest">Oldest planted</option>
            </select>
            <button onClick={applyFilters} className="px-4 py-2 text-sm font-semibold bg-sage-700 hover:bg-sage-800 text-white rounded-xl">
              Apply
            </button>
          </div>

          {loading && trees.length === 0 ? (
            <p className="text-sage-400 text-sm">Loading…</p>
          ) : trees.length === 0 ? (
            <p className="text-sage-400 text-sm">No trees match these filters.</p>
          ) : (
            <>
              <p className="text-sage-400 text-xs mb-3">{total} tree{total===1?'':'s'} found</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trees.map(t => <TreeCard key={t.id} tree={t} />)}
              </div>
              {page < totalPages && (
                <button onClick={() => loadAll(page + 1)} disabled={loading}
                  className="w-full mt-5 text-sage-600 hover:text-sage-800 text-sm font-semibold py-2.5 border border-sage-200 rounded-xl disabled:opacity-50">
                  {loading ? 'Loading…' : 'Load more trees'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
