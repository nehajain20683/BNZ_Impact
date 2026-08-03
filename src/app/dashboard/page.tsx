// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Download, MapPin, TreePine } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/login?callbackUrl=/dashboard');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      donations: {
        where: { paymentStatus: 'COMPLETED' },
        include: { campaign: true, trees: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) redirect('/auth/login');

  const totalTrees = user.donations.reduce((s, d) => s + d.numberOfTrees, 0);
  const totalAmount = user.donations.reduce((s, d) => s + d.amount, 0);
  const co2 = totalTrees * 22;
  const allTrees = user.donations.flatMap(d => d.trees);

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-10">
            <h1 className="font-display text-4xl text-sage-950 mb-1">My Dashboard</h1>
            <p className="text-sage-600">Welcome back, {user.name || 'Donor'}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total Donated', value: formatCurrency(totalAmount), icon: '💰' },
              { label: 'Trees Sponsored', value: `${totalTrees}`, icon: '🌳' },
              { label: 'CO₂ Offset/yr', value: `${co2}kg`, icon: '🌍' },
              { label: 'Donations Made', value: `${user.donations.length}`, icon: '📋' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-sage-100 rounded-2xl p-5">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="font-display text-2xl font-bold text-sage-900">{stat.value}</div>
                <div className="text-sage-500 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-sage-100 rounded-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-sage-100">
              <h2 className="font-display text-xl text-sage-900">My Donations</h2>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm table-responsive min-w-[600px]">
                <thead className="bg-sage-50 text-sage-600">
                  <tr>
                    {['Receipt', 'Date', 'Campaign', 'Trees', 'Amount', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {user.donations.map((d) => (
                    <tr key={d.id} className="border-t border-forest-50 hover:bg-sage-50/50">
                      <td className="px-4 py-3 font-mono text-sage-600 text-xs">#{d.receiptNumber}</td>
                      <td className="px-4 py-3 text-sage-700">{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-sage-800 font-medium">{d.campaign.name}</td>
                      <td className="px-4 py-3"><span className="bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-semibold">{d.numberOfTrees}</span></td>
                      <td className="px-4 py-3 font-semibold text-sage-900">{formatCurrency(d.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <a href={`/api/receipts/${d.id}/pdf`} target="_blank" className="text-xs text-sage-600 hover:text-sage-800 flex items-center gap-1">
                            <Download className="w-3 h-3" /> Receipt
                          </a>
                          <a href={`/api/certificates/${d.id}/pdf`} target="_blank" className="text-xs text-sage-600 hover:text-sage-800 flex items-center gap-1">
                            <Download className="w-3 h-3" /> Cert
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {user.donations.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-sage-400">No donations yet. <Link href="/donate" className="text-sage-600 underline">Donate now</Link></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {allTrees.length > 0 && (
            <div>
              <h2 className="font-display text-2xl text-sage-950 mb-5">My Trees</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allTrees.map((tree) => (
                  <div key={tree.id} className="bg-white border border-sage-100 rounded-2xl p-4">
                    <div className="w-full h-24 bg-sage-50 rounded-xl flex items-center justify-center mb-4">
                      {tree.imageUrl
                        ? <img src={tree.imageUrl} alt="tree" className="w-full h-full object-cover rounded-xl" />
                        : <TreePine className="w-10 h-10 text-sage-400" />}
                    </div>
                    <div className="font-mono text-xs text-sage-500 mb-1">{tree.treeTagId || 'Tag pending'}</div>
                    <div className="font-semibold text-sage-900 text-sm">{tree.species || 'Species TBA'}</div>
                    <div className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                      tree.status === 'PLANTED' ? 'bg-green-100 text-green-700' :
                      tree.status === 'GROWING' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'}`}>
                      {tree.status}
                    </div>
                    {tree.geoLatitude && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-sage-500">
                        <MapPin className="w-3 h-3" />
                        {tree.geoLatitude.toFixed(4)}, {tree.geoLongitude?.toFixed(4)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
