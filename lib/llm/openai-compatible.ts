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
