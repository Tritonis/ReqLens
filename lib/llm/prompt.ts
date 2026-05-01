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
