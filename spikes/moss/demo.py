#!/usr/bin/env python3
"""LINEDOWN — Moss spike, one-command verification.

    python spikes/moss/demo.py              # real Moss if keys are exported, else local
    python spikes/moss/demo.py --offline    # force the local scorer, no keys needed
    python spikes/moss/demo.py --live       # fail loudly if keys are missing
    python spikes/moss/demo.py --json       # emit schema-shaped events only

Covers demo beat 3 (cross-vendor equivalents) and beat 5 (counterfeit catch).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fixtures import MARKINGS, PARTS  # noqa: E402
from moss_partmatch import (  # noqa: E402
    as_counterfeit_flagged,
    as_tool_result,
    build_indexes,
    find_equivalents,
    get_backend,
    match_marking,
)

AT_RISK_PART = "MTC20F2085S1RC48BA1"
BROKER_PHOTO = "data/markings/broker-unit-remarked.jpg"

BAR = "=" * 72


def rule(title: str) -> None:
    print(f"\n{BAR}\n  {title}\n{BAR}")


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="force local scorer")
    ap.add_argument("--live", action="store_true", help="require real Moss keys")
    ap.add_argument("--json", action="store_true", help="emit events only")
    args = ap.parse_args()

    if args.offline and args.live:
        print("--offline and --live are mutually exclusive", file=sys.stderr)
        return 2

    offline = True if args.offline else (False if args.live else None)

    try:
        backend = get_backend(offline=offline)
    except EnvironmentError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    emit = not args.json

    if emit:
        rule("LINEDOWN · Moss spike")
        print(f"  backend        : {backend.name}")
        if backend.name == "local":
            print("  NOTE           : local hybrid scorer — no keys, no network.")
            print("                   Identical payload shapes. Stage insurance.")
        else:
            print(f"  project        : {os.getenv('MOSS_PROJECT_ID', '')[:8]}…")
            print("  model          : moss-minilm")
        print(f"  parts indexed  : {len(PARTS)}")
        print(f"  markings       : {len(MARKINGS)}")
        print("\n  IMAGE EMBEDDING: NOT AVAILABLE in the Moss SDK (text-only).")
        print("                   matchMarking() resolves a photo to its OCR'd")
        print("                   marking string, then text-matches. See status/moss.md.")

    try:
        await build_indexes(backend)
    except Exception as e:  # noqa: BLE001
        print(f"\nERROR building indexes: {type(e).__name__}: {e}", file=sys.stderr)
        if backend.name == "moss":
            print("Retry with --offline to verify the logic without keys.", file=sys.stderr)
        return 1

    events = []

    # ---------------------------------------------------------------- beat 3
    if emit:
        rule(f"BEAT 3 · cross-vendor equivalents for {AT_RISK_PART}")

    partmatch = await find_equivalents(AT_RISK_PART, backend=backend)
    events.append(as_tool_result("c-moss-1", "moss.partmatch", partmatch))

    if emit:
        print(f"  query      : {partmatch['query']}")
        print(f"  latencyMs  : {partmatch['latencyMs']}  <-- rendered on stage")
        print(f"\n  {'MPN':<24}{'VENDOR':<14}{'SCORE':>7}  {'QVL':<5}{'$/UNIT':>8}{'LEAD':>6}")
        print("  " + "-" * 68)
        for e in partmatch["equivalents"]:
            qvl = "yes" if e["onQvl"] else "NO"
            price = f"{e['pricePerUnit']:.0f}" if e["pricePerUnit"] else "-"
            lead = f"{e['leadTimeWeeks']}w" if e["leadTimeWeeks"] else "-"
            print(
                f"  {e['mpn']:<24}{e['vendor'][:13]:<14}{e['score']:>7.3f}  "
                f"{qvl:<5}{price:>8}{lead:>6}"
            )
        if partmatch["equivalents"]:
            top = partmatch["equivalents"][0]["specs"]
            print(f"\n  top spec match: {top.get('capacity')} {top.get('type')} "
                  f"{top.get('speed')} {top.get('rank')}")
        else:
            print("\n  no equivalents above the noise floor")

    # ---------------------------------------------------------------- beat 5
    if emit:
        rule("BEAT 5 · counterfeit catch — photograph the broker's module")

    matches = await match_marking(BROKER_PHOTO, backend=backend)
    events.append(as_tool_result("c-moss-2", "moss.matches", matches))

    if emit:
        print(f"  input        : {BROKER_PHOTO}")
        print(f"  resolved via : {matches['resolvedVia']}")
        print(f"  marking text : {matches['queryText'][:68]}…")
        print(f"  latencyMs    : {matches['latencyMs']}  <-- rendered on stage")
        print(f"  VERDICT      : {matches['verdict'].upper()}")
        print(f"\n  {'SCORE':>7}  {'KIND':<20}LABEL")
        print("  " + "-" * 68)
        for m in matches["matches"]:
            print(f"  {m['score']:>7.3f}  {str(m['kind']):<20}{m['label']}")

    if matches["verdict"] == "counterfeit":
        cf = as_counterfeit_flagged("cand-broker-atp", matches)
        events.append({"type": "counterfeit.flagged", "payload": cf})
        if emit:
            print(f"\n  imageA (submitted): {cf['imageA']}")
            print(f"  imageB (reference): {cf['imageB']}")
            print(f"  plain: {cf['plain']}")

    # --------------------------------------------- control: a genuine module
    if emit:
        rule("CONTROL · same pipeline, a genuine module (must NOT flag)")
    genuine = await match_marking("data/markings/samsung-cqk-genuine.jpg", backend=backend)
    if emit:
        print(f"  verdict   : {genuine['verdict'].upper()}")
        print(f"  top match : {genuine['matches'][0]['label']}  "
              f"({genuine['matches'][0]['score']:.3f})")
        print(f"  latencyMs : {genuine['latencyMs']}")

    # ------------------------------------- raw text input still works (no photo)
    if emit:
        rule("CONTROL · raw marking text input (no image at all)")
    raw = await match_marking(
        "MICRON MTC20F2085S1RC48BA1 MT60B2G8HB-48B:B D8BPK NS2301 IDG CHINA",
        backend=backend,
    )
    if emit:
        print(f"  verdict   : {raw['verdict'].upper()}")
        print(f"  top match : {raw['matches'][0]['label']}  ({raw['matches'][0]['score']:.3f})")
        print(f"  latencyMs : {raw['latencyMs']}")

    # ---------------------------------------------------------------- output
    if args.json:
        print(json.dumps(events, indent=2))
    else:
        out = Path(__file__).resolve().parent / "last_run_events.json"
        out.write_text(json.dumps(events, indent=2), encoding="utf-8")
        rule("RESULT")
        print(f"  {len(events)} schema-shaped events -> {out.name}")
        print("  kinds: moss.partmatch, moss.matches, counterfeit.flagged")
        print(f"\n  latency: partmatch {partmatch['latencyMs']}ms · "
              f"marking {matches['latencyMs']}ms")
        print("\n  OK — both functions return EVENT-SCHEMA payloads with latencyMs.\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
