'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { OrgWithMember } from '@/lib/types';

interface OrgContextValue {
  orgs: OrgWithMember[];
  activeOrg: OrgWithMember | null;
  setActiveOrg: (org: OrgWithMember) => void;
  loading: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  orgs: [], activeOrg: null, setActiveOrg: () => {}, loading: true,
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgs, setOrgs] = useState<OrgWithMember[]>([]);
  const [activeOrg, setActiveOrgState] = useState<OrgWithMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function setActiveOrg(org: OrgWithMember) {
    setActiveOrgState(org);
    if (typeof window !== 'undefined') localStorage.setItem('activeOrgId', org.id);
  }

  useEffect(() => {
    fetch('/api/orgs')
      .then(r => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setFetchError((data as { error?: string }).error ?? 'Failed to load organizations');
          setLoading(false);
          return;
        }
        setOrgs(data);
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('activeOrgId') : null;
        const saved = data.find((o: OrgWithMember) => o.id === savedId) ?? data[0] ?? null;
        setActiveOrgState(saved);
        setLoading(false);
      })
      .catch((e: Error) => {
        setFetchError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (fetchError) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-2 max-w-sm px-4">
        <p className="text-sm font-medium text-red-600">Failed to load organization</p>
        <p className="text-xs text-gray-500 font-mono break-all">{fetchError}</p>
        <p className="text-xs text-gray-400">Check that the database migration has been run in Supabase.</p>
      </div>
    </div>
  );

  return (
    <OrgContext.Provider value={{ orgs, activeOrg, setActiveOrg, loading }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrgContext() {
  return useContext(OrgContext);
}
