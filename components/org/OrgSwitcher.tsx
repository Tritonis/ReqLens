'use client';
import { useState } from 'react';
import { useOrgContext } from '@/lib/context/OrgContext';

export function OrgSwitcher() {
  const { orgs, activeOrg, setActiveOrg } = useOrgContext();
  const [open, setOpen] = useState(false);

  if (!activeOrg) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
        <span className="text-sm font-medium text-gray-800 truncate">{activeOrg.name}</span>
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 z-10">
          {orgs.map(org => (
            <button key={org.id} onClick={() => { setActiveOrg(org); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors
                ${org.id === activeOrg.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
              {org.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
