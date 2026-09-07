'use client';
// src/app/admin/dmrv/field-reports/page.tsx
// dMRV Roadmap Phase 4. FieldIssue and SiteInspection both had a complete
// data model and were actively captured by officers, but genuinely zero
// admin API or UI existed for either — confirmed by search before
// building this, same discipline as every other phase in this roadmap.
import { useEffect, useState } from 'react';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { AlertTriangle, ClipboardCheck, CheckCircle2, Undo2, MapPin } from 'lucide-react';

const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  CRITICAL: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

const ISSUE_STATUS_COLOR: Record<string, string> = {
  OPEN: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  ACKNOWLEDGED: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  RESOLVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

export default function FieldReportsPage() {
  const [tab, setTab] = useState<'issues' | 'inspections'>('issues');
  const [issueStatus, setIssueStatus] = useState('OPEN');
  const [issues, setIssues] = useState<any[]>([]);
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({});
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function loadIssues() {
    setLoading(true);
    const res = await fetch(`/api/admin/field-issues?status=${issueStatus}`);
    const data = await res.json();
    setIssues(data.issues || []);
    setIssueCounts(data.statusCounts || {});
    setLoading(false);
  }

  async function loadInspections() {
    setLoading(true);
    const res = await fetch('/api/admin/site-inspections?status=COMPLETED');
    const data = await res.json();
    setInspections(data.inspections || []);
    setLoading(false);
  }

  useEffect(() => { tab === 'issues' ? loadIssues() : loadInspections(); }, [tab, issueStatus]);

  async function act(id: string, action: 'ACKNOWLEDGE' | 'RESOLVE' | 'REOPEN', notes?: string) {
    const res = await fetch(`/api/admin/field-issues/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, resolutionNotes: notes }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed'); return; }
    showToast(action === 'RESOLVE' ? 'Marked resolved ✓' : action === 'ACKNOWLEDGE' ? 'Acknowledged ✓' : 'Reopened');
    setResolvingId(null);
    setResolutionNote('');
    loadIssues();
  }

  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white">
        <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400"/>
          <h1 className="text-lg font-bold">Field Reports</h1>
          <span className="text-xs text-gray-500 ml-1">Incidents and land-verification visits reported directly from the field</span>
        </div>

        {toast && <div className="fixed top-4 right-4 bg-gray-800 border border-gray-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab('issues')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                tab === 'issues' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
              <AlertTriangle className="w-3.5 h-3.5"/> Field Issues {issueCounts.OPEN ? `(${issueCounts.OPEN})` : ''}
            </button>
            <button onClick={() => setTab('inspections')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                tab === 'inspections' ? 'text-teal-400 bg-teal-500/10 border-teal-500/30' : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
              <ClipboardCheck className="w-3.5 h-3.5"/> Site Inspections
            </button>
          </div>

          {tab === 'issues' && (
            <div className="flex gap-2 mb-4">
              {['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'].map(s => (
                <button key={s} onClick={() => setIssueStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
                    issueStatus === s ? 'bg-gray-800 border-gray-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()} {issueCounts[s] ? `(${issueCounts[s]})` : ''}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : tab === 'issues' ? (
            issues.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400 opacity-40"/>
                <p className="text-gray-400 text-sm">Nothing {issueStatus === 'ALL' ? '' : issueStatus.toLowerCase()} right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map((iss: any) => (
                  <div key={iss.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white text-sm">{iss.issueType.replace(/_/g, ' ')}</div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {iss.site?.siteName} · {iss.farmer?.fullName || 'Unlinked'} · {new Date(iss.createdAt).toLocaleDateString('en-IN')}
                        </div>
                        {iss.tree?.treeTagId && <div className="text-gray-600 text-[11px] mt-0.5 font-mono">Tree: {iss.tree.treeTagId}</div>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_COLOR[iss.severity]}`}>{iss.severity}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ISSUE_STATUS_COLOR[iss.status]}`}>{iss.status}</span>
                      </div>
                    </div>
                    {iss.description && <p className="text-gray-400 text-xs mt-2">{iss.description}</p>}
                    {iss.gpsLat && (
                      <div className="flex items-center gap-1 text-gray-500 text-[10px] mt-2">
                        <MapPin className="w-3 h-3"/> {iss.gpsLat.toFixed(4)}, {iss.gpsLng.toFixed(4)}
                      </div>
                    )}
                    {iss.photos?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {iss.photos.map((p: string, i: number) => (
                          <img key={i} src={p} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0"/>
                        ))}
                      </div>
                    )}
                    <div className="text-gray-600 text-[11px] mt-2">Reported by {iss.reportedBy?.name || 'Officer'}</div>

                    {iss.status === 'RESOLVED' && iss.resolutionNotes && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 mt-2 text-emerald-300 text-xs">
                        Resolved: {iss.resolutionNotes}
                      </div>
                    )}

                    {resolvingId === iss.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} rows={2}
                          placeholder="What was actually done about this?"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"/>
                        <div className="flex gap-2">
                          <button onClick={() => act(iss.id, 'RESOLVE', resolutionNote)} disabled={!resolutionNote}
                            className="text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg disabled:opacity-40">
                            Confirm Resolved
                          </button>
                          <button onClick={() => setResolvingId(null)} className="text-xs text-gray-400 px-3 py-1.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-3">
                        {iss.status === 'OPEN' && (
                          <button onClick={() => act(iss.id, 'ACKNOWLEDGE')}
                            className="flex items-center gap-1 text-xs font-semibold text-amber-400 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5"/> Acknowledge
                          </button>
                        )}
                        {iss.status !== 'RESOLVED' && (
                          <button onClick={() => setResolvingId(iss.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5"/> Resolve
                          </button>
                        )}
                        {iss.status === 'RESOLVED' && (
                          <button onClick={() => act(iss.id, 'REOPEN')}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-400 border border-gray-700 bg-gray-800 px-3 py-1.5 rounded-lg">
                            <Undo2 className="w-3.5 h-3.5"/> Reopen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            inspections.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-teal-400 opacity-40"/>
                <p className="text-gray-400 text-sm">No completed inspections yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inspections.map((i: any) => (
                  <div key={i.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white text-sm">{i.farmer?.fullName}</div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {i.land?.surveyGutNumber || 'No parcel linked'} · {i.officer?.name} · {i.inspectedAt ? new Date(i.inspectedAt).toLocaleDateString('en-IN') : '—'}
                        </div>
                      </div>
                      {i.incompleteChecks.length === 0 ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">Checklist Complete</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/30">{i.incompleteChecks.length} incomplete</span>
                      )}
                    </div>
                    {i.incompleteChecks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {i.incompleteChecks.map((c: string, idx: number) => (
                          <div key={idx} className="text-amber-300 text-xs flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0"/> {c}
                          </div>
                        ))}
                      </div>
                    )}
                    {i.notes && <p className="text-gray-400 text-xs mt-2">{i.notes}</p>}
                    {i.photos?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {i.photos.map((p: string, idx: number) => (
                          <img key={idx} src={p} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0"/>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </DMRVLayout>
  );
}
