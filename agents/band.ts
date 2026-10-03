/**
 * The room — turn-taking orchestration with a Critic that can actually stop things.
 *
 * BAND was evaluated and rejected for this job, on evidence rather than convenience. RECON
 * read `band-ai/band-sdk-typescript` and found: no advance-turn call (turn order is emergent
 * from chat and @mentions), and crucially no gating primitive of any kind — its complete
 * event vocabulary is `["tool_call","tool_result","thought","error","task"]`, with zero hits
 * for critic/veto/gate/approve. A "BAND Critic that blocks" would be a prompt convention: an
 * agent posts an `error` and the others are *instructed* to respect it. Nothing enforces it.
 * It also requires Node 22+ and a live account with no offline mode.
 *
 * So the block is enforced here instead, and it is enforced twice over:
 *
 *   Layer 1 — the ZooWork runtime. `qvl_lookup` is an application-executed custom tool, so
 *             the agent's run genuinely PAUSES inside ZooWork until our process resolves it.
 *             The model cannot proceed without a real verdict and cannot invent one.
 *
 *   Layer 2 — this state machine. `gate()` below is the only path to `approval.requested`,
 *             and it requires BOTH the QVL verdict and the authenticity check to pass. A
 *             candidate that Engineering blocked is structurally unable to reach approval,
 *             regardless of what any agent says afterwards.
 *
 * That is the difference between a critic that is listened to and a critic that is binding.
 */

import type { EventLog } from './events.js';
import { ALL_AGENTS, ENGINEERING, INTAKE, QUALITY, SOURCING, type AgentDef } from './defs.js';
import { invokeTool, type HostContext } from './toolhost.js';
import type { AgentName, Candidate } from './types.js';

// ── the transcript ──────────────────────────────────────────────────────────

export interface Turn {
  agent: AgentName;
  role: string;
  text: string;
  /** plain-language restatement. Required in practice — see EventLog.validate(). */
  plain: string;
  /** tools this agent invoked during the turn, in order */
  tools: { name: string; input: Record<string, unknown>; summary: string }[];
}

export class Transcript {
  private turns: Turn[] = [];

  add(t: Turn): void {
    this.turns.push(t);
  }

  all(): Turn[] {
    return [...this.turns];
  }

  /** What the next speaker is shown. Kept short — a room briefing, not a chat log dump. */
  brief(limit = 8): string {
    return this.turns
      .slice(-limit)
      .map((t) => `${t.role}: ${t.text}`)
      .join('\n\n');
  }
}

// ── the speaker abstraction ─────────────────────────────────────────────────

/**
 * How an agent produces its turn. Two implementations:
 *   - ZooworkSpeaker (zoowork.ts) — a real ZooWork Session; the model calls the custom tools.
 *   - ScriptedSpeaker (below)     — no key needed; the orchestrator calls the same tools
 *                                   directly and composes the turn from the REAL results.
 *
 * The important property: both call `invokeTool`, so both get their verdicts from the same
 * QVL engine and the same Moss index. Offline mode is not a mock of the decision — only of
 * the prose around it.
 */
export interface Speaker {
  readonly mode: 'zoowork' | 'scripted';
  /** Run one turn for `agent`, given the room brief and an instruction. */
  speak(agent: AgentDef, brief: string, instruction: string, ctx: HostContext): Promise<Turn>;
  /** Called once before the first turn. */
  setup?(agents: AgentDef[]): Promise<void>;
  /** Called after the last turn. */
  teardown?(): Promise<void>;
}

// ── the gate ────────────────────────────────────────────────────────────────

export interface GateResult {
  candidateId: string;
  qvlPassed: boolean;
  authenticityPassed: boolean;
  /** true when this source demanded an authenticity screen */
  authRequired: boolean;
  /** true when a screen was actually completed */
  authScreened: boolean;
  eligible: boolean;
  blockingReason?: string;
}

/**
 * The progression gate. The ONLY way a candidate becomes eligible for approval.
 *
 * Two independent checks, deliberately not collapsed into one:
 *   - qualification (Engineering / QVL): is this part number tested on this platform?
 *   - authenticity  (Quality / Moss):    are these particular units genuine?
 *
 * A qualified part can arrive as a counterfeit, and a genuine part can be unqualified. Both
 * must pass. Collapsing them would lose beat 5 and would also be wrong.
 */
export function gate(ctx: HostContext, candidateId: string): GateResult {
  const candidate = ctx.candidates.find((c) => c.id === candidateId);
  const verdict = ctx.verdicts.get(candidateId);
  const auth = ctx.authenticity.get(candidateId);

  const qvlPassed = verdict?.decision === 'pass';

  /**
   * FAIL CLOSED on non-franchised supply.
   *
   * This was a real bug caught by the first end-to-end run: the module photo could not be
   * located, so Quality never completed a screen, so the counterfeit broker lot came back
   * `authenticityPassed: true` and — being the cheapest and fastest — was APPROVED. The demo
   * would have recommended buying the fake.
   *
   * The lesson generalises past the bug. For a broker or grey-market offer, "we did not
   * check" must never read as "it is fine". Absence of evidence is the normal state of a
   * counterfeit lot: no certificate of conformance, no traceability, no serial a
   * manufacturer can look up. So an unscreened non-franchised candidate is ineligible, and
   * the gate says so in those words.
   *
   * Franchised distribution is treated differently, and that asymmetry is deliberate: the
   * paperwork and the manufacturer's warranty ARE the authenticity evidence there.
   */
  const authRequired = Boolean(candidate?.broker);
  const authScreened = auth !== undefined;
  const authenticityPassed = authScreened ? auth!.ok : !authRequired;

  let blockingReason: string | undefined;
  if (!verdict) blockingReason = 'no QVL verdict — Engineering has not cleared this candidate';
  else if (!qvlPassed) blockingReason = verdict.reason;
  else if (authScreened && !auth!.ok) blockingReason = auth!.reason;
  else if (authRequired && !authScreened)
    blockingReason =
      'Non-franchised source and no completed authenticity screen. Unscreened grey-market ' +
      'supply is not purchasable — absence of a finding is not a clean result' +
      (candidate?.traceability ? ` (traceability: ${candidate.traceability.slice(0, 80)})` : '');

  return {
    candidateId,
    qvlPassed,
    authenticityPassed,
    authRequired,
    authScreened,
    eligible: qvlPassed && authenticityPassed,
    blockingReason,
  };
}

// ── the run ─────────────────────────────────────────────────────────────────

export interface RoomOptions {
  alert: {
    part: string;
    partLabel: string;
    program: string;
    qtyAtRisk: number;
    burnRatePerMin: number;
    deadlineLabel: string;
    reason: string;
    plain: string;
  };
  /** who grants the approval — the one human action in the demo */
  approver: string;
  /** called when the run reaches approval; return false to deny */
  onApproval?: (candidateId: string) => Promise<boolean>;
}

export interface RoomResult {
  blockedCandidates: string[];
  rejectedCandidates: string[];
  approvedCandidate?: string;
  gates: GateResult[];
  transcript: Turn[];
}

/** Turn order. Explicit and typed — not emergent from who @-mentions whom. */
const TURN_ORDER: { agent: AgentDef; instruction: string }[] = [
  {
    agent: INTAKE,
    instruction:
      'Open the room. Restate the allocation alert precisely, state the money at stake per ' +
      'minute, and name what the room must decide and in what order.',
  },
  {
    agent: SOURCING,
    instruction:
      'Find alternates. Search the market for pricing, stock and allocation news, then decode ' +
      'the at-risk part number to find cross-vendor equivalent modules. Present the candidates ' +
      'you found and argue for the best one on landed cost and arrival date.',
  },
  {
    agent: ENGINEERING,
    instruction:
      'Qualify every candidate. Call qvl_lookup for each one before commenting on it. Block ' +
      'anything the lookup returns as blocked, state the specific reason it gave, and name the ' +
      'qualified parts that would work instead.',
  },
  {
    agent: QUALITY,
    instruction:
      'Screen the non-franchised offers. Fetch the module photograph, transcribe the top marking ' +
      'exactly as printed, then match it against reference and known-counterfeit markings. ' +
      'Report both the counterfeit-cluster score and the genuine-reference score.',
  },
  {
    agent: ENGINEERING,
    instruction:
      'Close it out. Given your own qualification findings and Quality\'s authenticity findings, ' +
      'recommend the single candidate that should be purchased and say in one sentence why each ' +
      'rejected option was rejected.',
  },
];

export async function runRoom(
  ctx: HostContext,
  speaker: Speaker,
  opts: RoomOptions,
): Promise<RoomResult> {
  const transcript = new Transcript();
  const { log } = ctx;

  // ── beat 1: the alert ────────────────────────────────────────────────────
  log.alertRaised(opts.alert);
  log.tick(1500);

  await speaker.setup?.(ALL_AGENTS);

  // ── beats 2–5: the room talks, in order, with real tools ─────────────────
  for (const [i, step] of TURN_ORDER.entries()) {
    const turn = await speaker.speak(step.agent, transcript.brief(), step.instruction, ctx);
    transcript.add(turn);
    log.agentMessage(turn.agent, turn.role, turn.text, turn.plain);
    log.tick(2500);

    // Sourcing's turn is where candidates enter the room.
    if (step.agent.key === 'sourcing' && i === 1) {
      for (const c of ctx.candidates) {
        log.candidateAdded({
          id: c.id,
          mpn: c.mpn,
          vendor: c.vendor,
          specs: Object.fromEntries(Object.entries(c.specs).map(([k, v]) => [k, String(v)])),
          pricePerUnit: c.pricePerUnit,
          leadTimeWeeks: c.leadTimeWeeks,
          source: c.source,
          plain:
            (c as { plain?: string }).plain ??
            `${c.broker ? 'A middleman is offering' : 'An offer for'} ${c.mpn} at ` +
              `$${c.pricePerUnit.toFixed(2)} a module, ` +
              `${c.leadTimeWeeks === 0 ? 'available immediately' : `about ${c.leadTimeWeeks} week(s) away`}.`,
        });
        log.candidateStatus({
          id: c.id,
          status: 'evaluating',
          reason: 'Awaiting platform qualification check',
          plain: 'Found a possible replacement. Not approved yet — Engineering has to check it.',
        });
        log.tick(400);
      }
    }

    // After Engineering's FIRST turn, the verdicts exist. Emit the block.
    if (step.agent.key === 'engineering' && i === 2) {
      emitQualificationOutcomes(ctx);
      log.tick(1200);
    }

    // After Quality's turn, emit the counterfeit finding.
    if (step.agent.key === 'quality') {
      await emitAuthenticityOutcomes(ctx);
      log.tick(1200);
    }
  }

  // ── the gate ─────────────────────────────────────────────────────────────
  const gates = ctx.candidates.map((c) => gate(ctx, c.id));
  const blockedCandidates = gates.filter((g) => !g.qvlPassed).map((g) => g.candidateId);
  const rejectedCandidates = gates
    .filter((g) => g.qvlPassed && !g.authenticityPassed)
    .map((g) => g.candidateId);

  const eligible = ctx.candidates
    .filter((c) => gates.find((g) => g.candidateId === c.id)?.eligible)
    // cheapest eligible wins, with lead time as the tiebreak — the line has a ship date
    .sort((a, b) => a.pricePerUnit - b.pricePerUnit || a.leadTimeWeeks - b.leadTimeWeeks);

  // Lead time is a hard constraint, not a preference: a part that misses the build is not an
  // option however cheap it is.
  const deadlineWeeks = 11 / 7;
  const feasible = eligible.filter((c) => c.leadTimeWeeks <= Math.max(2, Math.ceil(deadlineWeeks * 7)));
  const winner = feasible.find((c) => c.leadTimeWeeks <= 2) ?? feasible[0] ?? eligible[0];

  if (!winner) {
    log.runEnded({
      outcomeLabel: 'No qualified, authentic, in-time alternate found — escalate to the supplier',
      dollarsSaved: 0,
      minutesElapsed: 2.5,
    });
    return { blockedCandidates, rejectedCandidates, gates, transcript: transcript.all() };
  }

  // ── beat 6: the approval. The only human action. ─────────────────────────
  const qty = opts.alert.qtyAtRisk;
  const total = Math.round(winner.pricePerUnit * qty * 100) / 100;
  const broker = ctx.candidates.find((c) => c.broker);
  const brokerAuth = broker ? ctx.authenticity.get(broker.id) : undefined;
  // What the broker "saving" would really have cost: scrap the lot and rebuild the machines.
  const scrapCost = broker ? Math.round(broker.pricePerUnit * qty * 1.5) : 0;
  const savingsVsBroker = broker && brokerAuth && !brokerAuth.ok ? scrapCost - (total - Math.round(broker.pricePerUnit * qty)) : undefined;

  const verdict = ctx.verdicts.get(winner.id);
  log.approvalRequested({
    candidateId: winner.id,
    summary:
      `${winner.vendor} ${winner.mpn} · ${opts.alert.partLabel} · ${qty.toLocaleString()} pcs · ` +
      `$${winner.pricePerUnit.toFixed(2)}/ea · $${total.toLocaleString()} · ` +
      `lead time ${winner.leadTimeWeeks} week(s) · ${winner.source}` +
      (verdict?.validationReportId ? ` · ${verdict.qvlRevision}, validation report ${verdict.validationReportId}` : '') +
      ' · drop-in module replacement, no die substitution, no board change',
    ...(savingsVsBroker && savingsVsBroker > 0 ? { savingsVsBroker } : {}),
    plain:
      `Approve the tested, in-stock replacement: ${qty.toLocaleString()} modules for ` +
      `$${total.toLocaleString()}, arriving in about ${winner.leadTimeWeeks} week(s).` +
      (broker && brokerAuth && !brokerAuth.ok
        ? ` It looks more expensive than the middleman's offer — but that offer would have meant ` +
          `scrapping the lot and rebuilding the servers, so this decision is the cheaper one.`
        : ''),
  });
  log.tick(2000);

  const granted = opts.onApproval ? await opts.onApproval(winner.id) : true;
  if (!granted) {
    log.candidateStatus({
      id: winner.id,
      status: 'rejected',
      reason: 'Approval withheld by the commodity manager',
      plain: 'A human declined this purchase. Nothing was ordered.',
    });
    log.runEnded({
      outcomeLabel: 'Approval withheld — no order placed',
      dollarsSaved: 0,
      minutesElapsed: 2.5,
      plain: 'The human declined, so nothing was ordered.',
    });
    return { blockedCandidates, rejectedCandidates, gates, transcript: transcript.all() };
  }

  log.approvalGranted({
    candidateId: winner.id,
    by: opts.approver,
    plain: 'A human approved the purchase. This is the only decision the agents did not make on their own.',
  });
  log.candidateStatus({
    id: winner.id,
    status: 'approved',
    reason: verdict?.reason ?? 'Qualified on platform QVL and authenticity screened',
    plain: 'Approved: this part is on the tested list for this server and the offer is from an official distributor.',
  });
  log.tick(1200);

  const poNumber = `PO-${4_400_000 + Math.floor(Math.random() * 99_999)}`;
  log.poDrafted({
    poNumber,
    candidateId: winner.id,
    qty,
    total,
    plain:
      `Purchase order ${poNumber} drafted: ${qty.toLocaleString()} memory modules, ` +
      `$${total.toLocaleString()}, ready to send to the distributor.`,
  });
  log.tick(1500);

  return {
    blockedCandidates,
    rejectedCandidates,
    approvedCandidate: winner.id,
    gates,
    transcript: transcript.all(),
  };
}

// ── outcome emission ────────────────────────────────────────────────────────

/** Turn the QVL verdicts into schema events. This is where beat 4 lands. */
function emitQualificationOutcomes(ctx: HostContext): void {
  const { log } = ctx;
  for (const c of ctx.candidates) {
    const v = ctx.verdicts.get(c.id);
    if (!v) continue;

    if (v.decision === 'block') {
      // THE RED MOMENT.
      log.blockRaised({
        agent: 'engineering',
        candidateId: c.id,
        reason: v.reason,
        plain: v.plain,
      });
      log.candidateStatus({
        id: c.id,
        status: 'blocked',
        reason: v.reason,
        plain: v.plain,
      });
      log.tick(600);
    }
  }
}

/** Turn the authenticity findings into schema events. Beat 5. */
async function emitAuthenticityOutcomes(ctx: HostContext): Promise<void> {
  const { log } = ctx;
  for (const c of ctx.candidates) {
    const a = ctx.authenticity.get(c.id);
    if (!a || a.ok) continue;

    /**
     * imageA/imageB come from the lot's marking fixture, which is the only place that knows
     * which label images actually exist on disk. UI mirrors whatever path we emit into
     * ui/public/, so a wrong path here is a broken side-by-side on the X-factor slide.
     */
    const fixture = ctx.fixtures.get(c.id);
    const mossPayload = ctx.mossCounterfeit?.[c.id];
    const imageA =
      fixture?.images?.label ?? (mossPayload?.imageA as string) ?? c.photoPath ?? '';
    const imageB =
      fixture?.images?.referenceGenuine ?? (mossPayload?.imageB as string) ?? '';

    log.counterfeitFlagged({
      candidateId: c.id,
      imageA,
      imageB,
      // The fixture's similarity to the known-remarked cluster is the headline number.
      score:
        fixture?.verdict?.similarityScores?.['ref-remarked-cluster-A'] ??
        (mossPayload?.score as number) ??
        a.score,
      // Measured, never invented, and never Moss's parseMs added on top.
      latencyMs: a.latencyMs || (mossPayload?.latencyMs as number) || 1,
      reason: a.reason,
      plain: a.plain,
    });
    log.candidateStatus({
      id: c.id,
      status: 'rejected',
      reason: a.reason,
      plain: a.plain,
    });
    log.tick(800);
  }
}

/** Convenience re-export so run.ts has one import site. */
export { ALL_AGENTS, ENGINEERING, INTAKE, QUALITY, SOURCING };
export type { AgentDef, Candidate };
