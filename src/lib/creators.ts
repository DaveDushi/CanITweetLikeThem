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

const avatarMods = import.meta.glob(
  '../assets/avatars/*.{jpg,jpeg,png,webp}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const avatarCache = new Map<string, string | null>();

/** Bundled avatar URL if we have one, else null (caller falls back to emoji). */
export function avatarUrl(slug: string): string | null {
  if (avatarCache.has(slug)) return avatarCache.get(slug)!;
  let url: string | null = null;
  for (const [key, value] of Object.entries(avatarMods)) {
    const file = key.split('/').pop() ?? '';
    const dot = file.lastIndexOf('.');
    if (dot > 0 && file.slice(0, dot) === slug) {
      url = value;
      break;
    }
  }
  avatarCache.set(slug, url);
  return url;
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
