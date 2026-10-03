"use client";

import { Plain } from "../primitives";

/**
 * THE RED MOMENT. A door slamming.
 *
 * Weight comes from the solid bar, the size of the word, and the fact that red
 * appears nowhere else on the page until this fires.
 */
export function BlockCard({
  reason,
  plain,
  candidateId,
  mpn,
}: {
  reason: string;
  plain: string;
  candidateId: string;
  mpn?: string;
}) {
  return (
    <article className="animate-slam animate-pulse-block overflow-hidden rounded-md border-2 border-block/70 bg-block-deep shadow-[0_0_70px_-14px_rgba(255,74,71,0.45)]">
      <div className="flex">
        {/* the bar */}
        <div className="flex w-[14px] shrink-0 flex-col bg-block">
          <div className="h-full w-full bg-[repeating-linear-gradient(135deg,rgba(0,0,0,0.28)_0_7px,transparent_7px_14px)]" />
        </div>

        <div className="min-w-0 flex-1 px-7 py-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h3 className="text-[2.25rem] font-bold uppercase leading-none tracking-[0.06em] text-block">
              Blocked
            </h3>
            <span className="mono rounded-sm border border-block/40 bg-block/10 px-2 py-[3px] text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-block/90">
              engineering hold
            </span>
          </div>

          {mpn ? (
            <p className="mono mt-4 break-all text-[1.0625rem] font-semibold text-ink">
              {mpn}
              <span className="ml-2.5 text-[0.75rem] font-normal uppercase tracking-[0.12em] text-block/60">
                {candidateId}
              </span>
            </p>
          ) : null}

          <p className="mt-3 max-w-[70ch] text-[1rem] leading-relaxed text-[#FFD5D3]">{reason}</p>

          <Plain tone="block">{plain}</Plain>
        </div>
      </div>
    </article>
  );
}
