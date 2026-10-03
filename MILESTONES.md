# LINEDOWN — milestone tracker

**Event:** AI Commerce Gallery, Walt Disney Family Museum — 3 Oct 2026
**Submission:** 17:00 · **Presentations:** 18:00 · **Plan written:** 13:51 → **~3h of build time**

**Product:** LINEDOWN — the sourcing desk that keeps the line running.
**Segment:** Datacenter memory. **Buyer:** server ODM / systems integrator.
**Part:** DDR5 RDIMM (conventional server memory, squeezed by HBM capacity cannibalisation).
**P&L line:** line-down cost + expedite premium + counterfeit scrap risk.

**Pitch line:** *"The AI boom broke the memory market. This agent is how a manufacturer buys
through it — and proves to an auditor why."*

---

## 🔒 FREEZE CALL — 16:30. Read this first.

### WE DEMO ON THE REPLAY LOG (`data/mock-events.json`). Decided, not provisional.

It is complete and validated: 55 events, every beat present, **55/55 payloads carry `plain`**,
all cross-file totals reconcile. AGENTS' live run is missing `plain` on 14 of 40 events and
**has no beat 5 at all** — no counterfeit catch, which is the never-cut X-Factor moment.

Say it plainly on stage if asked: audit replay of a sourcing decision is exactly what
IATF 16949 traceability requires. It is a feature. Do not apologise for it.

### Verified working

- `npx tsc --noEmit` → clean, exit 0
- Dev server up, HTTP 200, title `LINEDOWN — Sourcing Desk`
- 4 marking SVGs on disk; 5 fixtures + sidecars + 194-row flat marking file
- Numbers reconcile: PO $1,068,134.40 · block cost $209,203.20 · saved **$2,487,600**

### ⚠️ Stage risk — ports

**3000 and 3001 are occupied on this machine** (3000 serves an unrelated app, "Mise OS").
Ours came up on **3002**. Curling 3000 returns a confident HTTP 200 for the wrong application.
**Before going on stage, confirm the browser tab reads `LINEDOWN — Sourcing Desk`.**

### Still open

- UI: browser verification + the three screenshots (submission artifact if live fails)
- AGENTS: beat 5 + `plain` — upgrade path only, does not gate the demo
- User: `entire login --device`, four keys, DIMM photos — all upgrades, none are dependencies

---

## Demo spine (every milestone serves one of these beats)

| # | Beat | Owner track | Status |
|---|------|-------------|--------|
| 1 | Allocation alert on a qualified RDIMM; money counter starts | UI + DATA | ⬜ |
| 2 | Tavily pulls live spot pricing, stock, allocation news | AGENTS | ⬜ |
| 3 | Moss decodes the part number, finds cross-vendor equivalents | MOSS | ⬜ |
| 4 | **Engineering BLOCKS the cheapest — not on platform QVL** | AGENTS + UI | ⬜ |
| 5 | **Broker offer → photograph DIMM → Moss matches counterfeit marking** | MOSS + UI | ⬜ |
| 6 | Qualified alternate approved — presenter clicks **Approve** → PO drafted | UI | ⬜ |
| 7 | Entire commits the QVL change; `entire blame` answers the auditor | AGENTS | ⬜ |

**Never cut:** beat 4 (the block), beat 5 (the counterfeit catch), beat 6 (the click).
Those three are the entire demo. Everything else is supporting material.

---

## Milestones — wall clock

| ID | Time | Milestone | Track | Depends on | Status |
|----|------|-----------|-------|------------|--------|
| M0 | 14:00 | Event schema frozen; project scaffold up | — | — | ✅ |
| M1 | 14:20 | Moss multimodal **GO/NO-GO** called | MOSS | — | ✅ 14:10 |
| M2 | 14:25 | Integration notes: exact install + auth + call signatures, all 5 sponsors | RECON | — | ✅ 14:18 |
| M3 | 14:30 | Seed data complete: BOM, 4 candidates, QVL, counterfeit fixtures | DATA | M0 | ✅ 15:20 |
| M4 | 14:35 | `data/mock-events.json` — full 7-beat run, replayable | DATA | M0 | ✅ 14:28 |
| M5 | 15:15 | UI shell renders a complete run from mock events | UI | M4 | ⬜ |
| M6 | 15:30 | ZooWork agents defined; one real agent round-trips | AGENTS | M2 | ⬜ |
| M7 | 15:45 | Moss index live: part-number equivalence + image match | MOSS | M1, M3 | ⬜ |
| M8 | 16:00 | BAND room wired; Engineering block is a real spec function | AGENTS | M6 | ⬜ |
| M9 | 16:10 | Tavily real call feeding beat 2 | AGENTS | M2 | ⬜ |
| M10 | 16:20 | Entire commit + blame URL in the case file | AGENTS | M2 | ⬜ |
| M11 | 16:30 | **FEATURE FREEZE** — swap live stream in, or stay on replay | ALL | — | ⬜ |
| M12 | 16:40 | Clean run recorded → replay fallback verified | UI | M11 | ⬜ |
| M13 | 17:00 | **SUBMITTED** | — | M12 | ⬜ |
| M14 | 17:45 | Rehearsed twice, timed under 3:00 | — | M13 | ⬜ |

---

## Tracks (parallel agents)

| Track | Scope | Writes to | Status file |
|-------|-------|-----------|-------------|
| **RECON** | Sponsor SDK docs → exact, copy-pasteable integration notes | `docs/INTEGRATION.md` | `status/recon.md` |
| **DATA** | BOM, candidates, QVL, counterfeit fixtures, mock event log | `data/` | `status/data.md` |
| **UI** | Single-screen war room, replay engine, Approve button | `ui/` | `status/ui.md` |
| **AGENTS** | ZooWork agent defs, BAND room, Tavily + Entire adapters | `agents/` | `status/agents.md` |
| **MOSS** | Multimodal spike → working index for part match + image match | `spikes/moss/` | `status/moss.md` |

**Agents write only to their own paths and their own status file.** No cross-track edits —
that is how parallel work corrupts a repo with 3 hours on the clock.

---

## Cut ladder (cut in this order, without discussion)

1. Market/timing agent (the buy-now-vs-wait conflict) — stretch goal, first to go
2. Live Tavily call → use cached JSON captured earlier
3. WhatsApp / Slack delivery surface
4. The money counter animation (keep the number, drop the motion)
5. Entire commit step → show a pre-made blame screenshot instead
6. Live ZooWork stream → full replay mode

**Cutting to 6 is still a winning demo.** Replay mode is a legitimate feature —
audit replay of a sourcing decision is exactly what IATF 16949 traceability requires.
Say that out loud if asked; do not apologise for it.

---

## Risk register

| Risk | Likelihood | Mitigation | Owner |
|------|-----------|------------|-------|
| Moss image embedding not in SDK | Med | Fall back to text-match on marking strings + lot codes. Same beat, less visual. | MOSS |
| ZooWork SDK burns an hour | Med | `npx skills add SerendipityOneInc/zoowork-sdk-skills` first, then let Claude Code write it | AGENTS |
| Live demo stalls on stage | Med | M12 replay fallback. Non-negotiable. | UI |
| Jargon loses a judge | **High** | Every event carries a `plain` field. Enforced in schema. | UI |
| Reads as trading, not manufacturing | Low | Buyer is an ODM with a BOM and a ship date. Never say "spot market play". | ALL |
| Scope creep past 16:30 | **High** | M11 freeze is hard. | ALL |

---

## Decisions log

- **13:55** — Segment: datacenter memory over optical transceivers. Lower jargon barrier
  (Design is scored), better physical prop, QVL is a crisp published artifact for the block beat,
  counterfeit remarking is a textbook problem, real spot pricing exists for Tavily.
- **13:55** — HBM is the *villain in the backstory*, not the sourced part. No alternates exist
  for HBM; conventional DDR5 RDIMM substitutes at module level. Keep this distinction precise —
  someone in the audience will know.
- **13:58** — Replay-first architecture. UI consumes an event list; live vs. replay is invisible
  to it. Guarantees a demo exists by 15:15 regardless of integration state.
- **13:58** — Single screen. No nav, no auth, no settings.
- **14:10** — **Moss image embedding is NO-GO.** `DocumentInfo` takes text only; Moss's own
  image-search demo indexes caption text and keeps photos as S3 URLs in metadata. Beat 5 pivots
  to: photograph module → **ZooWork vision model** OCRs the top marking → Moss text-matches the
  string against reference/counterfeit markings in <10ms. The camera moment on stage survives,
  and routing OCR through ZooWork deepens usage for the "Best Use of ZooWork" prize rather than
  adding an external OCR dependency. `counterfeit.flagged` is unchanged — no UI rework.
- **14:12** — ~~Verified ZooWork env vars from the installed skill~~ — **superseded, see 14:20.**
- **14:20** — **ZooWork needs exactly one env var: `ZOOWORK_API_KEY`.** Grep of the shipped
  SDK (`@zoowork-ai/sdk` 0.10.2, `dist/`) finds only three `ZOOWORK_*` strings, and the skill
  reference states outright that `ZOOWORK_ORG_ID` does not exist (the gateway derives the tenant
  from the key). `ZOOWORK_AGENT_ID` is not an SDK input — ids come back from `createAgent()`.
  **Leave `ZOOWORK_BASE_URL` unset**: the default already carries the `/service/v1` prefix and a
  wrong value 404s every call. The earlier five-var list came from grepping env-var-shaped strings
  in the skill prose, which matched names the docs explicitly document as non-existent.
- **14:25** — Beat 5 mechanism settled. ZooWork has **no attachment/upload API** for session
  input (text-only messages). Pixels reach the model via a **custom-tool result**, which accepts
  base64 image blocks. So beat 5 is a two-hop tool chain on the Quality agent:
  `fetch_module_photo(candidateId)` returns the DIMM photo as a base64 image block →
  vision model transcribes the top marking → `marking_match(markingText)` hits Moss →
  `counterfeit.flagged` emitted unchanged. Deep runtime usage, no UI rework.
  Guards: vision model selected from `listModels()` by capability, not hardcoded; `marking_match`
  is tolerant (hybrid, low alpha) and the replay path carries a known-good transcription, so the
  beat cannot hinge on OCR succeeding under stage lighting.
- **14:30** — M4 shipped early: 55 events, ~2.4 min run, `plain` on every payload.
- **14:32** — One additive `tool.result` kind for the QVL lookup behind the block, renamed
  `zoodata.qvl` → **`qvl.lookup`**. Labelling a local JSON read as ZooData claims a sponsor
  integration we aren't making, and the Best Use of ZooWork prize invites exactly that question.
  Our thesis is provenance; we don't get to be loose about our own.
- **14:32** — Money counter primes from the **14:02 allocation notice**, not ts 0 — at
  $1,240/min it otherwise reaches only ~$3.0k across the run and reads as trivial. Honest
  provided the label names the start time. The hero number is `run.ended.dollarsSaved`
  = **$2,487,600**, given its own treatment at the close.
- **14:32** — Tavily sources in the mock log are placeholder-shaped. If we demo on replay, they
  must NOT be styled as live retrieved citations. Neutral source treatment only.
- **14:40** — **Entire is free, no key.** Its primitive is a **trail** (`entire trail resume
  [trail-id]`), carrying branch, checkpoints and session context, and trails have shareable URLs.
  Beat 7 upgraded from mocked to real: the QVL change is made under Entire by a Claude Code
  session, so the trail genuinely contains the agent session behind the sourcing decision, and
  the real URL goes into `policy.committed.blameUrl`. The presenter clicks it on stage.
  Fallback if it slips past the freeze: mocked hash, and say nothing about clicking through —
  never demo a URL that 404s. `ENTIRE_TOKEN` dropped from `.env`.
- **14:50** — **Beat 7 reverts to the terminal.** The hosted share link is the biggest
  per-sponsor demo risk: no public no-login share link or `--share` flag found, the browser view
  needs an account plus a connected pushed repo, and the one URL pattern seen came from
  search-engine synthesis, not a primary doc. Plan of record is **`entire why`** in the terminal
  (not `entire blame` — `blame` gives per-line attribution, `why` prints the actual prompt).
  Verified end to end. Running a command live beats a click-through and cannot 404.
- **14:50** — **`entire enable -y --agent claude-code` must run BEFORE an agent session starts.**
  It installs a git hook rather than wrapping `run`; missing it leaves no session to attach, with
  no recovery. Installed in the repo at 14:50.
- **14:50** — **Beat 4's block upgrades to ZooWork `custom_tools`.** The run genuinely pauses
  until the backend calls `resolveCustomToolCall`, making Engineering's veto runtime-enforced
  rather than prompt convention. Prioritised above the Market agent.
- **14:50** — BAND has real rooms but **no native Critic/veto** — the event vocabulary is five
  strings (`tool_call`, `tool_result`, `thought`, `error`, `task`); nothing halts a room. Local
  orchestrator confirmed as the right call. Org is `band-ai`, not `Band-AI/band`.
- **14:50** — ZooWork **cannot attach local/stdio or authenticated MCP servers** (remote HTTP
  only). Moss is called from our own backend and fed in via a `custom_tools` resolution.
- **14:50** — ZooWork model IDs need provider prefixes (`litellm/gpt-5.6-terra`); select from
  `listModels()` filtering `selectable !== false && default_for?.includes('model')` or 409s.
- **14:52** — Permission prompts disabled for this repo via `.claude/settings.local.json`
  (`acceptEdits` + scoped allowlist). `.env` reads denied; force-push denied.
