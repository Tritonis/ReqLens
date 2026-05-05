'use client';
import { useState, useEffect } from 'react';
import { Document } from '@/lib/types';

export function useDocuments(orgId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    fetch('/api/documents', { headers: { 'x-org-id': orgId } })
      .then(r => r.json())
      .then(data => { setDocuments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [orgId]);

  return { documents, loading };
}
