import type { APIRoute } from 'astro';
import { getCreator } from '../../lib/creators';
import { castVote, ensureVoterId, getDb } from '../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { slug?: string; dir?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }

  const { slug, dir } = body;
  if (!slug || (dir !== 'up' && dir !== 'down')) {
    return new Response(JSON.stringify({ error: 'expected { slug, dir: "up"|"down" }' }), {
      status: 400,
    });
  }

  const creator = getCreator(slug);
  const db = getDb();
  if (!creator || !db) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }

  const voterId = ensureVoterId(cookies.get('ctlt_voter')?.value);
  cookies.set('ctlt_voter', voterId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  try {
    const result = await castVote(db, slug, voterId, dir === 'up' ? 1 : -1);
    return new Response(JSON.stringify(result), {
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'vote store unavailable' }), {
      status: 503,
    });
  }
};
