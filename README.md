# DC BuildOut Simplified

**Datacenter buildout, unblocked.** The desk is called **LINEDOWN**.

Built at the AI Commerce Gallery hackathon — Walt Disney Family Museum, 3 Oct 2026.

**[Live demo](https://ui-orpin-ten.vercel.app)** · [Landing page](https://ui-orpin-ten.vercel.app/landing)

---

A server ODM's qualified DDR5 RDIMM just had its allocation cut 40%. A 480-node AI cluster
ships in 11 days. LINEDOWN is the agent desk that sources a *qualified* alternate before the
line stops — and proves to an auditor why it chose what it chose.

The AI boom broke the memory market. HBM capacity cannibalised conventional DRAM supply, and
server DDR5 got scarce. Memory is **2.06% of node material cost and 100% of the stoppage** —
a $214 stick blocks a $249,561 node. This is how a manufacturer buys through it.

## What it does

1. An allocation cut opens a war room. A money counter starts burning at $1,240/min.
2. **Tavily** pulls spot pricing, distributor stock and allocation news.
3. **Moss** decodes the part number and finds cross-vendor equivalents on spec — on-device,
   about a quarter of a millisecond.
4. **Engineering blocks** the cheapest option. It matches all five platform requirements
   field-for-field and is still blocked: electrically fine, cheapest by $209,203, never tested
   in that board. The QVL is a record of what was *tested*, not what *fits*.
5. A broker offer looks too good. Its chip top-markings match a known remarked-counterfeit
   pattern at 93% — six independent findings — and it's rejected.
6. A qualified alternate is approved by a human, with one click. PO drafted.
7. **Entire** commits the decision with the agent session attached. `entire why` resolves a
   line to the session that changed it — the answer an auditor needs six months later.

Outcome: **$2,487,600 protected** on a single sourcing decision.

## Two gates, deliberately independent

The QVL check answers *"was this tested here."* The authenticity check answers *"is this
genuine."* Neither answers the other — the counterfeit lot carries the qualified incumbent part
number and passes qualification cleanly. One gate would have bought the fake.

## Stack

| Sponsor | Role |
|---|---|
| **ZooWork** | The agent runtime. `custom_tools` halt the run inside ZooWork until our backend calls `resolveCustomToolCall` — **verified live against the API**, so Engineering's veto is platform-enforced rather than prompt convention. Reproduce: `cd agents && npx tsx verify-zoowork.ts` |
| **Moss** | On-device retrieval: cross-vendor part-number equivalence and chip-marking matching. Sub-millisecond, and the query never leaves the laptop. |
| **Tavily** | Spot pricing, distributor stock, lead times, allocation news. |
| **Entire** | Session-attached commits. Git tells you what changed; Entire tells you why — locally, with no account. |

## What is real, and what isn't

Honesty about scope, because the product's whole thesis is provenance:

- **Moss has no image embedding.** The counterfeit check is text matching over chip top-marking
  strings, lot codes and date codes — six findings, each reproducible by plain string, regex and
  date comparison. It is not a comparison of pixels.
- **BAND is not used.** It was evaluated and rejected on evidence: its complete chat event
  vocabulary is `["tool_call","tool_result","thought","error","task"]` with no gating primitive,
  so a "Critic that blocks" would be a prompt convention nothing enforces. The reasoning is in
  [`agents/band.ts`](agents/band.ts) and [`docs/INTEGRATION.md`](docs/INTEGRATION.md) §4.3.
- **The ZooWork gate ran live; the seven-beat demo plays from a validated replay log.** Audit
  replay of a sourcing decision is what IATF 16949 traceability requires, so replay is a feature
  of the product rather than a stand-in for one.
- **Pricing is illustrative**, and labelled as such in the data files.
- We source an alternate **module**. We never substitute DRAM die.

### It caught us buying the fake

Our first end-to-end run **approved the counterfeit.** The module photo couldn't be found, so
Quality never completed a screen, so nothing came back as a *finding* — and the broker lot, being
cheapest and fastest, won. Fixed by failing closed on non-franchised supply: the absence of a
finding is not a clean result.

Later, when we deliberately withheld a QVL verdict, the agent timed out and refused to decide —
*"I can't qualify or reject it until the QVL service responds."* It would not guess. The gate is
load-bearing in both directions.

## Run it

```bash
cp .env.example .env    # ZOOWORK_API_KEY, TAVILY_API_KEY, MOSS_PROJECT_ID, MOSS_PROJECT_KEY
cd ui && npm install && npm run dev    # → http://localhost:3137
```

Controls: `Space` pause/resume · `R` restart · `→` skip beat. The run pauses at the approval
gate until you click Approve.

The UI consumes an event list conforming to [`docs/EVENT-SCHEMA.md`](docs/EVENT-SCHEMA.md).
Live mode and replay mode are indistinguishable to it.

- Pitch and Q&A: [`docs/PITCH.md`](docs/PITCH.md)
- Demo runbook: [`docs/DEMO-RUNBOOK.md`](docs/DEMO-RUNBOOK.md)
- Integration notes, all five sponsors: [`docs/INTEGRATION.md`](docs/INTEGRATION.md)
- Plan, decisions log and cut ladder: [`MILESTONES.md`](MILESTONES.md)
