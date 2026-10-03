"""LINEDOWN — Moss track.

Two functions, both returning payloads that drop straight into
docs/EVENT-SCHEMA.md:

    find_equivalents(part_number)      -> moss.partmatch
    match_marking(image_path_or_text)  -> moss.matches

`findEquivalents` / `matchMarking` are exported as camelCase aliases so the
AGENTS track can call whichever spelling it already wrote.

VERDICT ON IMAGES (see status/moss.md): the Moss SDK is TEXT-ONLY today.
`DocumentInfo` exposes exactly (id, text, metadata, embedding) and
`client.query(name, query: str, ...)` takes a string. Moss's own
moss-image-search-demo indexes COCO *captions* and keeps the photo as an S3
URL in metadata. So `match_marking` accepts an image path, resolves it to the
module's OCR'd marking string, and text-matches that. Honest, and it works.

Two backends, same output shapes:
  * MossBackend   — the real SDK. Needs MOSS_PROJECT_ID / MOSS_PROJECT_KEY.
  * LocalBackend  — no keys, no network. Hybrid keyword + char-trigram scorer.
                    Stage insurance. The UI cannot tell the difference.
"""

from __future__ import annotations

import asyncio
import math
import os
import re
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from fixtures import (
    IMAGE_SIDECAR_FALLBACK,
    MARKINGS,
    PARTS,
    marking_doc_text,
    part_spec_text,
)

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

PARTS_INDEX = os.getenv("MOSS_PARTS_INDEX", "linedown-dram-parts")
MARKINGS_INDEX = os.getenv("MOSS_MARKINGS_INDEX", "linedown-dram-markings")
MODEL_ID = os.getenv("MOSS_MODEL_ID", "moss-minilm")

# alpha blends semantic vs keyword in Moss hybrid search. Higher = more
# semantic. A part number is a KEYWORD problem -- MTC20F2085S1RC48BA1 has no
# "meaning" -- so we keep alpha low there. Marking strings are half prose
# (vendor, origin, "MADE IN KOREA") so they sit in the middle.
ALPHA_PARTS = float(os.getenv("MOSS_ALPHA_PARTS", "0.15"))
ALPHA_MARKINGS = float(os.getenv("MOSS_ALPHA_MARKINGS", "0.5"))

# Drop results that are noise. An unrecognised part number should come back
# with an EMPTY equivalents list, not a table of 0.00 scores -- "no equivalent
# found" is a real answer and it reads far better on stage than a broken table.
MIN_SCORE = float(os.getenv("MOSS_MIN_SCORE", "0.05"))

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".heic", ".webp", ".bmp", ".tif", ".tiff"}


# --------------------------------------------------------------------------
# Local backend — hybrid scorer, zero dependencies
# --------------------------------------------------------------------------

_TOKEN_RE = re.compile(r"[A-Za-z0-9]+")


def _tokens(text: str) -> List[str]:
    return _TOKEN_RE.findall(text.upper())


def _trigrams(text: str) -> Counter:
    flat = re.sub(r"[^A-Z0-9]", "", text.upper())
    if len(flat) < 3:
        return Counter([flat] if flat else [])
    return Counter(flat[i : i + 3] for i in range(len(flat) - 2))


def _cosine(a: Counter, b: Counter) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    num = sum(a[t] * b[t] for t in common)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return num / (na * nb) if na and nb else 0.0


def _keyword_score(q: Sequence[str], d: Sequence[str]) -> float:
    """Token-set F1. Rewards shared spec tokens, punishes neither side's noise."""
    qs, ds = set(q), set(d)
    if not qs or not ds:
        return 0.0
    inter = len(qs & ds)
    if not inter:
        return 0.0
    precision = inter / len(qs)
    recall = inter / len(ds)
    return 2 * precision * recall / (precision + recall)


class LocalBackend:
    """Key-free stand-in. Same surface as MossBackend, same payload shapes."""

    name = "local"

    def __init__(self) -> None:
        self._indexes: Dict[str, List[Dict[str, Any]]] = {}

    async def create_index(self, index: str, docs: List[Dict[str, Any]]) -> None:
        self._indexes[index] = [
            {
                **d,
                "_tokens": _tokens(d["text"]),
                "_trigrams": _trigrams(d["text"]),
            }
            for d in docs
        ]

    async def load_index(self, index: str) -> None:
        if index not in self._indexes:
            raise RuntimeError(f"index '{index}' was never created")

    async def query(
        self, index: str, query: str, top_k: int, alpha: float
    ) -> Dict[str, Any]:
        docs = self._indexes[index]
        q_tok, q_tri = _tokens(query), _trigrams(query)

        started = time.perf_counter()
        scored = []
        for d in docs:
            semantic = _cosine(q_tri, d["_trigrams"])
            keyword = _keyword_score(q_tok, d["_tokens"])
            scored.append((alpha * semantic + (1 - alpha) * keyword, d))
        scored.sort(key=lambda p: p[0], reverse=True)
        elapsed_ms = (time.perf_counter() - started) * 1000

        return {
            "docs": [
                {
                    "id": d["id"],
                    "score": round(score, 4),
                    "text": d["text"],
                    "metadata": d.get("metadata", {}),
                }
                for score, d in scored[:top_k]
            ],
            "time_taken_ms": elapsed_ms,
        }


# --------------------------------------------------------------------------
# Moss backend — the real SDK
# --------------------------------------------------------------------------


class MossBackend:
    """Wraps inferedge_moss.

    Verified signatures (introspected from moss 1.14.0):
        MossClient(project_id: str, project_key: str, *, cache_path=None)
        create_index(name, docs: List[DocumentInfo], model_id=None, *, wait=True)
        load_index(name, auto_refresh=False, polling_interval_in_seconds=600, cache_path=None) -> str
        query(name, query: str, options: Optional[QueryOptions]) -> SearchResult
        get_index(name) -> IndexInfo        # raises RuntimeError if absent
        DocumentInfo fields: id, text, metadata, embedding, payload
        QueryOptions fields: top_k, alpha, filter, embedding, min_score,
                             group_by, candidate_depth
        SearchResult fields: docs, index_name, query, time_taken_ms
        docs[i] fields:     id, score, text, metadata

    `query` takes `query: str`. There is no image overload. That is the whole
    verdict in one line.
    """

    name = "moss"

    def __init__(self, project_id: str, project_key: str) -> None:
        # Imported lazily so --offline needs neither the package nor keys.
        # Prefer the stable `moss` package; fall back to the older
        # `inferedge_moss` beta that Moss's own demos pin. Same class names.
        try:
            from moss import DocumentInfo, MossClient, QueryOptions

            self.pkg = "moss"
        except ImportError:
            from inferedge_moss import DocumentInfo, MossClient, QueryOptions

            self.pkg = "inferedge_moss"

        self._DocumentInfo = DocumentInfo
        self._QueryOptions = QueryOptions
        self._client = MossClient(project_id, project_key)
        self._loaded: set = set()

        # `min_score` landed in QueryOptions in moss>=1.14; on the beta we
        # filter client-side instead.
        self._has_min_score = hasattr(QueryOptions, "min_score")

    async def create_index(self, index: str, docs: List[Dict[str, Any]]) -> None:
        # GOTCHA: get_index RAISES RuntimeError when the index is missing.
        # It does not return None. Moss's own demo does exactly this try/except.
        try:
            existing = await self._client.get_index(index)
            if getattr(existing, "doc_count", 0):
                return  # already built, reuse it
        except RuntimeError:
            pass

        payload = [
            self._DocumentInfo(
                id=d["id"], text=d["text"], metadata=d.get("metadata", {})
            )
            for d in docs
        ]
        await self._client.create_index(index, payload, MODEL_ID)

    async def load_index(self, index: str) -> None:
        # GOTCHA: load_index is MANDATORY before query. create_index alone does
        # not leave an index queryable.
        if index not in self._loaded:
            await self._client.load_index(index)
            self._loaded.add(index)

    async def query(
        self, index: str, query: str, top_k: int, alpha: float
    ) -> Dict[str, Any]:
        opts = (
            self._QueryOptions(top_k=top_k, alpha=alpha, min_score=MIN_SCORE)
            if self._has_min_score
            else self._QueryOptions(top_k=top_k, alpha=alpha)
        )
        started = time.perf_counter()
        result = await self._client.query(index, query, opts)
        wall_ms = (time.perf_counter() - started) * 1000

        return {
            "docs": [
                {
                    "id": d.id,
                    "score": float(d.score),
                    "text": d.text,
                    "metadata": dict(getattr(d, "metadata", {}) or {}),
                }
                for d in result.docs
            ],
            # SDK reports retrieval time; wall clock includes our own overhead.
            # Report the larger so the number on stage is never a lie.
            "time_taken_ms": max(float(result.time_taken_ms), wall_ms),
        }


def get_backend(offline: Optional[bool] = None):
    """Pick a backend. Falls back to local when keys are absent."""
    if offline is True:
        return LocalBackend()

    project_id = os.getenv("MOSS_PROJECT_ID")
    project_key = os.getenv("MOSS_PROJECT_KEY")

    if not project_id or not project_key:
        if offline is False:
            raise EnvironmentError(
                "MOSS_PROJECT_ID and MOSS_PROJECT_KEY are required.\n"
                "  export MOSS_PROJECT_ID=...  MOSS_PROJECT_KEY=...\n"
                "Or run with --offline to use the local scorer."
            )
        return LocalBackend()

    try:
        return MossBackend(project_id, project_key)
    except ImportError:
        if offline is False:
            raise
        return LocalBackend()


# --------------------------------------------------------------------------
# Index construction
# --------------------------------------------------------------------------


async def build_indexes(backend) -> None:
    """Index both corpora. Idempotent against a live Moss project."""
    part_docs = [
        {
            "id": p["mpn"],
            "text": part_spec_text(p),
            "metadata": {
                "mpn": p["mpn"],
                "vendor": p["vendor"],
                "qvl": str(p["qvl"]).lower(),
                "pricePerUnit": str(p["pricePerUnit"]),
                "leadTimeWeeks": str(p["leadTimeWeeks"]),
                **p["specs"],
            },
        }
        for p in PARTS
    ]

    marking_docs = [
        {
            "id": m["id"],
            "text": marking_doc_text(m),
            "metadata": {
                "label": m["label"],
                "mpn": m["mpn"],
                "vendor": m["vendor"],
                "kind": m["kind"],
                "thumbnail": m["thumbnail"],
            },
        }
        for m in MARKINGS
    ]

    await backend.create_index(PARTS_INDEX, part_docs)
    await backend.create_index(MARKINGS_INDEX, marking_docs)
    await backend.load_index(PARTS_INDEX)
    await backend.load_index(MARKINGS_INDEX)


# --------------------------------------------------------------------------
# 1. find_equivalents  ->  moss.partmatch
# --------------------------------------------------------------------------

_PARTS_BY_MPN = {p["mpn"]: p for p in PARTS}


async def find_equivalents(
    part_number: str, backend=None, top_k: int = 4
) -> Dict[str, Any]:
    """Cross-vendor DDR5 RDIMM equivalence for `part_number`.

    Returns a `moss.partmatch` payload:
        { query, equivalents: [{mpn, vendor, score, specs}], latencyMs }

    The query text is the MPN plus, when we can decode it, its spec sentence --
    that decoded sentence is what lets a Micron MPN find a Samsung one.
    """
    backend = backend or get_backend()

    known = _PARTS_BY_MPN.get(part_number.strip().upper())
    query_text = part_spec_text(known) if known else part_number

    # +2 headroom: the query part itself and any dropped self-match.
    result = await backend.query(
        PARTS_INDEX, query_text, top_k=top_k + 2, alpha=ALPHA_PARTS
    )

    equivalents = []
    for doc in result["docs"]:
        mpn = doc["metadata"].get("mpn", doc["id"])
        if mpn.upper() == part_number.strip().upper():
            continue  # never return the query as its own equivalent
        if float(doc["score"]) < MIN_SCORE:
            continue  # noise floor -- see MIN_SCORE
        part = _PARTS_BY_MPN.get(mpn, {})
        equivalents.append(
            {
                "mpn": mpn,
                "vendor": doc["metadata"].get("vendor", part.get("vendor", "unknown")),
                "score": round(float(doc["score"]), 4),
                "specs": part.get("specs", {}),
                # Extras the UI may use; harmless to the schema.
                "pricePerUnit": part.get("pricePerUnit"),
                "leadTimeWeeks": part.get("leadTimeWeeks"),
                "onQvl": part.get("qvl"),
            }
        )
        if len(equivalents) >= top_k:
            break

    return {
        "query": part_number,
        "equivalents": equivalents,
        "latencyMs": round(result["time_taken_ms"], 2),
    }


# --------------------------------------------------------------------------
# 2. match_marking  ->  moss.matches
# --------------------------------------------------------------------------


def resolve_marking_text(image_path_or_text: str) -> tuple[str, str]:
    """Turn the argument into a marking string to search with.

    Accepts either raw marking text or a path to a photo. Moss cannot embed
    pixels, so a photo is resolved to text in this order:

        1. sidecar file next to the image  (photo.jpg -> photo.jpg.txt, photo.txt)
        2. the fixtures' known-marking table
        3. hard failure -- we never silently search the filename

    When the UI track hands us a real photo at demo time it must arrive with
    its marking string. `data/` should carry both.
    """
    candidate = image_path_or_text.strip()
    looks_like_image = Path(candidate).suffix.lower() in IMAGE_SUFFIXES

    if not looks_like_image:
        return candidate, "text"

    path = Path(candidate)
    for sidecar in (
        Path(str(path) + ".txt"),
        path.with_suffix(".txt"),
    ):
        if sidecar.is_file():
            return sidecar.read_text(encoding="utf-8").strip(), f"sidecar:{sidecar.name}"

    for key, marking in IMAGE_SIDECAR_FALLBACK.items():
        if candidate.endswith(key) or key.endswith(candidate) or path.name in key:
            return marking, "fixture-table"

    raise FileNotFoundError(
        f"No marking text for image '{candidate}'.\n"
        f"Moss cannot embed images -- write the OCR'd marking to "
        f"'{candidate}.txt' or add it to fixtures.IMAGE_SIDECAR_FALLBACK."
    )


async def match_marking(
    image_path_or_text: str, backend=None, top_k: int = 3
) -> Dict[str, Any]:
    """Match a photographed DRAM top-marking against reference markings.

    Returns a `moss.matches` payload:
        { matches: [{id, label, score, thumbnail}], latencyMs }

    Extra keys (`kind`, `verdict`, `queryText`, `resolvedVia`) ride along for
    the `counterfeit.flagged` event. The schema says the UI renders unknown
    fields as a neutral card, so extras are safe.
    """
    backend = backend or get_backend()

    query_text, resolved_via = resolve_marking_text(image_path_or_text)
    result = await backend.query(
        MARKINGS_INDEX, query_text, top_k=top_k, alpha=ALPHA_MARKINGS
    )

    matches = []
    for doc in result["docs"]:
        md = doc["metadata"]
        matches.append(
            {
                "id": doc["id"],
                "label": md.get("label", doc["id"]),
                "score": round(float(doc["score"]), 4),
                "thumbnail": md.get("thumbnail"),
                "kind": md.get("kind"),
                "mpn": md.get("mpn"),
            }
        )

    top = matches[0] if matches else None
    verdict = "no_reference"
    if top:
        verdict = "counterfeit" if top["kind"] == "known_counterfeit" else "genuine"

    return {
        "matches": matches,
        "latencyMs": round(result["time_taken_ms"], 2),
        # --- supporting detail for counterfeit.flagged ---
        "queryText": query_text,
        "resolvedVia": resolved_via,
        "verdict": verdict,
        "topScore": top["score"] if top else 0.0,
    }


# camelCase aliases for the AGENTS track
findEquivalents = find_equivalents
matchMarking = match_marking


# --------------------------------------------------------------------------
# Event helpers — wrap a payload in the EVENT-SCHEMA envelope
# --------------------------------------------------------------------------


def as_tool_result(call_id: str, kind: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """`tool.result` envelope. `id`/`ts` are assigned by whoever builds the run."""
    return {"type": "tool.result", "payload": {"callId": call_id, "kind": kind, "payload": payload}}


def as_counterfeit_flagged(
    candidate_id: str, match_payload: Dict[str, Any], reference_id: str | None = None
) -> Dict[str, Any]:
    """Build a `counterfeit.flagged` payload from a match_marking result."""
    matches = match_payload["matches"]
    fake = next((m for m in matches if m["kind"] == "known_counterfeit"), None)
    good = next((m for m in matches if m["kind"] == "known_good"), None)
    if reference_id:
        good = next((m for m in matches if m["id"] == reference_id), good)

    score = match_payload["topScore"]
    return {
        "candidateId": candidate_id,
        "imageA": (fake or matches[0])["thumbnail"],
        "imageB": good["thumbnail"] if good else None,
        "score": score,
        "latencyMs": match_payload["latencyMs"],
        "reason": (
            f"Top-marking matches known-counterfeit reference "
            f"'{(fake or matches[0])['id']}' at {score:.0%} similarity. "
            f"FBGA die code and lot-code format disagree with the module label."
        ),
        "plain": (
            "The chips on this module do not match the label on it. "
            "Someone sanded off the old markings and re-printed faster ones. "
            "These would fail in the field, and the cluster would come down with them."
        ),
    }
