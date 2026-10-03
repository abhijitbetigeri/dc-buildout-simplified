# PITCH track — status

**Owner:** PITCH · **Writes:** `docs/PITCH.md`, `docs/DEMO-RUNBOOK.md`, this file
**Delivered:** 16:05, ahead of the 16:15 gate.

## Done

- `docs/PITCH.md` — 3-minute script timed against `data/mock-events.json` (55 events, 148,000 ms),
  memorised open/close, mid-demo "what is this", 13-question Q&A sheet, 5 sponsor attribution lines.
- `docs/DEMO-RUNBOOK.md` — start commands, keyboard, per-symptom failure table, cut-ladder
  degraded paths.

## Timing — it fits, with 3 seconds of margin

| Wall clock | What |
|---|---|
| 0:00–0:12 | Opening line, static board |
| 0:12 | Space → run starts |
| 0:12–2:35 | `ts 0 → 143000` |
| ~2:30 | +~4s approval pause at `ts 108000` |
| 2:39–2:57 | Hero number + closing line |

Every beat the brief named maps to a real `ts`: alert 0, Tavily 12000, Moss 29000/32500, block
60000, counterfeit 90000, approval 108000, Entire commit 123000→130500, `run.ended` 143000. The
brief said "Entire commit 125s"; the actual call is at 123s with the hash at 128s and
`policy.committed` at 130.5s. Script is written to the real numbers.

## Arithmetic verified against `data/bom.json` (NOT taken on trust)

`status/data.md` does not exist, so the opening line was re-derived from the `rollup` block:

- 2.06% — $2,465,280 memory ÷ $119,789,472 material = 2.058% ✓ matches `memoryShareOfMaterialPct`
- $249,561 per node — $119,789,472 ÷ 480 ✓ matches `materialCostPerNodeUsd`
- $214 a stick — `lines[BOM-0020].unitCostUsd`; 11,520 × $214 = $2,465,280 ✓
- $2,487,600 — $1,785,600 (1,240/min × 1,440) + $702,000 (`savingsVsBroker`) ✓
- $209,203 block cost — $45.40 × 4,608 ✓ · PO $1,068,134.40 — 4,608 × $231.80 ✓

The opening is built on the arithmetic, not on a quoted line.

## Decisions taken without the user (they were offline)

- **Latency — FINAL 16:20, beat 3 re-cut to "about a quarter of a millisecond, on-device."** The
  6/8 ms were DATA's invented placeholders; the log now carries MOSS's measured 0.22 / 0.20 (verified
  on disk in both `data/mock-events.json` and `ui/public/events.json`), and AGENTS' live run measures
  0.26. The phrase is true at all three, so stage variance cannot falsify it, and nobody reads three
  significant figures off a projector. Q6b rewritten against the measured figure; the earlier
  "six milliseconds" permission is struck.
- **"No photos leave the building" is struck from the script.** Cloud index creation does not support
  it. The line is now "the query never leaves the laptop" — same confidentiality point, actually true.
  DATA caught this in their own payloads; my beat-3 narration had echoed the stronger version.
- **Replay-only, per the freeze.** Q3 and Q10 no longer branch. The live run is missing beat 5 and
  missing `plain` on 14 of 40 events, so presenting it would mean silent cards on the counterfeit
  beat. Runbook marks cut-ladder items 2 and 6 as taken, framed as a defensible position.
## 17:50 — added Q15, "can this actually run on ZooWork?"

Q&A only, no narration touched. Verified both load-bearing quotes on disk before writing them into a
judge-facing answer:

- *"Your chat UI | Stays yours | It talks to your backend, never to ZooWork"* —
  `deploy-your-agent.md:22`. It is a table row, not a prose sentence; the answer paraphrases it rather
  than quoting it as a sentence.
- **No credential vault** — confirmed in two places (`not-supported.md:143` "no vault resource of any
  kind and no credential methods on the client", `typescript-sdk.md:538`).

Structure: what deploys (5 agent defs, `resource.persona.docs`, Skill registry ZIPs, `custom_tools`
declaring the three tools) / what stays ours by their design (UI on Vercel, and the resolver, because
the halt requires *our* app to call `resolveCustomToolCall`) / the honest delta from what we built
(converge on a persistent agent via `listAgents({ labels })` instead of create-and-delete; resolver
becomes a long-running service with a pending-call recovery loop; ~1 hour, no research). Credential-vault
limit volunteered only if multi-tenancy comes up, with the note that it does not affect our buyer.

Also flagged at the top of the Q&A sheet that **Q2 + Q15 are the pair for the ZooWork prize** — the
halt verified and testable, plus evidence we read the platform's architecture rather than just calling it.

## 17:45 — ZooWork halt VERIFIED. Prohibition struck, invitation unlocked.

Checked the transcript myself: `data/cache/zoowork-roundtrip.json` has `haltProven: true`,
`resumeProven: true`, `run_status: awaiting_approval` with one pending call at 1s/3s/5s while the
answer was withheld, then a correct block on our computed verdict from the real QVL. Reproducible via
`cd agents && npx tsx verify-zoowork.ts`.

- Beat 4's DO-NOT-SAY note and Q2's two-layer hedge are both struck. Q2 now leads with the runtime
  halt and **offers the test to a judge**. §5 ZooWork line upgraded from architecture to verified.
- **Boundary written into all three places:** the **gate round trip** ran live; the seven-beat demo is
  replay. Never blurred.
- **Added the refusal to Q14** — withheld past timeout, the agent declined to qualify or reject rather
  than inventing a verdict. Paired with the fail-closed story it answers the rubber-stamp question in
  both directions: one failure where it over-trusted price, one where it refused to proceed without
  authority. The coordinator was right that this is better than the success.
- **Timed narration NOT touched.** Beat 4's spoken line no longer names ZooWork, which matters for the
  named prize, but naming it costs ~4 words and eats into beat 5's window. Logged in PITCH.md as an
  explicitly optional swap for the coordinator — I would not destabilise rehearsed timing 15 minutes
  before stage, and Q2 carries the claim.
- Note: the coordinator quoted agent id `agt_01m41z8pj1f73mr7bkzke10z97`; the transcript on disk says
  `agt_01m41zfqvj9sv563mc4n14nhfq` (different attempt). The pitch cites the callId and the transcript
  file, not an agent id, so nothing depends on it.

## ⚠️ TWO FALSE CLAIMS FOUND AND REMOVED — 16:35. SUPERSEDED IN PART BY THE ABOVE.

Both were in my own draft. Neither would have survived a judge's follow-up.

**1. "The run is halted inside ZooWork's runtime."** AGENTS confirmed at 16:30: **no ZooWork API call
was ever made.** No key in this environment, so no agent, no session, no `agent.custom_tool_use`, no
`resolveCustomToolCall`. The orchestrator calls the tool handlers directly in process. Beat 4 and the
§5 ZooWork line are re-cut; Q2 is now a two-layer answer that volunteers the limit.

- Beat 4's replacement line is *stronger*, not weaker, because it is checkable: "that block isn't a
  model being cautious — it's a function of the data. Put that part on the qualified list and the
  same code clears it." `agents/` is 25/25 green and one test is exactly that verdict flip.
- **Strategic note for the coordinator:** this materially weakens the Best-Use-of-ZooWork claim. What
  we can say is architecture and source-verified declarations, not exercised runtime. If anyone can
  get a key and make one real `createAgent` + `resolveCustomToolCall` round trip before 18:00, that
  single call is worth more to the named prize than any other remaining work. **Your call — I am not
  reopening the freeze, and the pitch is honest as it stands.**

**2. "`entire why` prints the actual prompt behind the decision."** I ran it at 16:35.
`entire why data/qvl.json:12` — the command the runbook told the presenter to pre-open — **fails**:
that path is not in HEAD. On the committed `data/cache/qvl-rev-E.proposed.json` it runs but prints
*"No Entire checkpoint is linked to the commit that last touched this line."* The capability is real
in Entire and the hook is installed, but nothing is linked to our commits, so it is not demonstrable.

- Beat 7 now claims the **committed decision record**, which is real: commit `dab5f15`, message
  *"QVL rev-E: Samsung M321R8GA0BB0-CQK qualified primary alternate; TRA564G48D436O blocked pending
  evaluation; broker lot PRC-24817 blacklisted."* That is an audit record and it is showable.
- Runbook default is **no terminal**; if one is shown it is `git log -1`, not `entire why`.
- **Live vs replay branches only in Q&A.** Narration is word-identical in both modes, so the M11
  freeze decision does not touch the script.
- **BAND gets a drop rule, not a soft claim.** If M8 misses the freeze, the BAND sentence comes out
  entirely. §5 states plainly that BAND has no veto and the gate is ZooWork's. The README's "Critic
  that can block" wording predated RECON's SDK read; flagged rather than edited (not a PITCH-track
  file) and **fixed by the coordinator at 16:10** — README now states BAND has no veto primitive and
  that the gate is ZooWork's `custom_tools`. No remaining contradiction for a judge to find.
- **No blame URL on stage.** Beat 7 is `entire why` in a pre-opened terminal, per the 14:50 decision.
- **Illustrative pricing is disclosed by the presenter, proactively**, in Q3 and Q5. Cheaper to say it
  first than to be caught by the data files' own comments.

## 16:55 — beat 7 is REAL. One correction to the coordinator's command choice.

AGENTS wired the checkpoint and I re-verified it myself. HEAD is `e28231e` with
`Entire-Checkpoint: 01M41Y6846EXDDP1RGZY9B6C1T`. **No login** — `entire auth status` reports "Not
logged in" and everything still works. Both earlier blockers (login required; late `entire enable`
prevents capture) are dead, and the hedging is out of the runbook. The claim is now demonstrable
rather than architectural: *the sourcing decision carries the agent session that made it, verifiable
from a terminal, offline, with no account.*

**Correction: `entire checkpoint explain` does NOT avoid the Luma problem — I tested it.** It is
**1,237 lines**, its `## Intent` block is the Luma root prompt, and the first line of its transcript is
the Luma root prompt again. Swapping `why` → `explain` would show the signup link twice instead of
once.

**What actually solves it:** `entire checkpoint explain <id> | head -9`. That is the header block —
checkpoint, session, created, author, 12941k tokens, and the 3 commits with their decision messages —
and it stops cleanly one line above `## Intent`. No Luma URL anywhere, fits one screen, no scrolling.
That is now the runbook's provenance command; `git log -1` still leads because the commit message is
the substance. `entire why` is demoted to "only if asked for per-line attribution, point at the
metadata line, don't read the prompt aloud."

Timed narration untouched — it already claimed the session linkage rather than the prompt text, so the
metadata framing fits inside the existing beat as the coordinator expected.

## Added 16:45 — the fail-closed story (coordinator's call, and it was right)

AGENTS' first end-to-end run **approved the counterfeit**: the module photo was missing, so Quality
never completed a screen, so the lot came back authenticity-passed, and being cheapest and fastest it
won. Fix was making `gate()` **fail closed on non-franchised supply** — the absence of a finding is
not a clean result.

- **Added as Q&A Q14**, flagged at the top of the sheet as the answer to steer to. It pre-empts the
  sharpest available question ("how do you know your agents don't rubber-stamp the cheapest?") and the
  answer is "they did, once — here is what we changed." A gate that was always right proves nothing;
  a gate that caught its own authors proves it is load-bearing.
- **Not added to the close.** The close has 3 seconds of slack and is memorised; adding to it breaks
  the timing. Instead there is an **optional one-line insert at `ts 119`**, in genuinely dead air,
  marked first-to-cut.
- **Placement constraint worth keeping if anyone edits this:** the line must not land before `ts 115`.
  Said near the Approve click it reads as "the thing you just approved is the fake." At `ts 119` the
  counterfeit has been rejected for 25 seconds and there is no ambiguity.

## Asks of other tracks

- ~~**DATA / MOSS:** reconcile the latency figures.~~ **Closed 16:20 — measured 0.22/0.20 in the log,
  script says "about a quarter of a millisecond".** Thanks to DATA for the variance catch.
- ~~**AGENTS — confirm the `custom_tools` halt ran end to end.**~~ **Answered 16:30: it did not, and
  no ZooWork call was made at all.** Q2 and beat 4 re-cut accordingly (see above). Thanks to AGENTS
  for answering straight — that answer prevented the worst failure available to us tonight.
- ~~**AGENTS:** `run-latest.json` missing `plain` / no `counterfeit.flagged`.~~ **Fixed by AGENTS:**
  beat 5 emits, `plain` is 44/44, and `EventLog.validate()` now fails the run if any event lacks it.
  Runbook corrected — the reason we don't present it is that it hasn't been rehearsed, not that it is
  incomplete. Accuracy matters there because a judge may ask.
- **ANYONE WITH A ZOOWORK KEY:** see the strategic note above. One real `createAgent` +
  `resolveCustomToolCall` round trip before 18:00 is the highest-value remaining work for the named
  prize. Not needed for the pitch to be honest; it is needed for the pitch to be strong.
- **UI:** `status/ui.md` does not mention the port. `ui/package.json` pins dev and start to **3137**;
  please state that in your status file. Runbook now names 3137, tells the presenter to read the URL
  off the dev output rather than trust it, and uses the tab title "LINEDOWN — Sourcing Desk" as the
  sanity check, since 3000 is occupied by an unrelated app that returns HTTP 200.
- **UI:** the script assumes a **static pre-roll state** — board dark, alert not yet fired — for the
  12-second opening line. If that does not exist, say so and I will re-cut the open; a fallback is
  already written into PITCH.md assumption 5.
- **UI:** confirm the approval gate is reachable with the mouse as well as Space/Enter. The audience
  needs to see a human touch the machine.
- **ALL:** by 16:30 tell me which sponsors are live. Q&A answers Q3 and Q10 branch on it, and I would
  rather the presenter rehearse one version than choose on stage.

## Files touched

`docs/PITCH.md`, `docs/DEMO-RUNBOOK.md`, `status/pitch.md`. Nothing else. No cross-track edits.
