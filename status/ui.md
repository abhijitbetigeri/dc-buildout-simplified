# UI track — status

**State:** M5 done, M12 replay fallback verified. 26/26 automated browser checks pass.

## Run it

```bash
cd ui
npm install
npm run sync      # mirrors data/mock-events.json + data/markings/img into public/
npm run dev       # http://localhost:3137
```

**URL is http://localhost:3137 — NOT 3000.** Ports 3000 and 3001 are taken on this machine
by unrelated apps, so both `dev` and `start` are pinned to **3137** in `package.json`.
Nothing in the code or scripts references 3000.

Production check: `npm run build && npm run start` (also 3137).
Verification: `npm run verify` (drives real Chrome, writes `ui/shots/`).

## Presenter controls

| Key | Does |
|---|---|
| `Space` | pause / resume — and **approves** when the run is halted at the gate |
| `→` | jump to the next of the 7 beats |
| `Shift`+`→` | advance one event (rehearsal) |
| `R` | restart the run |
| `Enter` | approve, when halted |

Mouse works for everything too: Play/Next/Restart buttons sit in the header, and the
Approve button is a 977×110px target. The presenter never needs a keyboard hand free.

Rehearsal URLs (harmless if unused): `?beat=5` or `?at=92000` opens on a beat,
`&paused=1` holds it, `&speed=4` changes pace, `&gate=open` lets a *seek* run past the
approval gate so the tail can be inspected without clicking. The gate itself is untouched.

## Screenshots — the submission fallback

`ui/shots/` — regenerate any time with `npm run verify`:
- `1-counterfeit.png` — both marking SVGs side by side, 93% remark-pattern match, 0.20ms
- `2-block.png` — the red BLOCKED card with its plain-language line
- `3-approval.png` — run halted, green Approve button
- `4-outcome.png` — $2,487,600 exposure protected

## What the UI does with the contract

- Accepts the **wrapper object** `{ runId, program, durationMs, events }` **and** a bare
  `Event[]` (`lib/run.ts` → `normalizeRun`). Takes `durationMs` for the progress strip and
  `runId` for the counter priming.
- `tool.result` kinds: `tavily.sources`, `moss.partmatch`, `moss.matches`, `entire.commit`,
  and `qvl.lookup` (also accepts the old `zoodata.qvl`). Anything else → neutral card.
- **Every** event's `plain` renders as a subtitle — including on `agent.message`,
  `tool.call`, `tool.result`, `po.drafted`, `approval.requested` and `run.ended`.
- Unknown `type`, orphan `tool.call` with no result, empty `equivalents[]`, empty
  `matches[]`, and missing marking images all degrade to a clean state. Verified: a
  synthetic log with an unknown type and an unresolved tool call renders without a crash.
- Money counter is primed from the **14:02 allocation notice** parsed out of `runId`,
  labelled on screen as "exposure accrued since 14:02 allocation notice", at the shipped
  $1,240/min. Clamped to 12h so a wrong venue clock cannot produce a silly number.
- `latencyMs` is rendered large and alone. `parseMs` is deliberately **never** added to it.

## Findings worth knowing

1. **The `score` on `counterfeit.flagged` is a match against the known-remarked cluster, so
   HIGH means guilty.** My first pass rendered it as a similarity gauge, which read exactly
   backwards. Now labelled "remark-pattern match / CONFIRMED REMARK" against a flag
   threshold of 85. If a future payload ever scores against the genuine reference instead,
   the wording flips automatically.
2. **"It moves, but I can't follow it" was an orientation gap, not a playback bug.** Playback,
   auto-scroll and entry transitions were all working. What was missing was *where am I*:
   the beat indicator existed but was a small line of text in the corner. Fixed by making
   the stage indicator the loudest element in the header (`5 / 7 · COUNTERFEIT CAUGHT`, with
   an elapsed clock and all seven beats labelled across a segmented strip), and by dropping
   older cards to 45% so the live edge is obvious. Hero cards settle to 75% rather than 45%
   so they stay legible when the presenter scrolls back.
3. **`autoFocus` on the Approve button scrolled the whole document** and pushed the header
   off the projector. Removed; Space/Enter still reach it through the global key handler.
4. Cards grow after their images decode, which left the newest beat half off screen. A
   `ResizeObserver` re-pins the feed on any content resize.
5. `npm run build | head` truncates the build via SIGPIPE and leaves `.next` without a
   BUILD_ID. Do not pipe the build into `head` — it looks like it succeeded and then
   `next start` fails.

## Open / handoff

- The marking SVGs are shipping artifacts, not placeholders. If real DIMM photos arrive they
  drop in as a file copy with the same filename stems and a `0 0 440 210` viewBox — no code
  or event-log change. `npm run sync` picks them up.
- If both marking images ever fail to load, the card still composes: labelled empty frames
  plus the six-row findings table and the verdict. Beat 5 cannot hard-fail on a missing asset.
- Tavily sources carry an `illustrative · not retrieved` badge automatically whenever the
  payload sets `_illustrative`. If AGENTS lands a real Tavily call, drop that flag and the
  badge disappears on its own — no UI change needed.
- Live mode is wired but unused: `useEventStream` takes `{ kind: "live", subscribe, onApprove }`
  with an identical return shape. Swapping the source is the only change required.
