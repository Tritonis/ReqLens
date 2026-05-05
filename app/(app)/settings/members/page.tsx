'use client';
import { useState, useEffect, useCallback } from 'react';
import { useOrgContext } from '@/lib/context/OrgContext';
import { Topbar } from '@/components/layout/Topbar';
import { MemberList } from '@/components/org/MemberList';
import { InviteForm } from '@/components/org/InviteForm';
import { OrgMember, OrgInvitation } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function MembersPage() {
  const { activeOrg } = useOrgContext();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    const headers = { 'x-org-id': activeOrg.id };
    const [mRes, iRes] = await Promise.all([
      fetch(`/api/orgs/${activeOrg.id}/members`, { headers }),
      fetch(`/api/orgs/${activeOrg.id}/invitations`, { headers }),
    ]);
    if (mRes.ok) setMembers(await mRes.json());
    if (iRes.ok) setInvitations(await iRes.json());
  }, [activeOrg]);

  useEffect(() => { load(); }, [load]);

  if (!activeOrg?.member.can_manage_users) {
    return <div className="flex flex-col flex-1"><Topbar title="Members" /><main className="p-6 text-gray-500 text-sm">Access denied.</main></div>;
  }

  async function revokeInvitation(invitationId: string) {
    await fetch(`/api/orgs/${activeOrg!.id}/invitations`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-org-id': activeOrg!.id },
      body: JSON.stringify({ invitationId }),
    });
    load();
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Members" actions={
        <button onClick={() => { setShowInvite(v => !v); setInviteUrl(null); }}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          {showInvite ? 'Cancel' : 'Invite member'}
        </button>
      } />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8">
        {showInvite && (
          <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Invite a member</h2>
            <InviteForm orgId={activeOrg.id} onInvited={url => { setInviteUrl(url); setShowInvite(false); load(); }} />
          </section>
        )}
        {inviteUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
            <p className="font-medium text-green-800">Invitation created</p>
            <p className="text-green-700 break-all">{inviteUrl}</p>
            <button onClick={() => { navigator.clipboard.writeText(inviteUrl); }} className="text-xs text-green-600 underline">Copy link</button>
          </div>
        )}
        <section className="bg-white rounded-xl border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 px-5 py-4 border-b border-gray-100">Current members</h2>
          <MemberList members={members} orgId={activeOrg.id} currentUserId={currentUserId} ownerId={activeOrg.owner_id} onUpdate={load} />
        </section>
        {invitations.filter(i => !i.accepted_at).length > 0 && (
          <section className="bg-white rounded-xl border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800 px-5 py-4 border-b border-gray-100">Pending invitations</h2>
            <div className="divide-y divide-gray-50">
              {invitations.filter(i => !i.accepted_at).map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-gray-800">{inv.email}</p>
                    <p className="text-xs text-gray-400">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => revokeInvitation(inv.id)} className="text-xs text-red-500 hover:text-red-700">Revoke</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
