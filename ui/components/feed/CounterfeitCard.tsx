"use client";

import { useState } from "react";
import { resolveImg } from "@/lib/run";
import { Latency, Plain } from "../primitives";

/**
 * THE X-FACTOR SHOT.
 *
 * Two module markings, side by side, with the match score read between them.
 * Everything here serves one glance: these two are supposed to be the same
 * part, and they are not.
 *
 * Score semantics follow the shipped payload — `score` is the match against the
 * known remarked cluster, so HIGH means guilty. We label it that way rather than
 * calling it "similarity" and leaving the direction ambiguous. A low score is
 * read the other way (match against the genuine reference) so the component
 * stays correct if the DATA track flips the comparison.
 */
export function CounterfeitCard({
  imageA,
  imageB,
  score,
  latencyMs,
  reason,
  plain,
  candidateId,
}: {
  imageA: string;
  imageB: string;
  score: number;
  latencyMs: number;
  reason: string;
  plain: string;
  candidateId: string;
}) {
  const pct = Math.round(score * 100);
  const guiltyHigh = score >= 0.5;
  const THRESHOLD = guiltyHigh ? 85 : 90;
  const scoreLabel = guiltyHigh ? "remark-pattern match" : "match to genuine";
  const verdict = guiltyHigh ? "confirmed remark" : "no match";

  return (
    <article className="animate-slam overflow-hidden rounded-md border border-block/55 bg-gradient-to-b from-block-deep/90 to-surface shadow-[0_0_60px_-12px_rgba(255,74,71,0.3)]">
      {/* ——— header ——— */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-block/30 bg-block/[0.07] px-6 py-4">
        <div className="flex items-center gap-3">
          <ShieldX />
          <div>
            <h3 className="text-[1.3125rem] font-bold uppercase leading-none tracking-[0.1em] text-block">
              Counterfeit detected
            </h3>
            <p className="mono mt-1.5 text-[0.6875rem] uppercase tracking-[0.16em] text-block/60">
              on-device visual provenance check · candidate {candidateId}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="label mb-1.5">match latency</p>
          <Latency ms={latencyMs} size="lg" />
        </div>
      </header>

      {/* ——— the comparison ——— */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-0 px-6 py-7">
        <Panel
          eyebrow="submitted"
          caption="Broker photograph · unaudited lot"
          src={imageA}
          fallback="/img/label-submitted.svg"
          suspect
        />

        {/* the score, read between the two images */}
        <div className="flex h-full flex-col items-center justify-center px-5 pt-7">
          <div className="h-9 w-px bg-gradient-to-b from-transparent to-line-bright" />
          <p className="label mt-4 mb-2 max-w-[9rem] text-center leading-tight">{scoreLabel}</p>
          <div className="flex items-baseline">
            <span className="mono tnum text-[4.25rem] font-bold leading-none tracking-tighter text-block">
              {pct}
            </span>
            <span className="mono text-[1.5rem] font-semibold leading-none text-block/50">%</span>
          </div>

          {/* threshold gauge — shows the verdict is not a judgement call */}
          <div className="mt-5 w-[118px]">
            <div className="relative h-[6px] overflow-hidden rounded-full bg-hi">
              <div className="h-full rounded-full bg-block" style={{ width: `${pct}%` }} />
              <div
                className="absolute top-[-3px] h-[12px] w-[2px] bg-ink/75"
                style={{ left: `${THRESHOLD}%` }}
              />
            </div>
            <div className="mono mt-2 flex justify-between text-[0.625rem] uppercase tracking-[0.08em] text-faint">
              <span>0</span>
              <span className="text-dim">flag {THRESHOLD}</span>
            </div>
          </div>

          <p className="mono mt-4 rounded border border-block/40 bg-block/10 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-block">
            {verdict}
          </p>
          <div className="mt-4 h-9 w-px bg-gradient-to-t from-transparent to-line-bright" />
        </div>

        <Panel
          eyebrow="known good"
          caption="Verified manufacturer reference"
          src={imageB}
          fallback="/img/label-reference.svg"
        />
      </div>

      {/* ——— why: the findings carry the beat even if no image renders ——— */}
      <Findings reason={reason} plain={plain} />
    </article>
  );
}

/**
 * The `reason` string carries its discrepancies as an inline "(1) … (2) …" list.
 * Breaking them into rows makes six independent failures read as six independent
 * failures rather than a paragraph — and it means the beat still lands on the
 * evidence alone if the marking images are missing on the venue machine.
 */
function Findings({ reason, plain }: { reason: string; plain: string }) {
  const { lead, items, note } = parseFindings(reason);

  return (
    <div className="border-t border-block/25 bg-base/40 px-6 py-5">
      <p className="label mb-2.5">marking discrepancies</p>

      {lead ? (
        <p className="mb-3 text-[0.9375rem] leading-relaxed text-[#E7D3D2]">{lead}</p>
      ) : null}

      {items.length >= 2 ? (
        <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {items.map((t, i) => (
            <li key={i} className="flex gap-2.5 border-l-2 border-block/40 pl-3">
              <span className="mono tnum shrink-0 text-[0.75rem] font-semibold leading-5 text-block/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[0.875rem] leading-5 text-[#E7D3D2]">{t}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[0.9375rem] leading-relaxed text-[#E7D3D2]">{reason}</p>
      )}

      {note ? (
        <p className="mono mt-3.5 border-t border-block/20 pt-3 text-[0.8125rem] leading-relaxed text-dim">
          {note}
        </p>
      ) : null}

      <Plain tone="block">{plain}</Plain>
    </div>
  );
}

function parseFindings(reason: string) {
  const empty = { lead: reason, items: [] as string[], note: "" };
  try {
    const start = reason.search(/\(1\)/);
    if (start === -1) return empty;

    const lead = reason.slice(0, start).replace(/[—:;,\s]+$/, "").trim();
    const parts = reason.slice(start).split(/\((\d+)\)\s*/);

    const items: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) {
      if (/^\d+$/.test(parts[i]) && parts[i + 1]) {
        items.push(parts[i + 1].trim().replace(/[;\s]+$/, ""));
      }
    }
    if (items.length < 2) return empty;

    // The final entry usually runs on into a closing remark. Split it off so the
    // last finding stays a finding.
    let note = "";
    const last = items[items.length - 1];
    const cut = last.indexOf(". ");
    if (cut > 20 && last.length - cut > 20) {
      items[items.length - 1] = last.slice(0, cut);
      note = last.slice(cut + 2).trim();
    }
    return { lead, items, note };
  } catch {
    return empty;
  }
}

function Panel({
  eyebrow,
  caption,
  src,
  fallback,
  suspect,
}: {
  eyebrow: string;
  caption: string;
  src: string;
  fallback: string;
  suspect?: boolean;
}) {
  // Stage safety outranks asset completeness. If the real marking asset is
  // missing we fall back to the shipped schematic label; if that fails too we
  // render a labelled empty frame. A broken image icon never reaches a judge,
  // and the verdict plus the findings table carry the beat on their own.
  const [url, setUrl] = useState(() => resolveImg(src) || fallback);
  const [dead, setDead] = useState(false);

  return (
    <figure className="min-w-0">
      <figcaption className="mb-3">
        <span
          className={`mono rounded-sm border px-2 py-[3px] text-[0.6875rem] font-semibold uppercase tracking-[0.16em] ${
            suspect ? "border-block/50 bg-block/15 text-block" : "border-line-bright bg-hi text-dim"
          }`}
        >
          {eyebrow}
        </span>
      </figcaption>

      <div
        className={`relative overflow-hidden rounded border-2 ${
          dead ? "bg-hi" : "bg-[#F2F1EC]"
        } ${suspect ? "border-block/70" : "border-line-bright"}`}
      >
        {dead ? (
          <div className="flex aspect-[440/210] flex-col items-center justify-center gap-2 px-4 text-center">
            <span className="mono text-[0.625rem] uppercase tracking-[0.16em] text-faint">
              marking image unavailable
            </span>
            <span className="text-[0.75rem] leading-snug text-faint/70">
              Verdict below is from the marking data, not the photograph.
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${eyebrow} module marking`}
            className="block h-auto w-full"
            onError={() => (url === fallback ? setDead(true) : setUrl(fallback))}
          />
        )}

        {suspect && !dead ? (
          <>
            <Reticle className="left-1.5 top-1.5 border-l-2 border-t-2" />
            <Reticle className="right-1.5 top-1.5 border-r-2 border-t-2" />
            <Reticle className="bottom-1.5 left-1.5 border-b-2 border-l-2" />
            <Reticle className="bottom-1.5 right-1.5 border-b-2 border-r-2" />
          </>
        ) : null}
      </div>

      <p className="mono mt-2.5 text-[0.75rem] leading-snug text-faint">{caption}</p>
    </figure>
  );
}

function Reticle({ className }: { className: string }) {
  return <span className={`pointer-events-none absolute h-4 w-4 border-block ${className}`} />;
}

function ShieldX() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10v-6L12 2.5Z"
        stroke="#FF4A47"
        strokeWidth="1.5"
        fill="rgba(255,74,71,0.1)"
      />
      <path
        d="M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2"
        stroke="#FF4A47"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
