"""Self-contained fixtures for the LINEDOWN Moss spike.

Two corpora:

1. PARTS    — DDR5 RDIMM modules across vendors, for cross-vendor equivalence
              (beat 3: "Moss decodes the part number, finds cross-vendor equivalents")
2. MARKINGS — DRAM top-marking / lot-code / date-code strings, for the counterfeit
              catch (beat 5). Includes one genuine reference and one remarked fake
              for the SAME module, which is what makes the side-by-side land.

No network, no keys, no files needed to read these.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# 1. Cross-vendor DDR5 RDIMM catalogue
# ---------------------------------------------------------------------------
# `spec_text` is what actually gets embedded. Equivalence between vendors is a
# SPEC question, not a string question: MTC20F2085S1RC48BA1 and
# M321R8GA0BB0-CQK share no substring but are the same module. So we index the
# decoded spec sentence alongside the MPN and let hybrid search do the rest.

PARTS = [
    {
        "mpn": "MTC20F2085S1RC48BA1",
        "vendor": "Micron",
        "specs": {
            "capacity": "64GB",
            "type": "DDR5 RDIMM",
            "speed": "4800 MT/s",
            "rank": "2Rx4",
            "cas": "CL40",
            "voltage": "1.1V",
            "ecc": "ECC Registered",
            "height": "31.25mm",
        },
        "pricePerUnit": 318.0,
        "leadTimeWeeks": 14,
        "qvl": True,
        "note": "Incumbent. Qualified on AI-SRV-G4. Allocation cut 40%.",
    },
    {
        "mpn": "M321R8GA0BB0-CQK",
        "vendor": "Samsung",
        "specs": {
            "capacity": "64GB",
            "type": "DDR5 RDIMM",
            "speed": "4800 MT/s",
            "rank": "2Rx4",
            "cas": "CL40",
            "voltage": "1.1V",
            "ecc": "ECC Registered",
            "height": "31.25mm",
        },
        "pricePerUnit": 341.0,
        "leadTimeWeeks": 6,
        "qvl": True,
        "note": "Drop-in equivalent. On platform QVL. The approvable alternate.",
    },
    {
        "mpn": "HMCG94MEBRA123N",
        "vendor": "SK hynix",
        "specs": {
            "capacity": "64GB",
            "type": "DDR5 RDIMM",
            "speed": "4800 MT/s",
            "rank": "2Rx4",
            "cas": "CL40",
            "voltage": "1.1V",
            "ecc": "ECC Registered",
            "height": "31.25mm",
        },
        "pricePerUnit": 329.0,
        "leadTimeWeeks": 9,
        "qvl": True,
        "note": "Equivalent, qualified, mid-price.",
    },
    {
        "mpn": "KSM48R40BD4TMM-64HMR",
        "vendor": "Kingston",
        "specs": {
            "capacity": "64GB",
            "type": "DDR5 RDIMM",
            "speed": "4800 MT/s",
            "rank": "2Rx4",
            "cas": "CL40",
            "voltage": "1.1V",
            "ecc": "ECC Registered",
            "height": "31.25mm",
        },
        "pricePerUnit": 274.0,
        "leadTimeWeeks": 2,
        "qvl": False,
        "note": "CHEAPEST + FASTEST. Not on AI-SRV-G4 QVL -> beat 4, the block.",
    },
    {
        "mpn": "AB64GR48C4-MBHJ",
        "vendor": "ATP / grey-market broker",
        "specs": {
            "capacity": "64GB",
            "type": "DDR5 RDIMM",
            "speed": "4800 MT/s",
            "rank": "2Rx4",
            "cas": "CL40",
            "voltage": "1.1V",
            "ecc": "ECC Registered",
            "height": "31.25mm",
        },
        "pricePerUnit": 198.0,
        "leadTimeWeeks": 1,
        "qvl": False,
        "note": "Too cheap, ships tomorrow, no traceability -> beat 5, the counterfeit.",
    },
    # --- Near misses. These SHOULD rank below the true equivalents. ---
    {
        "mpn": "MTC20F2085S1RC56BA1",
        "vendor": "Micron",
        "specs": {
            "capacity": "64GB",
            "type": "DDR5 RDIMM",
            "speed": "5600 MT/s",
            "rank": "2Rx4",
            "cas": "CL46",
            "voltage": "1.1V",
            "ecc": "ECC Registered",
            "height": "31.25mm",
        },
        "pricePerUnit": 402.0,
        "leadTimeWeeks": 12,
        "qvl": False,
        "note": "Faster bin. Downclocks, but not QVL'd at this speed. Near miss.",
    },
    {
        "mpn": "M321R4GA3BBbb-CQK",
        "vendor": "Samsung",
        "specs": {
            "capacity": "32GB",
            "type": "DDR5 RDIMM",
            "speed": "4800 MT/s",
            "rank": "1Rx4",
            "cas": "CL40",
            "voltage": "1.1V",
            "ecc": "ECC Registered",
            "height": "31.25mm",
        },
        "pricePerUnit": 176.0,
        "leadTimeWeeks": 4,
        "qvl": True,
        "note": "Half the capacity. Wrong DPC math. Near miss.",
    },
    {
        "mpn": "CT64G48C40U5",
        "vendor": "Crucial",
        "specs": {
            "capacity": "64GB",
            "type": "DDR5 UDIMM",
            "speed": "4800 MT/s",
            "rank": "2Rx8",
            "cas": "CL40",
            "voltage": "1.1V",
            "ecc": "non-ECC Unbuffered",
            "height": "31.25mm",
        },
        "pricePerUnit": 149.0,
        "leadTimeWeeks": 1,
        "qvl": False,
        "note": "UDIMM, non-ECC. Will not even POST in a server. Hard near miss.",
    },
]


def part_spec_text(part: dict) -> str:
    """The string we actually index for a module.

    We index the DECODED SPEC, not the raw part number. Two design choices,
    both of which exist because the naive version mis-ranked on the demo data:

    1. **Compound spec tokens** (`CAP64GB`, `SPD4800`, `FORMRDIMM`).
       A drop-in equivalent must match on capacity, form factor, speed bin,
       rank and ECC. As loose prose ("64GB DDR5 RDIMM 4800 MT/s 2Rx4") a
       speed mismatch costs one token out of twenty and a 5600-bin sibling
       beats a true cross-vendor equivalent. As one compound token it costs a
       whole dimension, which is what it actually costs in engineering.

    2. **No shared boilerplate.** "server memory module", voltage and height
       are identical across the catalogue, so they add similarity to every
       pair equally and only dilute the signal.

    The compound tokens carry NO delimiter -- `CAP64GB`, not `CAP_64GB` --
    because an underscore splits under most word tokenizers (including Moss's
    and our local one), which would silently turn each compound back into a
    shared prefix plus a value and undo the whole point.

    The MPN and vendor still ride along so a literal part-number lookup hits.
    """
    s = part["specs"]
    speed = s["speed"].split()[0]
    form = "UDIMM" if "UDIMM" in s["type"] else "RDIMM"
    ecc = "ECCREG" if "Registered" in s["ecc"] else "NONECCUNBUF"

    spec_tokens = " ".join(
        [
            f"CAP{s['capacity']}",
            f"FORM{form}",
            f"SPD{speed}",
            f"RANK{s['rank'].upper().replace('X', 'X')}",
            ecc,
            f"CAS{s['cas'].replace('CL', '')}",
        ]
    )
    return f"{part['mpn']} VENDOR{part['vendor'].split()[0].upper()} {spec_tokens}"


# ---------------------------------------------------------------------------
# 2. DRAM top-marking corpus  (the counterfeit catch)
# ---------------------------------------------------------------------------
# These are the laser-etched strings on the DRAM dice and the module label:
#   <component part marking> <FBGA code> <lot code> <date code> <origin>
#
# The fake is a REMARK of the Samsung module: sanded top, re-lasered to claim
# -CQK 4800. Three tells, all visible in the string:
#   * FBGA code belongs to a different die than the claimed part
#   * lot code is 7 chars where Samsung uses 8
#   * date code 2402 predates the claimed part's production ramp
#
# `thumbnail` maps straight onto moss.matches[].thumbnail and
# counterfeit.flagged imageA/imageB. Paths are owned by the DATA/UI tracks;
# they are relative so nothing breaks if the files are not there yet.

MARKINGS = [
    {
        "id": "mark-samsung-genuine",
        "label": "Samsung M321R8GA0BB0-CQK — genuine reference",
        "mpn": "M321R8GA0BB0-CQK",
        "vendor": "Samsung",
        "kind": "known_good",
        "thumbnail": "data/markings/samsung-cqk-genuine.jpg",
        "marking": "SAMSUNG 964 M321R8GA0BB0-CQK K4RAH086VB-BCQK SEC 2514 GTP6902H MADE IN KOREA 64GB 2Rx4 PC5-4800B-RB0-1010-XT",
    },
    {
        "id": "mark-samsung-remarked",
        "label": "Broker unit — REMARKED, claims -CQK",
        "mpn": "M321R8GA0BB0-CQK",
        "vendor": "unknown (broker)",
        "kind": "known_counterfeit",
        "thumbnail": "data/markings/broker-unit-remarked.jpg",
        "marking": "SAMSUNG 964 M321R8GA0BB0-CQK K4RAH086VB-BCPB SEC 2402 GTP690 MADE IN KOREA 64GB 2Rx4 PC5-4800B-RB0-1010-XT",
        "tells": [
            "FBGA die code BCPB is a 4000 MT/s die, not the BCQK 4800 die the label claims",
            "lot code GTP690 is 6 chars; Samsung lot codes are 8",
            "date code 2514 -> 2402: module label newer than the dice on it",
        ],
    },
    {
        "id": "mark-micron-genuine",
        "label": "Micron MTC20F2085S1RC48BA1 — genuine reference",
        "mpn": "MTC20F2085S1RC48BA1",
        "vendor": "Micron",
        "kind": "known_good",
        "thumbnail": "data/markings/micron-48ba1-genuine.jpg",
        "marking": "MICRON MTC20F2085S1RC48BA1 MT60B2G8HB-48B:B D8BQK NS2447 IDG 64GB 2Rx4 PC5-4800B TAIWAN",
    },
    {
        "id": "mark-hynix-genuine",
        "label": "SK hynix HMCG94MEBRA123N — genuine reference",
        "mpn": "HMCG94MEBRA123N",
        "vendor": "SK hynix",
        "kind": "known_good",
        "thumbnail": "data/markings/hynix-a123n-genuine.jpg",
        "marking": "SK hynix HMCG94MEBRA123N H5CG48MEBDX014 648A 64GB 2Rx4 PC5-4800B-RR2-1010 KOREA",
    },
    {
        "id": "mark-kingston-genuine",
        "label": "Kingston KSM48R40BD4TMM-64HMR — genuine reference",
        "mpn": "KSM48R40BD4TMM-64HMR",
        "vendor": "Kingston",
        "kind": "known_good",
        "thumbnail": "data/markings/kingston-64hmr-genuine.jpg",
        "marking": "KINGSTON KSM48R40BD4TMM-64HMR 9965745-016.A00G 64GB 2Rx4 PC5-4800B-RR2 CSX2448 ASSEMBLED IN USA",
    },
    {
        "id": "mark-known-fake-pool",
        "label": "Known-bad pool — sanded-and-relasered Micron clone",
        "mpn": "MTC20F2085S1RC48BA1",
        "vendor": "unknown (seized lot)",
        "kind": "known_counterfeit",
        "thumbnail": "data/markings/micron-clone-sanded.jpg",
        "marking": "MICRON MTC20F2085S1RC48BA1 MT60B2G8HB-48B:B D8BPK NS2301 IDG 64GB 2Rx4 PC5-4800B CHINA",
        "tells": [
            "D8BPK is a 4000 MT/s FBGA code wearing a 4800 part number",
            "origin CHINA; Micron marks this line TAIWAN",
        ],
    },
]


def marking_doc_text(m: dict) -> str:
    """Indexed text for a marking. The raw etched string plus its provenance."""
    return f"{m['marking']} | {m['vendor']} | {m['kind']}"


# The photo the presenter "takes" on stage. See `matchMarking` in
# moss_partmatch.py: an image path resolves to its marking text via a sidecar
# .txt, or via this table when the fixture is already known.
IMAGE_SIDECAR_FALLBACK = {
    "data/markings/broker-unit-remarked.jpg": MARKINGS[1]["marking"],
    "data/markings/samsung-cqk-genuine.jpg": MARKINGS[0]["marking"],
    "data/markings/micron-48ba1-genuine.jpg": MARKINGS[2]["marking"],
}
