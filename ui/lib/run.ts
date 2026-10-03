import type { LinedownEvent, RunFile } from "./types";

/** Accepts a bare `Event[]` or `{ events: Event[] }`. Always returns a ts-ordered list. */
export function normalizeRun(raw: RunFile | null | undefined): {
  events: LinedownEvent[];
  runId?: string;
  durationMs?: number;
} {
  if (!raw) return { events: [] };
  if (Array.isArray(raw)) return { events: [...raw].sort((a, b) => a.ts - b.ts) };
  return {
    events: [...(raw.events ?? [])].sort((a, b) => a.ts - b.ts),
    runId: raw.runId,
    durationMs: raw.durationMs,
  };
}

/**
 * Resolve an image path from an event payload to something the browser can fetch.
 * The DATA track writes repo-relative paths like `data/markings/img/x.svg`;
 * `scripts/sync-data.mjs` mirrors those under public/ at the same path.
 */
export function resolveImg(p: string): string {
  if (!p) return "";
  if (/^(https?:|data:|blob:)/.test(p)) return p;
  return p.startsWith("/") ? p : `/${p}`;
}

/**
 * The seven demo beats. `→` jumps between these, not between every message —
 * on stage the presenter wants the next *moment*, not the next line of dialogue.
 */
// Beat names are read off a projector mid-sentence, so they are plain and active.
const BEAT_FOR_TYPE: Record<string, { n: number; name: string }> = {
  "alert.raised": { n: 1, name: "Supply shock" },
  "block.raised": { n: 4, name: "Engineering blocks it" },
  "counterfeit.flagged": { n: 5, name: "Counterfeit caught" },
  "approval.requested": { n: 6, name: "Human decides" },
  "policy.committed": { n: 7, name: "Written to the record" },
};

const BEAT_FOR_TOOL: Record<string, { n: number; name: string }> = {
  tavily: { n: 2, name: "Reading the market" },
  moss: { n: 3, name: "Finding equivalents" },
};

export type Beat = { n: number; name: string; index: number; ts: number };

export function beats(events: LinedownEvent[]): Beat[] {
  const out: Beat[] = [];
  const seen = new Set<number>();
  events.forEach((e, index) => {
    const direct = BEAT_FOR_TYPE[e.type];
    const viaTool =
      e.type === "tool.call" ? BEAT_FOR_TOOL[String(e.payload?.tool ?? "")] : undefined;
    const hit = direct ?? viaTool;
    if (hit && !seen.has(hit.n)) {
      seen.add(hit.n);
      out.push({ ...hit, index, ts: e.ts });
    }
  });
  return out.sort((a, b) => a.ts - b.ts);
}

/**
 * Exposure has been accruing since the allocation notice, not since the replay
 * started. We prime the counter from the notice time stamped in the run id
 * (`ld-run-20261003-1402`) and label it with that time on screen, so the number
 * is large because it is real — not because we inflated the rate.
 */
export function noticePrimeMs(runId?: string, now = Date.now()): { primeMs: number; label: string } {
  const m = /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(runId ?? "");
  if (!m) return { primeMs: 0, label: "" };
  const [, y, mo, d, hh, mm] = m;
  const notice = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    0,
    0
  ).getTime();
  const delta = now - notice;
  // Guard the stage: a wrong system clock must never produce a silly number.
  const primeMs = delta > 0 && delta < 12 * 3600_000 ? delta : 0;
  return { primeMs, label: `${hh}:${mm}` };
}
