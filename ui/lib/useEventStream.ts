"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { derive } from "./derive";
import { beats as computeBeats, type Beat } from "./run";
import type { LinedownEvent, RunState } from "./types";

/**
 * A run source. Replay walks a static array using each event's `ts`.
 * Live pushes events in as they happen. Components consume the identical
 * return shape and cannot tell which one they are looking at.
 */
export type EventSource =
  | { kind: "replay"; events: LinedownEvent[] }
  | {
      kind: "live";
      subscribe: (emit: (e: LinedownEvent) => void) => () => void;
      /** Called when the presenter clicks Approve, so the live backend can unblock. */
      onApprove?: (candidateId: string) => void;
    };

export type EventStream = {
  events: LinedownEvent[];
  state: RunState;
  /** Monotonic replay/live clock in ms. Freezes while paused or awaiting approval. */
  elapsedMs: number;
  /** Ref read of the same clock — for 60fps consumers that must not re-render the tree. */
  getElapsed: () => number;
  live: boolean;
  paused: boolean;
  awaitingApproval: boolean;
  pendingApprovalFor: string | null;
  finished: boolean;
  cursor: number;
  total: number;
  beats: Beat[];
  /** 1-based index of the beat currently on screen, 0 before the first. */
  beatIndex: number;
  controls: {
    toggle: () => void;
    pause: () => void;
    resume: () => void;
    restart: () => void;
    /** → jumps to the next demo beat. */
    skip: () => void;
    /** Shift+→ advances a single event, for fine control in rehearsal. */
    step: () => void;
    approve: () => void;
  };
};

const COARSE_CLOCK_MS = 100;

export type StreamOptions = {
  /** Seed the clock, so a rehearsal (or a screenshot) can open straight on a beat. */
  startAtMs?: number;
  startPaused?: boolean;
  /**
   * Rehearsal only: let a seek run straight through the approval gate so the
   * tail of the run can be inspected without clicking. Never affects a live
   * run — the gate itself is untouched, this only applies to catch-up.
   */
  seekThroughGate?: boolean;
};

export function useEventStream(
  source: EventSource,
  speed = 1,
  opts: StreamOptions = {}
): EventStream {
  const isLive = source.kind === "live";
  const all = source.kind === "replay" ? source.events : EMPTY;

  const [cursor, setCursor] = useState(0);
  const [liveEvents, setLiveEvents] = useState<LinedownEvent[]>([]);
  const [paused, setPaused] = useState(!!opts.startPaused);
  const [awaiting, setAwaiting] = useState(false);
  const [coarseElapsed, setCoarseElapsed] = useState(opts.startAtMs ?? 0);

  const elapsedRef = useRef(opts.startAtMs ?? 0);
  const pausedRef = useRef(false);
  const awaitingRef = useRef(false);
  const cursorRef = useRef(0);
  const startedRef = useRef(false);
  pausedRef.current = paused;
  awaitingRef.current = awaiting;

  const events = useMemo(
    () => (isLive ? liveEvents : all.slice(0, cursor)),
    [isLive, liveEvents, all, cursor]
  );

  const state = useMemo(() => derive(events), [events]);

  const beatList = useMemo(() => computeBeats(isLive ? liveEvents : all), [isLive, liveEvents, all]);
  const beatIndex = useMemo(
    () => beatList.filter((b) => b.index < (isLive ? liveEvents.length : cursor)).length,
    [beatList, isLive, liveEvents.length, cursor]
  );

  const finished = isLive ? false : cursor >= all.length && all.length > 0;

  const pendingApprovalFor = useMemo(() => {
    if (!awaiting) return null;
    for (let i = state.feed.length - 1; i >= 0; i--) {
      const f = state.feed[i];
      if (f.kind === "approval" && !f.granted) return f.candidateId;
    }
    return null;
  }, [awaiting, state.feed]);

  // Catch up to a seeded clock on mount, so `?at=` works even when opening paused.
  // Honours the approval gate: seeking past it still halts there.
  useEffect(() => {
    if (isLive || !opts.startAtMs || !all.length) return;
    let i = 0;
    while (i < all.length && all[i].ts <= opts.startAtMs) {
      if (all[i].type === "approval.requested" && !opts.seekThroughGate) {
        i += 1;
        setAwaiting(true);
        break;
      }
      i += 1;
    }
    cursorRef.current = i;
    setCursor(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, all]);

  // ——— Replay clock. One rAF loop drives both event emission and the money counter,
  // so the number on screen can never disagree with the beat on screen. ———
  useEffect(() => {
    if (isLive) return;
    let raf = 0;
    let last = performance.now();
    let lastCoarse = 0;

    const frame = (now: number) => {
      const dt = now - last;
      last = now;

      if (!pausedRef.current && !awaitingRef.current && cursorRef.current < all.length) {
        elapsedRef.current += dt * speed;

        let next = cursorRef.current;
        let hitApproval = false;
        while (next < all.length && all[next].ts <= elapsedRef.current) {
          if (all[next].type === "approval.requested") {
            next += 1; // emit the request itself, then halt
            hitApproval = true;
            break;
          }
          next += 1;
        }
        if (next !== cursorRef.current) {
          cursorRef.current = next;
          setCursor(next);
        }
        if (hitApproval) setAwaiting(true);
      }

      if (now - lastCoarse > COARSE_CLOCK_MS) {
        lastCoarse = now;
        setCoarseElapsed(elapsedRef.current);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [isLive, all, speed]);

  // ——— Live clock + subscription. Same clock contract, different plumbing. ———
  useEffect(() => {
    if (source.kind !== "live") return;
    let raf = 0;
    let last = performance.now();
    let lastCoarse = 0;
    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      if (startedRef.current && !pausedRef.current && !awaitingRef.current) {
        elapsedRef.current += dt;
      }
      if (now - lastCoarse > COARSE_CLOCK_MS) {
        lastCoarse = now;
        setCoarseElapsed(elapsedRef.current);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const unsub = source.subscribe((e) => {
      startedRef.current = true;
      setLiveEvents((prev) => [...prev, e]);
      if (e.type === "approval.requested") setAwaiting(true);
      if (e.type === "approval.granted") setAwaiting(false);
    });

    return () => {
      cancelAnimationFrame(raf);
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);
  const toggle = useCallback(() => setPaused((p) => !p), []);

  const restart = useCallback(() => {
    elapsedRef.current = 0;
    cursorRef.current = 0;
    setCursor(0);
    setLiveEvents([]);
    setAwaiting(false);
    setPaused(false);
    setCoarseElapsed(0);
  }, []);

  /** → : pull the clock forward to the next demo beat so that moment lands now. */
  const skip = useCallback(() => {
    if (isLive) return;
    if (awaitingRef.current) return; // the approval gate is deliberate; → must not bypass it
    const i = cursorRef.current;
    if (i >= all.length) return;
    const next = beatList.find((b) => b.index >= i);
    elapsedRef.current = Math.max(elapsedRef.current, next ? next.ts : all[i].ts);
    setCoarseElapsed(elapsedRef.current);
  }, [isLive, all, beatList]);

  /** Shift+→ : one event at a time. */
  const step = useCallback(() => {
    if (isLive) return;
    if (awaitingRef.current) return;
    const i = cursorRef.current;
    if (i >= all.length) return;
    elapsedRef.current = Math.max(elapsedRef.current, all[i].ts);
    setCoarseElapsed(elapsedRef.current);
  }, [isLive, all]);

  const approve = useCallback(() => {
    if (!awaitingRef.current) return;
    if (source.kind === "live") {
      const target = pendingApprovalFor;
      if (target) source.onApprove?.(target);
      setAwaiting(false);
      return;
    }
    // Replay: resume and pull the clock straight to the next beat so the click feels wired up.
    const i = cursorRef.current;
    if (i < all.length) {
      elapsedRef.current = Math.max(elapsedRef.current, all[i].ts);
      setCoarseElapsed(elapsedRef.current);
    }
    setAwaiting(false);
    setPaused(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind, all, pendingApprovalFor]);

  const getElapsed = useCallback(() => elapsedRef.current, []);

  // ——— Stage keyboard. The presenter needs these without looking down. ———
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (awaitingRef.current) approve();
        else toggle();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        restart();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (e.shiftKey) step();
        else skip();
      } else if (e.key === "Enter" && awaitingRef.current) {
        e.preventDefault();
        approve();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [approve, toggle, restart, skip, step]);

  return {
    events,
    state,
    elapsedMs: coarseElapsed,
    getElapsed,
    live: isLive,
    paused,
    awaitingApproval: awaiting,
    pendingApprovalFor,
    finished,
    cursor: isLive ? liveEvents.length : cursor,
    total: isLive ? liveEvents.length : all.length,
    beats: beatList,
    beatIndex,
    controls: { toggle, pause, resume, restart, skip, step, approve },
  };
}

const EMPTY: LinedownEvent[] = [];
