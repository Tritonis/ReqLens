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
