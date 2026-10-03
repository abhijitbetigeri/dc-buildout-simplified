import type {
  AlertPayload,
  Candidate,
  CommitInfo,
  FeedItem,
  LinedownEvent,
  RunEnd,
  RunState,
  ToolCallItem,
} from "./types";

/**
 * Fold an event prefix into render state.
 *
 * Pure and total: an event type we have never seen becomes an `unknown` feed item,
 * and a malformed payload degrades to a neutral card. This function must never throw —
 * on stage, a crash is the whole demo.
 */
export function derive(events: LinedownEvent[]): RunState {
  let alert: AlertPayload | null = null;
  const feed: FeedItem[] = [];
  const candidates = new Map<string, Candidate>();
  let commit: CommitInfo | null = null;
  let po: RunState["po"] = null;
  let end: RunEnd | null = null;

  const toolByCallId = new Map<string, ToolCallItem>();

  for (const ev of events) {
    const p = (ev?.payload ?? {}) as Record<string, any>;
    try {
      switch (ev.type) {
        case "alert.raised":
          alert = p as AlertPayload;
          break;

        case "agent.message":
          feed.push({
            kind: "message",
            id: ev.id,
            agent: String(p.agent ?? "agent"),
            role: String(p.role ?? p.agent ?? "Agent"),
            text: String(p.text ?? ""),
            plain: p.plain ? String(p.plain) : undefined,
          });
          break;

        case "tool.call": {
          const item: ToolCallItem = {
            kind: "tool",
            id: ev.id,
            callId: String(p.callId ?? ev.id),
            agent: String(p.agent ?? "agent"),
            tool: String(p.tool ?? "tool"),
            label: String(p.label ?? "Working"),
            settled: false,
            plain: p.plain ? String(p.plain) : undefined,
          };
          feed.push(item);
          toolByCallId.set(item.callId, item);
          break;
        }

        case "tool.result": {
          const target = toolByCallId.get(String(p.callId));
          if (target) {
            target.settled = true;
            target.resultKind = String(p.kind ?? "");
            target.result = p.payload;
            if (p.plain) target.resultPlain = String(p.plain);
          } else {
            // Result with no matching call — still show the evidence rather than drop it.
            const orphan: ToolCallItem = {
              kind: "tool",
              id: ev.id,
              callId: String(p.callId ?? ev.id),
              agent: "agent",
              tool: String(p.kind ?? "tool").split(".")[0],
              label: "Evidence",
              settled: true,
              resultKind: String(p.kind ?? ""),
              result: p.payload,
              resultPlain: p.plain ? String(p.plain) : undefined,
            };
            feed.push(orphan);
            toolByCallId.set(orphan.callId, orphan);
          }
          if (String(p.kind) === "entire.commit" && p.payload) {
            commit = p.payload as CommitInfo;
          }
          break;
        }

        case "candidate.added":
          candidates.set(String(p.id), {
            id: String(p.id),
            mpn: String(p.mpn ?? "—"),
            vendor: String(p.vendor ?? "—"),
            specs: (p.specs ?? {}) as Record<string, string>,
            pricePerUnit: Number(p.pricePerUnit ?? 0),
            leadTimeWeeks: Number(p.leadTimeWeeks ?? 0),
            source: String(p.source ?? ""),
            status: "new",
          });
          break;

        case "candidate.status": {
          const c = candidates.get(String(p.id));
          if (c) {
            c.status = p.status ?? "evaluating";
            c.statusReason = p.reason ? String(p.reason) : undefined;
            c.statusPlain = p.plain ? String(p.plain) : undefined;
          }
          feed.push({
            kind: "status",
            id: ev.id,
            candidateId: String(p.id),
            status: p.status ?? "evaluating",
            reason: String(p.reason ?? ""),
            plain: p.plain ? String(p.plain) : undefined,
          });
          break;
        }

        case "block.raised": {
          const c = candidates.get(String(p.candidateId));
          if (c) {
            c.status = "blocked";
            c.statusReason = String(p.reason ?? "");
            c.statusPlain = String(p.plain ?? "");
          }
          feed.push({
            kind: "block",
            id: ev.id,
            agent: String(p.agent ?? "engineering"),
            candidateId: String(p.candidateId ?? ""),
            reason: String(p.reason ?? ""),
            plain: String(p.plain ?? ""),
          });
          break;
        }

        case "counterfeit.flagged": {
          const c = candidates.get(String(p.candidateId));
          if (c) c.counterfeit = true;
          feed.push({
            kind: "counterfeit",
            id: ev.id,
            candidateId: String(p.candidateId ?? ""),
            imageA: String(p.imageA ?? ""),
            imageB: String(p.imageB ?? ""),
            score: Number(p.score ?? 0),
            latencyMs: Number(p.latencyMs ?? 0),
            reason: String(p.reason ?? ""),
            plain: String(p.plain ?? ""),
          });
          break;
        }

        case "approval.requested":
          feed.push({
            kind: "approval",
            id: ev.id,
            candidateId: String(p.candidateId ?? ""),
            summary: String(p.summary ?? ""),
            savingsVsBroker:
              p.savingsVsBroker != null ? Number(p.savingsVsBroker) : undefined,
            granted: false,
            plain: p.plain ? String(p.plain) : undefined,
          });
          break;

        case "approval.granted": {
          const open = [...feed]
            .reverse()
            .find((f) => f.kind === "approval" && !f.granted) as
            | Extract<FeedItem, { kind: "approval" }>
            | undefined;
          if (open) {
            open.granted = true;
            open.grantedBy = String(p.by ?? "Approver");
          }
          break;
        }

        case "po.drafted":
          po = {
            poNumber: String(p.poNumber ?? "—"),
            candidateId: String(p.candidateId ?? ""),
            qty: Number(p.qty ?? 0),
            total: Number(p.total ?? 0),
          };
          feed.push({ kind: "po", id: ev.id, ...po, plain: p.plain ? String(p.plain) : undefined });
          break;

        case "policy.committed":
          commit = {
            commitHash: String(p.commitHash ?? ""),
            blameUrl: String(p.blameUrl ?? ""),
            summary: String(p.summary ?? ""),
            sessionId: String(p.sessionId ?? ""),
          };
          break;

        case "run.ended":
          end = {
            outcomeLabel: String(p.outcomeLabel ?? "Run complete"),
            dollarsSaved: Number(p.dollarsSaved ?? 0),
            minutesElapsed: Number(p.minutesElapsed ?? 0),
            plain: p.plain ? String(p.plain) : undefined,
          };
          break;

        default:
          feed.push({ kind: "unknown", id: ev.id, type: String(ev.type), payload: p });
      }
    } catch {
      feed.push({ kind: "unknown", id: ev?.id ?? "?", type: String(ev?.type ?? "?"), payload: p });
    }
  }

  // A tool call that never got a result must not spin forever on a projector.
  // Once the conversation has moved on by 2 items, show it as done.
  feed.forEach((item, i) => {
    if (item.kind === "tool" && !item.settled && i < feed.length - 2) {
      item.settled = true;
    }
  });

  return {
    alert,
    feed,
    candidates: Array.from(candidates.values()),
    commit,
    po,
    end,
  };
}

export const money = (n: number, frac = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

export const compactMoney = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return money(n);
};

export const qty = (n: number) => n.toLocaleString("en-US");
