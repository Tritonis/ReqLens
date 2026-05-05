'use client';
import { OrgMember } from '@/lib/types';

const FLAGS = [
  { key: 'can_upload',       label: 'Upload' },
  { key: 'can_review',       label: 'Review' },
  { key: 'can_export',       label: 'Export' },
  { key: 'can_manage_users', label: 'Admin' },
] as const;

interface Props {
  members: OrgMember[];
  orgId: string;
  currentUserId: string;
  ownerId: string;
  onUpdate: () => void;
}

export function MemberList({ members, orgId, currentUserId, ownerId, onUpdate }: Props) {
  async function toggleFlag(userId: string, flag: string, current: boolean) {
    await fetch(`/api/orgs/${orgId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
      body: JSON.stringify({ [flag]: !current }),
    });
    onUpdate();
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member?')) return;
    await fetch(`/api/orgs/${orgId}/members/${userId}`, {
      method: 'DELETE', headers: { 'x-org-id': orgId },
    });
    onUpdate();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 font-medium text-gray-500">Member</th>
            {FLAGS.map(f => <th key={f.key} className="text-center py-2 px-3 font-medium text-gray-500">{f.label}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.user_id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-800">
                {m.email}
                {m.user_id === ownerId && <span className="ml-2 text-xs text-blue-600 font-medium">Owner</span>}
              </td>
              {FLAGS.map(f => (
                <td key={f.key} className="text-center py-2 px-3">
                  <input type="checkbox" checked={m[f.key]} disabled={m.user_id === ownerId}
                    onChange={() => toggleFlag(m.user_id, f.key, m[f.key])}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40" />
                </td>
              ))}
              <td className="py-2 px-3">
                {m.user_id !== ownerId && m.user_id !== currentUserId && (
                  <button onClick={() => removeMember(m.user_id)}
                    className="text-xs text-red-500 hover:text-red-700">Remove</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
