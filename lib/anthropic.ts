import Anthropic from '@anthropic-ai/sdk';
import { ExtractionOptions, ExtractionResult, ExtractedRequirement } from './types';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const SYSTEM_PROMPT = `You are a senior business analyst and requirements engineer. Your job is to extract, classify, and structure requirements from documents.

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

const CHUNK_SIZE = 40_000; // chars — ~10K tokens of input per chunk

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
  const typeFilter = [
    options.functional && 'functional requirements',
    options.nonFunctional && 'non-functional requirements',
    options.constraints && 'constraints',
  ].filter(Boolean).join(', ');

  // Scanned/image PDF — pass bytes directly, no chunking possible
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

  // Text document small enough for a single call
  if (text.length <= CHUNK_SIZE) {
    const prompt = `Document: "${documentName}"\n\nExtract the following: ${typeFilter}.\n\n--- DOCUMENT START ---\n${text}\n--- DOCUMENT END ---`;
    return callClaude(prompt);
  }

  // Large text document — process in sequential chunks and merge
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }

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
