import Anthropic from '@anthropic-ai/sdk';
import { ExtractionOptions, ExtractionResult } from './types';

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
- Confidence < 0.7 means mark as ambiguous
- Respond ONLY with valid JSON, no preamble, no markdown fences`;

export async function extractRequirements(
  text: string,
  options: ExtractionOptions,
  documentName: string
): Promise<ExtractionResult> {
  const typeFilter = [
    options.functional && 'functional requirements',
    options.nonFunctional && 'non-functional requirements',
    options.constraints && 'constraints',
  ].filter(Boolean).join(', ');

  const userPrompt = `Document: "${documentName}"

Extract the following from the document below: ${typeFilter}.

Return a JSON object with this exact shape:
{
  "requirements": [...],
  "summary": "..."
}

--- DOCUMENT START ---
${text.slice(0, 80000)}
--- DOCUMENT END ---`;

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const parsed = JSON.parse(raw) as ExtractionResult;
    parsed.requirements = parsed.requirements.map(r => ({
      ...r,
      confidence: Math.min(1, Math.max(0, r.confidence)),
    }));
    return parsed;
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${raw.slice(0, 200)}`);
  }
}
