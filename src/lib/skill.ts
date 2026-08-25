import type { Creator } from './creators';

const PLATFORM_LABELS: Record<string, string> = { X: 'X/Twitter' };

function platformLabel(c: Creator): string {
  return c.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join('/');
}

export function buildSkillMd(c: Creator): string {
  const v = c.voice;
  const firstName = c.name.split(' ')[0];
  const platformList = platformLabel(c);

  const coreInstructions = `## Core Instructions

1. **Study the style first**
   Read the style guide below before generating anything. Match ${firstName}'s current voice, not a generic version of them.

2. **Voice rules (non-negotiable)**
${v.traits.map((t) => `   - ${t}`).join('\n')}

3. **Preferred post types** (rotate or match user request)
${v.patterns.map((p) => `   - ${p.name}`).join('\n')}

4. **Structure patterns to copy** (see Signature Patterns in the style guide for full skeletons)
${v.patterns.map((p) => `   - **${p.name}**: ${p.note ?? p.template.split('\n')[0]}`).join('\n')}

5. **Output rules**
   - Default to 1 post unless the user asks for multiple
${v.formatting_rules.map((r) => `   - ${r}`).join('\n')}
   - Do not explain the style in the output — just deliver the post(s)
   - If user provides a topic, adapt it into ${firstName}'s voice and worldview

6. **Quality check before responding**
${c.quality_check.map((q) => `   - ${q}`).join('\n')}

## Example Triggers
${c.triggers.map((t) => `- "${t}"`).join('\n')}
`;

  const signaturePatterns = v.patterns
    .map(
      (p, i) => `### ${i + 1}. ${p.name}

\`\`\`
${p.template}
\`\`\`
${p.note ? `\n${p.note}\n` : ''}`,
    )
    .join('\n');

  const styleGuide = `---

# Style Guide (${c.name} ${c.handle})

## Who They Are
${c.bio}

## Core Voice Traits
${v.traits.map((t) => `- ${t}`).join('\n')}
- Sentence style: ${v.sentence_style}
${v.emoji_usage ? `- Emoji usage: ${v.emoji_usage}` : ''}

## Signature Patterns

${signaturePatterns}
## Hooks That Work For This Voice
${v.hooks.map((h) => `- "${h}"`).join('\n')}

## Vocabulary And Phrasing
${v.vocabulary.map((x) => `- ${x}`).join('\n')}

## Formatting Rules
${v.formatting_rules.map((r) => `- ${r}`).join('\n')}

## What To Avoid
${v.never.map((x) => `- ${x}`).join('\n')}

## Calibration Examples
Study these before writing anything:

${c.examples.map((e) => `> ${e.text.replace(/\n/g, '\n> ')}\n`).join('\n')}
${v.tone_spectrum ? `## Tone Spectrum\n${v.tone_spectrum}\n` : ''}`;

  return `---
name: ${c.slug}-posts
description: Generate ${platformList} posts in the exact style of ${c.name} (${c.handle}). Use when the user asks for posts like ${c.name}, ${firstName} style posts, content in their voice, or to write posts matching their ${c.category} tone.
---

# ${c.name} Posts

Generate authentic ${platformList} posts that match ${c.name}'s voice and patterns.

## When To Use
Trigger on any request to write posts, tweets, or content "like ${c.name}", "in ${c.name}'s style", "as ${c.handle}", or similar.

${coreInstructions}${styleGuide}`;
}
