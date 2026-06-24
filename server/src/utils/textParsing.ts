const HASHTAG_RE = /#([a-zA-Z0-9_]{1,50})/g;
const MENTION_RE = /@([a-zA-Z0-9_]{1,20})/g;

export function extractHashtags(text: string): string[] {
  const matches = [...text.matchAll(HASHTAG_RE)].map((m) => m[1].toLowerCase());
  return [...new Set(matches)];
}

export function extractMentions(text: string): string[] {
  const matches = [...text.matchAll(MENTION_RE)].map((m) => m[1].toLowerCase());
  return [...new Set(matches)];
}
