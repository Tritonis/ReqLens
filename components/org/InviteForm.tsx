'use client';
import { useState } from 'react';

const TEMPLATES = {
  Analyst:  { can_upload: true,  can_review: true,  can_export: true,  can_manage_users: false },
  Reviewer: { can_upload: false, can_review: true,  can_export: false, can_manage_users: false },
  Exporter: { can_upload: false, can_review: true,  can_export: true,  can_manage_users: false },
  Admin:    { can_upload: true,  can_review: true,  can_export: true,  can_manage_users: true  },
} as const;

type Flags = { can_upload: boolean; can_review: boolean; can_export: boolean; can_manage_users: boolean };
const FLAGS: Array<[keyof Flags, string]> = [
  ['can_upload', 'Upload'], ['can_review', 'Review'], ['can_export', 'Export'], ['can_manage_users', 'Admin'],
];

interface Props { orgId: string; onInvited: (url: string) => void; }

export function InviteForm({ orgId, onInvited }: Props) {
  const [email, setEmail] = useState('');
  const [flags, setFlags] = useState<Flags>({ can_upload: false, can_review: true, can_export: false, can_manage_users: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(name: keyof typeof TEMPLATES) {
    setFlags({ ...TEMPLATES[name] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch(`/api/orgs/${orgId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
      body: JSON.stringify({ email, ...flags }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    onInvited(data.inviteUrl);
    setEmail('');
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Role template</p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map(t => (
            <button key={t} type="button" onClick={() => applyTemplate(t)}
              className="px-3 py-1 text-xs rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors">
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        {FLAGS.map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={flags[key]} onChange={() => setFlags(f => ({ ...f, [key]: !f[key] }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
        {loading ? 'Sending…' : 'Send invitation'}
      </button>
    </form>
  );
}
