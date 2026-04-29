'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { DashboardMetrics } from '@/components/requirements/DashboardMetrics';
import { FilterBar } from '@/components/requirements/FilterBar';
import { RequirementsList } from '@/components/requirements/RequirementsList';
import { RequirementDetail } from '@/components/requirements/RequirementDetail';
import { useRequirements } from '@/hooks/useRequirements';
import type { Requirement, RequirementType } from '@/lib/types';

export default function RequirementsPage() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId') ?? undefined;
  const [activeType, setActiveType] = useState<RequirementType | 'all'>('all');
  const [showAmbiguous, setShowAmbiguous] = useState(false);
  const [selected, setSelected] = useState<Requirement | null>(null);

  const { requirements, loading, refetch } = useRequirements({
    documentId,
    type: activeType,
    ambiguous: showAmbiguous || undefined,
  });

  async function handleFlag(id: string) {
    await fetch(`/api/requirements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_ambiguous: true }),
    });
    refetch();
  }

  function handleExportCsv() {
    if (documentId) window.open(`/api/export/csv?documentId=${documentId}`, '_blank');
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Requirements" actions={
        documentId ? (
          <button onClick={handleExportCsv}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Export CSV
          </button>
        ) : null
      } />
      <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
        <DashboardMetrics requirements={requirements} />
        <FilterBar activeType={activeType} showAmbiguous={showAmbiguous}
          onTypeChange={setActiveType} onAmbiguousToggle={() => setShowAmbiguous(v => !v)} />
        <div className="flex flex-1 gap-4 overflow-hidden">
          <RequirementsList requirements={requirements} selectedId={selected?.id ?? null}
            onSelect={setSelected} loading={loading} />
          <RequirementDetail requirement={selected} onFlag={handleFlag}
            onExportCsv={documentId ? handleExportCsv : undefined} />
        </div>
      </main>
    </div>
  );
}
