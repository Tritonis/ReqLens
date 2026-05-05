'use client';
import { useState, useEffect, useCallback } from 'react';
import { Requirement, RequirementType, Priority } from '@/lib/types';

interface Filters {
  orgId?: string;
  documentId?: string;
  type?: RequirementType | 'all';
  priority?: Priority;
  ambiguous?: boolean;
  assignedToMe?: boolean;
}

export function useRequirements(filters: Filters = {}) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirements = useCallback(async () => {
    if (!filters.orgId) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.documentId) params.set('documentId', filters.documentId);
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.ambiguous) params.set('ambiguous', 'true');
    if (filters.assignedToMe) params.set('assignedToMe', 'true');

    try {
      const res = await fetch(`/api/requirements?${params}`, {
        headers: { 'x-org-id': filters.orgId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequirements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters.orgId, filters.documentId, filters.type, filters.priority, filters.ambiguous, filters.assignedToMe]);

  useEffect(() => { fetchRequirements(); }, [fetchRequirements]);

  return { requirements, loading, error, refetch: fetchRequirements };
}
