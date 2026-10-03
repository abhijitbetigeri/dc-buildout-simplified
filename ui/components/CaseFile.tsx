"use client";

import { compactMoney, money, qty as fmtQty } from "@/lib/derive";
import type { AlertPayload, Candidate, CommitInfo } from "@/lib/types";
import { Label } from "./primitives";

/**
 * THE CASE FILE — right zone, assembling live.
 *
 * This is the artefact an auditor would actually ask for: every candidate that
 * was considered, what it cost, and why it was refused or accepted. It ends with
 * the commit hash, which is the answer to "prove it".
 */
export function CaseFile({
  candidates,
  po,
  commit,
  alert,
}: {
  candidates: Candidate[];
  po: { poNumber: string; candidateId: string; qty: number; total: number } | null;
  commit: CommitInfo | null;
  alert: AlertPayload | null;
}) {
  // Cheapest first — so the block lands on the top row and reads as a refusal
  // of the cheapest option rather than an arbitrary pick.
  const rows = [...candidates].sort((a, b) => a.pricePerUnit - b.pricePerUnit);

  return (
    <aside className="scroll-dark flex h-full flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b hairline bg-surface/95 px-5 py-3 backdrop-blur">
        <Label>case file</Label>
        <span className="mono text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
          {rows.length} candidate{rows.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="flex-1 space-y-2 px-4 py-4">
        {rows.length === 0 ? (
          <p className="pt-8 text-center text-[0.875rem] text-faint">
            No candidates sourced yet.
          </p>
        ) : null}

        {rows.map((c) => (
          <CandidateRow key={c.id} c={c} qtyAtRisk={alert?.qtyAtRisk} />
        ))}
      </div>

      {po ? (
        <div className="animate-slide-in border-t border-approve/30 bg-approve-deep/40 px-5 py-4">
          <Label>purchase order</Label>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="mono text-[1.0625rem] font-semibold text-approve">{po.poNumber}</span>
            <span className="mono tnum text-[0.9375rem] text-ink">{money(po.total)}</span>
          </div>
          <p className="mono mt-1.5 text-[0.75rem] text-faint">
            {fmtQty(po.qty)} modules · {po.candidateId}
          </p>
        </div>
      ) : null}

      {/* ——— the auditor's answer ——— */}
      {commit ? <BlamePanel commit={commit} /> : null}
    </aside>
  );
}

const STATUS: Record<
  string,
  { pill: string; row: string; word: string; accent: string }
> = {
  blocked: {
    pill: "border-block/50 bg-block/15 text-block",
    row: "border-block/50 bg-block/[0.06]",
    word: "blocked",
    accent: "bg-block",
  },
  approved: {
    pill: "border-approve/50 bg-approve/15 text-approve",
    row: "border-approve/50 bg-approve/[0.06]",
    word: "approved",
    accent: "bg-approve",
  },
  rejected: {
    pill: "border-line-bright bg-hi text-dim",
    row: "border-line bg-surface/40 opacity-70",
    word: "rejected",
    accent: "bg-faint",
  },
  evaluating: {
    pill: "border-accent/35 bg-accent/10 text-accent",
    row: "border-line bg-surface/60",
    word: "evaluating",
    accent: "bg-accent/70",
  },
  new: {
    pill: "border-line-bright bg-hi text-dim",
    row: "border-line bg-surface/60",
    word: "logged",
    accent: "bg-line-bright",
  },
};

const SPEC_ORDER = ["capacity", "organization", "speed", "formFactor", "voltage", "density", "org", "form", "rcd"];

function CandidateRow({ c, qtyAtRisk }: { c: Candidate; qtyAtRisk?: number }) {
  const s = STATUS[c.status] ?? STATUS.evaluating;
  const extended = qtyAtRisk ? c.pricePerUnit * qtyAtRisk : null;

  const specs = Object.entries(c.specs ?? {})
    .filter(([k]) => k !== "note")
    .sort(
      ([a], [b]) =>
        (SPEC_ORDER.indexOf(a) + 1 || 99) - (SPEC_ORDER.indexOf(b) + 1 || 99)
    )
    .slice(0, 5);

  return (
    <article
      className={`animate-slide-in relative overflow-hidden rounded border transition-colors duration-500 ${s.row}`}
    >
      {/* status edge */}
      <span className={`absolute left-0 top-0 h-full w-[3px] ${s.accent}`} />

      <div className="pl-4 pr-3.5 py-3">
        {/* header: part + status */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <p className="mono truncate text-[0.9375rem] font-semibold text-ink" title={c.mpn}>
              {c.mpn}
            </p>
            <p className="mt-[2px] truncate text-[0.75rem] text-faint" title={c.vendor}>
              {c.vendor}
            </p>
          </div>
          <span
            className={`mono shrink-0 rounded-sm border px-1.5 py-[2px] text-[0.5625rem] font-semibold uppercase tracking-[0.12em] ${s.pill}`}
          >
            {s.word}
          </span>
        </div>

        {/* commercials */}
        <div className="mt-3 flex items-end gap-4">
          <div>
            <Label>unit</Label>
            <p className="mono tnum mt-[2px] text-[1.0625rem] font-semibold leading-none text-ink">
              ${c.pricePerUnit.toFixed(2)}
            </p>
          </div>
          <div>
            <Label>lead</Label>
            <p className="mono tnum mt-[2px] text-[1.0625rem] font-semibold leading-none text-ink">
              {c.leadTimeWeeks}
              <span className="ml-0.5 text-[0.6875rem] font-medium text-faint">wk</span>
            </p>
          </div>
          {extended ? (
            <div className="ml-auto text-right">
              <Label>extended</Label>
              <p className="mono tnum mt-[2px] text-[0.9375rem] leading-none text-dim">
                {compactMoney(extended)}
              </p>
            </div>
          ) : null}
        </div>

        {/* specs */}
        {specs.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {specs.map(([k, v]) => (
              <span
                key={k}
                className="mono rounded-sm border border-line bg-base/50 px-1.5 py-[2px] text-[0.625rem] text-faint"
                title={`${k}: ${v}`}
              >
                {String(v)}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mono mt-2.5 truncate text-[0.6875rem] text-faint/80" title={c.source}>
          {c.source}
        </p>

        {c.counterfeit ? (
          <p className="mono mt-2 inline-flex items-center gap-1.5 rounded-sm border border-block/50 bg-block/15 px-1.5 py-[2px] text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-block">
            counterfeit · remarked
          </p>
        ) : null}

        {/* why — the part that makes this a case file rather than a price list */}
        {c.statusReason ? (
          <p
            className={`mt-2.5 border-l-2 pl-2.5 text-[0.75rem] leading-snug ${
              c.status === "blocked"
                ? "border-block/50 text-[#FFC9C7]"
                : c.status === "approved"
                  ? "border-approve/50 text-[#B6F2D4]"
                  : "border-line-bright text-dim"
            }`}
          >
            {c.statusReason}
          </p>
        ) : null}
        {c.statusPlain ? (
          <p className="mt-1.5 pl-2.5 text-[0.75rem] leading-snug text-faint">{c.statusPlain}</p>
        ) : null}
      </div>
    </article>
  );
}

function BlamePanel({ commit }: { commit: CommitInfo }) {
  return (
    <div className="animate-slide-in border-t hairline bg-raised/70 px-5 py-5">
      <Label>committed to the record</Label>

      <div className="mt-2.5 flex items-center gap-2.5">
        <span className="mono rounded border border-accent/30 bg-accent/[0.07] px-2.5 py-1 text-[1rem] font-semibold text-accent">
          {commit.commitHash}
        </span>
        {commit.blameUrl ? (
          <a
            href={commit.blameUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mono text-[0.75rem] text-dim underline decoration-line-bright underline-offset-[3px] hover:text-ink"
          >
            entire blame →
          </a>
        ) : null}
      </div>

      {commit.summary ? (
        <p className="mono mt-3 text-[0.75rem] leading-relaxed text-dim">{commit.summary}</p>
      ) : null}

      {commit.sessionId ? (
        <p className="mono mt-3 text-[0.625rem] uppercase tracking-[0.1em] text-faint/80">
          session {commit.sessionId}
        </p>
      ) : null}

      <p className="mt-4 border-t border-line pt-3 text-[0.75rem] leading-relaxed text-faint">
        Every refusal in this case file is in that commit. An auditor asking in two years why the
        supplier changed gets the answer from one command — which is what IATF 16949 traceability
        actually requires.
      </p>
    </div>
  );
}
