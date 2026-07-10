'use client';
import DMRVLayout from '@/components/admin/DMRVLayout';
import { Shield, Leaf, Archive, GitBranch, Bell, BarChart2, FileText } from 'lucide-react';

const META: Record<string,{label:string;icon:any;color:string}> = {
  verify:   { label:'Verify',           icon: Shield,    color:'text-teal-400' },
  carbon:   { label:'Carbon Estimation',icon: Leaf,      color:'text-lime-400' },
  evidence: { label:'Evidence Vault',   icon: Archive,   color:'text-indigo-400' },
  audit:    { label:'Audit Trail',      icon: GitBranch, color:'text-violet-400' },
  alerts:   { label:'AI Alerts',        icon: Bell,      color:'text-amber-400' },
  monitor:  { label:'Monitor',          icon: BarChart2, color:'text-blue-400' },
  report:   { label:'Report',           icon: FileText,  color:'text-purple-400' },
};

const m = META['report'];
const Icon = m.icon;

export default function Page() {
  return (
    <DMRVLayout>
      <div className="bg-gray-950 min-h-screen text-white p-6">
        <div className="border-b border-gray-800 pb-4 mb-6 flex items-center gap-2">
          <Icon className={"w-5 h-5 " + m.color}/>
          <h1 className="text-lg font-bold">{m.label}</h1>
          <span className="text-xs text-gray-500 ml-1">— Full implementation in progress</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Icon className={"w-12 h-12 mx-auto mb-4 " + m.color + " opacity-40"}/>
          <p className="text-gray-400 text-sm">{m.label} module is ready. Data will populate from plantation activities.</p>
          <p className="text-gray-600 text-xs mt-2">Connect plantation site activities to see live data here.</p>
        </div>
      </div>
    </DMRVLayout>
  );
}
