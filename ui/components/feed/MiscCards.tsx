"use client";

import { compactMoney, money, qty } from "@/lib/derive";
import type { CandidateStatus, RunEnd } from "@/lib/types";
import { AgentBadge, Label, Plain } from "../primitives";

/* ———————————————— agent message ———————————————— */
export function MessageCard({
  agent,
  role,
  text,
  plain,
}: {
  agent: string;
  role: string;
  text: string;
  plain?: string;
}) {
  return (
    <article className="animate-slide-in rounded-md border border-line bg-surface/70 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <AgentBadge agent={agent} role={role} />
        <div className="min-w-0 flex-1">
          <p className="text-[1rem] leading-relaxed text-ink">{text}</p>
          <Plain>{plain}</Plain>
        </div>
      </div>
    </article>
  );
}

/* ———————————————— candidate status beat ————————————————
   Compact by design: these are the connective tissue between the big moments,
   and red/green here must not compete with the block and the approval. */
const STATUS_STYLE: Record<string, { dot: string; text: string; border: string; word: string }> = {
  blocked: { dot: "bg-block", text: "text-block", border: "border-block/35", word: "blocked" },
  approved: { dot: "bg-approve", text: "text-approve", border: "border-approve/35", word: "approved" },
  rejected: { dot: "bg-faint", text: "text-dim", border: "border-line", word: "rejected" },
  evaluating: { dot: "bg-accent/70", text: "text-dim", border: "border-line", word: "evaluating" },
};

export function StatusLine({
  candidateId,
  status,
  reason,
  plain,
  mpn,
}: {
  candidateId: string;
  status: CandidateStatus;
  reason: string;
  plain?: string;
  mpn?: string;
}) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.evaluating;
  return (
    <article
      className={`animate-slide-in rounded border ${s.border} bg-surface/40 px-4 py-2.5`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
          <span
            className={`mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] ${s.text}`}
          >
            {s.word}
          </span>
        </span>
        <span className="mono text-[0.8125rem] text-dim">{mpn ?? candidateId}</span>
        <span className="min-w-0 flex-1 text-[0.875rem] text-faint">{reason}</span>
      </div>
      {plain ? (
        <p className="mt-1.5 pl-[14px] text-[0.875rem] leading-snug text-dim">{plain}</p>
      ) : null}
    </article>
  );
}

/* ———————————————— purchase order ———————————————— */
export function PoCard({
  poNumber,
  qty: q,
  total,
  plain,
}: {
  poNumber: string;
  qty: number;
  total: number;
  plain?: string;
}) {
  return (
    <article className="animate-slide-in rounded-md border border-approve/40 bg-approve-deep/45 px-5 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>purchase order drafted</Label>
          <p className="mono mt-1.5 text-[1.375rem] font-semibold text-approve">{poNumber}</p>
        </div>
        <div className="flex gap-7">
          <div>
            <Label>qty</Label>
            <p className="mono tnum mt-1 text-[1.125rem] text-ink">{qty(q)}</p>
          </div>
          <div>
            <Label>value</Label>
            <p className="mono tnum mt-1 text-[1.125rem] text-ink">{money(total)}</p>
          </div>
        </div>
      </div>
      <Plain tone="approve">{plain}</Plain>
    </article>
  );
}

/* ———————————————— end of run: THE number ————————————————
   The climbing counter is the tension. This is the figure the judges leave with,
   so it gets the largest type on the page and nothing competes with it. */
export function OutcomeCard({ end }: { end: RunEnd }) {
  return (
    <article className="animate-slam overflow-hidden rounded-md border border-approve/50 bg-gradient-to-b from-approve-deep/80 to-surface shadow-[0_0_60px_-16px_rgba(63,217,139,0.3)]">
      <header className="flex items-center gap-2.5 border-b border-approve/25 bg-approve/[0.06] px-6 py-3.5">
        <span className="h-1.5 w-1.5 rounded-full bg-approve" />
        <h3 className="mono text-[0.8125rem] font-semibold uppercase tracking-[0.2em] text-approve">
          line stays up
        </h3>
      </header>

      <div className="px-6 pb-6 pt-7">
        <Label>exposure protected</Label>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="mono tnum text-[4.5rem] font-bold leading-[0.9] tracking-tight text-approve">
            {money(end.dollarsSaved)}
          </span>
          <span className="mono text-[1.0625rem] text-approve/60">
            {compactMoney(end.dollarsSaved)}
          </span>
        </div>

        <div className="mt-7 grid gap-5 border-t border-approve/20 pt-5 sm:grid-cols-[auto_1fr]">
          <div className="sm:pr-8 sm:border-r sm:border-approve/20">
            <Label>decision time</Label>
            <p className="mono tnum mt-1.5 text-[2.25rem] font-semibold leading-none text-ink">
              {end.minutesElapsed}
              <span className="ml-1.5 text-[1rem] font-medium text-faint">min</span>
            </p>
            <p className="mt-2 text-[0.8125rem] leading-snug text-faint">
              The email version of this
              <br />
              decision takes days.
            </p>
          </div>
          <div>
            <Label>outcome</Label>
            <p className="mt-1.5 text-[1.0625rem] font-medium leading-snug text-ink">
              {end.outcomeLabel}
            </p>
            <Plain tone="approve">{end.plain}</Plain>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ———————————————— unknown event type: neutral, never a crash ———————————————— */
export function UnknownCard({ type, payload }: { type: string; payload: Record<string, any> }) {
  const plain = typeof payload?.plain === "string" ? payload.plain : undefined;
  return (
    <article className="animate-slide-in rounded-md border border-line bg-surface/50 px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-faint" />
        <span className="mono rounded-sm border border-line-bright bg-hi px-2 py-[2px] text-[0.625rem] uppercase tracking-[0.12em] text-dim">
          {type || "unlabelled event"}
        </span>
      </div>
      {plain ? (
        <Plain>{plain}</Plain>
      ) : (
        <p className="mono mt-2.5 text-[0.75rem] leading-relaxed text-faint">
          Event recorded. No renderer for this type.
        </p>
      )}
    </article>
  );
}
