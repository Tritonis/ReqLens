'use client';
import { useState, useEffect } from 'react';
import { Requirement, OrgMember, RequirementAssignment } from '@/lib/types';
import { ConfidenceBar } from '@/components/ui/ConfidenceBar';
import { useOrgContext } from '@/lib/context/OrgContext';

interface Props { requirement: Requirement | null; onFlag: (id: string) => void; onExportCsv?: () => void; }

export function RequirementDetail({ requirement: r, onFlag, onExportCsv }: Props) {
  const { activeOrg } = useOrgContext();
  const [assignments, setAssignments] = useState<RequirementAssignment[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);

  useEffect(() => {
    if (!r || !activeOrg) return;
    const rId = r.id;
    const orgId = activeOrg.id;
    const h = { 'x-org-id': orgId };
    fetch(`/api/requirements/${rId}/assignments`, { headers: h })
      .then(res => res.json()).then(d => { if (Array.isArray(d)) setAssignments(d); }).catch(() => {});
    fetch(`/api/orgs/${orgId}/members`, { headers: h })
      .then(res => res.json()).then(d => { if (Array.isArray(d)) setMembers(d); }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.id, activeOrg?.id]);

  async function addAssignment(assigneeId: string) {
    if (!r || !activeOrg) return;
    await fetch(`/api/requirements/${r.id}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-org-id': activeOrg.id },
      body: JSON.stringify({ assignee_id: assigneeId }),
    });
    fetch(`/api/requirements/${r.id}/assignments`, { headers: { 'x-org-id': activeOrg.id } })
      .then(res => res.json()).then(d => { if (Array.isArray(d)) setAssignments(d); });
  }

  async function removeAssignment(assigneeId: string) {
    if (!r || !activeOrg) return;
    await fetch(`/api/requirements/${r.id}/assignments/${assigneeId}`, {
      method: 'DELETE', headers: { 'x-org-id': activeOrg.id },
    });
    setAssignments(prev => prev.filter(a => a.assignee_id !== assigneeId));
  }

  if (!r) return (
    <div className="w-72 shrink-0 border-l border-gray-100 flex items-center justify-center text-sm text-gray-400 p-5">
      Select a requirement
    </div>
  );

  const priorityColor: Record<string, string> = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-green-700' };
  const assignedIds = new Set(assignments.map(a => a.assignee_id));
  const unassignedMembers = members.filter(m => !assignedIds.has(m.user_id));
  const canReview = activeOrg?.member.can_review ?? false;

  return (
    <div className="w-72 shrink-0 border-l border-gray-100 flex flex-col gap-5 p-5 overflow-y-auto">
      <section>
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Requirement</h3>
        <p className="text-xs font-semibold text-blue-600 mb-1">{r.req_id}</p>
        <p className="text-sm text-gray-800 leading-relaxed">{r.text}</p>
      </section>
      {r.source_quote && (
        <section>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Source excerpt</h3>
          <blockquote className="border-l-2 border-blue-300 pl-3 text-xs text-gray-500 italic leading-relaxed">
            {r.source_quote}
            {r.source_page && <span className="block mt-1 not-italic text-gray-400">p. {r.source_page}</span>}
          </blockquote>
        </section>
      )}
      <section>
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Attributes</h3>
        <div className="space-y-1.5">
          {[['Type', r.type], ['Category', r.category ?? '—']].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs font-medium text-gray-800">{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-1 border-b border-gray-50">
            <span className="text-xs text-gray-500">Priority</span>
            <span className={`text-xs font-medium ${priorityColor[r.priority] ?? ''}`}>{r.priority}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-50">
            <span className="text-xs text-gray-500">Confidence</span>
            <div className="flex items-center gap-2">
              <ConfidenceBar value={r.confidence} />
              <span className="text-xs font-medium">{Math.round(r.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      </section>
      <section>
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Assigned to</h3>
        <div className="space-y-1.5">
          {assignments.map(a => (
            <div key={a.assignee_id} className="flex items-center justify-between">
              <span className="text-xs text-gray-700">{a.email}</span>
              {canReview && (
                <button onClick={() => removeAssignment(a.assignee_id)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
              )}
            </div>
          ))}
          {canReview && unassignedMembers.length > 0 && (
            <select defaultValue="" onChange={e => { if (e.target.value) addAssignment(e.target.value); e.target.value = ''; }}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1">
              <option value="" disabled>Add assignee…</option>
              {unassignedMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.email}</option>
              ))}
            </select>
          )}
          {assignments.length === 0 && <p className="text-xs text-gray-400">No assignees</p>}
        </div>
      </section>
      <section>
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Actions</h3>
        <div className="flex flex-col gap-2">
          {onExportCsv && (
            <button onClick={onExportCsv}
              className="text-sm px-3 py-2 rounded-lg bg-blue-600 text-white text-left hover:bg-blue-700 transition-colors">
              Export CSV
            </button>
          )}
          <button onClick={() => onFlag(r.id)}
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors">
            Flag as ambiguous
          </button>
        </div>
      </section>
    </div>
  );
}
