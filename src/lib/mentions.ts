// Shared @mention parsing — same pattern collab-hub's comment-actions.ts
// originated, now used by community posts/comments and DMs too instead of
// three separate copies of this regex.
const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;
const HASHTAG_PATTERN = /#(\w+)/g;

export function extractMentionedUsernames(body: string): string[] {
  const usernames = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    usernames.add(match[1]);
  }
  return [...usernames];
}

export function extractHashtags(body: string): string[] {
  const tags = new Set<string>();
  for (const match of body.matchAll(HASHTAG_PATTERN)) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}
