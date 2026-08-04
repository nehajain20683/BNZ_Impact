'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
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

  const reports = [
    { label:'Donations Report',     desc:'All donations with donor details',       type:'donations',  icon:'💰' },
    { label:'Land Owners Report',   desc:'All registered farmers and their lands', type:'farmers',    icon:'🌾' },
    { label:'Plantation Summary',   desc:'Sites, phases, trees planted',           type:'plantation', icon:'🌳' },
    { label:'Carbon Estimation',    desc:'CO₂ sequestration estimates',            type:'carbon',     icon:'🌿' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Reports" subtitle="Export and download organisation data"/>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.label} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
              <span className="text-3xl">{r.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{r.label}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{r.desc}</p>
              </div>
              <a href={`/api/admin/export-csv?type=${r.type}`} target="_blank"
                className="flex items-center gap-1.5 text-xs bg-sage-700 text-white px-3 py-2 rounded-xl hover:bg-sage-800">
                <Download className="w-3.5 h-3.5"/> Export CSV
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
