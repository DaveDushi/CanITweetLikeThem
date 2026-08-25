# Can I tweet like them?

A ranked gallery of AI skills that ghostwrite X posts in a specific creator's voice.
Hormozi, Naval, Marc Lou, levelsio, Florin Pop and friends. Download a skill, feed it
to your agent, and see if the output fools anyone. Vote the good clones up. The bad
ones sink.

Inspired by [canivibecodeit.com](https://canivibecodeit.com).

## How to grab a skill

1. Open any creator page.
2. Download its `SKILL.md`.
3. Hand it to whichever agent reads skills (opencode, Claude Code, anything that
   takes markdown instructions) and prompt away: "write a Florin Pop style post
   about rest."

No sign-up, no X API keys, $0 forever. Creator pages also have a **try it live**
box where the site's own agent writes a fresh post in that voice, so you can judge
the clone before committing. The **Post on X** button opens X's compose window
prefilled. It posts as whoever clicks.

## How to add a creator (ship your own skill)

This is the fun part, and there is no code involved. A skill starts life as one
JSON file. If you can fill out a template, you can ship one.

1. Fork the repo and create `data/creators/<slug>.json`. The slug becomes the URL,
   so `florin-pop.json` lives at `/florin-pop`.
2. Do the homework. Read the creator's last ~50 posts before writing a word of the
   voice DNA. The clone is only as good as the file.
3. Fill out the schema below.
4. Optionally drop a profile pic at `src/assets/avatars/<slug>.jpg`. Without one
   they get an emoji avatar, which is honestly fine too.
5. Open a PR. Merged files go live instantly and start collecting votes at zero.

The best reference file right now is [`data/creators/florin-pop.json`](data/creators/florin-pop.json).
Copy its shape.

### The schema

```jsonc
{
  "slug": "florin-pop",
  "name": "Florin Pop",
  "handle": "@FlorinPop17",
  "emoji": "🫶",
  "tagline": "Casual indie hacker living the soft life",
  "category": "indie-hacking",
  "platforms": ["X"],
  "bio": "One paragraph of who they are and what they post about",
  "added": "2026-08-24",
  "voice": {
    "traits": ["Extremely casual...", "..."],
    "sentence_style": "Short sentences, natural line breaks...",
    "emoji_usage": "Heavy but natural. Favorites: 🤭 ☠️ 💪 🫶",
    "vocabulary": ["padel", "freedom > money", "..."],
    "hooks": ["What would you do if...🤔", "..."],
    "patterns": [
      {
        "name": "Daily activity log",
        "template": "1h gym\n3h padel (2 games)\n20,000 steps later… 🤭",
        "note": "His most frequent format right now"
      }
    ],
    "quirks": ["Ends posts with a single emoji"],
    "never": ["Corporate speak", "Hashtags"],
    "formatting_rules": ["Line breaks over paragraphs", "Under 280 chars"]
  },
  "quality_check": ["Would this sound natural from him?"],
  "triggers": ["Write a Florin Pop style post about rest"],
  "examples": [{ "platform": "X", "text": "The biggest flex isn't money. It's free time." }],
  "links": { "X": "https://x.com/FlorinPop17" }
}
```

### What separates a great file from a forgettable one

Some hard-won notes from the files that already exist:

- `voice.never` is the highest-leverage field. If he would never use hashtags and
  your file doesn't say so, half the outputs get ruined by hashtags. Be thorough
  here and the clone gets scary good.
- `voice.patterns[].template` should be a literal skeleton with `[placeholders]`,
  not a description. Copy-paste friendly is the goal.
- `quality_check` is a pre-flight list the agent runs before answering. These few
  questions make or break output quality.
- `hooks` work best as fill-in-the-blank openers lifted straight from real posts.
- One file per creator, parody intent only. Every page credits their real handle.

Full field-by-field documentation also lives at `/submit` on the running site.
Each creator JSON gets compiled into the downloadable `SKILL.md` with frontmatter,
trigger rules, pattern skeletons, and the pre-flight quality check.

## Votes

Stored in D1. One vote per browser per creator, cookie-guarded, toggleable
up or down. No seed votes, no warm-up numbers. Every score on the site is a real
click from a real person, and yours could be next.
