# DEMO RUNBOOK — one page, for the person holding the laptop

Script is `docs/PITCH.md`. This page is what you keep open behind the browser.

## START (do this at 17:45, not at 17:58)

```bash
cd /Users/abhijitbetigeri/projects/line-down-desk/ui
node scripts/sync-data.mjs     # mirrors data/mock-events.json + markings into ui/public
npm run dev
```

### ⚠️ DO NOT TYPE A PORT FROM MEMORY

**Read the URL off the `npm run dev` output.** Our dev script is pinned to **port 3137**
(`ui/package.json`), so it should be **http://localhost:3137** — but read it, don't assume it.

**Ports 3000 and 3001 are occupied on this machine by unrelated apps.** Port 3000 serves something
called "Mise OS" and returns a confident HTTP 200. That is the worst failure mode available to you on
stage: a real-looking page that is not ours.

**The two-second check that rules out both a wrong port and a stale tab:**

> The browser tab title must read **"LINEDOWN — Sourcing Desk"**.

If it says anything else, you are on the wrong page. Close it and go back to the dev server output.

### Confirm you are on the real log

The UI prefers `/events.json` and silently falls back to `/events.stub.json`. `sync-data.mjs` is
idempotent — re-run it any time `data/` changes, **between runs, never during one**.

```bash
cd /Users/abhijitbetigeri/projects/line-down-desk
python3 -c "import json;d=json.load(open('ui/public/events.json'));e=d.get('events',d);print(len(e),e[-1]['ts'],sum(1 for x in e if 'plain' in (x.get('payload') or {})))"
# expect: 55 143000 55     ← 55 events, ends at ts 143000, all 55 carry `plain`
```

That third number matters. **We demo the replay log, decided at the freeze.** AGENTS' live run
(`data/cache/run-latest.json`) has since been completed — beat 5 emits and `plain` is on 44/44 — so
the reason for not using it is **not** that it is broken: it is that it has not been rehearsed, and
the replay log has. If a judge asks, that is the accurate answer. Do not load it tonight.

### Beat 7 terminal — lead with git, offer Entire

**Lead with this. It cannot fail and the commit message is the substance:**

```bash
cd /Users/abhijitbetigeri/projects/line-down-desk
git log -1
# e28231e  QVL rev-E: Samsung Semiconductor M321R8GA0BB0-CQK qualified primary alternate; ...
#          Engineering blocked the cheapest candidate as spec-compatible but not qualified...
#          Entire-Checkpoint: 01M41Y6846EXDDP1RGZY9B6C1T
```

**Offer this as the provenance follow-up if a judge pushes on traceability.** Tested 16:55, no login
needed, no Luma link anywhere in the output, fits on one screen:

```bash
entire checkpoint explain 01M41Y6846EXDDP1RGZY9B6C1T | head -9
```

```
● Checkpoint 01M41Y6846EXDDP1RGZY9B6C1T
  session  79c3b8a7-06a2-4fb1-8964-a4968e4c0492
  created  2026-10-03 22:29:42
  author   abhijitbetigeri <...>
  tokens   12941k
  commits  (3)
           e28231e  QVL rev-E: Samsung ... qualified primary alternate; TRA564G48D436O blocked ...
```

That header is the whole audit argument in eight lines: a checkpoint, a session, and the commits it
produced. **Run it piped to `head`.** Unpiped it is **1,237 lines**, and its `## Intent` block and the
first line of its transcript are both the session root prompt — *"Explore ideas for
https://luma.com/6bbloggr…"*. Scrolling into a hackathon signup link in the middle of an audit
argument is the thing to avoid, and `head -9` stops cleanly above it.

**Two commands NOT to run on stage:**

- `entire why data/cache/qvl-rev-E.proposed.json:12` — works, but prints the `Prompt:` line with the
  Luma URL right there on screen. Only if a judge asks specifically for per-line attribution, and then
  point at the metadata line (model, checkpoint, session, commit) and do not read the prompt aloud.
  Note it must be **line 12** — line 1 answers "No Entire checkpoint is linked" — and
  `entire why data/qvl.json:12` fails outright, that path is not in HEAD.
- `--generate` — nobody has run it. Not on stage.

**Never click a blame URL**; the hosted share link is unverified.

## PRE-FLIGHT (5 minutes before)

- [ ] **Tab title reads "LINEDOWN — Sourcing Desk"** (see above — this is the one check that catches the wrong-port failure)
- [ ] Browser full screen, zoom set so the money counter and the hero number are readable from the back row
- [ ] Reload, then press `R`. Board must be at beat 1 and idle, not mid-run
- [ ] Notifications off, screensaver off, laptop on mains
- [ ] Terminal pre-run **once** with both beat-7 commands, output on screen, behind the browser: `git log -1` and `entire checkpoint explain 01M41Y6846EXDDP1RGZY9B6C1T | head -9`
- [ ] Neither needs login. `entire auth status` says "Not logged in" and both still work — auth is only for syncing to origin, so there is nothing to set up
- [ ] You are on **replay**. That is the decided mode — use the single Q3/Q10 answers and do not hedge it
- [ ] Beat 3 latency: say **"about a quarter of a millisecond"**. Never a decimal — the rendered number varies (0.20 / 0.22 / 0.26)
- [ ] **The ZooWork halt is verified — you may offer a judge the test.** `cd agents && npx tsx verify-zoowork.ts`, transcript `data/cache/zoowork-roundtrip.json`. Boundary: the **gate** ran live, the seven-beat run is replay. Never blur those two
- [ ] Know **Q14** cold — our own first run approved the counterfeit, and the gate now fails closed on unscreened grey-market stock. Steer any question toward it; it is the best material we have
- [ ] Beat 7 has an **optional one-line insert** at `ts 119` about that failure. On time → say it. Behind → it is the first thing you cut

## KEYBOARD

| Key | Does |
|---|---|
| **Space** | Pause / resume. **At the approval gate, Space = Approve.** |
| **R** | Restart from `ts 0`. Safe at any time. |
| **→** | Jump the clock to the next beat. Your recovery key. |
| **Shift+→** | One event at a time. For rehearsal, not for stage. |
| **Enter** | Approve, at the gate only. |

Two things the engine will not let you do, by design: `→` **cannot skip the approval gate** (the
click has to be deliberate), and neither `→` nor `Shift+→` does anything in live mode. Keystrokes are
ignored while focus is in a text field — click the board background first if the keys go dead.

## IF A BEAT FAILS MID-DEMO

**One sentence, then move.** Never debug in front of the room, never apologise twice.

> "That one's on the degraded path — I'll show you the recorded run after."

Then press `→` to pull the clock to the next beat and keep narrating. The script's narration still
works: it describes what the beat *is*, not what is animating.

| Symptom | Do this |
|---|---|
| Board is blank / stuck at beat 1 | `R`. If still blank, hard-reload the tab. The event log is static; a reload always recovers. |
| A beat renders a plain grey card | That is the deliberate unknown-event fallback. Keep going — nothing is broken. |
| Images missing in beat 5 | Re-run `node scripts/sync-data.mjs` between runs, not during one. On stage: narrate the match scores, which are text and will be there. |
| Page looks wrong / unfamiliar | Check the tab title. You are probably on port 3000's unrelated app. Go back to the dev server output for the real URL. |
| Approval gate does not appear | Press `→` once; if it still does not appear, say the beat-6 line, click anything, and move to beat 7. Do not stand there waiting. |
| Clock has run away from you | `→` to the next beat. Being 10 seconds early is invisible; being 20 seconds late costs the close. |
| Terminal `entire why` errors | Say the sentence about what it prints, do not show it. The claim is still honest; it ran in rehearsal. |

**Running out of time is the one failure that costs you the close.** At 2:35 wall clock, whatever is
on screen, press `→` until `run.ended` is up and deliver the closing line. The hero number plus the
closing line is a complete pitch on its own.

## DEGRADED PATHS — cut ladder, in order, no discussion

From `MILESTONES.md`. Cutting down to item 6 is still a winning demo.

1. Market/timing agent — gone first, already deprioritised
2. ~~Live Tavily~~ → **cut; we are on cached JSON.** Sources are placeholders: present them neutrally, use Q10's replay answer, never gesture at a URL as though it was fetched
3. WhatsApp / Slack delivery surface
4. Money counter animation — keep the number, drop the motion
5. Entire commit step → pre-made terminal output. **Never a screenshot of a URL**
6. ~~Live ZooWork stream~~ → **cut; full replay mode, decided at the freeze.** This is the mode we rehearse and present

Items 2 and 6 are already taken. That is a deliberate, defensible position, not a shortfall — the
replay log is the complete record and the live run is not.

Below the ladder sit the three beats that are the demo and are **never cut**: the block (`ts 60`),
the counterfeit catch (`ts 90`), the Approve click (`ts 108`). If you have to choose what to protect
with your remaining time, protect the silences around those three.

**Replay is not an apology.** Audit replay of a sourcing decision is what IATF 16949 traceability
requires. Say it once, in a normal voice, and continue.
