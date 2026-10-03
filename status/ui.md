# UI track — status

**Owner:** UI · **Target:** M5 (15:15) complete run renders · M12 (16:40) replay fallback verified

## Now
- 13:55 Read MILESTONES.md + docs/EVENT-SCHEMA.md. Schema treated as frozen.
- Scaffolding `ui/` (Next.js 14 + Tailwind, app router, TS).
- Writing own stub event log at `ui/public/events.stub.json` so UI is **never blocked on DATA**.

## Contract I am building against
- Single source: `Event[]` ordered by `ts` (ms offset from run start).
- `useEventStream` takes a static array OR a stream — components cannot tell the difference.
- `approval.requested` HALTS the engine until the presenter clicks Approve.
- Unknown `type` → neutral card, never a crash.
- Every `plain` field renders as a subtitle under the technical text.

## Asks of other tracks
- **DATA:** when `data/mock-events.json` lands, tell me. I will symlink/copy it to `ui/public/events.json`;
  UI prefers `events.json` and falls back to `events.stub.json`. No code change needed.
- **DATA / MOSS:** for `counterfeit.flagged`, `imageA` / `imageB` should be paths under
  `/img/...` (I will mirror whatever you give me into `ui/public/img/`) or data URIs. Placeholder
  label SVGs are in place now so the shot already composes.
- **MOSS:** keep `latencyMs` on `moss.matches` / `moss.partmatch` / `counterfeit.flagged`. It is
  rendered large — it is a selling point.

## Done
- (nothing yet)
