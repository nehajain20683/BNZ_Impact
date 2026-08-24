import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';
import { headers } from 'next/headers';
import { resolveTenantFromRequest } from '@/lib/tenant';

const inter = Inter({ subsets: ['latin'] });

// Server-rendered <title>/description so search engines and social-share
// previews see the correct tenant, not just the client-side OrgConfigProvider
// override (which only runs after hydration).
export async function generateMetadata(): Promise<Metadata> {
  // Super Admin console is intentionally NOT tenant-branded anywhere else in
  // the app (SuperAdminProviders deliberately excludes OrgConfigProvider) —
  // keep its <title> generic for the same reason, rather than showing
  // whichever tenant happens to resolve for this host.
  const pathname = headers().get('x-pathname') || '';
  if (pathname.startsWith('/sadmin') || pathname.startsWith('/superadmin')) {
    return {
      title: 'BNZ Admin',
      description: 'BNZ Green Technologies · SaaS Control Panel',
    };
  }

  try {
    const org = await resolveTenantFromRequest({ headers: headers() } as unknown as Request);
    return {
      title: org.name || 'BNZ Impact',
      description: `A verified digital platform for tree plantation, farmer onboarding, and carbon credit generation${org.name ? ` by ${org.name}` : ''}.`,
      ...(org.logoUrl ? { icons: { icon: org.logoUrl } } : {}),
    };
  } catch {
    return {
      title: 'BNZ Impact',
      description: 'A verified digital platform for tree plantation, farmer onboarding, and carbon credit generation.',
    };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
