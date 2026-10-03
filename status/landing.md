# LANDING track — status

**State: COMPLETE.** Landing page live at **`/landing`**.
`npx tsc --noEmit` clean. Demo route `/` untouched and verified rendering.

---

## ⚠ ONE ACTION NEEDED BEFORE THE SHOWCASE

The server currently on **port 3137 is a production `next start`**, serving a `.next` build that
was made *before* `/landing` existed. It therefore returns **404 for `/landing`** right now.

I deliberately did **not** rebuild, because `next build` rewrites `.next/` underneath the running
`next start` and could break the rehearsed demo minutes before showtime. The coordinator should
pick one, when it is safe to do so:

```bash
# A — rebuild and restart (gives both routes on 3137)
cd ui && npm run build && npm start

# B — dev server instead (picks up new routes with no build step)
cd ui && npm run dev
```

Verified in an isolated copy of the `ui/` tree (symlinked node_modules, port 3148):
`/` → 200 and `/landing` → 200, no console errors, all four screenshots served through
`/_next/image`.

---

## Deliverables

| File | Purpose |
|---|---|
| `ui/app/landing/page.tsx` | The page. Server component, no client JS. |
| `ui/components/landing/parts.tsx` | Landing-only primitives: Section, Figure, Card, Chip, Shot, Beat, StackRow. |

**Nothing else was written.** `app/page.tsx`, `app/layout.tsx`, `globals.css`,
`tailwind.config.ts`, `components/feed/`, `lib/` and `data/` are all unmodified — confirmed by
`git status`. The landing route imports nothing from the demo and the demo imports nothing from it.

### How the screenshots are embedded

Static `next/image` imports straight out of `ui/shots/` (`import shot from "@/shots/1-counterfeit.png"`),
so **nothing was copied into `ui/public/`**. Next's webpack asset pipeline hashes them into
`_next/static/media/` and serves responsive variants with a blur placeholder. Each one links to its
full-resolution frame, because attendees will be reading dense boards on a phone.

### Design

Reuses the demo's existing tokens only — `base / surface / raised / line / ink / dim / faint`,
one amber accent, `block` red and `approve` green reserved for exactly those two meanings.
Mono for every part number, latency, dollar figure and label. No new global CSS, no new Tailwind
config entry. Verified at 1440×900 and 390×844: no horizontal overflow at either width.

---

## Content, and where each claim comes from

Page order: Hero → the one stat → how it works (7 beats + 4 screenshots) → the two gates →
"It caught us buying the fake" → stack → what's real and what isn't → footer.

Every number is from `docs/PITCH.md` §2 / `status/data.md` / `data/bom.json`:
2.06%, $214, $249,561, 4,608 short, 192 of 480 nodes, 11 days, $1,240/min, $1,785,600/day,
$209,203 refused, $702,000 counterfeit avoided, $2,487,600 protected, PO-4471982 at $1,068,134.40,
93%/41% marking match, 2.5 min decision time.

### Honesty constraints — all enforced on the page

The §5 attributions are reproduced in substance, with each checked-and-unsupportable claim printed
*next to* the claim rather than omitted. Specifically:

- **ZooWork — UPDATED 17:42, claim upgraded.** The earlier "no API key / never submitted /
  source-verified" hedge is **gone from the page** (grep-verified: zero occurrences of "no API
  key", "never submitted", "source-verified"). The `custom_tools` halt is now presented as what it
  is — **verified end to end against the live API**, real agent on `litellm/gpt-5.6-terra` selected
  from `listModels()`, run held in `awaiting_approval` with one pending custom tool call until
  `resolveCustomToolCall`, then resumed and blocked cand-01 on the computed verdict from the real
  `data/qvl.json`. Transcript checked on disk at `data/cache/zoowork-roundtrip.json`
  (`haltProven: true`, `resumeProven: true`, `result: VERIFIED`) before the copy was written.
  **The boundary is stated explicitly in three places** — stack caveat, evidence card and boundary
  card — in the pitch's words: *the gate is live and tested; the run you watched is the replay
  log.* Beat 4 says "the gate that holds a run here is ZooWork's `custom_tools`, verified live
  against the API" rather than claiming the replayed seven-beat run itself entered the runtime,
  which would re-introduce the old overclaim from the other side.
- **Moss** — "no image embedding, so beat 5 is text matching over markings, not a comparison of
  pixels". Latency given as "about a quarter of a millisecond", never a decimal. Confidentiality
  framed as "the query never leaves the laptop"; the "no photos leave the building" line is
  explicitly disclaimed as an overclaim.
- **BAND** — "no native veto or block primitive — its event vocabulary is five strings"; the gate
  is attributed to ZooWork's `custom_tools`. BAND is never described as a Critic that blocks.
- **Tavily** — the §5 sentence verbatim in substance, plus a boundary card stating the rendered
  search results are the recorded shape, not retrieved citations.
- **Entire** — `entire why` (not `entire blame`); the page states that **no checkpoint is linked to
  our commits**, so what is showable is the committed decision record, not the prompt. The hosted
  share URL is not linked.
- A **"What is real, and what isn't"** section carries six boundary cards: the seven-beat run is a
  replay, illustrative pricing, placeholder search results, no image comparison — and, as
  counterweights, **the gate ran live** and the 25-test suite with the verdict-flip test that makes
  the gate falsifiable. The old "no ZooWork API call was made" card has been removed.

### The two gates

Framed as independent checks, using the demo's own data to show why neither substitutes for the
other: the cheapest candidate (`TRA564G48D4360`) matched all five platform requirements exactly and
was blocked for never having been tested in that board; the broker's lot was the *already-qualified*
incumbent part number and failed authenticity. Qualified-and-counterfeit and
genuine-and-unqualified both scrap the build.

### "It caught us buying the fake"

Told as a finding, not a confession, per PITCH §4 Q14: the first end-to-end run approved the
counterfeit because the photo was missing, so Quality never completed a screen and the
cheapest-fastest option won; the fix was failing closed on non-franchised supply, because the
absence of a finding is not a clean result. The page does not imply the current run is at risk of
it.

Paired with it, in the same section, is **"It refused to guess when it couldn't look the part
up."** — the first live ZooWork round trip, where the verdict was withheld past the tool budget,
the call timed out, and the agent declined to fall back on the spec sheet that matched perfectly:
*"I called the authoritative QVL lookup twice… it timed out both times. I can't qualify or reject
it until the QVL service responds."* Next to it is a terminal-style evidence block carrying the
real `REQUESTED` / `awaiting_approval` / `pending_custom_tool_calls=1` lines and the callId. The
two stories close the section: one failure approved what it had not screened, the other declined
to decide what it could not look up — the gate is load-bearing in both directions.

---

## Open items / handoff

1. **The rebuild above is the only blocker.** Until then `/landing` 404s on port 3137.
2. **The footer repo link is `https://github.com/abhijitbetigeri/dc-buildout-simplified`** as
   briefed. It was not fetched or verified — if the repo is private at showtime, a judge clicking
   it gets a 404.
3. **The hero CTA points at `/`** with a plain anchor (full page load, not a client transition), so
   it cannot interfere with the demo's event-stream state.
4. **No pre-roll coordination.** The landing page does not auto-start the run; a presenter clicking
   "Watch the live demo" lands on the frozen board and still has to press Space, which is the
   rehearsed behaviour.
