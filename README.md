# canitweetlikethem

**Can I tweet like them?** A ranked gallery of downloadable AI skills that make your
agent write X posts exactly like a given creator — Hormozi, Marc Lou, Naval, levelsio,
Florin Pop and friends. Vote clones up or down; the best voices rise.

Inspired by [canivibecodeit.com](https://canivibecodeit.com).

## How it runs

Two Cloudflare Workers:

1. **The site** (this directory). Astro server output, D1 for votes, rendered pages.
2. **The agent** (`agent/`). A [Flue](https://flueframework.com/) agent worker that
   ghostwrites tweets with Cloudflare Workers AI (model `@cf/google/gemma-4-26b-a4b-it`,
   no API key needed). One Durable Object class per conversation.

The site calls the agent through a service binding named `AGENT`, so nothing crosses
the public internet and no localhost URL needs to work from inside workerd. Both sides
share a bearer token (`AGENT_TOKEN`) as a second lock in front of the agent's routes.

## Run it locally

```bash
npm install
cd agent && npm install && cd ..
npm run db:init:local    # create the votes table in local D1
npm run agent:dev        # terminal 1: Flue agent on :5173
npm run dev              # terminal 2: site on http://localhost:4321
```

`agent/.env` and the site's `.dev.vars` both set `AGENT_TOKEN=dev-token` for local dev.
If generation answers 403, check the two values still match.

## Deploy

```bash
wrangler d1 create canitweetlikethem   # paste the real id into wrangler.jsonc
npm run db:init:remote
npm run deploy                         # site
npm run agent:deploy                   # agent (deploy first or after, order doesn't matter)
```

Both `wrangler.jsonc` files pin an `account_id`. The D1 id placeholder
(`local-canitweetlikethem`) works for local dev only; deploys need the real one.

Requires Node >= 22.5.

## Live generation

Creator pages have a "try it live" section. Enter a topic or leave it empty and the
agent picks its own, then writes one post in that creator's voice. The draft gets copy
and **Post on X** buttons; posting opens X's compose window prefilled via web intent.
No X API keys. It posts as whoever clicks.

## Stack

- [Astro](https://astro.build) server output + Cloudflare Workers adapter — fully rendered HTML
- [Flue](https://flueframework.com/) agent framework, deployed as its own Worker with one Durable Object per conversation
- Cloudflare Workers AI for generation, reached through the agent
- Cloudflare D1 (SQLite) for vote counters, one anonymous vote per browser via cookie
- Vanilla JS for voting/copy/generate interactions
- Creators are JSON files in `data/creators/` — one file per creator, contributed by PR
- Profile pics live in `src/assets/avatars/<slug>.jpg`, emoji fallback when missing

## Add a creator

Add `data/creators/<slug>.json` following the schema documented at `/submit`.
Study the creator's last ~50 posts before writing the voice DNA — the quality of the
clone is the quality of the data file. Skills are generated from these files as
agent-friendly `SKILL.md` documents with frontmatter, trigger rules, pattern skeletons,
and a pre-flight quality check.

## Votes

Stored in D1. One vote per browser per creator, cookie-guarded, toggleable up/down.
No seed votes — every score on the site is a real vote.
