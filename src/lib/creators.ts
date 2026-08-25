export interface Pattern {
  name: string;
  template: string;
  note?: string;
}

export interface Voice {
  traits: string[];
  sentence_style: string;
  emoji_usage?: string;
  vocabulary: string[];
  hooks: string[];
  patterns: Pattern[];
  quirks: string[];
  never: string[];
  formatting_rules: string[];
  tone_spectrum?: string;
}

export interface ExamplePost {
  platform: string;
  text: string;
}

export interface Creator {
  slug: string;
  name: string;
  handle: string;
  emoji: string;
  tagline: string;
  category: string;
  platforms: string[];
  bio: string;
  added: string;
  voice: Voice;
  quality_check: string[];
  triggers: string[];
  examples: ExamplePost[];
  links: Record<string, string>;
}

const files = import.meta.glob('../../data/creators/*.json', { eager: true });

export const creators: Creator[] = Object.values(files).map(
  (m) => (m as { default: Creator }).default,
);

export const categories = [...new Set(creators.map((c) => c.category))].sort();

/** X screen name from links.X (or the @handle field), without the @. */
export function xHandle(creator: Creator): string | null {
  const x = creator.links.X ?? creator.links.x;
  if (x) {
    const m = x.match(/(?:^|\/\/)(?:www\.)?x\.com\/([A-Za-z0-9_]+)/);
    if (m) return m[1];
  }
  const stripped = creator.handle.replace(/^@/, '');
  return stripped || null;
}

/** Canonical profile URL, always based on the X handle (/@levelsio). */
export function profilePath(creator: Creator): string {
  return `/@${xHandle(creator) ?? creator.slug}`;
}

/** Live X profile pic — follows the creator if they change it. */
export function avatarUrl(creator: Creator): string | null {
  const handle = xHandle(creator);
  return handle
    ? `https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false`
    : null;
}

export function getCreator(slug: string): Creator | undefined {
  return creators.find((c) => c.slug === slug);
}

export function sortCreators(
  list: Creator[],
  scores: Map<string, number>,
  sort: string,
): Creator[] {
  const copy = [...list];
  if (sort === 'new') return copy.sort((a, b) => b.added.localeCompare(a.added));
  if (sort === 'az') return copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy.sort((a, b) => (scores.get(b.slug) ?? 0) - (scores.get(a.slug) ?? 0));
}
