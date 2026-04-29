import { Requirement } from '@/lib/types';

export function requirementsToCsv(requirements: Requirement[]): string {
  const header = 'ID,Type,Category,Priority,Confidence,Text,Source Quote,Source Page,Ambiguous';
  const rows = requirements.map(r => [
    r.req_id,
    r.type,
    r.category ?? '',
    r.priority,
    `${(r.confidence * 100).toFixed(0)}%`,
    `"${r.text.replace(/"/g, '""')}"`,
    `"${(r.source_quote ?? '').replace(/"/g, '""')}"`,
    r.source_page ?? '',
    r.is_ambiguous ? 'Yes' : 'No',
  ].join(','));
  return [header, ...rows].join('\n');
}
