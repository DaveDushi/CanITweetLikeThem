import { env } from 'cloudflare:workers';

/** Minimal D1 surface we use — avoids a hard workers-types dependency. */
interface Stmt {
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | undefined>;
}

export interface D1Like {
  prepare(query: string): Stmt & {
    bind(...values: (string | number)[]): Stmt;
  };
}

interface Bindings {
  DB?: D1Like;
}

const bindings = env as unknown as Bindings;

export function getDb(): D1Like | null {
  return bindings.DB ?? null;
}

export async function getScores(db: D1Like): Promise<Map<string, number>> {
  const { results } = await db
    .prepare('SELECT slug, SUM(dir) AS total FROM votes GROUP BY slug')
    .all<{ slug: string; total: number }>();
  const scores = new Map<string, number>();
  for (const row of results ?? []) {
    scores.set(row.slug, Number(row.total));
  }
  return scores;
}

export async function getUserVotes(
  db: D1Like,
  voterId: string,
): Promise<Map<string, number>> {
  const { results } = await db
    .prepare('SELECT slug, dir FROM votes WHERE voter = ?')
    .bind(voterId)
    .all<{ slug: string; dir: number }>();
  const votes = new Map<string, number>();
  for (const row of results ?? []) {
    votes.set(row.slug, Number(row.dir));
  }
  return votes;
}

const upsertSql = `INSERT INTO votes (slug, voter, dir) VALUES (?, ?, ?)
   ON CONFLICT (slug, voter) DO UPDATE SET dir = excluded.dir`;

export async function castVote(
  db: D1Like,
  slug: string,
  voterId: string,
  dir: number,
): Promise<{ score: number; userVote: number }> {
  const existing = await db
    .prepare('SELECT dir FROM votes WHERE slug = ? AND voter = ?')
    .bind(slug, voterId)
    .first<{ dir: number }>();

  if (existing && Number(existing.dir) === dir) {
    await db
      .prepare('DELETE FROM votes WHERE slug = ? AND voter = ?')
      .bind(slug, voterId)
      .run();
  } else {
    await db.prepare(upsertSql).bind(slug, voterId, dir).run();
  }

  const totalRow = await db
    .prepare('SELECT COALESCE(SUM(dir), 0) AS total FROM votes WHERE slug = ?')
    .bind(slug)
    .first<{ total: number }>();
  const current = await currentUserVote(db, slug, voterId);
  return { score: Number(totalRow?.total ?? 0), userVote: current };
}

async function currentUserVote(
  db: D1Like,
  slug: string,
  voterId: string,
): Promise<number> {
  const row = await db
    .prepare('SELECT dir FROM votes WHERE slug = ? AND voter = ?')
    .bind(slug, voterId)
    .first<{ dir: number }>();
  return row ? Number(row.dir) : 0;
}

export function ensureVoterId(cookieValue: string | undefined): string {
  return cookieValue ?? globalThis.crypto.randomUUID();
}
