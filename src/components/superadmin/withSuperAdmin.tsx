'use client';
// Higher-order component that guards all /sadmin pages
// Redirects to /sadmin/login if not authenticated as SUPER_ADMIN
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Zap } from 'lucide-react';
import SuperAdminLayout from './SuperAdminLayout';

export function withSuperAdmin(Component: React.ComponentType) {
  return function GuardedPage(props: any) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const role = (session?.user as any)?.role;

    useEffect(() => {
      if (status === 'unauthenticated') router.push('/sadmin/login');
      if (status === 'authenticated' && role !== 'SUPER_ADMIN') router.push('/sadmin/login');
    }, [status, role]);

    if (status === 'loading') {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Zap className="w-6 h-6 text-white"/>
            </div>
            <p className="text-gray-500 text-sm">Loading BNZ Admin…</p>
          </div>
        </div>
      );
    }

    if (!session || role !== 'SUPER_ADMIN') return null;

    return (
      <SuperAdminLayout>
        <Component {...props}/>
      </SuperAdminLayout>
    );
  };
}
