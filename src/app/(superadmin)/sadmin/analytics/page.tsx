'use client';
import { withSuperAdmin } from '@/components/superadmin/withSuperAdmin';

const META: Record<string,{title:string;desc:string;icon:string}> = {
  users:     { title:'All Users',    desc:'Users across all tenant organisations', icon:'👥' },
  plans:     { title:'Plans',        desc:'Subscription plan management',          icon:'📦' },
  billing:   { title:'Billing',      desc:'Revenue and invoice management',        icon:'💳' },
  analytics: { title:'Analytics',    desc:'Platform-wide usage analytics',         icon:'📊' },
  settings:  { title:'Settings',     desc:'Platform configuration and API keys',   icon:'⚙️' },
};

const m = META['analytics'];

function Page() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span>{m.icon}</span> {m.title}
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">{m.desc}</p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
        <div className="text-4xl mb-4">{m.icon}</div>
        <p className="text-gray-400 text-sm">{m.title} module — implementation in progress</p>
        <p className="text-gray-600 text-xs mt-1">This section will be fully built in the next iteration</p>
      </div>
    </div>
  );
}

export default withSuperAdmin(Page);
