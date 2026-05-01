jest.mock('../../../lib/llm/anthropic');
jest.mock('../../../lib/llm/openai-compatible');

import { extractRequirements as mockAnthropicExtract } from '../../../lib/llm/anthropic';
import { extractRequirements as mockOpenAIExtract } from '../../../lib/llm/openai-compatible';
import { extractRequirements } from '../../../lib/llm/index';

const mockAnthropicFn = mockAnthropicExtract as jest.Mock;
const mockOpenAIFn = mockOpenAIExtract as jest.Mock;

const opts = { functional: true, nonFunctional: false, constraints: false };
const emptyResult = { requirements: [], summary: '' };

beforeEach(() => {
  mockAnthropicFn.mockResolvedValue(emptyResult);
  mockOpenAIFn.mockResolvedValue(emptyResult);
});

afterEach(() => {
  delete process.env.LLM_PROVIDER;
  delete process.env.LLM_BASE_URL;
  delete process.env.LLM_MODEL;
  jest.clearAllMocks();
});

test('routes to Anthropic provider when LLM_PROVIDER=anthropic', async () => {
  process.env.LLM_PROVIDER = 'anthropic';
  await extractRequirements('text', opts, 'doc.txt');
  expect(mockAnthropicFn).toHaveBeenCalledTimes(1);
  expect(mockOpenAIFn).not.toHaveBeenCalled();
});

test('routes to Anthropic provider when LLM_PROVIDER is not set', async () => {
  delete process.env.LLM_PROVIDER;
  await extractRequirements('text', opts, 'doc.txt');
  expect(mockAnthropicFn).toHaveBeenCalledTimes(1);
  expect(mockOpenAIFn).not.toHaveBeenCalled();
});

test('routes to OpenAI-compatible provider when LLM_PROVIDER=openai-compatible', async () => {
  process.env.LLM_PROVIDER = 'openai-compatible';
  process.env.LLM_BASE_URL = 'http://localhost:11434/v1';
  process.env.LLM_MODEL = 'qwen2.5:7b';
  await extractRequirements('text', opts, 'doc.txt');
  expect(mockOpenAIFn).toHaveBeenCalledTimes(1);
  expect(mockAnthropicFn).not.toHaveBeenCalled();
});

test('throws when LLM_PROVIDER=openai-compatible but LLM_BASE_URL is missing', async () => {
  process.env.LLM_PROVIDER = 'openai-compatible';
  process.env.LLM_MODEL = 'qwen2.5:7b';
  delete process.env.LLM_BASE_URL;
  await expect(extractRequirements('text', opts, 'doc.txt'))
    .rejects.toThrow('LLM_BASE_URL and LLM_MODEL must be set');
});

test('throws when LLM_PROVIDER=openai-compatible but LLM_MODEL is missing', async () => {
  process.env.LLM_PROVIDER = 'openai-compatible';
  process.env.LLM_BASE_URL = 'http://localhost:11434/v1';
  delete process.env.LLM_MODEL;
  await expect(extractRequirements('text', opts, 'doc.txt'))
    .rejects.toThrow('LLM_BASE_URL and LLM_MODEL must be set');
});

test('throws on unknown LLM_PROVIDER value', async () => {
  process.env.LLM_PROVIDER = 'unsupported';
  await expect(extractRequirements('text', opts, 'doc.txt'))
    .rejects.toThrow('Unknown LLM_PROVIDER');
});
