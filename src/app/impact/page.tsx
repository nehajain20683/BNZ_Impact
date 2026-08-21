// src/app/impact/page.tsx
// Force dynamic rendering - never statically generated
// Prisma queries need runtime DATABASE_URL
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import ImpactContent from './ImpactContent';

export default function ImpactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading impact data…</p>
      </div>
    }>
      <ImpactContent/>
    </Suspense>
  );
}
