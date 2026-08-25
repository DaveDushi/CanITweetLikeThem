import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getCreator } from '../../lib/creators';
import type { Creator } from '../../lib/creators';
import { generateWithAgent } from '../../lib/flue-agent';
import { buildGenerationPrompt } from '../../lib/prompt';
import { sanitizeTweet } from '../../lib/sanitize';

type Bindings = {
  AGENT?: Fetcher;
  AGENT_URL?: string;
  AGENT_TOKEN?: string;
};

export const POST: APIRoute = async ({ request }) => {
  let body: { slug?: string; topic?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const creator = getCreator(body.slug ?? '');
  if (!creator) return json({ error: 'unknown creator' }, 404);

  const bindings = env as unknown as Bindings;

  // Preferred path: a service binding to the agent Worker (dev registry or
  // same-account production deploy). workerd's sandbox cannot reach host
  // loopback, so plain HTTP to localhost never works from inside the site.
  const agentBinding = bindings.AGENT;
  const httpBase = bindings.AGENT_URL?.replace(/\/+$/, '');
  if (!agentBinding && !httpBase) {
    return json(
      {
        error:
          'Agent not configured — locally run npm run preview (both workers in one wrangler session); in production deploy the agent worker so the AGENT service binding resolves.',
      },
      503,
    );
  }

  const fetchImpl: typeof fetch = agentBinding
    ? ((input, init) => {
        const req =
          input instanceof Request ? new Request(input.url, init ?? input) : new Request(input, init);
        return agentBinding.fetch(req);
      })
    : fetch;

  const base = agentBinding ? 'https://agent.internal' : httpBase!;
  const conversationId = globalThis.crypto.randomUUID();
  try {
    const tweet = cleanTweet(
      await generateWithAgent({
        fetchImpl,
        baseUrl: `${base}/agents/tweet-writer`,
        conversationId,
        message: buildGenerationMessage(creator, body.topic ?? ''),
        token: bindings.AGENT_TOKEN,
      }),
    );
    if (!tweet) return json({ error: 'agent returned nothing — try again' }, 502);
    return json({ tweet });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'generation failed';
    return json({ error: msg }, 502);
  }
};

function buildGenerationMessage(creator: Creator, topic: string): string {
  const { system, user } = buildGenerationPrompt(creator, topic);
  return `${system}\n\n=== REQUEST ===\n${user}`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function cleanTweet(raw: string): string {
  let t = sanitizeTweet(raw);
  // strip markdown fences and wrapping quotes some models add
  t = t.replace(/^```[a-z]*\n?|```\s*$/g, '').trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith('“') && t.endsWith('”'))
  ) {
    t = t.slice(1, -1).trim();
  }
  // drop any "here's a post:" style preamble line
  const lines = t.split('\n');
  if (lines.length > 1 && /^(here('|’)s|sure|certainly)\b/i.test(lines[0])) {
    t = lines.slice(1).join('\n').trim();
  }
  return t;
}
