# DATA track — status

**State: COMPLETE.** M3 (seed data) and M4 (replayable event log) both met.
All 10 JSON files parse; all 4 SVGs are valid XML; no dangling asset references.

---

## FOR THE PRESENTER — use this line

> **Memory is 2.06% of what a node costs in materials and 100% of what stops the line.
> A $214 memory stick blocks a $249,561 server.**

Derived, not asserted — the arithmetic is in `data/bom.json` → `rollup`
(`memoryShareOfMaterialPct`, `materialCostPerNodeUsd`). If a judge challenges it, the 20 BOM
lines and the per-node quantities are right there. That asymmetry is the entire business case
for this desk: nobody staffs a team to save 2% of material cost, and everybody staffs a team to
stop the line going down.

Two more presenter-safe numbers:

- **$209,203** — what Engineering refused to save by blocking the cheapest module. Say the number
  out loud; it is what makes the block a real decision rather than a rubber stamp.
- **$2,487,600** — total protected. One avoided day of program slip ($1,785,600) plus the
  counterfeit scrap and rebuild we did not buy ($702,000). This is the hero number, **not** the
  live money counter.

---

## Deliverables

| File | Purpose |
|---|---|
| `data/mock-events.json` | **The one that matters.** Full 7-beat replayable run. 55 events, ts 0 → 143000 ms. |
| `data/bom.json` | 20-line assembly BOM, AI-SRV-G4, 480 nodes, computed rollups. One at-risk line, two on watch. |
| `data/candidates.json` | 4 alternate modules, 4 non-overlapping rejection reasons. |
| `data/qvl.json` | Platform QVL. Makes the beat-4 block a real lookup. |
| `data/markings/index.json` | Manifest for the beat-5 fixture set. Load this, don't glob. |
| `data/markings/*.json` | 5 fixtures: 3 genuine references, 1 suspect lot, 1 reusable pattern. |
| `data/markings/*.txt` | Flat sidecars, generated from the JSON. The text-match fallback. |
| `data/markings/marking-strings.txt` | All 194 marking lines in one grep-able file. |
| `data/markings/img/*.svg` | 4 schematic label images for the beat-5 side-by-side. |

### Event log shape

55 events; ids `e001`–`e055` contiguous; `ts` monotonic; **`plain` on every single payload**,
including `agent.message`, `tool.call` and `tool.result` where the schema does not require it.
Jargon with a plain-language subtitle reads as credible; jargon alone loses the judge.

Beat anchors: `alert.raised` e001 (0s) · tavily e006/e007 (12s) · `moss.partmatch` e012 (32s) ·
**`block.raised` e026 (60s)** · **`counterfeit.flagged` e037 (90s)** ·
**`approval.requested` e043 (108s, replay PAUSES)** · `entire.commit` e050 (128s) ·
`run.ended` e055 (143s).

---

## Decisions and assumptions

### 1. One additive `tool.result` kind: `qvl.lookup`
The schema froze `kind` at four values, none of which covers a QVL lookup. The alternative was a
`tool.call` with `status:"running"` and no result — a spinner that never resolves, which is worse
on stage than an unknown kind. Everything the demo needs is **also** carried by the following
`block.raised` (e026), so a UI rendering unknown kinds as a neutral card loses nothing.
Schema file not edited; it is not this track's to change.

### 2. `tool: "qvl"`, deliberately not `"zoodata"`
In replay this beat reads `data/qvl.json` off local disk. ZooData is ZooWork's
URL-to-structured-JSON product, so labelling a local file read `zoodata.*` would claim a sponsor
integration we are not making — and we are chasing that prize, so a judge may probe exactly there.
AGENTS owns flipping it to `"zoodata"` at M8 **if and only if** the lookup genuinely routes
through ZooData. Our whole pitch is provenance; we do not get to be loose about our own.
Note this puts `tool: "qvl"` outside the schema's frozen enum — accepted, same reasoning as §1.

### 3. The money counter vs the hero number
`burnRatePerMin` is **1240** → $1.79M/day. Derivation in `data/bom.json` → `exposure`: idled
final-assembly cell, contractual late-delivery penalty accrual, and customer-side cluster
revenue-at-risk pass-through. Over a 143-second run that counter only reaches ~$3.0k, which looks
weak. UI is priming it from the 14:02 allocation notice instead of from ts 0, with the label
saying so explicitly. The headline remains `run.ended.dollarsSaved` = $2,487,600.

### 4. Illustrative pricing — the boundary
**Every** price, premium, discount, lead time and dollar counter in `data/` is a plausible figure
chosen for the demo. Marked in a top-level `_comment` in each file. Nothing here is quoted market
data and nothing should be presented as fact.

AGENTS may overwrite: `candidates[].pricePerUnit`, `atRiskPart.contractPricePerUnit`, the
`tavily.sources` payload in e007, and any derived extended totals. **Do not** overwrite the QVL
validation report IDs, the marking fixtures or the findings — those are the demo's logic, not its
decoration. The Tavily sources in e007 are placeholders shaped like real results; if we stay on
replay, do not present them as retrieved citations.

### 5. Module-level, never die-level — for anyone writing copy
We are sourcing an alternate **MODULE**: a complete 288-pin DDR5 RDIMM assembly from a different
module manufacturer. We never substitute DRAM die inside a module. Where `dieRevision` appears in
`qvl.json` it is a descriptor of the as-validated module build — a record of what was on the
bench — not a substitutable attribute.

HBM is the **villain in the backstory**, never the sourced part: HBM3 on the GPU baseboards
(`BOM-0030`) is cannibalising the conventional DRAM capacity `BOM-0020` is built from. HBM has no
module-level alternate and this desk cannot second-source it. Someone in the audience will know
this distinction; getting it right buys credibility and getting it wrong costs the whole demo.

On the counterfeit: what was falsified is the **marking on an assembled module**. Nobody
decapsulated anything, so we make no claim about which die is inside. The honest claim is narrower
and stronger — *the module is not the part it says it is, so none of our qualification data
applies to it.*

### 6. Two independent gates, not one idea told twice
The counterfeit candidate `cand-02` deliberately carries the **qualified incumbent MPN**
(`MTC20F2085S1RC48BA1`), so it **passes** the QVL lookup and is caught only by the marking check.
QVL answers *"was this part tested on this platform"*. It cannot answer *"is this physical module
genuine"*. Beats 4 and 5 therefore each justify their own existence. AGENTS has been warned not to
let the qualification engine clear it.

### 7. Beat 4 is the strong version
`cand-01` matches all five platform `requirements` **field for field** and is still blocked —
electrically fine, cheapest by $209,203, never tested in this board. A part that fails a spec
outright is a demo anyone can build and a judge learns nothing from. "Spec-compatible but not
qualified on this platform" is the real engineering position and the actual argument for why
procurement cannot be naively automated.

`qvl.json` carries an `evaluationQueue[]` entry (`EVAL-G4-0412`, submitted 2026-07-02, thermal
margin and 24-slot loading never finished) so the reason upgrades from "not on the list" to
"submitted in July, testing never completed". It also carries a deliberate trap: a `withdrawn`
entry whose specs match `requirements` exactly and which must still fail — verify the engine
checks `status`, not just presence.

### 8. Four candidates, four different reasons
| id | Vendor | $/ea | Lead | Outcome |
|---|---|---|---|---|
| cand-01 | V-color | 186.40 | 2 wk | **BLOCKED** — spec-compatible, not on QVL |
| cand-02 | broker (claims Micron) | 152.75 | ex-stock | **REJECTED** — remarked/counterfeit |
| cand-03 | Samsung | 231.80 | 1 wk | **APPROVED** — qualified, in stock |
| cand-04 | SK hynix | 226.50 | 14 wk | **REJECTED** — schedule only |

cand-04 is a **schedule** reject, not a quality reject. It stays on the QVL and there is nothing
wrong with the part. Keep that distinction in narration — it shows the desk weighing time as a
hard constraint, and it is also just true.

### 9. Text-first counterfeit detection
All six findings on the broker's lot are reproducible with **string, regex, range and date
comparisons** — no image embedding. That directly covers the M1 risk row ("Moss image embedding
not in SDK → fall back to text-match on marking strings + lot codes"). Run
`grep '|FINDING|' data/markings/marking-strings.txt` to see all six with their methods.

Four of the six are individually sufficient to reject a lot. The strongest is F6: the SPD carries
a correct Micron vendor ID but blank assembler, date and serial bytes — fields written during
module assembly, a step a re-labeller does not perform.

The three similarity scores (0.93 remarked pattern / 0.41 the part it claims to be / 0.18 an
unrelated genuine part) matter **together**. A matcher that flagged everything would prove nothing.

### 10. Moss latency — switched to MOSS's measured numbers
`e012` was `latencyMs: 6` and `e036`/`e037` were `8`; those were my invented placeholders. MOSS
measured **0.22 ms** (beat 3) and **0.20 ms** (beat 5) on the local backend, so the event log now
carries the measured figures and the `plain` strings read "0.22 of a millisecond" and "a fifth of
a millisecond". PITCH flagged the conflict and can re-cut beat 3 to the stronger line.

Reason for preferring measured over conservative: if the live path returns 0.22 and replay claims
6, live and replay diverge on a number we are putting on screen. Given that our whole pitch is
provenance, replay has to report what the system actually does.

Two MOSS constraints now recorded in `data/mock-events.json` `_comment`,
`data/markings/index.json` and the suspect fixture, so they survive anyone editing these files:

- **Never add Moss's `parseMs` to `latencyMs`.**
- Stage wording is **"on-device retrieval"**, *not* "fully offline" — index creation is a cloud
  operation and only the query is local. I removed an overclaim of mine here: e036's `plain`
  previously said "no photos left the building", which the cloud index step does not support. It
  now says the query never leaves the laptop, which is both true and still the point.

---

## Photo swap — copy, not code

The user is photographing a real DIMM (one genuine, one altered). These are an **upgrade, not a
dependency** — the schematic SVGs are a complete shipping artifact and may well project more
legibly than a phone photo under venue lighting.

```bash
cd /Users/abhijitbetigeri/projects/line-down-desk

# Option A (preferred — zero code change). Keep the filename, replace the contents.
cp ~/Desktop/genuine-dimm.jpg  data/markings/img/genuine-micron-MTC20F2085S1RC48BA1-label.svg
cp ~/Desktop/altered-dimm.jpg  data/markings/img/suspect-broker-PRC-24817-label.svg
# The UI serves the bytes; the extension is cosmetic for an <img> tag. If the UI sniffs by
# extension, wrap instead:
#   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 210">
#     <image href="genuine-dimm.jpg" width="440" height="210" preserveAspectRatio="xMidYMid slice"/>
#   </svg>

# Option B. Same stem, .png beside the .svg; UI asset resolver prefers .png when present.
cp ~/Desktop/genuine-dimm.png  data/markings/img/genuine-micron-MTC20F2085S1RC48BA1-label.png
cp ~/Desktop/altered-dimm.png  data/markings/img/suspect-broker-PRC-24817-label.png
```

**`data/mock-events.json` must not be edited to accept a photo.** `e037.imageA`/`imageB`
reference these exact paths; the filenames are frozen. viewBox is locked at `0 0 440 210` (~2.1:1)
so a 4:3 photo letterboxes predictably rather than reflowing the beat-5 layout.

If the photos miss the 16:30 freeze, ship the SVGs. They are correct and complete.

---

## Notes for other tracks

**UI** — `plain` lives inside `payload` on every event; render it as a subtitle everywhere, not
just where the schema names it. Please do not hard-fail on a missing image in beat 5: a
placeholder plus the `findings[]` table is a fine degraded state and costs nothing to add. Worth
having even now that the SVGs exist, purely for stage safety.

**AGENTS** — `data/qvl.json` matches the parser shape you specified
(`platform`, `platformLabel`, `qualified[]`, `approvedAlternates[]`, `requirements{}`).
`data/candidates.json` carries both a string `specs` map for the UI and a typed
`specsNormalized` for your field-by-field compare. Keep them in sync if you edit either.

**MOSS** — `data/markings/index.json` is the manifest; `marking-strings.txt` is the flat fallback.
The `.txt` sidecars are generated from the `.json`, so edit the JSON and regenerate.

**Open item, not mine to close:** `tool: "qvl"` and `kind: "qvl.lookup"` both sit outside the
frozen enums in `docs/EVENT-SCHEMA.md`. Reasoning in §1 and §2. If the schema owner wants them
folded in properly, that is a two-line edit to the schema doc that I have not made.
