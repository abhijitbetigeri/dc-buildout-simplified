# LINEDOWN — PITCH

**Stage time:** 3:00 hard. **Submission:** 17:00. **Presentations:** 18:00.
**Run length:** 148,000 ms of event `ts` + the approval pause. Verified against `data/mock-events.json`
(55 events, `durationMs: 148000`, last event `ts: 143000`).

**Budget that fits in 3:00:**

| Wall clock | What |
|---|---|
| 0:00 – 0:12 | Pre-roll. Opening line. Nothing moving on screen yet. |
| 0:12 | Press **Space**. Run `ts` starts. |
| 0:12 – 2:35 | The run, `ts 0 → 143000`. |
| ~2:30 | + ~4s of approval pause at `ts 108000` (the only human click). |
| ~2:39 – 2:57 | Hero number holds. Closing line. |

**3 seconds of slack.** That is the whole margin. Everything below is written to word count.
If you are behind, cut the *second* sentence of beats 2 and 7 — never the silences.

---

## 1. THE SCRIPT

Notation: **[SILENCE]** = stop talking, the screen is doing the work. **[CLICK]** = presenter touches
the laptop. `ts` = run-time offset shown in `data/mock-events.json`. Spoken word counts are given so
you can rehearse against a stopwatch; everything is paced at ~150 wpm.

---

### PRE-ROLL — 0:00 to 0:12 · nothing on screen but the title and a dark board

> **"This server node costs two hundred forty-nine thousand dollars. Its memory is two percent of
> that — and one two-hundred-fourteen-dollar stick is a hundred percent of what stops the line."**

*(30 words · ~12s. Say it slowly. Do not rush the two numbers. Memorised — see §2.)*

**[CLICK] Press Space.** Then step back from the laptop.

---

### BEAT 1 — `ts 0` · `alert.raised` · the alert and the money counter

**[SILENCE — 2 seconds.]** The red alert and the counter appear. Let them.

> "Our memory supplier just cut allocation forty percent. A hundred ninety-two of four hundred eighty
> nodes can't be built. Kits are due in eleven days."

*(26 words · ~10s, lands by `ts 12`.)*

- **Gloss already done for you:** the word *allocation* is glossed by "cut forty percent" — do not
  explain it further, there is no time.
- **The counter:** it is labelled *accrued since the 14:02 allocation notice*. If a judge asks, that
  label is the honest answer — it is not counting from when you pressed Space. See §4 Q7.
- Do not read the agent dialogue aloud. It renders itself. You are narrating, not dubbing.

---

### BEAT 2 — `ts 12` · `tool.call` Tavily → `ts 17.5` sources render

> "Market goes to the open web. Tavily: prices up thirty-four percent in a quarter, lead times out to
> sixteen weeks."

*(21 words · ~8s)*

**[SILENCE — let the four sources render, ~3s.]**

> "And one result that matters in ninety seconds — an industry advisory about fake memory moving cheap
> through brokers."

*(19 words · ~7s, lands by `ts 29`.)*

- That second sentence is a **plant**. It is why beat 5 does not come out of nowhere. Keep it.
- **Do not** point at the source cards and call them live citations unless M9 landed and you are on a
  live Tavily call. See §4 Q10 and §5.

---

### BEAT 3 — `ts 29` · Moss part matching

> "Moss decodes the part number and finds every module that is the same part from a different brand."

*(18 words · ~7s)*

**[`ts 32.5` — the equivalents table renders. SILENCE — 1s.]**

> "Four equivalents, on-device, in about a quarter of a millisecond. The query never leaves the
> laptop — so the desk can run this on every line of the parts list, not just the one that broke."

*(35 words · ~14s, lands ~`ts 47`.)*

- **LATENCY — FINAL, 16:20. Say "about a quarter of a millisecond". Never a decimal.** DATA replaced
  the old 6/8 ms placeholders with MOSS's measured figures, verified on disk: `moss.partmatch`
  **0.22**, `moss.matches` and `counterfeit.flagged` **0.2**. AGENTS' live run measured the same
  partmatch at **0.26**. All three are real; it is a live query and it will vary again on stage.
  "About a quarter of a millisecond" is true at 0.20, 0.22 and 0.26, so it cannot be falsified by
  whichever path runs — and the audience cannot read three significant figures off a projector
  anyway. **Do not lock to a decimal and do not say "single-digit milliseconds"** — that was written
  against the old placeholders and is now simply false.
- **The confidentiality claim is "the query never leaves the laptop", NOT "no photos leave the
  building".** Index *creation* is a cloud operation, so the stronger-sounding line is an overclaim;
  DATA removed it from the event payloads for exactly that reason. The scripted line above is already
  the correct version. Also: never add Moss's `parseMs` to `latencyMs`, and say **"on-device
  retrieval"**, not "fully offline".
- **[SILENCE]** from `ts 36.5` to `ts 43` while the four candidate cards fill. Four cards appearing
  one after another is the best unprompted visual in the run. Do not talk over it.

> "Four quotes. The cheapest is forty-five dollars a stick under the approved one — two hundred nine
> thousand dollars on one parts-list line."

*(23 words · ~9s, lands `ts 48`. Verified: $45.40 × 4,608 = $209,203.20.)*

---

### BEAT 4 — `ts 51 → 60` · THE ENGINEERING BLOCK · never cut

> "So Engineering checks the QVL. That is the list of parts that have actually been tested in this
> exact server — not parts that fit on paper. Parts that were tested."

*(31 words · ~12s, `ts 48 → 60`. This is the one unavoidable piece of jargon in the demo and that is
its gloss. Say the gloss every time, even in Q&A.)*

**[`ts 55` — the QVL lookup table renders. SILENCE.]** Three qualified, one not listed.

**[`ts 60` — `block.raised`. THE RED MOMENT. SILENCE — FOUR FULL SECONDS.]**

Count them. Do not fill this. The screen says *"This supplier's memory was never tested on this
server."* Let the room read it.

> "That block isn't a model being cautious — it's a function of the data. Put that part on the
> qualified list and the same code clears it. Engineering just gave up two hundred nine thousand
> dollars and put its name on it."

*(41 words · ~16s, `ts 64 → 80`. Runs over the Sourcing/Engineering exchange at `ts 65.5–71.5` —
that is intended; they are arguing about the money while you explain the mechanism.)*

- **UPDATE 17:45 — the ZooWork halt is VERIFIED END TO END. The earlier prohibition is struck.** I
  checked the transcript myself: `data/cache/zoowork-roundtrip.json` has `haltProven: true`,
  `resumeProven: true`, and `run_status: awaiting_approval` with one pending custom tool call at 1s,
  3s and 5s while AGENTS deliberately withheld the answer. On resolve the agent blocked cand-01 on
  **our** computed verdict from the real `data/qvl.json`. Reproducible:
  `cd agents && npx tsx verify-zoowork.ts`.
- **You may now say, without hedging:** the ZooWork runtime halts the run at the custom tool and does
  not proceed until our backend resolves it; the Engineering veto is platform-enforced, not prompt
  convention; and a judge is welcome to test it.
- **KEEP THIS BOUNDARY PRECISE.** What ran live was **the QVL gate round trip**, not the seven-beat
  run. The demo plays from the replay log. So the claim is *"this gate is real and here is the
  transcript"* — never *"what you just watched was live."* Do not blur it; the honesty is
  load-bearing and a judge who catches a blur discounts the whole pitch.
- The data-driven claim in the scripted line is also still true and still worth having: `checkQvl` is a
  pure function of (candidate, QVL), `agents/` is 25/25, and one test flips the verdict by editing only
  the QVL. §4 Q2 now leads with the runtime halt and keeps this as the second half.
- **OPTIONAL word swap, coordinator's call — I have not applied it.** The spoken line above no longer
  names ZooWork, which matters for the named prize. Naming it costs ~4 words (*"That block isn't a
  prompt — ZooWork's runtime halts the run until our backend answers, and the answer is a function of
  the data…"*), which pushes beat 4 to ~17.6s and eats into beat 5's window. At 18 minutes to stage I
  would not destabilise rehearsed timing for it; Q2 carries the claim anyway. Apply only if the
  presenter rehearses it once.

---

### BEAT 5 — `ts 76 → 97` · THE COUNTERFEIT CATCH · never cut · this is the X-Factor

> "Now Quality. A broker has four thousand six hundred of the exact allocated part, in stock today,
> twenty-nine percent under our own contract price. Nobody can get that part."

*(29 words · ~11s, `ts 76 → 87`)*

**[`ts 84` — Moss tool call fires.]**

> "Photos off their warehouse floor. Moss matches the printing on the chips against our reference
> lots."

*(17 words · ~7s)*

**[`ts 90` — `counterfeit.flagged`. TWO LABELS SIDE BY SIDE. SILENCE — FIVE SECONDS.]**

This is the moment the demo is remembered for. Say nothing. Let people lean in and compare the two
images themselves.

> "Ninety-three percent match to a known remarked pattern. Forty-one percent to the part it claims to
> be. The markings were sanded off and reprinted. The cheap option that was available today would have
> cost us a scrapped build."

*(41 words · ~16s, `ts 95 → 111` — it rides into beat 6, which is fine.)*

- **What Moss actually did:** text matching over the marking strings — the FBGA chip code, the lot
  code, the date code. **It is not image embedding.** If asked, say so plainly; it is a better answer
  than the vague one. §4 Q6, §5.
- One tell is worth having ready if a judge presses: the date code `2341` is inconsistent with the
  board revision it is printed on. There are six independent failures in the event payload; you only
  ever need one.

---

### BEAT 6 — `ts 108` · THE APPROVE CLICK · never cut

> "Which leaves the most expensive quote on the board — tested on this server, in authorised
> distributor stock, five working days out."

*(22 words · ~9s, `ts 99 → 108`)*

**[`ts 108` — `approval.requested`. The run PAUSES. Walk to the laptop.]**

Say exactly one line, then click:

> "This is the only decision the agents don't make."

**[CLICK Approve.]** *(Space or Enter also work. Use the mouse — the audience should see a human
touch it.)*

**[SILENCE]** while `ts 110 → 114.5` grants approval and drafts PO-4471982, $1,068,134.40.

- Do not explain the savings maths here. It is on screen and you reuse it in the close.
- Verified: 4,608 × $231.80 = $1,068,134.40. Premium over the Micron contract price is
  $17.80 × 4,608 = $82,022.

---

### BEAT 7 — `ts 115 → 143` · ENTIRE COMMITS

> "PO is out. Four hundred eighty nodes still ship on the committed date."

*(13 words · ~5s)*

**OPTIONAL INSERT — `ts 119 → 123`, ~4s of otherwise dead air. Say it only if you are on or ahead of
time. This is the FIRST thing to cut if you are behind.**

> "Worth saying: the first version of this desk approved the fake. Now unscreened grey-market stock
> can't pass at all."

*(20 words · ~8s — it will ride to about `ts 127`, over the commit, which is harmless because the
commit is visual.)*

- **Why it goes here and not in the close:** the close has 3 seconds of slack and is memorised; adding
  to it breaks the timing. Here it sits in dead air, and by `ts 119` the counterfeit was rejected 25
  seconds ago, so there is no chance of the audience thinking the approval they just watched is the
  fake. **Do not move this line earlier than `ts 115`** for exactly that reason.
- If it lands well, it is the natural bridge into Q14 — which is the answer you want to be asked.

**[SILENCE — `ts 123` the commit runs, `ts 128` the hash lands, `ts 130.5` `policy.committed`.]**

> "And the rule change gets committed — the decision, the block, the blacklisted lot, all in one
> record. Six months from now an auditor asks why we paid a premium, and the answer is a line in the
> parts list that resolves to the agent session that changed it: who, when, and the reasoning. That's
> the traceability question a datacenter customer legally requires, answered before it was asked."

*(55 words · ~21s, `ts 124 → 145`. If you are running behind, drop the middle sentence.)*

- **UPDATE 16:50 — this now genuinely works, and I verified it myself.** AGENTS wired the checkpoint;
  HEAD is commit `e28231e` carrying `Entire-Checkpoint: 01M41Y6846EXDDP1RGZY9B6C1T`, and
  `entire why data/cache/qvl-rev-E.proposed.json:12` prints the AI author, model, checkpoint, session
  and commit. **No login required** — `entire auth status` says "Not logged in" and it still works;
  login is only for syncing to origin.
- **Use line 12, not line 1.** `why` reports the checkpoint of the commit that last touched *that
  line*. Line 12 (`amendedAt`) is rewritten every run so it is always freshly touched; line 1 (`{`)
  still answers "No Entire checkpoint is linked". And `data/qvl.json:12` fails outright — not in HEAD.
- **DO NOT build the narration around the prompt text.** `why` prints the *session root* prompt, which
  is *"Explore ideas for https://luma.com/6bbloggr… ZooWork Moss Entire"* — a hackathon signup link.
  It is honest and it is genuinely the originating prompt, but "here's why we approved this part"
  followed by a Luma URL lands badly. The scripted line above claims the **session linkage**, not the
  prompt text, and that is exactly what is demonstrable.
- **What is real and worth leaning on:** the commit message itself carries the rationale — *"Engineering
  blocked the cheapest candidate as spec-compatible but not qualified on this platform; Quality
  rejected the broker lot on independent marking discriminators."* That plus the checkpoint trailer is
  the audit artefact. Lead with `git log -1`; offer `entire why` only if a judge pushes.
- **Do not click a blame URL.** The hosted share link is UNVERIFIED and the URL in `policy.committed`
  is illustrative. §4 Q11.
- Gloss *auditor* with "a datacenter customer legally requires" rather than saying "IATF 16949" out
  loud mid-narration. Save the standard's name for Q&A.

---

### CLOSE — `ts 143` · `run.ended` · the hero number

**[SILENCE — 2 seconds on the number.]** $2,487,600.

> **"Two million, four hundred eighty-seven thousand, six hundred dollars. One day of program slip we
> didn't take, plus a counterfeit lot we didn't buy. In two and a half minutes — because two percent
> of the bill of materials is a hundred percent of the line."**

*(48 words · ~18s. Memorised — see §2. Stop. Do not add a thank-you sentence; you do not have the
seconds and the number is a better last thing in the room.)*

---

## 2. THE TWO MEMORISED LINES

**OPENING** — say it before anything moves on screen:

> **This server node costs two hundred forty-nine thousand dollars. Its memory is two percent of
> that — and one two-hundred-fourteen-dollar stick is a hundred percent of what stops the line.**

**CLOSING** — say it over the hero number:

> **Two million, four hundred eighty-seven thousand, six hundred dollars. One day of program slip we
> didn't take, plus a counterfeit lot we didn't buy. In two and a half minutes — because two percent
> of the bill of materials is a hundred percent of the line.**

The open and the close are the same sentence twice. That is deliberate — it is the whole thesis and
repeating it is what makes it stick for People's Choice.

**Every number in both lines, verified against `data/bom.json`:**

| Number | Source | Check |
|---|---|---|
| $249,561 per node | `rollup.materialCostPerNodeUsd` = 249561.4 | $119,789,472 ÷ 480 = $249,561.40 ✓ |
| 2.06% | `rollup.memoryShareOfMaterialPct` | $2,465,280 ÷ $119,789,472 = 2.058% ✓ |
| $214 a stick | `lines[BOM-0020].unitCostUsd` | 11,520 × $214 = $2,465,280 ✓ |
| $2,487,600 | `run.ended.dollarsSaved` | $1,785,600 + $702,000 ✓ |
| $1,785,600 | one day of slip | `burnRatePerMin` 1,240 × 1,440 min ✓ |
| $702,000 | counterfeit avoided | `approval.requested.savingsVsBroker` ✓ |

---

## 3. "WHAT IS THIS" — for a judge who walks in mid-demo

Read this verbatim if someone arrives late. It is written to be said in about 25 seconds and assumes
no knowledge of the industry.

> A company that builds AI servers just had one part rationed — the memory. They're short four
> thousand six hundred sticks, and without them a hundred ninety-two of their four hundred eighty
> servers can't be built, eleven days before the parts are due on the factory floor. LINEDOWN is a
> desk of agents that finds a replacement part that is *allowed* on this specific server, proves the
> seller isn't shipping fakes, gets one human to approve it, and then writes down permanently why that
> choice was made — because a datacenter customer can legally demand that proof years later. The
> cheapest replacement is blocked on purpose. The one available today turns out to be counterfeit. The
> expensive one ships. That's the demo.

---

## 4. Q&A SHEET

**If you get one question, steer to Q14** — our own first run approved the counterfeit, and the gate
now fails closed. It is the strongest thing we have to say.

**For the ZooWork prize specifically, the two that matter are Q2** (the halt is verified, and a judge
can test it) **and Q15** (what deploys to ZooWork vs. what stays ours, and why that split is theirs by
design). Together they show we understood the platform's architecture rather than just called its API.

Rules for this section: **if we have not verified it, the answer says so.** A judge who catches one
overclaim discounts everything else. An honest "that one is unverified, here is what *is*" has
repeatedly been the stronger answer in this build — it is literally how the project made its biggest
calls (see the decisions log at 14:10, 14:50).

---

**Q1. Why is a manufacturer at a commerce hackathon?**

> Because this *is* commerce — it's the buy side of it. Two million dollars of purchase orders in this
> demo are decided by agents: which supplier, what price, what quantity, what delivery. Everyone
> builds the sell side, the storefront and the checkout. Procurement is the larger half of B2B
> commerce by dollar volume and it's the half where the decision is hard — because a buyer can't just
> pick the cheapest listing. They have to pick one that is *allowed*. That constraint is what no
> shopping agent models, and it's the whole product.

Follow-up if pushed on business viability: the buyer is a server ODM — a contract manufacturer with a
bill of materials and a ship date. They have a commodity manager per part family. One avoided day of
program slip on one program is $1.79M. This is a seat they already pay a person to sit in.

---

**Q2. Is the Engineering block real, or is it prompted?**

**Verified end to end at 17:42. Answer it straight — this is now a strength, not a caveat.**

> It's platform-enforced. It's a ZooWork `custom_tools` call: the model calls the tool, the run halts,
> and it stays halted until our backend calls `resolveCustomToolCall`. We tested exactly that — we
> withheld the answer on purpose and the run sat in `awaiting_approval` with the call pending, for as
> long as we left it. Then we resolved it, and the agent blocked the cheapest part using the verdict
> our function computed from the real qualified-parts list. So the pause is the runtime's, not a prompt
> convention, and the verdict is data, not a model deciding to be strict. The transcript's in the repo
> and you're welcome to run it.

**The invitation is live — offer it.** `cd agents && npx tsx verify-zoowork.ts`, transcript at
`data/cache/zoowork-roundtrip.json` (`haltProven: true`, `resumeProven: true`, callId
`ctc_01M41ZFXZ7TVAS1YXZTFATSAY2`, model `litellm/gpt-5.6-terra` selected from `listModels()`). Real
agent created and deleted.

**The boundary you must not blur:** what ran live is **the gate round trip**, not the seven-beat demo.
If asked, say so plainly — *"the gate is live and tested; the run you watched is the replay log."*

**Second proof, and it is better than the success — see Q14.** Their first attempt withheld the
verdict past the timeout, and the agent **refused to guess**: *"I called the authoritative QVL lookup
twice for cand-01, but it timed out both times… I can't qualify or reject it until the QVL service
responds."* The gate is load-bearing in both directions.

**If a judge wants the cheaper proof**, `npm test` in `agents/` is 25/25 and one test flips the verdict
by editing only the QVL.

Secondary point worth having: BAND has no veto primitive. We checked the SDK — the entire event
vocabulary is five strings and nothing halts a room. So we did not fake a veto on BAND; we put the
gate where a gate actually exists. §5.

---

**Q3. Is this live or is it a replay?**

**Decided at the freeze: we demo the replay log. Say so plainly and do not hedge it.** Answer the
literal question first, then make the argument. Do not make the argument first — that reads as
dodging, and the argument is strong enough that you do not need to hide behind it.

> This run is a replay. And replay isn't a cop-out here, it's a shipped feature. Audit replay of a
> sourcing decision is exactly
> what the quality standard these customers audit against — IATF 16949 — requires: you must be able to
> reconstruct how a part was selected. Our architecture is replay-first for that reason. The UI
> consumes a list of events and genuinely cannot tell live from recorded; it's the same code path and
> the same event shapes. Every number you saw comes out of the same data files either way.

If pressed on *what specifically is live*: answer per sponsor from §5. Do not generalise. "Moss runs
for real with zero keys — that path is verified working right now" is true and is worth saying. If
asked whether there *is* a live path: yes, there is a live agent run, and we chose not to present it
because it is missing a beat and missing the plain-language subtitles that make this legible to you.
Choosing the complete record over the impressive-sounding one is the same judgement the demo is about.

Caveat to state if asked about the pricing: **the dollar figures are illustrative, not quoted market
data.** They are internally consistent and derived from the BOM, and the data files say so in their
own comments. Do not let a judge discover that; say it first.

---

**Q4. You're substituting memory chips inside a module? That's not a thing you can do.**

This question will come from the one person in the room who knows the industry. Getting it right buys
enormous credibility.

> Correct, and we're not. We source an alternate **module** — a complete 288-pin RDIMM assembly from a
> different module manufacturer. We never substitute DRAM die inside a module. What's inside a module
> is that vendor's qualification, not ours. The population rule here is one DIMM per channel, all 24
> slots, single part number per node — no mixed-vendor population within a node. The die revision
> shows up in our data only as a descriptor of the as-validated build.

And the related one: *isn't HBM the shortage?* — HBM is the **cause**, not the part. DDR5 wafer starts
got reallocated to HBM4, which is why conventional server memory got rationed. There are no alternates
for HBM; that's the point. Conventional DDR5 RDIMM substitutes at module level, which is why this
problem is solvable at all.

---

**Q5. Where do the numbers come from?**

> `data/bom.json` — a 20-line bill of materials for a 480-node cluster, $119.8M of material. Memory is
> one line: 24 sticks a node, 11,520 for the program, $214 each, $2.47M — 2.06% of material cost. The
> allocation cut is 40%, so 4,608 short, so 192 nodes don't build. The burn rate is $1,240 a minute —
> idle final-assembly cell on two shifts, late-delivery penalty accrual, and customer-side revenue
> pass-through from the master agreement. That's $1.79M a day. The headline saving is one avoided day
> of that, $1,785,600, plus $702,000 of counterfeit scrap and rebuild we didn't buy — $2,487,600.
> **The prices are illustrative** — plausible, internally consistent, not quoted market data. The part
> numbers are real market part numbers for 64GB 2Rx4 DDR5-4800 RDIMMs; the broker lot code is
> format-correct and invented.

---

**Q6. Did Moss compare the two photographs?**

> No — and it's worth being exact about this. Moss's shipped SDK has no image embedding; we verified
> that by introspecting the package. What Moss matched is the **marking text**: the chip's FBGA code,
> the lot code, the date code, read off the module and matched against our reference and known-bad
> lots. The images on screen are the evidence a human looks at; the match is text retrieval over the
> strings. That's still the real test a quality engineer runs — remarking shows up in the codes before
> it shows up to the eye. There's a path to make Moss OCR the photo itself through its document
> parser; the PDF wrapper for it is written and verified, the Moss OCR call is not, so we're not
> claiming it.

---

**Q6b. A quarter of a millisecond? What exactly is that measuring?** *(Expect this from anyone who
knows retrieval — sub-millisecond invites scrutiny. It is a friendly question and answering it
precisely is a credibility win. Do not get defensive; the number is honest.)*

> It's the query time against an already-loaded local index — so it's a vector-and-keyword search
> over a few thousand documents in process, not a network call. That's why it's sub-millisecond, and
> it's also why I'd call it "on-device retrieval" rather than "offline": *building* the index is a
> cloud operation, the *query* isn't. Moss's public claim is under ten milliseconds at a hundred
> thousand documents; we're well inside it at our corpus size, which is the honest framing. It varies
> run to run — we've measured 0.20, 0.22 and 0.26 on different runs — which is why I say "about a
> quarter of a millisecond" rather than quoting you a decimal.

If pressed on why it matters: it's the difference between checking one broken parts-list line and
checking all twenty on every revision. Latency is what makes it a standing control rather than a
fire drill.

And the related confidentiality question — *are you sending supplier photos to a vendor API?* — the
answer is **the query never leaves the laptop**. Do not say "no photos leave the building"; the cloud
index-creation step does not support that and we removed the claim from our own data when we caught
it.

---

**Q7. The money counter — what is it counting?**

> Accrued line-down cost since the allocation notice came in at 14:02, at $1,240 a minute. The label
> on it says exactly that. If it counted only from when I pressed play it would read about three
> thousand dollars across a two-and-a-half-minute demo, which would understate a real problem by
> three orders of magnitude. The honest hero number is the one at the end — $2,487,600 — and that one
> is built from the BOM, not from a clock.

---

**Q8. What stops a buyer just ignoring the block?**

> Nothing, and that's correct — a human can override. What changes is that the override is now a
> recorded act with a name on it, against a named validation report, at a named price. Today that
> argument happens in email and leaves no trace. Here, Engineering's block, the price it cost, and the
> human who approved the alternative all land in one commit. The point isn't to remove human judgment,
> it's to make it attributable.

---

**Q9. Isn't the real answer "qualify the cheap supplier"?**

> Yes, eventually — and the demo says so. The last thing Engineering does is send V-color 40 modules
> and a thermal chamber slot to finish the evaluation that's been open since July. The block isn't a
> ban, it's a "not for these kits." Next quarter that $45-a-stick argument can be had properly. That's
> the actual procurement behaviour and we didn't want to pretend qualification is impossible.

---

**Q10. Are those real search results?**

We are on replay, so there is one answer. Give it without being asked twice.

> No. Those are placeholder results shaped like Tavily output, and they're labelled as placeholders in
> our data file. The Tavily integration is real and the call signature is verified; what you're seeing
> is the recorded shape, not retrieved citations. I'd rather tell you that than have you assume it.

This is the single most likely place to get caught overclaiming, because the source cards *look* like
citations. Pre-empt it in narration — beat 2 is already written to describe what Tavily does rather
than to point at the cards as evidence — and never gesture at a URL as though it was fetched.

---

**Q11. Can you show the audit trail?**

> Yes. The QVL change is a real commit and the message is the decision record — which part was
> qualified, which was blocked and why, which broker lot got blacklisted. And it carries an Entire
> checkpoint, so `entire why` on that line resolves it to the agent session that made the change:
> the model, the session, the checkpoint, the commit. One caveat so you're not surprised — the prompt
> it prints is the *session root* prompt, which for us is the hackathon brief, not a procurement
> instruction — so what I'd show you is the checkpoint header: the session, the model, the token
> count, and the commits it produced. And none of this needs an account; it's all local. The hosted
> web view needs a login and a pushed repo, so I'm not going to click a URL at you that might 404.

**Lead with `git log -1`** — it cannot fail and the commit message is the substance. Then
`entire checkpoint explain 01M41Y6846EXDDP1RGZY9B6C1T | head -9`, which is the eight-line header:
checkpoint, session, author, token count and the commits it produced. **Keep the `| head -9`** —
unpiped it is 1,237 lines and both its Intent block and the first line of its transcript are the Luma
root prompt. Prefer it over `entire why`, which puts that URL on screen. See the runbook.

---

**Q12. Why five sponsors — isn't this integration theatre?**

> Each one does one job that the others can't. ZooWork is the runtime and the gate is designed around
> its `custom_tools` halt, because it's the only one with a primitive that can actually stop a run —
> BAND has no gating primitive at all; its whole chat event vocabulary is `tool_call`, `tool_result`,
> `thought`, `error` and `task`, with nothing that blocks or advances a turn. So a "BAND critic that
> blocks" could only ever be a prompt convention: one agent posts an error and the others are
> *instructed* to respect it. We put the veto where it could be enforced in code instead of socially.
> Moss does retrieval locally, which is why
> it can run on every parts-list line and not just the broken one. Tavily is the only thing that looks
> outside the company. Entire is the only thing that records *why*. We cut things that were decoration
> — there's a market-timing agent in the plan that we deprioritised in favour of making the block
> real. §5 is deliberately precise about what each one does and doesn't do.

---

**Q14. How do you know your agents don't just rubber-stamp whatever is cheapest?**

**This is the best answer in the sheet. If you get any Q&A time at all, steer to it.** It is also the
sharpest question a skeptical judge can ask, and we have the one answer that actually settles it.

> Because they did. Our first end-to-end run **approved the counterfeit.** The module photo couldn't
> be found, so Quality never completed an authenticity screen — and because nothing came back as a
> *finding*, the lot passed. It was cheapest and fastest, so it won. The system recommended buying the
> fake.
>
> The fix was making the gate **fail closed on non-franchised supply**: unscreened grey-market stock
> isn't purchasable, full stop. The absence of a finding is not a clean result. And that's not a patch
> for a demo, it's correct procurement posture — no certificate of conformance, no traceability, no
> serial the manufacturer can look up is the *normal* state of a counterfeit lot, not an anomaly.
> Franchised distribution is treated differently on purpose, because there the paperwork is itself the
> authenticity evidence.
>
> A naive sourcing agent optimises for price and lead time and buys counterfeits. That's exactly why
> there are two independent gates and why one of them fails closed.
>
> And there's a second failure that points the other way. When we tested the qualification gate, we
> withheld the verdict past its timeout to see what the agent would do — and it refused to guess. It
> said it had called the authoritative parts-list lookup twice, it had timed out both times, and it
> could not qualify or reject the part until the service answered. It didn't invent an answer to look
> decisive. So: one failure where it over-trusted price, one where it correctly refused to proceed
> without authority. Those two together are why I'd trust it on the third.

**That pairing is the whole answer.** A gate that only ever says yes proves nothing; a gate that caught
its own authors once and refused to guess once is load-bearing in both directions. Transcript is in
`data/cache/zoowork-roundtrip.json` if anyone wants it.

Two things to be careful about when you tell it:

- **Tell it as a finding, not a confession.** The posture is "we ran our own system adversarially and
  it failed, here is what we changed" — that is a team doing engineering. Do not apologise for it and
  do not oversell it either.
- **Do not imply the current run is at risk of it.** The behaviour is fixed; `gate()` requires both
  the qualification verdict and the authenticity screen to pass, and it is the only path to
  `approval.requested`.

---

**Q15. Can this actually run on ZooWork? Could a merchant deploy it Monday?**

**Yes, partially — and the split is ZooWork's own design, not a shortfall.** Their deploy reference
says it outright: *"Your chat UI — stays yours. It talks to your backend, never to ZooWork."* Leading
with that is what turns this from an excuse into evidence you read the platform.

> Yes, with a small hosting burden. What deploys to ZooWork is the agent loop: the five agent
> definitions, persona instructions in `resource.persona.docs`, skills uploaded to their Skill
> registry, and `resource.custom_tools` declaring the three tools — the parts-list lookup, the marking
> match and the web search. ZooWork carries the runtime, the model gateway and the sandbox, always-on.
>
> Two things stay ours, by their design. The war room UI — their own guidance is that the chat UI stays
> yours and talks to your backend, never to them; we'd put it on Vercel. And the custom-tool resolver,
> which isn't optional: ZooWork *halts* the run and waits for our application to handle
> `agent.custom_tool_use` and call `resolveCustomToolCall`. That's the halt we verified. So the QVL
> engine and the Moss matcher have to run somewhere reachable — which is the architecture working as
> intended, not a gap. Monday looks like a Next.js app plus a resolver service. Delivery is a link, an
> API, or Slack.

**Be honest about what would change from what we built**, because it is a small, unglamorous list and
saying it is more convincing than claiming we are production-ready:

- Our verification run **created an agent and deleted it.** A real deployment converges on one
  persistent agent found via `listAgents({ labels })` instead of creating one per deploy.
- The resolver becomes a **long-running service with a pending-call recovery loop**, not a script.
- Roughly an hour of work, and **none of it research** — the API surface is proven.

**One limit worth volunteering** if multi-tenancy comes up: ZooWork has **no credential vault** — no
vault resource and no credential methods on the client — so per-end-user secrets have nowhere to live
on the platform. That shapes how you'd build a multi-tenant version; it does not affect a single
manufacturer running their own desk, which is our buyer.

---

**Q13. (If a beat visibly fails on stage.)**

Do not apologise twice and do not debug in front of the room. One sentence, then keep going:

> "That one's on the degraded path — I'll show you the recorded run of it after." *(Press `→` to the
> next beat. Runbook §Failure.)*

---

## 5. SPONSOR ATTRIBUTION

One sentence each. These are written to survive a follow-up question. **Say them as written.** The
deliberate omissions are load-bearing — each one is a claim we checked and could not support.

**ZooWork** — The runtime the desk runs on and the thing that makes the Engineering veto enforceable:
a `custom_tools` call halts the agent run until our backend calls `resolveCustomToolCall`, which we
verified by withholding the answer and watching the run sit in `awaiting_approval` until we resolved
it — so the block is platform-enforced rather than prompt convention, and it is also why a module
photo would reach a vision model as a base64 image block in a tool result, since ZooWork has no
attachment API for session input. *Precise boundary: the gate round trip ran live against a real agent
on `litellm/gpt-5.6-terra`; the seven-beat demo plays from the replay log.*

**Moss** — On-device retrieval over two text indexes: decoded module specifications, which is how
cross-vendor part equivalence is found, and module top-marking strings, which is how the counterfeit
lot is caught — *Moss has no image embedding, so beat 5 is text matching over markings, not a
comparison of pixels.*

**Tavily** — The only component that looks outside the company: spot pricing, lead times, distributor
stock, and the industry counterfeit advisory that makes Quality suspicious in the first place.

**BAND** — The cross-company room the agents talk in. *BAND has no native veto or block primitive —
its event vocabulary is five strings and nothing halts a room — so the gate in beat 4 is ZooWork's,
not BAND's.* Do not describe BAND as "a Critic that blocks"; the README's wording predates the SDK
read and is wrong.

**Entire** — The provenance layer over the qualified-parts list: the commit that changes the QVL
carries an Entire checkpoint linking it to the agent session that produced it, so `entire why` on that
line answers which session, which model and which commit changed the parts list — git says what
changed, Entire says who and from where. *Precise version: the command is `entire why`, not `entire
blame`; the prompt it prints is the session root rather than a procurement instruction, so we claim
the session linkage and not the prompt text; and the hosted share URL is unverified, so this is a
terminal artefact only.*

**If BAND is not wired by the 16:30 freeze:** drop the BAND sentence entirely rather than softening
it. Four precise attributions beat five where one is aspirational, and "Best Use of ZooWork" is the
prize with our name on it — the ZooWork sentence is the one that has to be unassailable.

---

## ASSUMPTIONS AND OPEN ITEMS

Noted here rather than waiting on a decision, per instruction. All are PITCH-track judgement calls.

1. **Latency figure — RESOLVED 16:20, script re-cut.** The old 6/8 ms were invented placeholders;
   DATA replaced them with MOSS's measured 0.22 / 0.20, verified on disk in both
   `data/mock-events.json` and `ui/public/events.json`. AGENTS' live run measures 0.26 on the same
   operation. Beat 3 now says **"about a quarter of a millisecond, on-device"**, which is true at all
   three and cannot be falsified by stage variance. Answer is Q6b. An earlier revision of this file
   permitted "six milliseconds" — that permission is struck and the number is gone from the script.
2. **`status/data.md` does not exist.** The 2.06% / $214 / $249,561 line was re-derived directly from
   the `rollup` block of `data/bom.json` and every figure checks out (§2 table). The opening is built
   on the arithmetic, not on the quote.
3. **Live vs replay — RESOLVED at the freeze: we demo DATA's replay log.** It is complete, 55/55
   events carry `plain`, and every beat is present. AGENTS' live run is missing beat 5 entirely (no
   `counterfeit.flagged`) and missing `plain` on 14 of its 40 events, which would leave the presenter
   narrating silent cards on the two beats that carry the demo. Q3 and Q10 no longer branch — there is
   one answer and it is given without apology.
4. **BAND (M8) and live Tavily (M9) were not done.** §5 has a drop rule for BAND; Q10 is now the
   single replay answer for Tavily.
7. **The "no photos leave the building" framing is struck everywhere.** Cloud index creation does not
   support it. The claim is **"the query never leaves the laptop"**, in the script, in Q6 and in Q6b.
   DATA removed the stronger version from the event payloads for the same reason.
8. **Q2 — RESOLVED 17:45. The ZooWork halt is verified end to end and the prohibition is struck.**
   `data/cache/zoowork-roundtrip.json`: `haltProven: true`, `resumeProven: true`, `awaiting_approval`
   with one pending call at 1s/3s/5s while the answer was withheld, then a correct block on our
   computed verdict. Reproducible via `cd agents && npx tsx verify-zoowork.ts`. Q2 now leads with the
   runtime halt and **the invitation to test it is offered.** This went from the weakest claim in the
   pitch to the strongest in about 70 minutes. **The one boundary that must stay sharp:** the gate
   round trip ran live, the seven-beat demo is replay. Never let those blur.
9. **Beat 7 — RESOLVED 16:50, and it works.** At 16:35 `entire why` printed "No Entire checkpoint is
   linked"; AGENTS then wired the checkpoint and I re-verified it myself. HEAD is `e28231e` with
   `Entire-Checkpoint: 01M41Y6846EXDDP1RGZY9B6C1T`, and `why` on **line 12** of
   `data/cache/qvl-rev-E.proposed.json` resolves the line to the agent session. Line 1 still returns
   "no checkpoint" (older untrailered commit touched it), and `data/qvl.json:12` is not in HEAD — so
   the line number matters. **No login needed**; that earlier belief was wrong, as was the belief that
   a late `entire enable` prevents capture (`entire session attach` captured retroactively).
   **The narration claims the session linkage, never the prompt text** — `why` prints the session root
   prompt, which is the hackathon Luma brief, and reading that out after "here's why we approved this
   part" would land badly.
5. **Opening pre-roll needs a static screen** — the board dark, alert not yet fired. If the UI has no
   pre-roll state, press Space *as you begin* the last clause of the opening line instead, and accept
   that beat 1's narration starts 2 seconds late. Do not shorten the opening line.
6. **The `savingsVsBroker` $702,000** is net of the $364,262 the broker lot was nominally cheaper,
   against ~$1.07M of scrap and rebuild. If a judge does that subtraction out loud, agree with them:
   the figure is a net, and it is illustrative.
