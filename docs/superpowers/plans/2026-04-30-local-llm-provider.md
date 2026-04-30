# Local LLM Provider Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abstract the LLM provider so ReqLens can use Anthropic Claude or any OpenAI-compatible local endpoint (e.g. Ollama) for requirements extraction, selected via the `LLM_PROVIDER` environment variable.

**Architecture:** Introduce `lib/llm/` with four files: `prompt.ts` (shared system prompt, JSON schema description, chunk utilities), `anthropic.ts` (current `lib/anthropic.ts` moved here), `openai-compatible.ts` (new, uses `openai` npm package with JSON mode), and `index.ts` (factory that reads `LLM_PROVIDER` and delegates). The only application-code change is one import line in `app/api/upload/route.ts`. Docker Compose and an init script add Ollama as a local inference service.

**Tech Stack:** Next.js 14, TypeScript, `@anthropic-ai/sdk`, `openai` (new), Jest, Docker Compose, Ollama

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/llm/prompt.ts` | `SYSTEM_PROMPT`, `JSON_SCHEMA_DESCRIPTION`, `chunkText()`, `buildTypeFilter()`, `CHUNK_SIZE` |
| Create | `lib/llm/anthropic.ts` | Anthropic SDK provider (moved from `lib/anthropic.ts`, imports from `./prompt`) |
| Create | `lib/llm/openai-compatible.ts` | OpenAI SDK provider for any compatible endpoint |
| Create | `lib/llm/index.ts` | Factory: reads `LLM_PROVIDER`, validates config, delegates to correct provider |
| Delete | `lib/anthropic.ts` | Replaced by `lib/llm/anthropic.ts` |
| Modify | `app/api/upload/route.ts:4` | Update import path |
| Create | `__tests__/lib/llm/prompt.test.ts` | Tests for `chunkText`, `buildTypeFilter` |
| Create | `__tests__/lib/llm/anthropic.test.ts` | Migrated from `__tests__/lib/anthropic/anthropic.test.ts` |
| Delete | `__tests__/lib/anthropic/anthropic.test.ts` | Replaced by `__tests__/lib/llm/anthropic.test.ts` |
| Create | `__tests__/lib/llm/openai-compatible.test.ts` | Tests for OpenAI-compatible provider |
| Create | `__tests__/lib/llm/index.test.ts` | Tests for factory routing and validation |
| Create | `docker-compose.yml` | Ollama service for local development |
| Create | `scripts/ollama-init.sh` | Pulls the configured model from Ollama on first run |
| Create | `.env.local.example` | Documents all env vars including new `LLM_*` vars |

---

### Task 1: Establish a baseline and install the openai package

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Run the existing test suite to confirm a clean baseline**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 2: Install the openai npm package**

```bash
npm install openai
```

- [ ] **Step 3: Verify the package is present**

```bash
npm ls openai
```
Expected: output shows `openai@x.x.x` (version may vary).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add openai package for local LLM provider support"
```

---

### Task 2: Create lib/llm/prompt.ts — shared prompt utilities

**Files:**
- Create: `lib/llm/prompt.ts`
- Create: `__tests__/lib/llm/prompt.test.ts`

- [ ] **Step 1: Write failing tests for chunkText and buildTypeFilter**

Create `__tests__/lib/llm/prompt.test.ts`:

```typescript
import { chunkText, buildTypeFilter, CHUNK_SIZE } from '../../../lib/llm/prompt';

describe('chunkText', () => {
  it('returns single chunk when text is shorter than chunk size', () => {
    expect(chunkText('hello world', 100)).toEqual(['hello world']);
  });

  it('splits text into multiple chunks at the given size', () => {
    const text = 'x'.repeat(250);
    const chunks = chunkText(text, 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });

  it('uses CHUNK_SIZE as default when chunkSize is not specified', () => {
    const text = 'x'.repeat(CHUNK_SIZE + 1);
    expect(chunkText(text)).toHaveLength(2);
  });
});

describe('buildTypeFilter', () => {
  it('includes all types when all options are true', () => {
    expect(
      buildTypeFilter({ functional: true, nonFunctional: true, constraints: true })
    ).toBe('functional requirements, non-functional requirements, constraints');
  });

  it('includes only selected types', () => {
    expect(
      buildTypeFilter({ functional: true, nonFunctional: false, constraints: true })
    ).toBe('functional requirements, constraints');
  });

  it('returns empty string when no options are selected', () => {
    expect(
      buildTypeFilter({ functional: false, nonFunctional: false, constraints: false })
    ).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="lib/llm/prompt"
```
Expected: FAIL — `Cannot find module '../../../lib/llm/prompt'`

- [ ] **Step 3: Create lib/llm/prompt.ts**

```typescript
import { ExtractionOptions } from '../types';

export const SYSTEM_PROMPT = `You are a senior business analyst and requirements engineer. Your job is to extract, classify, and structure requirements from documents.

For each requirement you find, you must output:
- text: A clear, unambiguous requirement statement (rewrite in "shall/should/must" format if needed)
- source_quote: The verbatim text from the document that led to this requirement (max 200 chars)
- source_page: Page number if determinable from context clues, otherwise null
- type: One of "functional" | "non-functional" | "constraint" | "ambiguous"
- category: Subcategory — for functional: "data", "user-interface", "integration", "reporting", "workflow"; for non-functional: "performance", "security", "scalability", "usability", "availability"; for constraints: "budget", "timeline", "technology", "regulatory", "resource"
- priority: "high" | "medium" | "low" — infer from language ("must", "critical", "required" = high; "should", "preferred" = medium; "may", "nice to have" = low)
- confidence: Float 0.0–1.0 representing how certain you are this is a genuine requirement
- is_ambiguous: true if the requirement is vague, contradictory, or missing measurable acceptance criteria
- ambiguity_reason: If ambiguous, briefly explain why (max 100 chars)

Rules:
- Extract ALL requirements, even implicit ones buried in descriptive prose
- Do NOT invent requirements not supported by the text
- Split compound requirements into separate items
- Normalise passive voice and vague language into clear "shall" statements
- Confidence < 0.7 means mark as ambiguous`;

export const JSON_SCHEMA_DESCRIPTION = `Respond with ONLY a JSON object. No explanation, no markdown code fences.

Required schema:
{
  "requirements": [
    {
      "text": "<string> clear requirement in shall/should/must format",
      "source_quote": "<string|null> verbatim text from document, max 200 chars",
      "source_page": "<integer|null> page number if determinable",
      "type": "<'functional'|'non-functional'|'constraint'|'ambiguous'>",
      "category": "<string> subcategory as described above",
      "priority": "<'high'|'medium'|'low'>",
      "confidence": "<number 0.0-1.0>",
      "is_ambiguous": "<boolean>",
      "ambiguity_reason": "<string|null> brief reason if ambiguous, max 100 chars"
    }
  ],
  "summary": "<string> brief summary of the document and extracted requirements"
}`;

export const CHUNK_SIZE = 40_000;

export function chunkText(text: string, chunkSize: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export function buildTypeFilter(options: ExtractionOptions): string {
  return [
    options.functional && 'functional requirements',
    options.nonFunctional && 'non-functional requirements',
    options.constraints && 'constraints',
  ].filter(Boolean).join(', ');
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="lib/llm/prompt"
```
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/llm/prompt.ts __tests__/lib/llm/prompt.test.ts
git commit -m "feat: add shared LLM prompt utilities (SYSTEM_PROMPT, chunkText, buildTypeFilter)"
```

---

### Task 3: Move lib/anthropic.ts → lib/llm/anthropic.ts

**Files:**
- Create: `lib/llm/anthropic.ts`
- Create: `__tests__/lib/llm/anthropic.test.ts`
- Delete: `lib/anthropic.ts`
- Delete: `__tests__/lib/anthropic/anthropic.test.ts`

- [ ] **Step 1: Create lib/llm/anthropic.ts**

This is the existing `lib/anthropic.ts` with two changes: the import path for types is updated (`../types`), and `SYSTEM_PROMPT`, `CHUNK_SIZE`, `chunkText`, `buildTypeFilter` come from `./prompt` instead of being defined inline.

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { ExtractionOptions, ExtractionResult, ExtractedRequirement } from '../types';
import { SYSTEM_PROMPT, CHUNK_SIZE, chunkText, buildTypeFilter } from './prompt';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'extract_requirements',
  description: 'Extract and structure requirements from a document',
  input_schema: {
    type: 'object',
    properties: {
      requirements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text:             { type: 'string' },
            source_quote:     { type: 'string' },
            source_page:      { type: ['integer', 'null'] },
            type:             { type: 'string', enum: ['functional', 'non-functional', 'constraint', 'ambiguous'] },
            category:         { type: 'string' },
            priority:         { type: 'string', enum: ['high', 'medium', 'low'] },
            confidence:       { type: 'number' },
            is_ambiguous:     { type: 'boolean' },
            ambiguity_reason: { type: 'string' },
          },
          required: ['text', 'type', 'priority', 'confidence', 'is_ambiguous'],
        },
      },
      summary: { type: 'string' },
    },
    required: ['requirements', 'summary'],
  },
};

async function callClaude(
  userContent: Anthropic.MessageParam['content']
): Promise<ExtractionResult> {
  const response = await getClient().messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 64000,
    system: SYSTEM_PROMPT,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: 'tool', name: 'extract_requirements' },
    messages: [{ role: 'user', content: userContent }],
  }).finalMessage();

  if (response.stop_reason === 'max_tokens') {
    throw new Error('A document section produced too many requirements. Try splitting the document into smaller parts.');
  }

  const toolBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not return a tool_use response block');
  }

  const result = toolBlock.input as ExtractionResult;
  result.requirements = result.requirements.map(r => ({
    ...r,
    confidence: Math.min(1, Math.max(0, r.confidence)),
  }));
  return result;
}

export async function extractRequirements(
  text: string,
  options: ExtractionOptions,
  documentName: string,
  pdfBuffer?: Buffer
): Promise<ExtractionResult> {
  const typeFilter = buildTypeFilter(options);

  if (!text.trim() && pdfBuffer) {
    const content: Anthropic.MessageParam['content'] = [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') },
      } as Anthropic.Base64PDFSource & { type: 'document' },
      { type: 'text', text: `Document: "${documentName}"\n\nExtract the following: ${typeFilter}.` },
    ];
    return callClaude(content);
  }

  if (text.length <= CHUNK_SIZE) {
    const prompt = `Document: "${documentName}"\n\nExtract the following: ${typeFilter}.\n\n--- DOCUMENT START ---\n${text}\n--- DOCUMENT END ---`;
    return callClaude(prompt);
  }

  const chunks = chunkText(text);
  const allRequirements: ExtractedRequirement[] = [];
  let summary = '';

  for (let i = 0; i < chunks.length; i++) {
    const prompt = `Document: "${documentName}" (section ${i + 1} of ${chunks.length})\n\nExtract the following: ${typeFilter}.\n\n--- SECTION START ---\n${chunks[i]}\n--- SECTION END ---`;
    const result = await callClaude(prompt);
    allRequirements.push(...result.requirements);
    if (i === 0) summary = result.summary;
  }

  return { requirements: allRequirements, summary };
}
```

- [ ] **Step 2: Create __tests__/lib/llm/anthropic.test.ts**

This is the existing `__tests__/lib/anthropic/anthropic.test.ts` with one change: the import on line 9 is updated to the new path.

```typescript
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
```

- [ ] **Step 3: Run migrated tests to confirm they pass**

```bash
npm test -- --testPathPattern="lib/llm/anthropic"
```
Expected: PASS — 3 tests pass.

- [ ] **Step 4: Delete old files**

```bash
rm lib/anthropic.ts
rm __tests__/lib/anthropic/anthropic.test.ts
rmdir __tests__/lib/anthropic
```

- [ ] **Step 5: Run all tests to confirm nothing broke**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/llm/anthropic.ts __tests__/lib/llm/anthropic.test.ts
git rm lib/anthropic.ts __tests__/lib/anthropic/anthropic.test.ts
git commit -m "refactor: move lib/anthropic.ts into lib/llm/anthropic.ts, import shared prompt utilities"
```

---

### Task 4: Write failing tests for the OpenAI-compatible provider

**Files:**
- Create: `__tests__/lib/llm/openai-compatible.test.ts`

- [ ] **Step 1: Create __tests__/lib/llm/openai-compatible.test.ts**

```typescript
const mockCreate = jest.fn();

jest.mock('openai', () => ({
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="lib/llm/openai-compatible"
```
Expected: FAIL — `Cannot find module '../../../lib/llm/openai-compatible'`

---

### Task 5: Implement lib/llm/openai-compatible.ts

**Files:**
- Create: `lib/llm/openai-compatible.ts`

- [ ] **Step 1: Create lib/llm/openai-compatible.ts**

```typescript
import OpenAI from 'openai';
import { ExtractionOptions, ExtractionResult, ExtractedRequirement } from '../types';
import { SYSTEM_PROMPT, JSON_SCHEMA_DESCRIPTION, CHUNK_SIZE, chunkText, buildTypeFilter } from './prompt';

function getClient(): OpenAI {
  const baseURL = process.env.LLM_BASE_URL;
  if (!baseURL) throw new Error('LLM_BASE_URL is required when LLM_PROVIDER=openai-compatible');
  return new OpenAI({ baseURL, apiKey: process.env.LLM_API_KEY ?? 'ollama' });
}

function getModel(): string {
  const model = process.env.LLM_MODEL;
  if (!model) throw new Error('LLM_MODEL is required when LLM_PROVIDER=openai-compatible');
  return model;
}

const OPENAI_SYSTEM_PROMPT = `${SYSTEM_PROMPT}\n\n${JSON_SCHEMA_DESCRIPTION}`;

async function callModel(userMessage: string): Promise<ExtractionResult> {
  const response = await getClient().chat.completions.create({
    model: getModel(),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: OPENAI_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response content from model');

  let result: ExtractionResult;
  try {
    result = JSON.parse(content) as ExtractionResult;
  } catch {
    throw new Error(`Model returned invalid JSON: ${content.slice(0, 200)}`);
  }

  if (!Array.isArray(result.requirements)) {
    throw new Error('Model response missing "requirements" array');
  }

  result.requirements = result.requirements.map((r: ExtractedRequirement) => ({
    ...r,
    confidence: Math.min(1, Math.max(0, r.confidence ?? 0)),
  }));

  return result;
}

export async function extractRequirements(
  text: string,
  options: ExtractionOptions,
  documentName: string,
  pdfBuffer?: Buffer
): Promise<ExtractionResult> {
  if (!text.trim() && pdfBuffer) {
    throw new Error(
      'Scanned PDF extraction requires the Anthropic provider. Set LLM_PROVIDER=anthropic or provide a text-based PDF.'
    );
  }

  const typeFilter = buildTypeFilter(options);

  if (text.length <= CHUNK_SIZE) {
    const prompt = `Document: "${documentName}"\n\nExtract the following: ${typeFilter}.\n\n--- DOCUMENT START ---\n${text}\n--- DOCUMENT END ---`;
    return callModel(prompt);
  }

  const chunks = chunkText(text);
  const allRequirements: ExtractedRequirement[] = [];
  let summary = '';

  for (let i = 0; i < chunks.length; i++) {
    const prompt = `Document: "${documentName}" (section ${i + 1} of ${chunks.length})\n\nExtract the following: ${typeFilter}.\n\n--- SECTION START ---\n${chunks[i]}\n--- SECTION END ---`;
    const result = await callModel(prompt);
    allRequirements.push(...result.requirements);
    if (i === 0) summary = result.summary;
  }

  return { requirements: allRequirements, summary };
}
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="lib/llm/openai-compatible"
```
Expected: PASS — 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/llm/openai-compatible.ts __tests__/lib/llm/openai-compatible.test.ts
git commit -m "feat: add OpenAI-compatible LLM provider for local inference (Ollama)"
```

---

### Task 6: Write failing tests for the factory

**Files:**
- Create: `__tests__/lib/llm/index.test.ts`

- [ ] **Step 1: Create __tests__/lib/llm/index.test.ts**

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="lib/llm/index"
```
Expected: FAIL — `Cannot find module '../../../lib/llm/index'`

---

### Task 7: Implement the factory and wire up the application

**Files:**
- Create: `lib/llm/index.ts`
- Modify: `app/api/upload/route.ts:4`

- [ ] **Step 1: Create lib/llm/index.ts**

```typescript
import { extractRequirements as extractAnthropic } from './anthropic';
import { extractRequirements as extractOpenAI } from './openai-compatible';
import { ExtractionOptions, ExtractionResult } from '../types';

export async function extractRequirements(
  text: string,
  options: ExtractionOptions,
  documentName: string,
  pdfBuffer?: Buffer
): Promise<ExtractionResult> {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';

  if (provider === 'openai-compatible') {
    if (!process.env.LLM_BASE_URL || !process.env.LLM_MODEL) {
      throw new Error('LLM_PROVIDER is "openai-compatible" but LLM_BASE_URL and LLM_MODEL must be set.');
    }
    return extractOpenAI(text, options, documentName, pdfBuffer);
  }

  if (provider === 'anthropic') {
    return extractAnthropic(text, options, documentName, pdfBuffer);
  }

  throw new Error(`Unknown LLM_PROVIDER: "${provider}". Must be "anthropic" or "openai-compatible".`);
}
```

- [ ] **Step 2: Run factory tests to confirm they pass**

```bash
npm test -- --testPathPattern="lib/llm/index"
```
Expected: PASS — 6 tests pass.

- [ ] **Step 3: Update import in app/api/upload/route.ts**

Change line 4 from:
```typescript
import { extractRequirements } from '@/lib/anthropic';
```
To:
```typescript
import { extractRequirements } from '@/lib/llm';
```

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/llm/index.ts __tests__/lib/llm/index.test.ts app/api/upload/route.ts
git commit -m "feat: add LLM factory (lib/llm/index.ts); wire app/api/upload to lib/llm"
```

---

### Task 8: Add Ollama infrastructure

**Files:**
- Create: `docker-compose.yml`
- Create: `scripts/ollama-init.sh`
- Create: `.env.local.example`

- [ ] **Step 1: Create docker-compose.yml at the repo root**

```yaml
services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```

- [ ] **Step 2: Create scripts/ollama-init.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

MODEL="${LLM_MODEL:-qwen2.5:7b}"
echo "Pulling Ollama model: $MODEL"
ollama pull "$MODEL"
echo "Done. $MODEL is ready at http://localhost:11434"
```

- [ ] **Step 3: Make the script executable**

```bash
chmod +x scripts/ollama-init.sh
```

- [ ] **Step 4: Create .env.local.example**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# LLM Provider
# "anthropic" (default) — uses Claude via Anthropic SDK, requires ANTHROPIC_API_KEY
# "openai-compatible"   — uses any OpenAI-compatible endpoint (e.g. Ollama)
LLM_PROVIDER=anthropic

# Required when LLM_PROVIDER=openai-compatible
# LLM_BASE_URL=http://localhost:11434/v1   # Ollama default; adjust host/port if needed
# LLM_MODEL=qwen2.5:7b                    # recommended; qwen2.5:3b for <8GB RAM, qwen2.5:14b for best quality
# LLM_API_KEY=ollama                       # required by OpenAI SDK; Ollama ignores the value

# Anthropic (required when LLM_PROVIDER=anthropic)
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml scripts/ollama-init.sh .env.local.example
git commit -m "feat: add Ollama Docker Compose service and setup script for local LLM inference"
```
