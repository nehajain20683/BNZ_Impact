// src/components/dashboard/ImpactStatCard.tsx
// Generalizes the "CO2 box" look into a reusable card so any admin-defined
// impact metric renders consistently, without special-casing CO2 in code.
export default function ImpactStatCard({
  icon, value, unit, label, color,
}: { icon: string; value: string; unit?: string; label: string; color?: string }) {
  return (
    <div className="rounded-2xl p-6 text-center text-white" style={{ backgroundColor: color || '#1a3a1a' }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-display text-3xl font-bold">
        {value}{unit ? <span className="text-lg font-normal opacity-70 ml-1">{unit}</span> : null}
      </div>
      <div className="text-white/70 text-xs mt-1">{label}</div>
    </div>
  );
}
