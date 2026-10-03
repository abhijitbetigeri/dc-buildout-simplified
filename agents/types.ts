/**
 * Event contract — mirrors docs/EVENT-SCHEMA.md exactly.
 *
 * docs/EVENT-SCHEMA.md is FROZEN. If a change is needed it goes through status/, not here.
 * This file is the typed restatement of that document and nothing more. If the two ever
 * disagree, the markdown wins and this file is the bug.
 */

export type AgentName = 'intake' | 'sourcing' | 'engineering' | 'quality' | 'market';

export type EventType =
  | 'alert.raised'
  | 'agent.message'
  | 'tool.call'
  | 'tool.result'
  | 'candidate.added'
  | 'candidate.status'
  | 'block.raised'
  | 'counterfeit.flagged'
  | 'approval.requested'
  | 'approval.granted'
  | 'po.drafted'
  | 'policy.committed'
  | 'run.ended';

export interface Event<P = Record<string, unknown>> {
  /** "e001", monotonically increasing. */
  id: string;
  /** ms offset from run start — NOT wall clock. Replay sleeps to this. */
  ts: number;
  type: EventType;
  payload: P;
}

// ── payloads ────────────────────────────────────────────────────────────────

export interface AlertRaised {
  part: string;
  partLabel: string;
  program: string;
  qtyAtRisk: number;
  burnRatePerMin: number;
  deadlineLabel: string;
  reason: string;
  plain: string;
}

export interface AgentMessage {
  agent: AgentName | string;
  role: string;
  text: string;
}

/**
 * `qvl` was added to the frozen enum by the coordinator. It is the honest label for the
 * platform qualification lookup: in replay that reads a local JSON file, so badging it
 * `zoodata` would claim a sponsor integration we are not making — and the badge is what a
 * judge actually reads on screen. Use `zoodata` only if the lookup genuinely routes there.
 */
export type ToolName = 'tavily' | 'moss' | 'entire' | 'zoodata' | 'qvl';

export interface ToolCallEvt {
  callId: string;
  agent: AgentName | string;
  tool: ToolName;
  label: string;
  status: 'running';
  /** not in the original schema; DATA added it and UI renders it. Rule 1 wants it. */
  plain?: string;
}

export type ToolResultKind =
  | 'tavily.sources'
  | 'moss.matches'
  | 'moss.partmatch'
  | 'entire.commit'
  /** additive kind for the QVL lookup — everything it carries is duplicated in block.raised */
  | 'qvl.lookup';

export interface ToolResultEvt<P = unknown> {
  callId: string;
  kind: ToolResultKind;
  payload: P;
  plain?: string;
}

/** Payload of the additive `qvl.lookup` tool result. */
export interface QvlLookupPayload {
  label: string;
  source: string;
  qvlRevision?: string;
  lookups: {
    candidateId: string;
    mpn: string;
    result: 'qualified' | 'approved-alternate' | 'not-listed';
    validationReportId?: string;
    validatedOn?: string;
    minBiosVersion?: string;
    specCompare?: string;
    evaluationQueueId?: string;
    evaluationStatus?: string;
    note?: string;
  }[];
  latencyMs: number;
}

export interface TavilySources {
  sources: { title: string; url: string; snippet: string }[];
}

export interface MossMatches {
  matches: { id: string; label: string; score: number; thumbnail?: string }[];
  latencyMs: number;
}

export interface MossPartmatch {
  query: string;
  equivalents: { mpn: string; vendor: string; score: number; specs: Record<string, string> }[];
  latencyMs: number;
}

export interface EntireCommit {
  commitHash: string;
  blameUrl: string;
  summary: string;
  sessionId: string;
}

export interface CandidateAdded {
  id: string;
  mpn: string;
  vendor: string;
  specs: Record<string, string>;
  pricePerUnit: number;
  leadTimeWeeks: number;
  source: string;
}

export type CandidateState = 'evaluating' | 'blocked' | 'approved' | 'rejected';

export interface CandidateStatus {
  id: string;
  status: CandidateState;
  reason: string;
  plain: string;
}

export interface BlockRaised {
  agent: 'engineering';
  candidateId: string;
  reason: string;
  plain: string;
}

export interface CounterfeitFlagged {
  candidateId: string;
  imageA: string;
  imageB: string;
  score: number;
  latencyMs: number;
  reason: string;
  plain: string;
}

export interface ApprovalRequested {
  candidateId: string;
  summary: string;
  savingsVsBroker?: number;
}

export interface ApprovalGranted {
  candidateId: string;
  by: string;
}

export interface PoDrafted {
  poNumber: string;
  candidateId: string;
  qty: number;
  total: number;
}

export interface PolicyCommitted {
  commitHash: string;
  blameUrl: string;
  summary: string;
  sessionId: string;
}

export interface RunEnded {
  outcomeLabel: string;
  dollarsSaved: number;
  minutesElapsed: number;
}

// ── domain types shared by the tools ────────────────────────────────────────

export interface Candidate {
  id: string;
  mpn: string;
  vendor: string;
  specs: Record<string, string | number>;
  pricePerUnit: number;
  leadTimeWeeks: number;
  source: string;
  /**
   * Set when the offer did NOT come through franchised distribution — broker, grey market,
   * independent. These require a completed authenticity screen before they are purchasable,
   * and the gate FAILS CLOSED on them: unscreened is not the same as clean.
   */
  broker?: boolean;
  /** DATA's explicit channel field — more reliable than sniffing the prose */
  sourceChannel?: string;
  vendorTier?: string;
  /** supplier traceability statement; "NONE" is itself a finding */
  traceability?: string;
  lotCode?: string;
  /** path to the marking fixture JSON for this lot (data/markings/*.json) */
  markingFixtureRef?: string;
  /** marking string as read off the physical module, when one exists */
  markingText?: string;
  photoPath?: string;
  /** DATA's pre-normalised spec block, keyed the way the QVL requirements are */
  specsNormalized?: Record<string, string | number>;
}
