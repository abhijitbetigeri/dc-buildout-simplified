"use client";

import { useEffect, useRef } from "react";
import type { Candidate, FeedItem, RunEnd } from "@/lib/types";
import { ApprovalGate } from "./feed/ApprovalGate";
import { BlockCard } from "./feed/BlockCard";
import { CounterfeitCard } from "./feed/CounterfeitCard";
import { MessageCard, OutcomeCard, PoCard, StatusLine, UnknownCard } from "./feed/MiscCards";
import { ToolEvidence } from "./feed/ToolEvidence";
import { Label } from "./primitives";

/**
 * THE ROOM — center zone.
 *
 * The agents' transcript, with tool calls rendered inline as evidence rather
 * than hidden behind a disclosure. Everything here is driven off the derived
 * feed, so an unrecognised event becomes a neutral card instead of a crash.
 */
export function RoomFeed({
  feed,
  candidates,
  end,
  awaitingApproval,
  onApprove,
}: {
  feed: FeedItem[];
  candidates: Candidate[];
  end: RunEnd | null;
  awaitingApproval: boolean;
  onApprove: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const seeded = useRef(false);

  // Follow the newest beat, unless the presenter has deliberately scrolled up.
  // The first paint (or a seek that lands mid-run) jumps instantly; after that
  // it eases, so reading the room feels continuous.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !pinned.current) return;
    const smooth = seeded.current;
    seeded.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, [feed.length, end]);

  // Cards grow after their images decode (the marking SVGs especially), which
  // would otherwise leave the newest beat half off screen. Re-pin on any
  // content resize.
  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (pinned.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const mpnOf = (id: string) => candidates.find((c) => c.id === id)?.mpn;

  return (
    <section className="flex min-h-0 flex-col border-r hairline">
      <header className="flex items-center justify-between border-b hairline px-6 py-3">
        <Label>the room</Label>
        <span className="mono text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
          sourcing · engineering · quality · market
        </span>
      </header>

      <div
        ref={scroller}
        onScroll={onScroll}
        data-feed-scroll
        className="scroll-dark min-h-0 flex-1 overflow-y-auto px-6 py-5"
      >
        <div ref={content} className="space-y-2.5">
          {feed.length === 0 ? (
            <p className="pt-10 text-center text-[0.9375rem] text-faint">
              Waiting for the first agent to speak…
            </p>
          ) : null}

          {feed.map((item, i) => {
            // WHAT'S NEW: the newest card holds full weight, everything behind it
            // steps back. The eye lands in the right place without being told.
            const latest = !end && i === feed.length - 1;
            // The three hero beats stay legible once passed — they are what the
            // presenter scrolls back to — but still yield to the live edge.
            const hero =
              item.kind === "block" || item.kind === "counterfeit" || item.kind === "approval";
            return (
              <div
                key={item.id}
                className={`transition-opacity duration-700 ${
                  latest ? "opacity-100" : hero ? "opacity-75" : "opacity-45"
                }`}
              >
                <Item
                  item={item}
                  mpnOf={mpnOf}
                  awaiting={awaitingApproval}
                  onApprove={onApprove}
                />
              </div>
            );
          })}

          {end ? <OutcomeCard end={end} /> : null}

          {/* headroom so the last card clears the bottom edge */}
          <div className="h-6" />
        </div>
      </div>
    </section>
  );
}

function Item({
  item,
  mpnOf,
  awaiting,
  onApprove,
}: {
  item: FeedItem;
  mpnOf: (id: string) => string | undefined;
  awaiting: boolean;
  onApprove: () => void;
}) {
  switch (item.kind) {
    case "message":
      return (
        <MessageCard agent={item.agent} role={item.role} text={item.text} plain={item.plain} />
      );

    case "tool":
      return <ToolEvidence item={item} />;

    case "block":
      return (
        <BlockCard
          candidateId={item.candidateId}
          mpn={mpnOf(item.candidateId)}
          reason={item.reason}
          plain={item.plain}
        />
      );

    case "counterfeit":
      return (
        <CounterfeitCard
          candidateId={item.candidateId}
          imageA={item.imageA}
          imageB={item.imageB}
          score={item.score}
          latencyMs={item.latencyMs}
          reason={item.reason}
          plain={item.plain}
        />
      );

    case "approval":
      return (
        <ApprovalGate
          summary={item.summary}
          savingsVsBroker={item.savingsVsBroker}
          granted={item.granted}
          grantedBy={item.grantedBy}
          plain={item.plain}
          pending={awaiting && !item.granted}
          onApprove={onApprove}
        />
      );

    case "po":
      return (
        <PoCard poNumber={item.poNumber} qty={item.qty} total={item.total} plain={item.plain} />
      );

    case "status":
      return (
        <StatusLine
          candidateId={item.candidateId}
          mpn={mpnOf(item.candidateId)}
          status={item.status}
          reason={item.reason}
          plain={item.plain}
        />
      );

    default:
      return <UnknownCard type={(item as any).type} payload={(item as any).payload ?? {}} />;
  }
}
