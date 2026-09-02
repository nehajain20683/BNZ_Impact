// src/components/OrgLogo.tsx
// Every place a tenant's logo rendered previously forced it into a square
// box (w-N h-N + object-contain) — fine for a square icon-mark, but any
// wider logo (a text wordmark, a horizontal lockup) gets shrunk down to fit
// the square's height, leaving huge empty space and making the actual
// visible logo look disproportionately small. This sizes by height only,
// letting width follow the logo's own natural aspect ratio, capped so an
// unusually wide logo can't break the surrounding layout.
'use client';

const HEIGHTS: Record<string, string> = {
  xs: 'h-7', sm: 'h-8', md: 'h-9', lg: 'h-10', xl: 'h-12', '2xl': 'h-16',
};
const MAX_WIDTHS: Record<string, string> = {
  xs: 'max-w-[40px]', sm: 'max-w-[110px]', md: 'max-w-[130px]', lg: 'max-w-[150px]', xl: 'max-w-[180px]', '2xl': 'max-w-[220px]',
};

export function OrgLogo({
  src, alt, size = 'md', badge = false, className = '',
}: {
  src: string;
  alt: string;
  // 'xs' is specifically for tight icon-only slots (e.g. a collapsed
  // sidebar) where even the 'sm' cap would be too wide.
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  // Matches the farmer-portal pattern of a translucent rounded backing
  // behind the logo on a colored header — omit for plain backgrounds.
  badge?: boolean;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={[
        HEIGHTS[size], MAX_WIDTHS[size], 'w-auto object-contain flex-shrink-0',
        badge ? 'rounded-lg bg-white/20 p-1' : '',
        className,
      ].filter(Boolean).join(' ')}
    />
  );
}
