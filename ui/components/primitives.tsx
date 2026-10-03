import type { ReactNode } from "react";

/**
 * The plain-language subtitle. Non-negotiable: every beat that carries jargon
 * carries this underneath it. A judge who does not know what a QVL is
 * must still follow the run.
 */
export function Plain({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "block" | "approve" | "loud" }) {
  if (!children) return null;
  const tones = {
    default: "border-line-bright/60 text-dim",
    block: "border-block/50 text-[#FFC9C7]",
    approve: "border-approve/50 text-[#B6F2D4]",
    loud: "border-accent/50 text-[#F3D7B4]",
  } as const;
  return (
    <p className={`mt-2.5 border-l-2 pl-3 text-[0.9375rem] leading-[1.55] ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`label ${className}`}>{children}</div>;
}

const AGENT_TONE: Record<string, string> = {
  sourcing: "bg-[#1A2B33] text-[#8FD3E8] border-[#27454F]",
  engineering: "bg-[#2A2619] text-[#E0C98A] border-[#4A4228]",
  quality: "bg-[#231E2E] text-[#C3AEE8] border-[#3D3352]",
  market: "bg-[#1E2A23] text-[#9FD8B8] border-[#2E4536]",
  intake: "bg-[#23262A] text-[#AEB9BF] border-[#363C41]",
};

export function AgentBadge({ agent, role }: { agent: string; role: string }) {
  const tone = AGENT_TONE[agent] ?? "bg-hi text-dim border-line";
  return (
    <span
      className={`mono inline-flex shrink-0 items-center rounded border px-2 py-[3px] text-[0.6875rem] font-medium uppercase tracking-[0.14em] ${tone}`}
    >
      {role}
    </span>
  );
}

const TOOL_META: Record<string, { name: string; glyph: string }> = {
  tavily: { name: "Tavily", glyph: "◎" },
  moss: { name: "Moss", glyph: "▣" },
  entire: { name: "Entire", glyph: "⌘" },
  zoodata: { name: "ZooData", glyph: "⌸" },
};

export function toolMeta(tool: string) {
  return TOOL_META[tool] ?? { name: tool, glyph: "▪" };
}

/**
 * Measured on-device latency. These are real measurements from the MOSS track,
 * so they get typographic weight rather than a footnote.
 *
 * NOTE: this renders `latencyMs` — the match time — only. If an OCR path ever
 * lands, its `parseMs` is a separate multi-second server round trip and must
 * never be summed into this number or labelled as Moss latency.
 */
function fmtMs(ms: number) {
  if (ms < 1) return ms.toFixed(2);
  if (ms < 10) return Number(ms.toFixed(2)).toString();
  return Math.round(ms).toString();
}

export function Latency({ ms, size = "md" }: { ms?: number; size?: "md" | "lg" }) {
  if (ms == null || Number.isNaN(ms)) return null;
  const onDevice = ms < 10;
  if (size === "lg") {
    return (
      <div className="flex items-baseline gap-2">
        <span className="mono tnum text-[2.5rem] font-semibold leading-none text-accent">
          {fmtMs(ms)}
        </span>
        <span className="mono text-[1rem] leading-none text-accent-dim">ms</span>
        {onDevice && (
          <span className="mono ml-1 rounded-sm border border-accent/30 px-1.5 py-[2px] text-[0.625rem] uppercase tracking-[0.14em] text-accent/80">
            on-device
          </span>
        )}
      </div>
    );
  }
  return (
    <span className="mono tnum inline-flex items-baseline gap-1 rounded-sm border border-accent/25 bg-accent/[0.07] px-2 py-[2px]">
      <span className="text-[0.9375rem] font-semibold leading-none text-accent">{fmtMs(ms)}</span>
      <span className="text-[0.6875rem] leading-none text-accent-dim">ms</span>
    </span>
  );
}

export function ScoreBar({ score, tone = "neutral" }: { score: number; tone?: "neutral" | "block" | "approve" }) {
  const pct = Math.max(0, Math.min(1, score)) * 100;
  const bar =
    tone === "block" ? "bg-block" : tone === "approve" ? "bg-approve" : "bg-line-bright";
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-hi">
      <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Row({ k, v, mono = false }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[5px]">
      <span className="label">{k}</span>
      <span className={`text-data text-right ${mono ? "mono tnum text-ink" : "text-ink"}`}>{v}</span>
    </div>
  );
}
