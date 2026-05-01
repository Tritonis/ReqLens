const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { extractRequirements } from '../../../lib/llm/openai-compatible';

const validResponse = {
  requirements: [{
    text: 'The system shall allow users to log in.',
    source_quote: 'Users must be able to log in',
    source_page: 1,
    type: 'functional',
    category: 'user-interface',
    priority: 'high',
    confidence: 0.95,
    is_ambiguous: false,
    ambiguity_reason: null,
  }],
  summary: 'Login requirement extracted.',
};

function makeResponse(payload: object) {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

beforeEach(() => {
  process.env.LLM_BASE_URL = 'http://localhost:11434/v1';
  process.env.LLM_MODEL = 'qwen2.5:7b';
  process.env.LLM_API_KEY = 'ollama';
  mockCreate.mockResolvedValue(makeResponse(validResponse));
});

afterEach(() => {
  delete process.env.LLM_BASE_URL;
  delete process.env.LLM_MODEL;
  delete process.env.LLM_API_KEY;
  jest.clearAllMocks();
});

test('sends json_object response_format and correct model name', async () => {
  await extractRequirements('Some text', { functional: true, nonFunctional: false, constraints: false }, 'doc.txt');

  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    response_format: { type: 'json_object' },
    model: 'qwen2.5:7b',
  }));
});

test('parses model response into ExtractionResult', async () => {
  const result = await extractRequirements('Some text', { functional: true, nonFunctional: false, constraints: false }, 'doc.txt');

  expect(result.requirements).toHaveLength(1);
  expect(result.requirements[0].text).toBe('The system shall allow users to log in.');
  expect(result.summary).toBe('Login requirement extracted.');
});

test('clamps confidence above 1 down to 1', async () => {
  mockCreate.mockResolvedValue(makeResponse({
    ...validResponse,
    requirements: [{ ...validResponse.requirements[0], confidence: 2.0 }],
  }));

  const result = await extractRequirements('text', { functional: true, nonFunctional: false, constraints: false }, 'doc.txt');
  expect(result.requirements[0].confidence).toBe(1);
});

test('throws on scanned PDF input (pdfBuffer present, empty text)', async () => {
  await expect(
    extractRequirements('', { functional: true, nonFunctional: false, constraints: false }, 'scan.pdf', Buffer.from('bytes'))
  ).rejects.toThrow('Scanned PDF extraction requires the Anthropic provider');
});

test('chunks large documents and merges all requirements', async () => {
  const largeText = 'x'.repeat(85_000); // spans 3 chunks at 40K each
  const chunk2 = { requirements: [{ ...validResponse.requirements[0], text: 'Second requirement.' }], summary: 'chunk 2' };
  const chunk3 = { requirements: [], summary: 'chunk 3' };

  mockCreate
    .mockResolvedValueOnce(makeResponse(validResponse))
    .mockResolvedValueOnce(makeResponse(chunk2))
    .mockResolvedValueOnce(makeResponse(chunk3));

  const result = await extractRequirements(largeText, { functional: true, nonFunctional: false, constraints: false }, 'large.txt');

  expect(mockCreate).toHaveBeenCalledTimes(3);
  expect(result.requirements).toHaveLength(2);
  expect(result.summary).toBe('Login requirement extracted.');
});

test('throws when model returns invalid JSON', async () => {
  mockCreate.mockResolvedValue({ choices: [{ message: { content: 'not valid json {{{' } }] });

  await expect(
    extractRequirements('text', { functional: true, nonFunctional: false, constraints: false }, 'doc.txt')
  ).rejects.toThrow('Model returned invalid JSON');
});

test('throws when LLM_BASE_URL is not set', async () => {
  delete process.env.LLM_BASE_URL;

  await expect(
    extractRequirements('text', { functional: true, nonFunctional: false, constraints: false }, 'doc.txt')
  ).rejects.toThrow('LLM_BASE_URL is required');
});

test('throws when LLM_MODEL is not set', async () => {
  delete process.env.LLM_MODEL;

  await expect(
    extractRequirements('text', { functional: true, nonFunctional: false, constraints: false }, 'doc.txt')
  ).rejects.toThrow('LLM_MODEL is required');
});
