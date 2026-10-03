"use client";

import type { Beat } from "@/lib/run";

/**
 * WHERE AM I.
 *
 * The orientation device for the whole screen: which of the seven beats is
 * running, in plain language, how far through the incident we are, and how long
 * it has taken. A viewer must be able to glance up at any moment and know.
 */
export function StageBar({
  program,
  origin,
  live,
  paused,
  awaiting,
  finished,
  beats,
  beatIndex,
  elapsedMs,
  durationMs,
  onToggle,
  onRestart,
  onSkip,
}: {
  program?: string;
  origin: string;
  live: boolean;
  paused: boolean;
  awaiting: boolean;
  finished: boolean;
  beats: Beat[];
  beatIndex: number;
  elapsedMs: number;
  durationMs?: number;
  onToggle: () => void;
  onRestart: () => void;
  onSkip: () => void;
}) {
  const total = durationMs ?? beats[beats.length - 1]?.ts ?? 1;
  const n = beats.length || 7;
  const currentNo = Math.min(Math.max(beatIndex, 1), n);
  const current = beats[currentNo - 1];

  const mode = awaiting
    ? { text: "waiting for you", tone: "text-accent", dot: "bg-accent animate-breathe" }
    : finished
      ? { text: "complete", tone: "text-approve", dot: "bg-approve" }
      : paused
        ? { text: "paused", tone: "text-dim", dot: "bg-faint" }
        : live
          ? { text: "live", tone: "text-accent", dot: "bg-accent animate-breathe" }
          : { text: "replay", tone: "text-dim", dot: "bg-accent/70 animate-breathe" };

  return (
    <header className="shrink-0 border-b hairline bg-surface/70">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-2.5">
        <div className="flex items-baseline gap-2.5">
          <span className="mono text-[0.875rem] font-bold uppercase tracking-[0.26em] text-ink">
            Linedown
          </span>
          {program ? (
            <span className="mono hidden text-[0.75rem] text-faint xl:inline">{program}</span>
          ) : null}
        </div>

        {/* ——— THE BEAT. The loudest thing in the bar on purpose. ——— */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-4">
          <span className="mono tnum shrink-0 text-[1.5rem] font-bold leading-none text-accent">
            {currentNo}
            <span className="text-[1rem] font-medium text-accent/45"> / {n}</span>
          </span>
          <span className="truncate text-[1.125rem] font-semibold uppercase leading-none tracking-[0.1em] text-ink">
            {current?.name ?? "Standing by"}
          </span>
        </div>

        {/* elapsed */}
        <span className="mono tnum hidden text-[0.9375rem] text-dim md:inline">
          {clock(elapsedMs)}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${mode.dot}`} />
          <span
            className={`mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] ${mode.tone}`}
          >
            {mode.text}
          </span>
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          <Key onClick={onToggle} label={paused ? "Play" : "Pause"} hint="Space" />
          <Key onClick={onSkip} label="Next" hint="→" />
          <Key onClick={onRestart} label="Restart" hint="R" />
        </div>
      </div>

      {/* ——— seven segments: how far through the incident we are ——— */}
      <div className="flex gap-[3px] px-6 pb-2">
        {beats.map((b, i) => {
          const next = beats[i + 1]?.ts ?? total;
          const span = Math.max(1, next - b.ts);
          const fill =
            i + 1 < currentNo ? 1 : i + 1 > currentNo ? 0 : clamp((elapsedMs - b.ts) / span);
          const done = i + 1 < currentNo;
          const active = i + 1 === currentNo;
          return (
            <div key={b.n} className="min-w-0 flex-1">
              <div className="relative h-[4px] overflow-hidden rounded-full bg-hi">
                <div
                  className={`h-full rounded-full ${done ? "bg-accent/40" : "bg-accent"}`}
                  style={{ width: `${fill * 100}%` }}
                />
              </div>
              <p
                className={`mono mt-1 truncate text-[0.625rem] uppercase tracking-[0.1em] ${
                  active ? "text-accent" : done ? "text-faint" : "text-faint/45"
                }`}
              >
                {b.n}. {b.name}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mono px-6 pb-1 text-[0.5625rem] uppercase tracking-[0.12em] text-faint/50">
        source: {origin}
      </p>
    </header>
  );
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Key({ onClick, label, hint }: { onClick: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 rounded border border-line bg-raised px-2 py-1 transition-colors hover:border-line-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className="text-[0.75rem] text-dim group-hover:text-ink">{label}</span>
      <kbd className="mono rounded-sm border border-line-bright bg-hi px-1.5 py-[1px] text-[0.625rem] text-faint">
        {hint}
      </kbd>
    </button>
  );
}
