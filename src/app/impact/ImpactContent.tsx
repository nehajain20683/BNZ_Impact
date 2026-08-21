'use client';
// src/app/impact/ImpactContent.tsx
// Client component - fetches data via API, never at build time
import { useState, useEffect } from 'react';
import { TreePine, Users, Leaf, MapPin } from 'lucide-react';

export default function ImpactContent() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/impact')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading impact data…</p>
    </div>
  );

  const s = stats || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="font-display text-4xl text-gray-900 text-center mb-4">Our Impact</h1>
        <p className="text-gray-500 text-center mb-12">Real-time plantation and carbon data</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: TreePine, label:'Trees Planted',     value:(s.treesPlanted||0).toLocaleString('en-IN'), color:'text-green-600',   bg:'bg-green-50' },
            { icon: Users,    label:'Land Owners',       value:(s.farmerCount||0).toLocaleString('en-IN'),  color:'text-blue-600',    bg:'bg-blue-50' },
            { icon: MapPin,   label:'Plantation Sites',  value:(s.siteCount||0).toLocaleString('en-IN'),    color:'text-sage-700',    bg:'bg-sage-50' },
            { icon: Leaf,     label:'Carbon Est. tCO₂e', value:(s.estimatedCarbon||0).toLocaleString('en-IN'), color:'text-lime-600', bg:'bg-lime-50' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-6 text-center`}>
              <Icon className={`w-8 h-8 ${color} mx-auto mb-3`}/>
              <div className={`text-3xl font-black ${color}`}>{value}</div>
              <div className="text-gray-500 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
