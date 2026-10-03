import type { ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";

/**
 * LANDING primitives.
 *
 * Deliberately self-contained. These render only on /landing and must never be
 * imported by the demo. Every colour used here is an existing token from
 * tailwind.config.ts (base / surface / raised / line / ink / dim / faint /
 * accent / block / approve) — nothing new is defined globally, because the
 * demo's theme is frozen.
 */

/* ------------------------------------------------------------------ layout */

export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`border-t border-line/70 ${className}`}>
      <div className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        {children}
      </div>
    </section>
  );
}

export function Eyebrow({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  return (
    <p className={`mono text-[0.6875rem] uppercase tracking-[0.26em] ${TONE_TEXT[tone]}`}>
      {children}
    </p>
  );
}

export function Heading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`mt-4 text-[1.75rem] font-semibold leading-[1.14] tracking-[-0.02em] text-ink sm:text-[2.25rem] ${className}`}
    >
      {children}
    </h2>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 max-w-[62ch] text-[1.0625rem] leading-[1.6] text-dim sm:text-[1.125rem]">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------- tones */

type Tone = "default" | "accent" | "block" | "approve";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-faint",
  accent: "text-accent",
  block: "text-block",
  approve: "text-approve",
};

const TONE_EDGE: Record<Tone, string> = {
  default: "border-line",
  accent: "border-accent/40",
  block: "border-block/50",
  approve: "border-approve/45",
};

/* ------------------------------------------------------------------ pieces */

export function Mono({ children }: { children: ReactNode }) {
  return <span className="mono tnum text-ink">{children}</span>;
}

/** A number that has to carry across a room. */
export function Figure({
  value,
  unit,
  label,
  tone = "default",
  size = "md",
}: {
  value: string;
  unit?: string;
  label: string;
  tone?: Tone;
  size?: "md" | "lg";
}) {
  return (
    <div className={`border-l-2 pl-4 ${TONE_EDGE[tone]}`}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`mono tnum font-semibold leading-none tracking-[-0.02em] ${TONE_TEXT[tone] === "text-faint" ? "text-ink" : TONE_TEXT[tone]} ${
            size === "lg"
              ? "text-[2.5rem] sm:text-[3.25rem]"
              : "text-[1.75rem] sm:text-[2.125rem]"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="mono text-[0.875rem] leading-none text-faint">{unit}</span>
        )}
      </div>
      <p className="mono mt-3 text-[0.6875rem] uppercase leading-[1.5] tracking-[0.16em] text-faint">
        {label}
      </p>
    </div>
  );
}

export function Card({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const edge =
    tone === "block"
      ? "border-block/40 bg-block-deep/40"
      : tone === "approve"
        ? "border-approve/35 bg-approve-deep/40"
        : tone === "accent"
          ? "border-accent/30 bg-accent/[0.04]"
          : "border-line bg-surface";
  return <div className={`rounded-md border ${edge} ${className}`}>{children}</div>;
}

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  const style =
    tone === "block"
      ? "border-block/50 text-block"
      : tone === "approve"
        ? "border-approve/50 text-approve"
        : tone === "accent"
          ? "border-accent/40 text-accent"
          : "border-line-bright text-dim";
  return (
    <span
      className={`mono inline-flex items-center rounded-sm border px-2 py-[3px] text-[0.625rem] uppercase tracking-[0.16em] ${style}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- screenshots */

/**
 * A screenshot of the real demo. These are the strongest asset on the page, so
 * they get a full-width frame, a caption that says what you are looking at, and
 * no decorative chrome competing with them.
 */
export function Shot({
  src,
  alt,
  caption,
  priority = false,
  tone = "default",
}: {
  src: StaticImageData;
  alt: string;
  caption: ReactNode;
  priority?: boolean;
  tone?: Tone;
}) {
  const ring =
    tone === "block"
      ? "border-block/35"
      : tone === "approve"
        ? "border-approve/30"
        : "border-line";
  return (
    <figure className="min-w-0">
      {/* Opens the full-resolution frame — these are dense boards and attendees
          will be reading them on a phone. */}
      <a
        href={src.src}
        target="_blank"
        rel="noreferrer"
        className={`group block overflow-hidden rounded-md border bg-base ${ring}`}
      >
        <Image
          src={src}
          alt={alt}
          placeholder="blur"
          priority={priority}
          sizes="(max-width: 1120px) 100vw, 1056px"
          className="block h-auto w-full"
        />
      </a>
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.875rem] leading-[1.55] text-faint">
        {caption}
        <span className="mono whitespace-nowrap text-[0.6875rem] uppercase tracking-[0.14em] text-line-bright">
          Tap to enlarge
        </span>
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------- beat */

export function Beat({
  n,
  title,
  children,
  tone = "default",
}: {
  n: string;
  title: string;
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <li className={`relative border-l pl-5 sm:pl-6 ${TONE_EDGE[tone]}`}>
      <span
        className={`mono absolute -left-[1px] top-0 -translate-x-1/2 rounded-full border px-1.5 py-[1px] text-[0.625rem] tracking-[0.1em] ${TONE_EDGE[tone]} bg-base ${TONE_TEXT[tone]}`}
      >
        {n}
      </span>
      <h3 className="text-[1.0625rem] font-semibold leading-snug text-ink">{title}</h3>
      <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-[1.6] text-dim">{children}</p>
    </li>
  );
}

/* ------------------------------------------------------------------- stack */

export function StackRow({
  name,
  role,
  children,
  caveat,
}: {
  name: string;
  role: string;
  children: ReactNode;
  caveat?: ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-3 border-t border-line py-7 sm:grid-cols-[200px_minmax(0,1fr)]">
      <div>
        <p className="mono text-[1.0625rem] font-semibold tracking-[0.02em] text-ink">{name}</p>
        <p className="mono mt-1.5 text-[0.6875rem] uppercase tracking-[0.16em] text-faint">
          {role}
        </p>
      </div>
      <div className="min-w-0">
        <p className="max-w-[68ch] text-[0.9375rem] leading-[1.65] text-dim">{children}</p>
        {caveat && (
          <p className="mt-3 max-w-[68ch] border-l-2 border-accent/40 pl-3 text-[0.875rem] leading-[1.6] text-[#C9A878]">
            {caveat}
          </p>
        )}
      </div>
    </div>
  );
}
