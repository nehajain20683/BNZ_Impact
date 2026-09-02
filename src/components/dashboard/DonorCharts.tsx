'use client';
// src/components/dashboard/DonorCharts.tsx
// Visual complement to the top stat cards — a donor's planting effort shown
// as a trend over time and a species breakdown, not just single numbers.
// Uses recharts, which was already an installed dependency but never
// actually used anywhere in this app until now.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const PIE_COLORS = ['#2d5a1b', '#4d7c2f', '#7ba05b', '#a8c98a', '#d4e4c3', '#8b5a2b'];

export default function DonorCharts({
  yearlyPlantingData, speciesData,
}: {
  yearlyPlantingData: { year: string; count: number }[];
  speciesData: { species: string; count: number }[];
}) {
  const hasYearly = yearlyPlantingData.some(d => d.count > 0);
  const hasSpecies = speciesData.length > 0;

  if (!hasYearly && !hasSpecies) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      {hasYearly && (
        <div className="bg-white border border-sage-100 rounded-2xl p-5">
          <h3 className="font-display text-lg text-sage-950 mb-1">Your Planting Journey</h3>
          <p className="text-sage-400 text-xs mb-4">Trees planted by year</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={yearlyPlantingData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ea" vertical={false}/>
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8a9b7d' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 12, fill: '#8a9b7d' }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e9e0', fontSize: 13 }}
                formatter={(value: any) => [`${value} trees`, 'Planted']}
              />
              <Bar dataKey="count" fill="#2d5a1b" radius={[6, 6, 0, 0]} maxBarSize={48}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasSpecies && (
        <div className="bg-white border border-sage-100 rounded-2xl p-5">
          <h3 className="font-display text-lg text-sage-950 mb-1">Species Mix</h3>
          <p className="text-sage-400 text-xs mb-4">What you've helped plant</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={speciesData} dataKey="count" nameKey="species" cx="50%" cy="50%"
                innerRadius={50} outerRadius={80} paddingAngle={2}>
                {speciesData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e9e0', fontSize: 13 }}
                formatter={(value: any, name: any) => [`${value} trees`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
