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
