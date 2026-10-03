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
| M1 | 14:20 | Moss multimodal **GO/NO-GO** called | MOSS | — | ⬜ |
| M2 | 14:25 | Integration notes: exact install + auth + call signatures, all 5 sponsors | RECON | — | ⬜ |
| M3 | 14:30 | Seed data complete: BOM, 4 candidates, QVL, counterfeit fixtures | DATA | M0 | ⬜ |
| M4 | 14:35 | `data/mock-events.json` — full 7-beat run, replayable | DATA | M0 | ⬜ |
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
