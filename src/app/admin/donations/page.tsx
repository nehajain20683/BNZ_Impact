// src/app/admin/donations/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function AdminDonationsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/');

  const q      = typeof searchParams.q      === 'string' ? searchParams.q      : undefined;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;

  const where: any = {};
  if (status) where.paymentStatus = status;
  if (q) {
    where.OR = [
      { donorName:     { contains: q, mode: 'insensitive' } },
      { donorEmail:    { contains: q, mode: 'insensitive' } },
      { receiptNumber: { contains: q, mode: 'insensitive' } },
    ];
  }

  const donations = await prisma.donation.findMany({
    where,
    include: { campaign: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-forest-950 text-white px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-forest-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <span className="font-display text-lg">Donations Management</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <form className="flex gap-3 mb-6">
          <input name="q" defaultValue={q} placeholder="Search by name, email, receipt..."
            className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400" />
          <select name="status" defaultValue={status} className="border rounded-lg px-4 py-2 text-sm">
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <button type="submit" className="bg-forest-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Filter</button>
          <a href="/api/admin/export-csv" className="flex items-center gap-1 border border-forest-300 text-forest-700 px-4 py-2 rounded-lg text-sm hover:bg-forest-50">
            <Download className="w-4 h-4" /> CSV
          </a>
        </form>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {['Receipt', 'Date', 'Donor', 'Email', 'Campaign', 'Trees', 'Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {donations.map(d => (
                  <tr key={d.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">#{d.receiptNumber}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium">{d.donorName}</td>
                    <td className="px-4 py-3 text-gray-500">{d.donorEmail}</td>
                    <td className="px-4 py-3 text-gray-600">{d.campaign.name}</td>
                    <td className="px-4 py-3"><span className="bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full text-xs font-bold">{d.numberOfTrees}</span></td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(d.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        d.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        d.paymentStatus === 'PENDING'   ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'}`}>
                        {d.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a href={`/api/receipts/${d.id}/pdf`}     target="_blank" className="text-xs text-forest-600 hover:underline">Receipt</a>
                        <a href={`/api/certificates/${d.id}/pdf`} target="_blank" className="text-xs text-forest-600 hover:underline">Cert</a>
                      </div>
                    </td>
                  </tr>
                ))}
                {donations.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">No donations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
