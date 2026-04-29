'use client';
import { useState, useEffect } from 'react';
import { Document } from '@/lib/types';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(data => { setDocuments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { documents, loading };
}
