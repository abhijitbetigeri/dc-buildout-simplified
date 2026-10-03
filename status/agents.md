# AGENTS track — status

**Owner:** AGENTS · **Writes:** `agents/`, `data/cache/`, this file
**Last update:** 16:20 · **State:** complete and verified offline

---

## ENV VARS — export line (copy-paste)

```bash
export ZOOWORK_API_KEY=zwp_live_...      # platform.zoowork.ai → Project API key
export TAVILY_API_KEY=tvly-...
```

**That is the complete list.** Everything runs with zero keys, and **Entire needs no login** —
see blocker 1, which turned out not to be a blocker. `entire login --device` is optional and
only syncs checkpoints to origin; local attribution already works.

### Env vars that do NOT exist — do not set these

Grepped the shipped `@zoowork-ai/sdk` 0.10.2 `dist/`. Exactly three `ZOOWORK_*` strings
appear anywhere in the package:

| Var | Status |
|---|---|
| `ZOOWORK_API_KEY` | **real** — the only one we need |
| `ZOOWORK_BASE_URL` | real, but **leave UNSET** — the default already contains `/service/v1`; setting it wrong 404s every call |
| `ZOOWORK_WEBHOOK_SECRET` | real, but only for verifying inbound webhooks. We receive none. |
| `ZOOWORK_ORG_ID` | **DOES NOT EXIST.** The gateway derives the tenant from the key. Dead config. |
| `ZOOWORK_AGENT_ID` | **not an SDK input.** Agent ids come back from `createAgent()` at runtime. |
| `ENTIRE_TOKEN` | **does not exist**, and no Entire auth is needed at all — see blocker 1. |

`MOSS_PROJECT_ID` / `MOSS_PROJECT_KEY` belong to the MOSS track's spike, not to us. Our Moss
adapter runs their `--offline` path, which needs no keys.

---

## How to run it

```bash
cd agents && npm install
npm test        # 25/25 — proves the QVL block is data-driven, not a string
npm run offline # full 7-beat run → data/cache/run-latest.json
npm run capture # refresh data/cache/tavily-*.json (needs TAVILY_API_KEY)
npm run run -- --live   # uses ZooWork agents if a key exists; degrades to scripted if not
```

Verified at 16:20: `tsc -p tsconfig.json` clean, `npm test` 25/25, `npm run offline` produces
44 events with all 7 beats and `plain` on 44/44.

---

## What the run produces

`data/cache/run-latest.json` — wrapper object byte-compatible with `data/mock-events.json`
(`_comment`, `runId`, `program`, `durationMs`, `events`).

| Check | Result |
|---|---|
| Events | 44 |
| `plain` missing | **0** — `EventLog.validate()` now FAILS the run if any event lacks one |
| All 7 beats | ✅ alert / tavily.sources / moss.partmatch / block.raised / counterfeit.flagged / approval.granted / policy.committed |
| Result kinds | `tavily.sources`, `moss.partmatch`, `qvl.lookup`, `moss.matches`, `entire.commit` |
| Tool badges | `tavily`, `moss`, `qvl`, `entire` (using `qvl`, not `zoodata`) |
| Outcome | cand-01 **blocked** · cand-02 **rejected** · cand-03 **approved** |

---

## The ZooWork submission — what is real and what is not

**Read this before claiming anything to a judge.** The distinction matters and PITCH has it.

### Exercised, repeatedly, and tested
- **The QVL block is a genuine function of data.** `agents/tools/qvl.ts#checkQvl` is pure
  `(candidate, qvl) → verdict`, with field-by-field spec comparison. `npm test` group 6 takes
  the blocked candidate, adds it to the QVL, and shows the verdict flip `block → pass`. Same
  code, different data, different answer. That is the defensible claim.
- **The veto is structurally enforced.** `gate()` in `agents/band.ts` is the only path to
  `approval.requested` and demands both the QVL verdict and the authenticity screen.
- **Beat 5 runs off real forensics** — the six marking findings in DATA's
  `suspect-broker-lot-PRC-24817.json`, reproduced by string/regex/date comparison. No image
  embedding needed anywhere.

### The ZooWork runtime halt — VERIFIED END TO END (17:40)

**Earlier versions of this file said this had never run. That is now out of date.** A real
round trip was executed against the live platform. Reproduce:

```bash
cd agents && npx tsx verify-zoowork.ts     # evidence → data/cache/zoowork-roundtrip.json
```

Real agent `agt_01m41z8pj1f73mr7bkzke10z97`, model `litellm/gpt-5.6-terra` selected from
`listModels()` (42 rows, `default_for: ["model","pdfModel"]`) — no hardcoded id, no
`409 model_not_selectable`. Agent stopped and deleted afterwards.

**HALT — verified.** The run requested `qvl_lookup` and stopped. While we deliberately
withheld the answer:

```
t+1.9s  pending=1  run_status=awaiting_approval  pending_custom_tool_calls=1
t+4.6s  pending=1  run_status=awaiting_approval  pending_custom_tool_calls=1
t+7.3s  pending=1  run_status=awaiting_approval  pending_custom_tool_calls=1
```

**RESUME — verified.** `resolveCustomToolCall` → `outcome=completed`,
`resolvedBy=linedown-agents-backend`, run finished `succeeded`, and the agent reported **our**
verdict: *"Decision: BLOCK — cand-01 not listed on the AI-SRV-G4 QVL (QVL-G4-2026.08-rev-D).
Specs: all 5 platform requirements match. Evaluation: EVAL-G4-0412 — incomplete."* That value
came from `tools/qvl.ts#checkQvl` against the real `data/qvl.json`.

**The first attempt FAILED, usefully.** Withholding for 12s blew the tool timeout; the run
completed without us and the agent said *"it timed out both times… I can't qualify or reject it
until the QVL service responds."* **It refused to guess.** So the gate is load-bearing in both
directions. The script reports HALT and RESUME as separate claims because of this.

Two API behaviours worth knowing: a custom-tool pause reports `run_status: 'awaiting_approval'`,
so `pending_custom_tool_calls` is the only way to distinguish it from a human approval; and a
resolve receipt returns `status: pending, signaled: true` — acknowledgement of signalling, not
proof the run consumed the value.

### Still NOT exercised
- **The vision-OCR step.** Needs a selectable vision-capable model; coordinator called it NO-GO
  for the stage. The adapter returns the marking as text and says so in its provenance line.

---

## Architecture notes

- **BAND was evaluated and rejected on evidence.** RECON read `band-ai/band-sdk-typescript`:
  no advance-turn call, and **no gating primitive of any kind** — the whole chat event
  vocabulary is `["tool_call","tool_result","thought","error","task"]`, zero hits for
  critic/veto/gate/approve. A BAND critic can only be a prompt convention. It also needs
  Node 22+ (we are on 20.20.2) and a live account with no offline mode.
- **Same handlers in both modes.** `ScriptedSpeaker` and the live path both call
  `toolhost.ts#invokeTool`, so an offline run is a demonstration of real logic — only the
  prose around the decision is templated.
- **Market agent: CUT** at 15:35 per the cut ladder, to protect the custom_tools gate.
- `agents/zoowork.ts` is deliberately **absent** — unverifiable without a key, and `--live`
  degrades to scripted with a clear message rather than crashing.

---

## Bugs this track found and fixed

1. **The demo recommended buying the counterfeit.** First end-to-end run approved `cand-02`:
   the module photo could not be located, so Quality never completed a screen, so the broker
   lot read as `authenticityPassed: true` and — cheapest and fastest — won. Fixed by making
   the gate **fail closed** on non-franchised supply: unscreened grey-market stock is not
   purchasable, because absence of a finding is not a clean result. Franchised distribution is
   treated differently on purpose; there the paperwork *is* the evidence.
2. **Two QVL matcher bugs**, caught by the tests before any run: `"4800 MT/s (PC5-38400B)"`
   had every digit concatenated into one number, and `"RDIMM 288-pin"` failed a bare string
   compare against `"RDIMM"`. Now measurement-vs-code comparison, so `2Rx4 ≠ 2Rx8` still fails
   while `RDIMM 288-pin` satisfies `RDIMM`.
3. **Wrapper-shape divergence** between `data/mock-events.json` and the frozen schema —
   `JSON.parse(file).map(...)` would have thrown in the UI. Escalated; schema amended.

---

## Blockers

### 1. `entire login` — RESOLVED. Not needed. Beat 7 works.

**I previously reported this as a blocker. That was wrong, and testing it disproved two of my
own assumptions.** Beat 7 is fully working and attributed:

```
entire why data/cache/qvl-rev-E.proposed.json:12

  [AI] by Claude Code · claude-opus-5 · checkpoint 01M41Y6846EXDDP1RGZY9B6C1T
       · session 79c3b8a7 · commit e28231e3
  Prompt: "Explore ideas for https://luma.com/6bbloggr… ZooWork Moss Entire"
  Full context: entire checkpoint explain 01M41Y6846EXDDP1RGZY9B6C1T
```

Every run now reports `provenance: entire+git`.

**Corrections to what I said earlier:**

1. **Login is NOT required.** `entire auth status` reported `○ Not logged in` through every
   step above. Attach, checkpoint creation and `why` all work locally. Login is only needed to
   **sync checkpoints to origin**.
2. **`entire enable` landing after the session started did NOT prevent capture.** I flagged
   that as likely fatal. It isn't. `entire session attach <session-id>` retroactively captured
   23 turns even though the git hook never ran for this session. No fresh session needed.

**How it is wired** (`agents/tools/entire.ts#attachSession`): attach the session via
`CLAUDE_CODE_SESSION_ID`, parse the checkpoint id, then put `Entire-Checkpoint: <id>` in the
commit message. That trailer is what associates commit and checkpoint.

**The one real gotcha:** `why` reports the checkpoint of the commit that last touched *that
specific line*. `amendedAt` (line 12) is rewritten every run so it is always freshly touched;
line 1 (`{`) hasn't changed since an older untrailered commit and still answers "No Entire
checkpoint is linked". **Use line 12.** The adapter now computes a changed line from
`git diff` rather than hardcoding one.

**Caveat for the stage:** the prompt printed is the session's **root** prompt — a Luma event
link — not a procurement instruction. It is genuinely the originating prompt, but don't build
narration around the text. `entire checkpoint explain <id>` gives the full transcript with tool
calls and is the better audit artefact if a judge pushes. `blameUrl` stays a text reference,
never a hyperlink: no evidence of a no-login share URL exists and a 404 on stage is the worst
outcome available.

### 2. No sponsor keys — EXPECTED, fully mitigated
Zero keys present all afternoon. Every adapter is cache/fixture-first and the full run
succeeds without any. Keys upgrade fidelity; they are not load-bearing.

### 3. Tavily sources are PLACEHOLDERS — honest disclosure
`data/cache/tavily-*.json` are marked `_fixture: true`. They point at publication **roots**,
not invented article paths, because a fabricated deep link that 404s in front of a judge is
worse than an obviously generic one. The market context they describe is real; the citations
are not retrieved. **Do not present them as retrieved citations.** `npm run capture` replaces
them the moment `TAVILY_API_KEY` exists.

---

## Note for DATA

`data/cache/` is inside your write path. My five files there are `run-latest.json` and
`tavily-{pricing,stock,news}.json` plus `qvl-rev-E.proposed.json`; none collide with yours.
I kept the path because my brief named it explicitly and the UI may reference it — but if a
cleanup script of yours runs over `data/`, exclude `data/cache/` or tell me and I'll move to
`agents/cache/`. Latency figures in my run are measured per-run (0.19–0.26ms), deliberately
not pinned to yours; wording is **"on-device retrieval"**, never "fully offline", and Moss's
`parseMs` is never added into `latencyMs`.
