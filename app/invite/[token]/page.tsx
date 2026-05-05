'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InviteData {
  email: string;
  can_upload: boolean;
  can_review: boolean;
  can_export: boolean;
  can_manage_users: boolean;
  organizations: { name: string };
}

const FLAG_LABELS = [
  ['can_upload', 'Upload documents'],
  ['can_review', 'Review requirements'],
  ['can_export', 'Export CSV'],
  ['can_manage_users', 'Manage members'],
] as const;

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${params.token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setInvite(d); setLoading(false); });
  }, [params.token]);

  async function accept() {
    setAccepting(true);
    const res = await fetch(`/api/invite/${params.token}/accept`, { method: 'POST' });
    const data = await res.json();
    if (data.error) { setError(data.error); setAccepting(false); return; }
    router.push('/requirements');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-red-600 font-medium">{error}</p>
        <a href="/login" className="text-sm text-blue-600 hover:underline">Go to login</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">You&apos;ve been invited</h1>
          <p className="text-sm text-gray-500 mt-1">Join <span className="font-medium text-gray-800">{invite!.organizations.name}</span> on ReqLens</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Your permissions</p>
          {FLAG_LABELS.map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${invite![key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {invite![key] ? '✓' : '–'}
              </span>
              <span className={invite![key] ? 'text-gray-800' : 'text-gray-400'}>{label}</span>
            </div>
          ))}
        </div>
        <button onClick={accept} disabled={accepting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
          {accepting ? 'Accepting…' : 'Accept invitation'}
        </button>
      </div>
    </div>
  );
}
