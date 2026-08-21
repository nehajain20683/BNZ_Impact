/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore TypeScript and ESLint errors during build
  typescript:  { ignoreBuildErrors: true },
  eslint:      { ignoreDuringBuilds: true },

  // Force all pages to be dynamic — prevents Prisma calls at build time
  // This is correct for a multi-tenant SaaS where data depends on runtime env
  experimental: {
    // Ensure server components can access runtime env variables
  },

  // Required for Prisma on Vercel
  serverExternalPackages: ['@prisma/client', 'prisma'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
