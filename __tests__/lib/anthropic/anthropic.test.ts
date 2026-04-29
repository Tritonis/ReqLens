jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  const MockAnthropic = jest.fn().mockImplementation(() => ({ messages: { create: mockCreate } }));
  (MockAnthropic as any).__mockCreate = mockCreate;
  return { __esModule: true, default: MockAnthropic };
});

import Anthropic from '@anthropic-ai/sdk';
import { extractRequirements } from '@/lib/anthropic';

const mockCreate = (Anthropic as any).__mockCreate as jest.Mock;

const mockPayload = {
  requirements: [{
    text: 'The system shall allow login.',
    source_quote: 'Users must log in.',
    source_page: 1,
    type: 'functional',
    category: 'user-interface',
    priority: 'high',
    confidence: 0.95,
    is_ambiguous: false,
    ambiguity_reason: null,
  }],
  summary: 'An auth requirements document.',
};

beforeEach(() => mockCreate.mockReset());

test('parses Claude response into ExtractionResult', async () => {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text: JSON.stringify(mockPayload) }],
  });
  const result = await extractRequirements(
    'Users must log in.',
    { functional: true, nonFunctional: true, constraints: true },
    'test.pdf'
  );
  expect(result.requirements).toHaveLength(1);
  expect(result.requirements[0].type).toBe('functional');
  expect(result.summary).toBe('An auth requirements document.');
});

test('clamps confidence above 1 down to 1', async () => {
  const payload = { ...mockPayload, requirements: [{ ...mockPayload.requirements[0], confidence: 1.5 }] };
  mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(payload) }] });
  const result = await extractRequirements('text', { functional: true, nonFunctional: false, constraints: false }, 'doc');
  expect(result.requirements[0].confidence).toBe(1);
});

test('throws on non-JSON response', async () => {
  mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] });
  await expect(
    extractRequirements('text', { functional: true, nonFunctional: true, constraints: true }, 'doc')
  ).rejects.toThrow('Failed to parse Claude response as JSON');
});
