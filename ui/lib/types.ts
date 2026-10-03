// Mirrors docs/EVENT-SCHEMA.md. That file is frozen; this file follows it.

export type LinedownEvent = {
  id: string;
  ts: number; // ms offset from run start
  type: string; // known types below, but ANY string must render
  payload: Record<string, any>;
};

export type AlertPayload = {
  part: string;
  partLabel: string;
  program: string;
  qtyAtRisk: number;
  burnRatePerMin: number;
  deadlineLabel: string;
  reason: string;
  plain: string;
};

export type AgentId = "sourcing" | "engineering" | "quality" | "market" | "intake" | string;
export type ToolId = "tavily" | "moss" | "entire" | "zoodata" | string;

export type TavilySource = { title: string; url: string; snippet: string };
export type MossMatch = { id: string; label: string; score: number; thumbnail: string };
export type MossEquivalent = {
  mpn: string;
  vendor: string;
  score: number;
  specs: Record<string, string>;
};

export type CandidateStatus = "evaluating" | "blocked" | "approved" | "rejected" | "new";

export type Candidate = {
  id: string;
  mpn: string;
  vendor: string;
  specs: Record<string, string>;
  pricePerUnit: number;
  leadTimeWeeks: number;
  source: string;
  status: CandidateStatus;
  statusReason?: string;
  statusPlain?: string;
  counterfeit?: boolean;
};

// ——— Feed items: what the center column renders, in order ———

export type ToolCallItem = {
  kind: "tool";
  id: string;
  callId: string;
  agent: AgentId;
  tool: ToolId;
  label: string;
  settled: boolean;
  resultKind?: string;
  result?: any;
  /** `plain` from tool.call — what we are about to do, in plain language. */
  plain?: string;
  /** `plain` from tool.result — what came back, in plain language. */
  resultPlain?: string;
};

export type FeedItem =
  | { kind: "message"; id: string; agent: AgentId; role: string; text: string; plain?: string }
  | ToolCallItem
  | { kind: "block"; id: string; agent: string; candidateId: string; reason: string; plain: string }
  | {
      kind: "counterfeit";
      id: string;
      candidateId: string;
      imageA: string;
      imageB: string;
      score: number;
      latencyMs: number;
      reason: string;
      plain: string;
    }
  | {
      kind: "approval";
      id: string;
      candidateId: string;
      summary: string;
      savingsVsBroker?: number;
      granted: boolean;
      grantedBy?: string;
      plain?: string;
    }
  | { kind: "po"; id: string; poNumber: string; candidateId: string; qty: number; total: number; plain?: string }
  | { kind: "status"; id: string; candidateId: string; status: CandidateStatus; reason: string; plain?: string }
  | { kind: "unknown"; id: string; type: string; payload: Record<string, any> };

export type CommitInfo = {
  commitHash: string;
  blameUrl: string;
  summary: string;
  sessionId: string;
};

export type RunEnd = {
  outcomeLabel: string;
  dollarsSaved: number;
  minutesElapsed: number;
  plain?: string;
};

/** The DATA track ships either a bare array or `{ runId, program, durationMs, events }`. */
export type RunFile = LinedownEvent[] | { events: LinedownEvent[]; runId?: string; program?: string; durationMs?: number };

export type RunState = {
  alert: AlertPayload | null;
  feed: FeedItem[];
  candidates: Candidate[];
  commit: CommitInfo | null;
  po: { poNumber: string; candidateId: string; qty: number; total: number } | null;
  end: RunEnd | null;
};
