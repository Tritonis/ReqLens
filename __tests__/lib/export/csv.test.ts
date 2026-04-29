import { requirementsToCsv } from '@/lib/export/csv';
import type { Requirement } from '@/lib/types';

const req: Requirement = {
  id: 'r1', document_id: 'd1', user_id: 'u1', req_id: 'REQ-001',
  text: 'The system shall "allow" login.',
  source_quote: 'Users must log in.',
  source_page: 2,
  type: 'functional', category: 'user-interface',
  priority: 'high', confidence: 0.95,
  is_ambiguous: false, notes: null, status: 'open', created_at: '',
};

test('generates CSV header and data row', () => {
  const csv = requirementsToCsv([req]);
  const lines = csv.split('\n');
  expect(lines[0]).toBe('ID,Type,Category,Priority,Confidence,Text,Source Quote,Source Page,Ambiguous');
  expect(lines[1]).toContain('REQ-001');
  expect(lines[1]).toContain('95%');
  expect(lines[1]).toContain('No');
});

test('escapes double quotes in text fields', () => {
  const csv = requirementsToCsv([req]);
  expect(csv).toContain('""allow""');
});
