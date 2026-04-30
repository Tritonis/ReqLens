# Local LLM Provider Support

**Date:** 2026-04-30  
**Status:** Approved

## Problem

ReqLens currently hard-codes the Anthropic SDK in `lib/anthropic.ts`. There is no way to use a locally-run model for requirements extraction without modifying application code. Teams that want data privacy, offline operation, or cost control have no alternative.

## Goal

Allow ReqLens to run requirements extraction against any OpenAI-compatible inference endpoint (Ollama, vLLM, or similar) in addition to Claude, with the provider selected at deploy time via environment variables. Provide a Docker Compose setup so developers can run Ollama locally with a single command.

## Scope

- LLM provider abstraction in `lib/llm/`
- OpenAI-compatible provider implementation using the `openai` npm package
- Ollama Docker Compose infrastructure (Ollama service only)
- Updated env var documentation
- Migrated and new unit tests

Out of scope: per-org or per-user provider selection, fine-tuning, model evaluation pipeline.

---

## Architecture

### Provider Abstraction (Option A — thin adapter)

The existing `lib/anthropic.ts` is moved to `lib/llm/anthropic.ts` with no logic changes. A new `lib/llm/openai-compatible.ts` implements the same public interface. A factory in `lib/llm/index.ts` reads `LLM_PROVIDER` from the environment and exports the correct implementation.

```
lib/
  llm/
    index.ts              — factory: reads LLM_PROVIDER, exports extractRequirements()
    anthropic.ts          — moved from lib/anthropic.ts (unchanged)
    openai-compatible.ts  — new: OpenAI SDK pointed at any compatible endpoint
    prompt.ts             — shared: SYSTEM_PROMPT, JSON schema, chunkText() utility
```

The public API is unchanged:

```ts
export async function extractRequirements(
  text: string,
  options: ExtractionOptions,
  documentName: string,
  pdfBuffer?: Buffer
): Promise<ExtractionResult>
```

The only application-level change is one import in `app/api/upload/route.ts`:

```ts
// before
import { extractRequirements } from '@/lib/anthropic';
// after
import { extractRequirements } from '@/lib/llm';
```

### Shared Utilities (`lib/llm/prompt.ts`)

Both providers share:
- `SYSTEM_PROMPT` — the senior BA/requirements engineer persona and extraction rules
- `JSON_SCHEMA_DESCRIPTION` — the full requirements schema described in prose for embedding in prompts
- `chunkText(text: string, chunkSize: number): string[]` — splits large documents into sequential chunks (current 40K char limit)

These are extracted from the current `lib/anthropic.ts` so the extraction logic is defined once.

---

## OpenAI-Compatible Provider

### Structured Output

Claude's `tool_use` enforces the JSON schema at the API level. For OpenAI-compatible endpoints this is not universally reliable. The provider uses **JSON mode** (`response_format: { type: 'json_object' }`) with the full schema embedded verbatim in the system prompt. JSON mode guarantees syntactically valid JSON; the schema description in the prompt governs the structure.

Example system prompt addition:
```
Respond with ONLY a JSON object. No explanation, no markdown.
Schema:
{
  "requirements": [ { "text": string, "source_quote": string|null, ... } ],
  "summary": string
}
```

### Chunking

Uses the shared `chunkText()` from `prompt.ts`. Sequential calls are merged identically to the Anthropic provider — first chunk's summary is used, all requirements are concatenated.

### Scanned PDF Limitation

When `pdfBuffer` is provided and `rawText` is empty (scanned PDF path), the OpenAI-compatible provider throws:

```
Error: Scanned PDF extraction requires the Anthropic provider. Set LLM_PROVIDER=anthropic or provide a text-based PDF.
```

This surfaces to the user via the existing error path in `app/api/upload/route.ts` with a 500 + descriptive message.

### Factory Validation

If `LLM_PROVIDER=openai-compatible` and either `LLM_BASE_URL` or `LLM_MODEL` is absent, the factory throws at module load time:

```
Error: LLM_PROVIDER is "openai-compatible" but LLM_BASE_URL and LLM_MODEL must be set.
```

---

## Environment Variables

```
# LLM Provider
# "anthropic" (default) — uses Claude via Anthropic SDK, requires ANTHROPIC_API_KEY
# "openai-compatible"   — uses any OpenAI-compatible endpoint
LLM_PROVIDER=anthropic

# Required when LLM_PROVIDER=openai-compatible
LLM_BASE_URL=http://localhost:11434/v1   # Ollama default
LLM_MODEL=qwen2.5:7b                    # recommended; see model notes below
LLM_API_KEY=ollama                       # required by OpenAI SDK, ignored by Ollama

# Existing
ANTHROPIC_API_KEY=sk-ant-...
```

### Recommended Models (Ollama)

| Model | VRAM | Quality | Notes |
|---|---|---|---|
| `qwen2.5:7b` | ~6 GB | Good | Default recommendation |
| `qwen2.5:3b` | ~3 GB | Fair | RAM-constrained machines |
| `qwen2.5:14b` | ~10 GB | Best local | High-end workstations |

`qwen2.5` is recommended over Llama 3.2 for instruction-following quality and JSON reliability on structured extraction tasks.

---

## Ollama Infrastructure

### Docker Compose

`docker-compose.yml` at the repo root provides an Ollama service only. The Next.js app continues to run via `npm run dev` alongside it.

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

Developers run `docker compose up ollama` once, then `npm run dev` as normal. The `ollama_data` volume persists pulled models between restarts.

### Model Init Script

`scripts/ollama-init.sh` runs `ollama pull $LLM_MODEL` to pre-fetch the configured model. Documented as a one-time step; developers who run Ollama natively can run it directly.

---

## Testing

### Migrated Tests

`__tests__/lib/anthropic/anthropic.test.ts` → `__tests__/lib/llm/anthropic.test.ts`  
Import updated to `lib/llm/anthropic`. No logic changes.

### New Tests

**`__tests__/lib/llm/openai-compatible.test.ts`**
- Correct JSON mode params sent to OpenAI SDK (`response_format: { type: 'json_object' }`)
- Valid JSON response parsed into `ExtractionResult`
- Chunking fires for documents > 40K chars; results merged correctly
- `pdfBuffer` present + empty text throws scanned PDF error
- Response with invalid JSON throws parse error

**`__tests__/lib/llm/index.test.ts`**
- `LLM_PROVIDER=anthropic` (or unset) returns Anthropic provider
- `LLM_PROVIDER=openai-compatible` with all vars set returns OpenAI-compatible provider
- `LLM_PROVIDER=openai-compatible` with missing `LLM_BASE_URL` or `LLM_MODEL` throws at instantiation

All tests use mocked SDK clients — no live Ollama or Anthropic API calls.

---

## Migration Path

1. Add `openai` npm package (`npm install openai`)
2. Move `lib/anthropic.ts` → `lib/llm/anthropic.ts`
3. Extract shared prompt/chunking to `lib/llm/prompt.ts`
4. Implement `lib/llm/openai-compatible.ts`
5. Implement factory in `lib/llm/index.ts`
6. Update import in `app/api/upload/route.ts`
7. Migrate and add tests
8. Add `docker-compose.yml` and `scripts/ollama-init.sh`
9. Update `.env.local.example`
