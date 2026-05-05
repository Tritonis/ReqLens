import { renderHook, waitFor } from '@testing-library/react';
import { useRequirements } from '@/hooks/useRequirements';

global.fetch = jest.fn();

const mockReqs = [{ id: 'r1', req_id: 'REQ-001', text: 'Shall do X', type: 'functional', priority: 'high', confidence: 0.9, is_ambiguous: false }];

beforeEach(() => (fetch as jest.Mock).mockReset());

test('fetches and returns requirements', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockReqs });
  const { result } = renderHook(() => useRequirements({ orgId: 'org1', documentId: 'doc1' }));
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.requirements).toEqual(mockReqs);
});

test('sets error on failed fetch', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Not found' }) });
  const { result } = renderHook(() => useRequirements({ orgId: 'org1' }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Not found');
});

test('skips fetch when orgId is not provided', async () => {
  const { result } = renderHook(() => useRequirements());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(fetch).not.toHaveBeenCalled();
  expect(result.current.requirements).toEqual([]);
});
