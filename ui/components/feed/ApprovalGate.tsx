"use client";

import { compactMoney } from "@/lib/derive";
import { Label, Plain } from "../primitives";

/**
 * The only human action in the demo. Replay is halted here until it is clicked,
 * so it has to look like the lever it is — and it has to be impossible to miss
 * from the back of the room.
 */
export function ApprovalGate({
  summary,
  savingsVsBroker,
  granted,
  grantedBy,
  plain,
  pending,
  onApprove,
}: {
  summary: string;
  savingsVsBroker?: number;
  granted: boolean;
  grantedBy?: string;
  plain?: string;
  pending: boolean;
  onApprove: () => void;
}) {
  return (
    <article
      className={`animate-slide-in overflow-hidden rounded-md border transition-colors duration-500 ${
        granted
          ? "border-approve/55 bg-approve-deep/70"
          : "border-accent/45 bg-gradient-to-b from-accent/[0.06] to-surface"
      }`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-inherit px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              granted ? "bg-approve" : "animate-breathe bg-accent"
            }`}
          />
          <h3
            className={`mono text-[0.8125rem] font-semibold uppercase tracking-[0.2em] ${
              granted ? "text-approve" : "text-accent"
            }`}
          >
            {granted ? "authorised" : "human authorisation required"}
          </h3>
        </div>
        {granted && grantedBy ? (
          <span className="mono text-[0.75rem] text-approve/70">{grantedBy}</span>
        ) : (
          <span className="mono text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
            run halted
          </span>
        )}
      </header>

      <div className="px-6 py-6">
        <Label>recommendation</Label>
        <p className="mono mt-2.5 max-w-[78ch] text-[0.9375rem] leading-relaxed text-ink">
          {summary}
        </p>
        <Plain tone={granted ? "approve" : "loud"}>{plain}</Plain>

        {savingsVsBroker != null ? (
          <div className="mt-5 inline-flex items-center gap-3 rounded border border-line bg-raised px-4 py-2.5">
            <Label>exposure avoided vs broker lot</Label>
            <span
              className={`mono tnum text-[1.25rem] font-semibold leading-none ${
                granted ? "text-approve" : "text-ink"
              }`}
            >
              {compactMoney(savingsVsBroker)}
            </span>
          </div>
        ) : null}

        <div className="mt-7">
          {granted ? (
            <div className="flex items-center gap-3.5">
              <Check />
              <span className="text-[1.25rem] font-semibold text-approve">Approved</span>
              <span className="mono text-[0.8125rem] text-approve/60">
                — purchase order released
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onApprove}
              // No autoFocus: the browser scrolls a focused element into view,
              // which drags the whole document and pushes the header off screen.
              // Space/Enter already reach this through the global key handler.
              data-pending={pending ? "1" : undefined}
              className="group relative w-full overflow-hidden rounded-md border-2 border-approve bg-approve px-8 py-6 text-left transition-transform duration-150 active:scale-[0.995] focus:outline-none focus-visible:ring-4 focus-visible:ring-approve/35"
            >
              <span className="relative flex items-center justify-between gap-6">
                <span>
                  <span className="block text-[2rem] font-bold uppercase leading-none tracking-[0.06em] text-[#06231A]">
                    Approve
                  </span>
                  <span className="mono mt-2 block text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#06231A]/70">
                    release purchase order · press space
                  </span>
                </span>
                <Arrow />
              </span>
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Check() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="10" stroke="#3FD98B" strokeWidth="1.6" fill="rgba(63,217,139,0.12)" />
      <path d="M7.6 12.3l3 3 5.8-6.1" stroke="#3FD98B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M4 12h15M13 6l6 6-6 6"
        stroke="#06231A"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
