"use client";

import { useState } from "react";
import { resolveImg } from "@/lib/run";
import type { MossEquivalent, MossMatch, TavilySource, ToolCallItem } from "@/lib/types";
import { AgentBadge, Label, Latency, Plain, ScoreBar, toolMeta } from "../primitives";

/**
 * A tool call rendered as an inline evidence chip that fills in with its result.
 * The chip is the same shape for every tool so the room reads as one transcript.
 */
export function ToolEvidence({ item }: { item: ToolCallItem }) {
  const meta = toolMeta(item.tool);
  const running = !item.settled;

  return (
    <div className="animate-slide-in rounded-md border border-line bg-surface/80">
      {/* ——— the call ——— */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <span className="mono flex items-center gap-2 rounded-sm border border-line-bright bg-hi px-2 py-[3px] text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-dim">
          <span className="text-[0.8125rem] leading-none text-accent/70">{meta.glyph}</span>
          {meta.name}
        </span>
        <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">{item.label}</span>
        {running ? (
          <span className="mono flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-accent" />
            working
          </span>
        ) : (
          <span className="mono text-[0.6875rem] uppercase tracking-[0.14em] text-faint">done</span>
        )}
      </div>

      {item.plain ? (
        <div className="px-4 pb-3">
          <Plain>{item.plain}</Plain>
        </div>
      ) : null}

      {/* ——— the result ——— */}
      {item.settled && item.result ? (
        <div className="border-t border-line px-4 py-4">
          <Result kind={item.resultKind ?? ""} payload={item.result} />
          {item.resultPlain ? <Plain>{item.resultPlain}</Plain> : null}
        </div>
      ) : null}
    </div>
  );
}

function Result({ kind, payload }: { kind: string; payload: any }) {
  try {
    switch (kind) {
      case "tavily.sources":
        return <TavilySources payload={payload} />;
      case "moss.partmatch":
        return <MossPartMatch payload={payload} />;
      case "moss.matches":
        return <MossMatches payload={payload} />;
      case "entire.commit":
        return <EntireCommit payload={payload} />;
      // Additive kind from the DATA track; both spellings accepted.
      case "qvl.lookup":
      case "zoodata.qvl":
        return <QvlLookup payload={payload} />;
      default:
        return <NeutralResult kind={kind} payload={payload} />;
    }
  } catch {
    return <NeutralResult kind={kind} payload={payload} />;
  }
}

/* ———————————————— Tavily ————————————————
   Deliberately neutral. While the run is on replay these are placeholder-shaped,
   not retrieved citations — so they get a plain "source" treatment and an
   explicit badge when the payload says so. No fake live-fetch theatre. */
function TavilySources({ payload }: { payload: { sources?: TavilySource[]; _illustrative?: boolean } }) {
  const sources = payload?.sources ?? [];
  const illustrative = payload?._illustrative === true;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Label>
          {sources.length} source{sources.length === 1 ? "" : "s"}
        </Label>
        {illustrative ? (
          <span className="mono rounded-sm border border-line-bright bg-hi px-2 py-[2px] text-[0.625rem] uppercase tracking-[0.12em] text-dim">
            illustrative · not retrieved
          </span>
        ) : null}
      </div>

      <ul className="space-y-2.5">
        {sources.map((s, i) => (
          <li key={i} className="border-l-2 border-line-bright pl-3.5">
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[0.9375rem] font-medium leading-snug text-ink underline decoration-line-bright decoration-1 underline-offset-[3px] hover:decoration-dim"
            >
              {s.title}
            </a>
            <p className="mono mt-1 truncate text-[0.6875rem] text-faint">{hostOf(s.url)}</p>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-dim">{s.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ———————————————— Moss: part equivalence ———————————————— */
function MossPartMatch({
  payload,
}: {
  payload: {
    query?: string;
    decoded?: Record<string, string>;
    equivalents?: MossEquivalent[];
    latencyMs?: number;
  };
}) {
  const decoded = payload?.decoded ?? {};
  const eq = payload?.equivalents ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Label>decoded</Label>
          <p className="mono mt-1 break-all text-[1rem] font-semibold text-ink">{payload.query}</p>
        </div>
        <Latency ms={payload.latencyMs} />
      </div>

      {Object.keys(decoded).length ? (
        <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-[3px] rounded border border-line bg-raised/60 px-3.5 py-3">
          {Object.entries(decoded)
            .filter(([k]) => k !== "note")
            .map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/40 py-[3px] last:border-0">
                <dt className="label shrink-0">{humanKey(k)}</dt>
                <dd className="mono truncate text-[0.8125rem] text-ink" title={String(v)}>
                  {String(v)}
                </dd>
              </div>
            ))}
        </dl>
      ) : null}

      <Label>module-level equivalents</Label>
      {/* "Nothing qualifies" is a real sourcing outcome, not an error state. */}
      {eq.length === 0 ? (
        <div className="mt-2 rounded border border-line bg-raised/50 px-3.5 py-3">
          <p className="text-[0.9375rem] font-medium text-ink">
            No cross-vendor equivalent found
          </p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-dim">
            Nothing in the index matches this module at a substitutable level. The part has to be
            re-allocated, re-qualified or re-designed — there is no drop-in alternative to buy.
          </p>
        </div>
      ) : null}
      <ul className="mt-2 space-y-1.5">
        {eq.map((e) => (
          <li
            key={e.mpn}
            className="flex items-center gap-3 rounded border border-line bg-raised/50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="mono truncate text-[0.9375rem] font-medium text-ink">{e.mpn}</p>
              <p className="mt-[2px] text-[0.75rem] text-faint">{e.vendor}</p>
            </div>
            <div className="w-[88px] shrink-0">
              <p className="mono tnum mb-1 text-right text-[0.8125rem] text-dim">
                {e.score.toFixed(2)}
              </p>
              <ScoreBar score={e.score} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ———————————————— Moss: image match ———————————————— */
function MossMatches({ payload }: { payload: { matches?: MossMatch[]; latencyMs?: number } }) {
  const matches = payload?.matches ?? [];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <Label>visual matches</Label>
        <Latency ms={payload.latencyMs} />
      </div>
      {matches.length === 0 ? (
        <div className="rounded border border-line bg-raised/50 px-3.5 py-3">
          <p className="text-[0.9375rem] font-medium text-ink">No visual match found</p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-dim">
            This marking does not match any reference in the index — genuine or known-counterfeit.
            It needs a physical inspection, not a desk decision.
          </p>
        </div>
      ) : null}
      <ul className="grid gap-2.5 sm:grid-cols-3">
        {matches.map((m) => {
          const top = m.score >= 0.5;
          return (
            <li
              key={m.id}
              className={`overflow-hidden rounded border bg-raised/50 ${
                top ? "border-block/50" : "border-line"
              }`}
            >
              <Thumb src={m.thumbnail} alt={m.label} />
              <div className="px-2.5 pb-2.5 pt-2">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span
                    className={`mono tnum text-[1.0625rem] font-semibold ${
                      top ? "text-block" : "text-dim"
                    }`}
                  >
                    {Math.round(m.score * 100)}%
                  </span>
                  {top ? (
                    <span className="mono text-[0.5625rem] uppercase tracking-[0.12em] text-block/80">
                      closest
                    </span>
                  ) : null}
                </div>
                <ScoreBar score={m.score} tone={top ? "block" : "neutral"} />
                <p className="mt-2 text-[0.75rem] leading-snug text-faint">{m.label}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState(() => resolveImg(src));
  const [failed, setFailed] = useState(false);
  if (failed || !url) {
    return (
      <div className="flex h-[70px] items-center justify-center border-b border-line bg-hi">
        <span className="mono text-[0.625rem] uppercase tracking-[0.14em] text-faint">
          no image
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="block h-[70px] w-full border-b border-line bg-[#F2F1EC] object-cover"
      onError={() => {
        if (url !== "/img/mod-remark.svg") setUrl("/img/mod-remark.svg");
        else setFailed(true);
      }}
    />
  );
}

/* ———————————————— QVL lookup (additive kind) ———————————————— */
function QvlLookup({
  payload,
}: {
  payload: {
    label?: string;
    qvlRevision?: string;
    source?: string;
    latencyMs?: number;
    lookups?: {
      candidateId?: string;
      mpn?: string;
      result?: string;
      validationReportId?: string;
      validatedOn?: string;
      note?: string;
      specCompare?: string;
      evaluationQueueId?: string;
      evaluationStatus?: string;
    }[];
  };
}) {
  const rows = payload?.lookups ?? [];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>{payload.label ?? "QVL lookup"}</Label>
          {payload.qvlRevision ? (
            <p className="mono mt-1 text-[0.8125rem] text-dim">{payload.qvlRevision}</p>
          ) : null}
        </div>
        <Latency ms={payload.latencyMs} />
      </div>

      <ul className="space-y-1.5">
        {rows.map((r, i) => {
          const qualified = r.result === "qualified";
          return (
            <li
              key={i}
              className={`rounded border px-3 py-2.5 ${
                qualified ? "border-line bg-raised/50" : "border-block/45 bg-block/[0.06]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="mono text-[0.9375rem] font-medium text-ink">{r.mpn}</p>
                <span
                  className={`mono rounded-sm border px-2 py-[2px] text-[0.625rem] font-semibold uppercase tracking-[0.12em] ${
                    qualified
                      ? "border-line-bright bg-hi text-dim"
                      : "border-block/50 bg-block/15 text-block"
                  }`}
                >
                  {qualified ? "qualified" : (r.result ?? "unknown").replace(/-/g, " ")}
                </span>
              </div>
              {r.validationReportId ? (
                <p className="mono mt-1.5 text-[0.75rem] text-faint">
                  report {r.validationReportId}
                  {r.validatedOn ? ` · validated ${r.validatedOn}` : ""}
                </p>
              ) : null}
              {r.specCompare ? (
                <p className="mt-1.5 text-[0.8125rem] leading-snug text-dim">{r.specCompare}</p>
              ) : null}
              {r.evaluationStatus ? (
                <p className="mono mt-1 text-[0.75rem] leading-snug text-block/75">
                  {r.evaluationQueueId ? `${r.evaluationQueueId} — ` : ""}
                  {r.evaluationStatus}
                </p>
              ) : null}
              {r.note ? (
                <p className="mt-2 border-l-2 border-line-bright pl-2.5 text-[0.8125rem] leading-snug text-dim">
                  {r.note}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ———————————————— Entire commit ———————————————— */
function EntireCommit({
  payload,
}: {
  payload: { commitHash?: string; blameUrl?: string; summary?: string; sessionId?: string };
}) {
  return (
    <div>
      <Label>committed to the record</Label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="mono rounded border border-accent/30 bg-accent/[0.07] px-2.5 py-1 text-[0.9375rem] font-semibold text-accent">
          {payload.commitHash}
        </span>
        {payload.blameUrl ? (
          <a
            href={payload.blameUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mono text-[0.75rem] text-dim underline decoration-line-bright underline-offset-[3px] hover:text-ink"
          >
            entire blame →
          </a>
        ) : null}
      </div>
      {payload.summary ? (
        <p className="mono mt-3 text-[0.8125rem] leading-relaxed text-dim">{payload.summary}</p>
      ) : null}
    </div>
  );
}

/* ———————————————— Unknown result kind: neutral, never a crash ———————————————— */
function NeutralResult({ kind, payload }: { kind: string; payload: any }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Label>result</Label>
        <span className="mono rounded-sm border border-line-bright bg-hi px-2 py-[2px] text-[0.625rem] uppercase tracking-[0.12em] text-dim">
          {kind || "unlabelled"}
        </span>
      </div>
      <pre className="scroll-dark max-h-44 overflow-auto rounded border border-line bg-base/60 p-3 text-[0.75rem] leading-relaxed text-dim">
        {safeJson(payload)}
      </pre>
    </div>
  );
}

export function safeJson(v: any) {
  try {
    return JSON.stringify(v, null, 1);
  } catch {
    return String(v);
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function humanKey(k: string) {
  return k.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

export { AgentBadge };
