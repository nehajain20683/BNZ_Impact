'use client';
// src/components/admin/OrgSwitcher.tsx
// Dropdown for SUPER_ADMIN to switch between tenant orgs in admin panel
import { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check, RefreshCw } from 'lucide-react';

export default function OrgSwitcher() {
  const [activeOrg, setActiveOrg]   = useState<any>(null);
  const [allOrgs, setAllOrgs]       = useState<any[]>([]);
  const [open, setOpen]             = useState(false);
  const [switching, setSwitching]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/switch-org')
      .then(r => r.json())
      .then(d => {
        if (d.activeOrg) setActiveOrg(d.activeOrg);
        if (d.allOrgs)   setAllOrgs(d.allOrgs);
      })
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function switchOrg(org: any) {
    setSwitching(true);
    setOpen(false);
    await fetch('/api/admin/switch-org', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orgId: org.id }),
    });
    setActiveOrg(org);
    setSwitching(false);
    // Reload page to refresh all data with new org
    window.location.reload();
  }

  if (!allOrgs.length) return null; // Not SUPER_ADMIN or still loading

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white border-2 border-indigo-200 hover:border-indigo-400 text-gray-700 font-semibold px-3 py-2 rounded-xl text-sm transition-all shadow-sm"
      >
        {switching ? (
          <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin"/>
        ) : (
          <div className="w-4 h-4 rounded-md flex-shrink-0"
            style={{ backgroundColor: activeOrg?.primary_color || '#2d5a1b' }}/>
        )}
        <span className="max-w-32 truncate">{activeOrg?.name || 'Select Org'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Organisation</p>
          </div>
          <div className="py-1 max-h-72 overflow-y-auto">
            {allOrgs.map(org => (
              <button key={org.id} onClick={() => switchOrg(org)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left">
                <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: org.primary_color || '#2d5a1b' }}>
                  {org.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{org.name}</p>
                  <p className="text-xs text-gray-400">{org.slug}</p>
                </div>
                {activeOrg?.id === org.id && (
                  <Check className="w-4 h-4 text-indigo-500 flex-shrink-0"/>
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400">SUPER_ADMIN — viewing all tenants</p>
          </div>
        </div>
      )}
    </div>
  );
}
