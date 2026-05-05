'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropZone } from '@/components/upload/DropZone';
import { PasteBox } from '@/components/upload/PasteBox';
import { ExtractionOptions } from '@/components/upload/ExtractionOptions';
import { AnalysisProgress } from '@/components/analysis/AnalysisProgress';
import { RecentDocuments } from '@/components/upload/RecentDocuments';
import { Topbar } from '@/components/layout/Topbar';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useOrgContext } from '@/lib/context/OrgContext';
import type { ExtractionOptions as Options } from '@/lib/types';

const DEFAULT_OPTIONS: Options = { functional: true, nonFunctional: true, constraints: true };

export default function UploadPage() {
  const router = useRouter();
  const { activeOrg } = useOrgContext();
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const { status, reqCount, error, analyze } = useAnalysis(activeOrg?.id);

  const canAnalyze = (file !== null || pasteText.trim().length > 0) && status === 'idle' && !!activeOrg;

  async function handleAnalyze() {
    const docId = await analyze(file, pasteText, options);
    if (docId) setTimeout(() => router.push(`/requirements?documentId=${docId}`), 1500);
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Upload & Analyze" />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <DropZone onFile={f => { setFile(f); setPasteText(''); }} />
            {file && (
              <p className="text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span>
                <button onClick={() => setFile(null)} className="ml-2 text-gray-400 hover:text-gray-600">✕</button>
              </p>
            )}
          </div>
          <PasteBox value={pasteText} onChange={t => { setPasteText(t); if (t) setFile(null); }} />
        </div>
        <ExtractionOptions value={options} onChange={setOptions} />
        <div className="flex flex-col gap-3">
          <AnalysisProgress status={status} reqCount={reqCount} error={error} />
          <button onClick={handleAnalyze} disabled={!canAnalyze}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-start">
            Analyze document
          </button>
        </div>
        <div className="border-t border-gray-100 pt-6">
          <RecentDocuments orgId={activeOrg?.id} />
        </div>
      </main>
    </div>
  );
}
