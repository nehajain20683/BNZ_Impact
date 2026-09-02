'use client';
// src/app/admin/field-officers/[id]/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/admin/PageHeader';
import { ArrowLeft, TreePine, MapPin, Sprout, Stethoscope, ClipboardCheck, Camera, HelpCircle } from 'lucide-react';

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'Last 7 Days' },
  { id: 'month', label: 'Last 30 Days' },
  { id: 'all',   label: 'All Time' },
];

const ACTIVITY_ICON: Record<string, any> = { photo: Camera, inspection: ClipboardCheck, monitoring: Stethoscope };

export default function FieldOfficerMetricsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/field-officers/${id}/metrics?period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [id, period]);

  if (loading && !data) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!data || data.error) return <div className="min-h-screen flex items-center justify-center text-gray-400">{data?.error || 'Officer not found'}</div>;

  const { officer, metrics, activity } = data;

  return (
    <div>
      <PageHeader title={officer.name} subtitle={`${officer.designation || 'Field Officer'} · ${officer.district || '—'}`}>
        <button onClick={() => router.push('/admin/field-officers')}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4"/> Back to Field Officers
        </button>
      </PageHeader>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                period === p.id ? 'bg-[var(--admin-primary)] text-white' : 'text-gray-500'}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Trees Photographed', value: metrics.treesPhotographed, icon: Camera, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Farms Visited', value: `${metrics.farmsVisited} / ${metrics.assignedFarmerCount}`, icon: MapPin, color: 'text-blue-600 bg-blue-50' },
            { label: 'Trees Health-Checked', value: metrics.treesHealthChecked, icon: Stethoscope, color: 'text-teal-600 bg-teal-50' },
            { label: 'Avg. Survival Verified', value: metrics.avgSurvivalPct != null ? `${metrics.avgSurvivalPct}%` : '—', icon: Sprout, color: 'text-green-600 bg-green-50' },
            { label: 'Land Verifications Completed', value: metrics.inspectionsCompleted, icon: ClipboardCheck, color: 'text-purple-600 bg-purple-50' },
            { label: 'Trees Assigned Overall', value: metrics.assignedFarmerCount, icon: TreePine, color: 'text-amber-600 bg-amber-50' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}><s.icon className="w-4 h-4"/></div>
              <div className="font-bold text-gray-900 text-lg">{s.value}</div>
              <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}

          {/* Deliberately shown, not hidden — these two are genuinely not
              tracked anywhere in the app yet (no issue-reporting module, no
              attendance/session system), so a supervisor sees an honest gap
              instead of an indistinguishable fake zero. */}
          {['Issues Reported', 'Hours Active'].map(label => (
            <div key={label} className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 text-gray-400 bg-gray-100"><HelpCircle className="w-4 h-4"/></div>
              <div className="font-bold text-gray-400 text-lg">Not tracked</div>
              <div className="text-gray-400 text-xs mt-0.5">{label} — feature not built yet</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Recent Activity</h3>
          {activity.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No activity recorded in this period.</p>
          ) : (
            <div className="space-y-2.5">
              {activity.map((a: any, i: number) => {
                const Icon = ACTIVITY_ICON[a.type] || Camera;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-gray-400"/>
                    </div>
                    <span className="text-gray-700 flex-1">{a.label}</span>
                    <span className="text-gray-400 text-xs whitespace-nowrap">{new Date(a.at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
