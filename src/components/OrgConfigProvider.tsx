'use client';
// src/components/OrgConfigProvider.tsx
// Fetches org config from /api/public/org-config and provides it via context
// Default is empty/generic until API responds
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type OrgConfig = {
  id:           string;
  name:         string;
  slug:         string;
  primaryColor: string;
  logoUrl:      string | null;
  email:        string | null;
  phone:        string | null;
  website:      string | null;
  treePrice:    number;
  plan:         string;
  paymentSuccessMessage: string | null;
  loaded:       boolean; // true once API has responded
};

// Generic default — no JITO hardcoding
// Shows blank name until API responds so tenant sees their own name
const DEFAULT_CONFIG: OrgConfig = {
  id:           '',
  name:         '',          // blank until loaded
  slug:         '',
  primaryColor: '#2d5a1b',  // default green
  logoUrl:      null,
  email:        null,
  phone:        null,
  website:      null,
  treePrice:    500,
  plan:         'STARTER',
  paymentSuccessMessage: null,
  loaded:       false,
};

const OrgContext = createContext<OrgConfig>(DEFAULT_CONFIG);
export function useOrgConfig() { return useContext(OrgContext); }

function hexToHsl(hex: string): string {
  try {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0;
    const l = (max+min)/2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h = ((g-b)/d + (g<b?6:0))/6; break;
        case g: h = ((b-r)/d + 2)/6; break;
        case b: h = ((r-g)/d + 4)/6; break;
      }
    }
    return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
  } catch { return '120 40% 25%'; }
}

export function OrgConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OrgConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    fetch('/api/public/org-config')
      .then(r => r.json())
      .then(data => {
        if (!data.id) return;
        setConfig({ ...data, loaded: true });
        if (data.primaryColor) {
          const hsl = hexToHsl(data.primaryColor);
          document.documentElement.style.setProperty('--brand-primary', data.primaryColor);
          document.documentElement.style.setProperty('--brand-primary-hsl', hsl);
        }
        if (data.name) document.title = data.name;
      })
      .catch(() => {
        // On error, set loaded so UI doesn't hang
        setConfig(c => ({ ...c, loaded: true }));
      });
  }, []);

  return (
    <OrgContext.Provider value={config}>
      {children}
    </OrgContext.Provider>
  );
}
