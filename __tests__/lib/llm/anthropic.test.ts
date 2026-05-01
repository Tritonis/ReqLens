jest.mock('@anthropic-ai/sdk', () => {
  const mockStream = jest.fn();
  const MockAnthropic = jest.fn().mockImplementation(() => ({ messages: { stream: mockStream } }));
  (MockAnthropic as any).__mockStream = mockStream;
  return { __esModule: true, default: MockAnthropic };
});

import Anthropic from '@anthropic-ai/sdk';
import { extractRequirements } from '@/lib/llm/anthropic';

const mockStream = (Anthropic as any).__mockStream as jest.Mock;

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

function mockFinalMessage(payload: object) {
  return {
    finalMessage: jest.fn().mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', input: payload }],
    }),
  };
}

beforeEach(() => mockStream.mockReset());

test('parses Claude response into ExtractionResult', async () => {
  mockStream.mockReturnValueOnce(mockFinalMessage(mockPayload));
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
  mockStream.mockReturnValueOnce(mockFinalMessage(payload));
  const result = await extractRequirements('text', { functional: true, nonFunctional: false, constraints: false }, 'doc');
  expect(result.requirements[0].confidence).toBe(1);
});

test('throws on max_tokens stop reason', async () => {
  mockStream.mockReturnValueOnce({
    finalMessage: jest.fn().mockResolvedValueOnce({
      stop_reason: 'max_tokens',
      content: [],
    }),
  });
  await expect(
    extractRequirements('text', { functional: true, nonFunctional: true, constraints: true }, 'doc')
  ).rejects.toThrow('too many requirements');
});
