'use client';
import { useState, useCallback } from 'react';
import { ExtractionOptions } from '@/lib/types';

export type AnalysisStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export function useAnalysis(orgId?: string) {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [reqCount, setReqCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (file: File | null, text: string, options: ExtractionOptions) => {
    setStatus('uploading');
    setError(null);
    const formData = new FormData();
    if (file) formData.append('file', file);
    else formData.append('text', text);
    formData.append('options', JSON.stringify(options));
    setStatus('processing');
    try {
      const headers: HeadersInit = {};
      if (orgId) headers['x-org-id'] = orgId;
      const res = await fetch('/api/upload', { method: 'POST', body: formData, headers });
      const data = await res.json();
      if (!res.ok) { setStatus('error'); setError(data.error ?? 'Analysis failed'); return null; }
      setDocumentId(data.documentId);
      setReqCount(data.count);
      setStatus('done');
      return data.documentId as string;
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
      return null;
    }
  }, [orgId]);

  const reset = useCallback(() => {
    setStatus('idle'); setDocumentId(null); setReqCount(0); setError(null);
  }, []);

  return { status, documentId, reqCount, error, analyze, reset };
}
