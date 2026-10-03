"use client";

import { compactMoney, money, qty } from "@/lib/derive";
import type { AlertPayload, RunEnd } from "@/lib/types";
import { MoneyCounter } from "./MoneyCounter";
import { Label, Plain } from "./primitives";

export function AlertPanel({
  alert,
  end,
  getElapsed,
  frozen,
  primeMs = 0,
  noticeLabel = "",
}: {
  alert: AlertPayload | null;
  end: RunEnd | null;
  getElapsed: () => number;
  frozen: boolean;
  primeMs?: number;
  noticeLabel?: string;
}) {
  if (!alert) {
    return (
      <aside className="flex h-full flex-col justify-center border-r hairline px-7">
        <Label>standing by</Label>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-faint">
          No active sourcing case. The desk is quiet.
        </p>
      </aside>
    );
  }

  return (
    <aside className="scroll-dark flex h-full flex-col overflow-y-auto border-r hairline">
      {/* ——— the alert itself ——— */}
      <div className="border-b hairline px-7 pb-6 pt-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">
            allocation alert
          </span>
        </div>

        <h1 className="mono mt-4 break-all text-[1.5rem] font-semibold leading-tight tracking-tight text-ink">
          {alert.part}
        </h1>
        <p className="mt-1.5 text-[0.9375rem] font-medium text-dim">{alert.partLabel}</p>

        <div className="mt-5 rounded border border-line bg-raised/60 px-3.5 py-3">
          <Label>cause</Label>
          <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink">{alert.reason}</p>
        </div>

        <Plain tone="loud">{alert.plain}</Plain>
      </div>

      {/* ——— exposure ——— */}
      <div className="grid grid-cols-2 border-b hairline">
        <Stat label="qty at risk" value={qty(alert.qtyAtRisk)} unit="modules" border />
        <Stat label="deadline" value={alert.deadlineLabel} urgent />
      </div>

      <div className="border-b hairline px-7 py-5">
        <Label>program</Label>
        <p className="mono mt-1.5 text-[0.9375rem] leading-snug text-ink">{alert.program}</p>
      </div>

      {/* ——— THE COUNTER ——— */}
      <div className="border-b hairline px-7 pb-7 pt-6">
        <Label>
          {noticeLabel
            ? `exposure accrued since ${noticeLabel} allocation notice`
            : "line-down cost accrued"}
        </Label>
        <div className="mt-4">
          <MoneyCounter
            burnRatePerMin={alert.burnRatePerMin}
            getElapsed={getElapsed}
            frozen={frozen}
            primeMs={primeMs}
          />
        </div>
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-faint">
          Idle line, expedite premium and liquidated-damages exposure, blended at{" "}
          <span className="mono text-dim">{money(alert.burnRatePerMin)}/min</span> —{" "}
          {compactMoney(alert.burnRatePerMin * 60 * 24)} a day — counting from the moment the
          allocation notice landed{noticeLabel ? ` at ${noticeLabel}` : ""}.
        </p>
      </div>

      {/* ——— outcome ——— */}
      {end ? (
        <div className="animate-slide-in border-b border-approve/25 bg-approve-deep/50 px-7 py-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-approve" />
            <span className="mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-approve">
              run closed
            </span>
          </div>
          <p className="mt-3 text-[1rem] font-medium leading-snug text-ink">{end.outcomeLabel}</p>
          <div className="mt-5 flex items-end gap-6">
            <div>
              <Label>exposure avoided</Label>
              <p className="mono tnum mt-1 text-[1.75rem] font-semibold leading-none text-approve">
                {compactMoney(end.dollarsSaved)}
              </p>
              <p className="mono mt-1.5 text-[0.75rem] text-faint">{money(end.dollarsSaved)}</p>
            </div>
            <div>
              <Label>decision time</Label>
              <p className="mono tnum mt-1 text-[1.75rem] font-semibold leading-none text-ink">
                {end.minutesElapsed}
                <span className="ml-1 text-[0.875rem] font-medium text-faint">min</span>
              </p>
            </div>
          </div>
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-dim">
            The manual version of this decision is a week of emails.
          </p>
        </div>
      ) : null}

      <div className="flex-1" />
    </aside>
  );
}

function Stat({
  label,
  value,
  unit,
  border,
  urgent,
}: {
  label: string;
  value: string;
  unit?: string;
  border?: boolean;
  urgent?: boolean;
}) {
  return (
    <div className={`px-7 py-5 ${border ? "border-r hairline" : ""}`}>
      <Label>{label}</Label>
      <p
        className={`mono tnum mt-2 text-[1.1875rem] font-semibold leading-tight ${
          urgent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </p>
      {unit ? <p className="mono mt-1 text-[0.6875rem] uppercase tracking-[0.1em] text-faint">{unit}</p> : null}
    </div>
  );
}
