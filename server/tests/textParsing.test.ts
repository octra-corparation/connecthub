import { describe, it, expect } from 'vitest';
import { extractHashtags, extractMentions } from '../src/utils/textParsing';

describe('extractHashtags', () => {
  it('extracts simple hashtags', () => {
    expect(extractHashtags('I love #coding and #TypeScript')).toEqual(['coding', 'typescript']);
  });

  it('deduplicates and lowercases', () => {
    expect(extractHashtags('#JS is great, #js is fun, #JS rocks')).toEqual(['js']);
  });

  it('returns empty array when no hashtags present', () => {
    expect(extractHashtags('just a regular post')).toEqual([]);
  });

  it('ignores hashtags with invalid characters after the boundary', () => {
    expect(extractHashtags('check out #web-dev')).toEqual(['web']);
  });
});

describe('extractMentions', () => {
  it('extracts simple mentions', () => {
    expect(extractMentions('Hey @sarah_dev check this out')).toEqual(['sarah_dev']);
  });

  it('deduplicates and lowercases', () => {
    expect(extractMentions('@Mike and @mike are the same')).toEqual(['mike']);
  });

  it('handles multiple distinct mentions', () => {
    expect(extractMentions('cc @alice @bob @charlie')).toEqual(['alice', 'bob', 'charlie']);
  });
});
