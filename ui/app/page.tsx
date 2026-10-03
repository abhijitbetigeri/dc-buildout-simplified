"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertPanel } from "@/components/AlertPanel";
import { CaseFile } from "@/components/CaseFile";
import { RoomFeed } from "@/components/RoomFeed";
import { StageBar } from "@/components/StageBar";
import { beats as runBeats, normalizeRun, noticePrimeMs } from "@/lib/run";
import type { LinedownEvent } from "@/lib/types";
import { useEventStream } from "@/lib/useEventStream";

/**
 * LINEDOWN — the sourcing desk. One screen, three zones.
 *
 * Replay-first by design: the page consumes an event list and cannot tell
 * whether it came off disk or off a live agent stream. That is what guarantees
 * a demo exists regardless of integration state.
 */
export default function Page() {
  const [run, setRun] = useState<{
    events: LinedownEvent[];
    runId?: string;
    durationMs?: number;
    origin: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Prefer the DATA track's real log; fall back to the stub so the UI is
      // never blocked and never blank.
      for (const [url, origin] of [
        ["/events.json", "data/mock-events.json"],
        ["/events.stub.json", "ui stub"],
      ] as const) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) continue;
          const parsed = normalizeRun(await res.json());
          if (!parsed.events.length) continue;
          if (!cancelled) setRun({ ...parsed, origin });
          return;
        } catch {
          /* try the next source */
        }
      }
      if (!cancelled) setError("No event log could be loaded.");
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <Fallback message={error} />;
  if (!run) return <Fallback message="Loading run…" />;
  return <Desk run={run} />;
}

function Desk({
  run,
}: {
  run: { events: LinedownEvent[]; runId?: string; durationMs?: number; origin: string };
}) {
  const source = useMemo(
    () => ({ kind: "replay" as const, events: run.events }),
    [run.events]
  );

  // Stage/rehearsal controls: ?at=<ms> or ?beat=<n> opens on a beat, &paused=1
  // holds it there, &speed=<n> changes the pace. Harmless if absent.
  const opts = useMemo(() => {
    if (typeof window === "undefined") return { startAtMs: 0, startPaused: false, speed: 1 };
    const q = new URLSearchParams(window.location.search);
    const at = Number(q.get("at"));
    const beatNo = Number(q.get("beat"));
    const bs = runBeats(run.events);
    const fromBeat = beatNo ? bs.find((b) => b.n === beatNo)?.ts : undefined;
    return {
      startAtMs: Number.isFinite(at) && at > 0 ? at : (fromBeat ?? 0),
      startPaused: q.get("paused") === "1",
      speed: Number(q.get("speed")) > 0 ? Number(q.get("speed")) : 1,
      seekThroughGate: q.get("gate") === "open",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.events]);

  const stream = useEventStream(source, opts.speed, {
    startAtMs: opts.startAtMs,
    startPaused: opts.startPaused,
    seekThroughGate: opts.seekThroughGate,
  });
  const { state, controls, awaitingApproval, paused } = stream;

  // Exposure has been accruing since the allocation notice, not since the replay
  // started. Primed from the run id and labelled with that time on screen.
  const prime = useMemo(() => noticePrimeMs(run.runId), [run.runId]);

  const frozen = paused || awaitingApproval || !!state.end;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <StageBar
        program={state.alert?.program}
        origin={run.origin}
        live={stream.live}
        paused={paused}
        awaiting={awaitingApproval}
        finished={!!state.end}
        beats={stream.beats}
        beatIndex={stream.beatIndex}
        elapsedMs={stream.elapsedMs}
        durationMs={run.durationMs}
        onToggle={controls.toggle}
        onRestart={controls.restart}
        onSkip={controls.skip}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[clamp(320px,23vw,392px)_minmax(0,1fr)] xl:grid-cols-[clamp(320px,21vw,392px)_minmax(0,1fr)_clamp(352px,25vw,452px)]">
        <AlertPanel
          alert={state.alert}
          end={state.end}
          getElapsed={stream.getElapsed}
          frozen={frozen}
          primeMs={prime.primeMs}
          noticeLabel={prime.label}
        />

        <RoomFeed
          feed={state.feed}
          candidates={state.candidates}
          end={state.end}
          awaitingApproval={awaitingApproval}
          onApprove={controls.approve}
        />

        <div className="hidden xl:block">
          <CaseFile
            candidates={state.candidates}
            po={state.po}
            commit={state.commit}
            alert={state.alert}
          />
        </div>
      </main>
    </div>
  );
}

function Fallback({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <p className="mono text-[0.6875rem] uppercase tracking-[0.3em] text-faint">linedown</p>
        <p className="mt-4 text-[1.0625rem] text-dim">{message}</p>
      </div>
    </div>
  );
}
