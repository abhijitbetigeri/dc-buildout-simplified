import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep neutral industrial surface. Cool-grey, not blue, not purple.
        base: "#0A0C0D",
        surface: "#121517",
        raised: "#191D20",
        hi: "#20262A",
        line: "#2B3236",
        "line-bright": "#3A4348",
        ink: "#EDF0F1",
        dim: "#9AA5AB",
        faint: "#6B767C",
        // ONE accent — the money counter and nothing structural.
        accent: "#F0A14B",
        "accent-dim": "#8A5C28",
        // RESERVED. Only block / approve.
        block: "#FF4A47",
        "block-deep": "#2E1012",
        approve: "#3FD98B",
        "approve-deep": "#0C2A1E",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Sized generously — this is read from across a room.
        "data-sm": ["0.8125rem", { lineHeight: "1.1rem", letterSpacing: "0.02em" }],
        "data": ["0.9375rem", { lineHeight: "1.3rem", letterSpacing: "0.01em" }],
      },
      keyframes: {
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slam": {
          "0%": { opacity: "0", transform: "scale(1.04)" },
          "55%": { opacity: "1", transform: "scale(0.995)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-block": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(255,74,71,0.0)" },
          "50%": { boxShadow: "0 0 0 6px rgba(255,74,71,0.10)" },
        },
        "breathe": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
      },
      animation: {
        "slide-in": "slide-in 260ms cubic-bezier(0.16,1,0.3,1) both",
        "slam": "slam 420ms cubic-bezier(0.2,1.4,0.4,1) both",
        "pulse-block": "pulse-block 2.2s ease-in-out infinite",
        "breathe": "breathe 1.6s ease-in-out infinite",
        "scan": "scan 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
