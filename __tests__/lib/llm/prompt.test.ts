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
