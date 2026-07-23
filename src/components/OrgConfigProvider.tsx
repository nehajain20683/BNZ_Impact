'use client';
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
};

const DEFAULT: OrgConfig = {
  id:           'org_jito_mumbai',
  name:         'JITO Green Legacy',
  slug:         'jito-mumbai',
  primaryColor: '#2d5a1b',
  logoUrl:      null,
  email:        'mumbaizoneJES@jito.org',
  phone:        '+919137741905',
  website:      null,
  treePrice:    500,
  plan:         'ENTERPRISE',
};

const OrgContext = createContext<OrgConfig>(DEFAULT);
export function useOrgConfig() { return useContext(OrgContext); }

export function OrgConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OrgConfig>(DEFAULT);

  useEffect(() => {
    fetch('/api/public/org-config')
      .then(r => r.json())
      .then(data => { if (data.id) setConfig(data); })
      .catch(() => {});
  }, []);

  return <OrgContext.Provider value={config}>{children}</OrgContext.Provider>;
}