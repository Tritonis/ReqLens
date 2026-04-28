import type { Document, Requirement } from '@/lib/types';

test('Document and Requirement shapes are assignable', () => {
  const doc: Document = {
    id: 'abc', user_id: 'u1', name: 'test.pdf', source_type: 'pdf',
    storage_path: null, status: 'done', error_msg: null,
    page_count: 10, req_count: 5, created_at: '', updated_at: '',
  };
  const req: Requirement = {
    id: 'r1', document_id: 'abc', user_id: 'u1', req_id: 'REQ-001',
    text: 'The system shall do X.', source_quote: null, source_page: null,
    type: 'functional', category: 'workflow', priority: 'high',
    confidence: 0.9, is_ambiguous: false, notes: null, status: 'open', created_at: '',
  };
  expect(doc.name).toBe('test.pdf');
  expect(req.req_id).toBe('REQ-001');
});
