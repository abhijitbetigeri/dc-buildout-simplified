"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The tension of the whole demo: a cost that climbs while the agents work.
 *
 * Reads the run clock from a ref each frame so a 60fps number never re-renders
 * the rest of the page. Freezes exactly when the clock freezes — paused, or
 * held at the approval gate — so the figure on screen can never disagree with
 * the beat on screen.
 */
export function MoneyCounter({
  burnRatePerMin,
  getElapsed,
  frozen,
  primeMs = 0,
}: {
  burnRatePerMin: number;
  getElapsed: () => number;
  frozen: boolean;
  /** Exposure already accrued before the run opened — see noticePrimeMs(). */
  primeMs?: number;
}) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const v = ((primeMs + getElapsed()) / 60000) * burnRatePerMin;
      setValue(v);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [getElapsed, burnRatePerMin, primeMs]);

  // Flash the thousands digit as it rolls — motion without a spinner.
  useEffect(() => {
    const k = Math.floor(value / 1000);
    if (k !== prevRef.current) {
      prevRef.current = k;
      setBumped(true);
      const t = setTimeout(() => setBumped(false), 220);
      return () => clearTimeout(t);
    }
  }, [value]);

  const whole = Math.floor(value);
  const cents = Math.floor((value - whole) * 100);

  return (
    <div className="relative">
      <div className="flex items-baseline gap-1.5">
        <span className="mono text-[1.75rem] font-medium leading-none text-accent-dim">$</span>
        <span
          className={`mono tnum text-[3.5rem] font-semibold leading-none tracking-tight text-accent transition-[text-shadow] duration-200 ${
            bumped ? "[text-shadow:0_0_22px_rgba(240,161,75,0.45)]" : ""
          }`}
        >
          {whole.toLocaleString("en-US")}
        </span>
        <span className="mono tnum text-[1.5rem] font-medium leading-none text-accent/55">
          .{String(cents).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            frozen ? "bg-faint" : "animate-breathe bg-accent"
          }`}
        />
        <span className="mono text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
          {frozen ? "accrual held" : `accruing $${burnRatePerMin.toLocaleString("en-US")}/min`}
        </span>
      </div>
    </div>
  );
}
