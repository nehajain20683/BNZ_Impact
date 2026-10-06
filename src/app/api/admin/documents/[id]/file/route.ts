export const runtime = 'nodejs';
// Admin view of a stored file, served on demand. Admin-only and restricted to
// the admin's own organisation (a file is reachable only through its farmer's
// org), like every other admin route.
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveOrgId } from '@/lib/get-active-org';
import prisma from '@/lib/prisma';
import { dataUrlToResponse } from '@/lib/blob-response';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(role)) return new Response('Unauthorized', { status: 401 });
  const orgId = await getActiveOrgId();
  const row = await prisma.farmerDocument.findFirst({
    where: { id: params.id, farmer: { orgId } }, select: { fileUrl: true, fileName: true },
  });
  if (!row?.fileUrl) return new Response('Not found', { status: 404 });
  return dataUrlToResponse(row.fileUrl, { filename: row.fileName, maxAgeSeconds: 300 });
}
