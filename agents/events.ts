/**
 * The event log. Every track talks through this and nothing else.
 *
 * One rule makes live mode and replay mode interchangeable: `ts` is a millisecond offset
 * from run start, never a wall clock. In live mode that offset is measured; in replay the
 * UI sleeps to it. `writeRun()` produces a file in exactly the shape of data/mock-events.json,
 * which is the whole point — the UI cannot tell which mode produced the file.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  AgentName,
  AlertRaised,
  ApprovalGranted,
  ApprovalRequested,
  BlockRaised,
  CandidateAdded,
  CandidateStatus,
  CounterfeitFlagged,
  Event,
  EventType,
  PoDrafted,
  PolicyCommitted,
  RunEnded,
  ToolName,
  ToolResultKind,
} from './types.js';

export type Listener = (e: Event) => void;

export class EventLog {
  private events: Event[] = [];
  private seq = 0;
  private readonly t0: number;
  private listeners: Listener[] = [];

  /**
   * @param clock  'real' measures elapsed wall time (live runs). 'synthetic' advances a
   *               virtual clock on every emit, which makes recorded runs deterministic and
   *               diffable — we use it when capturing a replay file.
   */
  constructor(private clock: 'real' | 'synthetic' = 'real') {
    this.t0 = Date.now();
  }

  private syntheticTs = 0;

  /** Advance the synthetic clock. No-op under the real clock. */
  tick(ms: number): void {
    if (this.clock === 'synthetic') this.syntheticTs += ms;
  }

  private now(): number {
    return this.clock === 'real' ? Date.now() - this.t0 : this.syntheticTs;
  }

  onEvent(fn: Listener): void {
    this.listeners.push(fn);
  }

  /** Low-level emit. Prefer the typed helpers below — they are what keeps us schema-honest. */
  emit<P extends object>(type: EventType, payload: P): Event<P> {
    this.seq += 1;
    const e: Event<P> = {
      id: `e${String(this.seq).padStart(3, '0')}`,
      ts: this.now(),
      type,
      payload,
    };
    this.events.push(e as Event);
    for (const fn of this.listeners) {
      try {
        fn(e as Event);
      } catch {
        /* a bad listener must never take the run down */
      }
    }
    return e;
  }

  // ── typed emitters, one per schema type ───────────────────────────────────

  alertRaised(p: AlertRaised) {
    return this.emit('alert.raised', p);
  }

  /**
   * `plain` is not in the schema's `agent.message` payload, but DATA emits it, the UI renders
   * it as a subtitle, and the risk register rates "jargon loses a judge" as High. So every
   * agent turn carries a plain-language restatement. Treat it as required, not optional.
   */
  agentMessage(agent: AgentName | string, role: string, text: string, plain?: string) {
    return this.emit('agent.message', { agent, role, text, ...(plain ? { plain } : {}) });
  }

  /**
   * Open a tool call. `callId`s are short and prefixed by tool (`t1`, `m1`, `q1`, `c1`) to
   * match DATA's vocabulary in data/mock-events.json — the UI pairs call/result by this id,
   * so the two tracks must spell them the same way.
   */
  toolCall(agent: AgentName | string, tool: ToolName, label: string, plain?: string): string {
    const prefix = { tavily: 't', moss: 'm', qvl: 'q', zoodata: 'q', entire: 'c' }[tool] ?? 'x';
    this.callSeq[prefix] = (this.callSeq[prefix] ?? 0) + 1;
    const callId = `${prefix}${this.callSeq[prefix]}`;
    this.emit('tool.call', { callId, agent, tool, label, status: 'running' as const, ...(plain ? { plain } : {}) });
    return callId;
  }

  private callSeq: Record<string, number> = {};

  toolResult(callId: string, kind: ToolResultKind, payload: unknown, plain?: string) {
    return this.emit('tool.result', { callId, kind, payload, ...(plain ? { plain } : {}) });
  }

  candidateAdded(p: CandidateAdded & { plain?: string }) {
    return this.emit('candidate.added', p);
  }

  candidateStatus(p: CandidateStatus) {
    return this.emit('candidate.status', p);
  }

  /** THE RED MOMENT. */
  blockRaised(p: BlockRaised) {
    return this.emit('block.raised', p);
  }

  /** THE X-FACTOR. */
  counterfeitFlagged(p: CounterfeitFlagged) {
    return this.emit('counterfeit.flagged', p);
  }

  /** Replay PAUSES here until the presenter clicks. */
  approvalRequested(p: ApprovalRequested & { plain?: string }) {
    return this.emit('approval.requested', p);
  }

  approvalGranted(p: ApprovalGranted & { plain?: string }) {
    return this.emit('approval.granted', p);
  }

  poDrafted(p: PoDrafted & { plain?: string }) {
    return this.emit('po.drafted', p);
  }

  policyCommitted(p: PolicyCommitted & { plain?: string }) {
    return this.emit('policy.committed', p);
  }

  runEnded(p: RunEnded & { plain?: string }) {
    return this.emit('run.ended', p);
  }

  // ── output ────────────────────────────────────────────────────────────────

  all(): Event[] {
    return [...this.events];
  }

  /**
   * Write the run in exactly the shape of data/mock-events.json — a WRAPPER OBJECT, not a
   * bare array:
   *
   *   { _comment, runId, program, durationMs, events: Event[] }
   *
   * The frozen schema originally said "a run is Event[]", and DATA's file is the wrapper.
   * That divergence is resolved in favour of the wrapper (schema amended, UI unwraps with
   * `Array.isArray(d) ? d : d.events`). AGENTS and DATA must stay byte-compatible here or
   * live mode and replay mode stop being interchangeable, which is the one property the
   * whole architecture rests on.
   */
  async writeRun(
    path: string,
    meta: { runId: string; program: string; comment?: string[] },
  ): Promise<number> {
    const ordered = [...this.events].sort((a, b) => a.ts - b.ts);
    const doc = {
      _comment: meta.comment ?? [
        'LINEDOWN — run produced by the AGENTS track orchestrator (agents/run.ts).',
        'Same shape as data/mock-events.json so replay and live mode are interchangeable.',
      ],
      runId: meta.runId,
      program: meta.program,
      durationMs: ordered.length ? ordered[ordered.length - 1].ts : 0,
      events: ordered,
    };
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    return ordered.length;
  }

  /** Cheap self-check so a malformed run fails here rather than on stage. */
  validate(): string[] {
    const problems: string[] = [];
    let lastTs = -1;
    const openCalls = new Set<string>();

    for (const e of this.events) {
      if (e.ts < lastTs) problems.push(`${e.id}: ts ${e.ts} goes backwards (prev ${lastTs})`);
      lastTs = e.ts;

      if (e.type === 'tool.call') openCalls.add((e.payload as { callId: string }).callId);
      if (e.type === 'tool.result') {
        const { callId } = e.payload as { callId: string };
        if (!openCalls.has(callId)) problems.push(`${e.id}: tool.result for unopened call ${callId}`);
        openCalls.delete(callId);
      }

      /**
       * The schema's rule 1, enforced on EVERY event rather than the four the schema names.
       *
       * DATA found 14 of 40 events in the first run came up silent, and the UI renders `plain`
       * as a subtitle on every card. The risk register rates "jargon loses a judge" as High and
       * Design is a scored criterion, so a missing subtitle is a scoring loss, not a cosmetic
       * one. Validation fails the run rather than letting it reach the stage half-narrated.
       */
      const plain = (e.payload as { plain?: string }).plain;
      if (!plain || !plain.trim()) problems.push(`${e.id} (${e.type}): missing required 'plain'`);
    }

    for (const c of openCalls) problems.push(`tool.call ${c} never got a tool.result`);
    if (!this.events.some((e) => e.type === 'alert.raised')) problems.push('run has no alert.raised');
    if (!this.events.some((e) => e.type === 'run.ended')) problems.push('run has no run.ended');
    return problems;
  }
}
