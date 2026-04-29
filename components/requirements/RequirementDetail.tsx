'use client';
import { Requirement } from '@/lib/types';
import { ConfidenceBar } from '@/components/ui/ConfidenceBar';

interface Props { requirement: Requirement | null; onFlag: (id: string) => void; onExportCsv?: () => void; }

export function RequirementDetail({ requirement: r, onFlag, onExportCsv }: Props) {
  if (!r) return (
    <div className="w-72 shrink-0 border-l border-gray-100 flex items-center justify-center text-sm text-gray-400 p-5">
      Select a requirement
    </div>
  );

  const priorityColor: Record<string, string> = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-green-700' };

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
