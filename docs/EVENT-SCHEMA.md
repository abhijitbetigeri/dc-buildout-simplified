# EVENT SCHEMA — the contract

Everything the UI renders is a flat, append-only list of events.
Agents emit them. The UI replays them. **Nothing else couples the two tracks.**

This file is frozen. If you need a change, say so in `status/` — do not edit unilaterally.

## Envelope

```ts
type Event = {
  id: string          // "e001", monotonically increasing
  ts: number          // ms offset from run start (NOT wall clock) — replay uses this
  type: EventType
  payload: object     // per-type, below
}
```

A run is `Event[]` ordered by `ts`. Replay = walk the list, sleep to the next `ts`, render.
Live = same list, streamed. **The UI must not care which it is.**

### File format (amended 15:00 — the one change to this frozen file)

On disk a run is a **wrapper object**, not a bare array:

```json
{ "runId": "...", "program": "...", "durationMs": 148000, "events": [ /* Event[] */ ] }
```

Both DATA and AGENTS emit this shape, so live and replay files are interchangeable.
**Every reader must accept both:**

```ts
const events = Array.isArray(d) ? d : d.events
```

The metadata is worth keeping — `durationMs` lets the UI size a progress bar before parsing
55 events. Readers tolerate the bare array so nobody's stub breaks.

## Types

### `alert.raised` — opens the run
```ts
{ part: string            // "MTC20F2085S1RC48BA1" (the at-risk MPN)
  partLabel: string       // "64GB DDR5-4800 RDIMM"
  program: string         // "AI-SRV-G4 — 480 node cluster"
  qtyAtRisk: number
  burnRatePerMin: number  // drives the money counter
  deadlineLabel: string   // "Ship date in 11 days"
  reason: string          // "Supplier cut allocation 40%"
  plain: string }         // plain-language subtitle — ALWAYS required
```

### `agent.message`
```ts
{ agent: string   // "sourcing" | "engineering" | "quality" | "market" | "intake"
  role: string    // "Sourcing" — display name
  text: string }
```

### `tool.call`
```ts
{ callId: string
  agent: string
  tool: "tavily" | "moss" | "entire" | "zoodata" | "qvl"   // "qvl" = local lookup, amended 15:15
  label: string    // "Pulling spot pricing" — human readable
  status: "running" }
```

### `tool.result`
```ts
{ callId: string
  kind: "tavily.sources" | "moss.matches" | "moss.partmatch" | "entire.commit"
  payload: ...  // see below
}
```

- `qvl.lookup` → `{ ... }` — the QVL lookup behind the block (added 15:00; readers tolerate the
  earlier spelling `zoodata.qvl`). Everything this carries is also in `block.raised`.
- `tavily.sources` → `{ sources: { title, url, snippet }[] }`
- `moss.matches` → `{ matches: { id, label, score, thumbnail }[], latencyMs: number }`
- `moss.partmatch` → `{ query: string, equivalents: { mpn, vendor, score, specs }[] , latencyMs: number }`
- `entire.commit` → `{ commitHash, blameUrl, summary, sessionId }`

> `latencyMs` is rendered prominently. Sub-10ms on-device is a selling point — show it.

### `candidate.added`
```ts
{ id, mpn, vendor, specs: Record<string,string>,
  pricePerUnit: number, leadTimeWeeks: number, source: string }
```

### `candidate.status`
```ts
{ id, status: "evaluating" | "blocked" | "approved" | "rejected",
  reason: string, plain: string }
```

### `block.raised` — THE RED MOMENT. Render big.
```ts
{ agent: "engineering", candidateId: string,
  reason: string,   // "Not on platform QVL for AI-SRV-G4"
  plain: string }   // "This supplier was never tested on this server. Could take the cluster down."
```

### `counterfeit.flagged` — THE X-FACTOR. Render two images side by side.
```ts
{ candidateId: string,
  imageA: string,   // submitted module label (path or data URI)
  imageB: string,   // known-good / known-counterfeit reference
  score: number,    // similarity
  latencyMs: number,
  reason: string, plain: string }
```

### `approval.requested` — UI shows the big Approve button, replay PAUSES here
```ts
{ candidateId: string, summary: string, savingsVsBroker?: number }
```

### `approval.granted`
```ts
{ candidateId: string, by: string }
```

### `po.drafted`
```ts
{ poNumber: string, candidateId: string, qty: number, total: number }
```

### `policy.committed`
```ts
{ commitHash: string, blameUrl: string, summary: string, sessionId: string }
```

### `run.ended`
```ts
{ outcomeLabel: string, dollarsSaved: number, minutesElapsed: number }
```

## Rules

1. **Every event carries a `plain` field where a judge could get lost.** Design is scored on
   "user-friendly". Jargon with a plain-language subtitle = credible. Jargon alone = lost judge.
2. **`approval.requested` pauses replay** until the presenter clicks. That click is the
   only human action in the demo and it must feel deliberate.
3. The UI renders an unknown event type as a neutral card rather than crashing.
