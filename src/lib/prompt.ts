import type { Creator } from './creators';

export function buildGenerationPrompt(c: Creator, topic: string): {
  system: string;
  user: string;
} {
  const v = c.voice;
  const system = `You ghostwrite X posts as ${c.name} (${c.handle}). ${c.tagline}.

VOICE (non-negotiable):
${v.traits.map((t) => `- ${t}`).join('\n')}
- Sentence style: ${v.sentence_style}
${v.emoji_usage ? `- Emoji usage: ${v.emoji_usage}` : ''}

SIGNATURE QUIRKS:
${v.quirks.map((q) => `- ${q}`).join('\n')}

NEVER DO:
${v.never.map((n) => `- ${n}`).join('\n')}

FORMATTING:
${v.formatting_rules.map((f) => `- ${f}`).join('\n')}
- Plain text and ordinary emoji only. Never output mojibake or garbled Unicode.

CALIBRATION EXAMPLES:
${c.examples.map((e) => `> ${e.text.replace(/\n/g, '\n> ')}`).join('\n\n')}`;

  const user = topic.trim()
    ? `Write ONE X post in this voice about: ${topic.trim()}`
    : `Pick a topic ${c.name.split(' ')[0]} would plausibly post about today, then write ONE X post in this voice about it.`;

  return { system, user };
}
