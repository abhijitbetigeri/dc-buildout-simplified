# MOSS track — status

NO-GO: image embedding is NOT in the Moss SDK. Verified by introspecting the shipped package, both the stable `moss` 1.14.0 and the `inferedge-moss` 1.0.0b19 beta. `DocumentInfo` exposes exactly `(id, text, metadata, embedding, payload)` — image/audio kwargs are rejected — and `client.query(name, query: str, options)` takes a string with no image overload. Moss's own `usemoss/moss-image-search-demo` indexes **COCO caption text** and keeps the photo as an S3 URL in metadata. It is text search with pictures attached.

**GO on the text path — beat 5 works and is verified running.** `spikes/moss/demo.py --offline` passes today, no keys. Plus there is a credible route to put the photo back on stage (see "X-Factor upgrade").

---

## The verdict (answers M1)

| Claim on moss.dev | Reality in the shipped SDK |
|---|---|
| "text + image + audio embedding" | Marketing. No image or audio entry point exists. Zero `image`/`clip`/`vision`/`multimodal` symbols in the package. |
| "one lightweight model per modality" | Working `model_id` values: `moss-minilm` (default), `moss-mediumlm`, `custom`. All text. |
| image search demo | Text search over captions. The pixels never reach Moss. |

Two escape hatches, both real, neither needed for the default path:

1. **`model_id="custom"`** — bring your own vectors via `DocumentInfo.embedding` and `QueryOptions.embedding`. You ship CLIP yourself; Moss just stores and searches. All vectors must share dimensionality. **Do not take this before the deadline.**
2. **Server-side OCR** — the X-Factor upgrade below. Cheaper than CLIP and already coded.

---

## X-Factor upgrade — make Moss read the photo itself

`moss>=1.14` has a server-side document parser with OCR:

```python
ParseFileInput(name, content_type, path=None, data=None)
ParseOptions(ocr_mode="full_ocr"|"auto_ocr", use_high_resolution=True, ...)
await client.create_index_from_files(name, files, model_id, parse_options)
```

`content_type` accepts **only** `application/pdf` and the DOCX mime — a JPEG is refused. But a JPEG *wrapped in a one-page PDF* is accepted, and `ocr_mode="full_ocr"` reads the laser-etched marking off it. Beat 5 becomes "photograph the DIMM → Moss reads it → Moss matches it", with no extra model.

`spikes/moss/ocr_upgrade.py` implements this: a dependency-free JPEG→PDF wrapper (DCTDecode, no re-encode) plus `match_marking_via_ocr()`. **The PDF writer is verified** — macOS CoreGraphics parses the output and reports correct dimensions. **The Moss OCR call is NOT verified** (no keys here).

Test the wrapper with zero keys:
```bash
python spikes/moss/ocr_upgrade.py <any-photo.jpg>   # writes a .pdf next to it
```

**If you use this on stage, time it separately.** Parsing is a server round trip taking *seconds*. The sub-10ms number must come from the query step, which stays local. `ocr_marking_from_image` returns `parseMs` apart from the query's `latencyMs` for exactly this reason. Never add them together, and never show `parseMs` as "Moss latency". Also: pre-warm it before you present — it is 3 network calls.

---

## Install

```bash
pip install moss              # Python — stable 1.14.0. USE THIS ONE.
npm install @moss-js/moss     # TypeScript — 1.15.0
```

## GOTCHAS — each one costs 20+ minutes

1. **Do not copy the install from Moss's demo repos.** They pin `inferedge-moss` (1.0.0b19, a *beta*, imported as `inferedge_moss`). The stable package is plain `moss` at 1.14.0 and has much more: `add_docs`, `delete_docs`, `create_index_from_files`, `query_multi_index`, `list_indexes`, `unload_index`, `session`, `wait_for_job`, and `min_score`/`group_by`/`candidate_depth` on `QueryOptions`. Both packages are real and both install; pick `moss`.
2. **Import location moved between the two.** On stable `moss` the one-liner works: `from moss import MossClient, DocumentInfo, QueryOptions`. On the `inferedge_moss` beta, `QueryOptions` is in a *different module*, `moss_core`. If you inherited beta code and the import blows up, that is why. `spikes/moss/moss_partmatch.py` tries stable then falls back.
3. **`npm install @moss-dev/moss` is the stale name** (moss.dev's homepage says it — it resolves, but at 1.7.1). The README's `@moss-js/moss` is 1.15.0. Trust the README.
4. **`load_index()` is mandatory before `query()`.** `create_index` does not leave an index queryable. This is the single most confusing failure.
5. **Everything is `async`.** All `MossClient` methods are coroutines. Run under `asyncio.run`.
6. **Errors come back as bare `RuntimeError`, not typed exceptions.** Bad keys surface as `RuntimeError: Failed to load index '...': Cloud error: Invalid response: Authentication failed (HTTP 403 ...)`. Verified. So you cannot catch auth separately from a missing index — match on the message.
7. **`get_index()` RAISES `RuntimeError` when the index does not exist.** It does not return `None`. Use try/except, as Moss's own demo does.
8. **Latency field is `results.time_taken_ms`**, not `latency_ms` or `took`. We report `latencyMs` per the schema and take `max(sdk_time, wall_clock)` so the stage number is never flattering.
9. **Index creation is a cloud operation.** Only *queries* are on-device. On stage say "on-device retrieval", not "fully offline" — someone will ask.

## Env vars

```bash
export MOSS_PROJECT_ID=...     # required
export MOSS_PROJECT_KEY=...    # required
```
From moss.dev signup. Hackathon code: **GALLERYHACKS**.

Optional overrides, all with working defaults: `MOSS_PARTS_INDEX` (`linedown-dram-parts`), `MOSS_MARKINGS_INDEX` (`linedown-dram-markings`), `MOSS_MODEL_ID` (`moss-minilm`), `MOSS_ALPHA_PARTS` (`0.15`), `MOSS_ALPHA_MARKINGS` (`0.5`), `MOSS_MIN_SCORE` (`0.05`).

## Verified call signatures (introspected from moss 1.14.0)

```python
MossClient(project_id: str, project_key: str, *, cache_path: Optional[str] = None)

await client.create_index(name, docs: List[DocumentInfo], model_id=None, *, wait=True)
await client.load_index(name, auto_refresh=False, polling_interval_in_seconds=600, cache_path=None) -> str
await client.query(name, query: str, options: Optional[QueryOptions]) -> SearchResult
await client.get_index(name) -> IndexInfo          # .doc_count ; RAISES RuntimeError if absent

DocumentInfo(id, text, metadata={}, embedding=None, payload=None)
QueryOptions(top_k, alpha, filter, embedding, min_score, group_by, candidate_depth)
SearchResult  -> .docs, .index_name, .query, .time_taken_ms
result.docs[i] -> .id, .score, .text, .metadata
MossClient.DEFAULT_MODEL_ID == "moss-minilm"
```

`alpha` blends semantic vs keyword. **Higher = more semantic.**

## Retrieval tuning — the non-obvious finding

A part number has no *meaning*, so cross-vendor equivalence is a keyword problem, not a semantic one: **`alpha=0.15` for parts**, `0.5` for marking strings (those are half prose — vendor, "MADE IN KOREA").

More importantly: **index the decoded spec, not the raw MPN.** The naive version ("64GB DDR5 RDIMM 4800 MT/s 2Rx4") mis-ranked — a Micron 5600-bin sibling beat the true Samsung equivalent, because a speed mismatch costs only one token out of twenty, and the sibling MPN shares character trigrams. Fix: emit **compound spec tokens** — `CAP64GB FORMRDIMM SPD4800 RANK2RX4 ECCREG CAS40` — so a mismatch costs a whole dimension, and drop boilerplate (voltage, height, "server memory module") that is identical across the catalogue and only dilutes.

Use **no delimiter** in those tokens: `CAP64GB`, not `CAP_64GB`. An underscore splits under most word tokenizers, which silently turns each compound back into a shared prefix plus a value and undoes the whole point.

Result — ranking is now correctly monotonic, true equivalents above near-misses:

```
0.737  HMCG94MEBRA123N       64GB RDIMM 4800 2Rx4   SK hynix   (QVL)
0.700  AB64GR48C4-MBHJ       64GB RDIMM 4800 2Rx4   broker     -> beat 5
0.697  KSM48R40BD4TMM-64HMR  64GB RDIMM 4800 2Rx4   Kingston   -> beat 4 block
0.697  M321R8GA0BB0-CQK      64GB RDIMM 4800 2Rx4   Samsung    (QVL) -> approve
-- noise floor --
0.663  MTC20F2085S1RC56BA1   wrong speed bin
0.480  M321R4GA3BBbb-CQK     half capacity
0.391  CT64G48C40U5          UDIMM, non-ECC
```

The four cheapest-and-real equivalents sit on top, which is what beats 4 and 5 need: the cheapest options *are* genuine electrical equivalents, so the block is about qualification, not specs. An unrecognised MPN returns an **empty** `equivalents` list rather than a table of 0.00 scores — "no equivalent found" reads far better on stage than a broken table.

## The spike

```bash
python spikes/moss/demo.py --offline     # verified working RIGHT NOW, no keys
python spikes/moss/demo.py               # real Moss if keys exported, else local
python spikes/moss/demo.py --live        # fail loudly if keys are missing
python spikes/moss/demo.py --json        # schema-shaped events on stdout
```

| File | What |
|---|---|
| `moss_partmatch.py` | `find_equivalents()` + `match_marking()`, camelCase aliases `findEquivalents`/`matchMarking`. Two backends. |
| `fixtures.py` | Self-contained: 8 cross-vendor DDR5 RDIMMs, 6 marking strings incl. 2 counterfeits. |
| `demo.py` | Indexes both corpora, runs beats 3 and 5, two controls, writes `last_run_events.json`. |
| `ocr_upgrade.py` | The photo path. PDF wrapper verified; Moss OCR call unverified. |

Both functions return payloads matching `docs/EVENT-SCHEMA.md` exactly — asserted in the demo run:

- `find_equivalents(mpn)` → `moss.partmatch` = `{query, equivalents:[{mpn,vendor,score,specs}], latencyMs}` (plus `pricePerUnit`, `leadTimeWeeks`, `onQvl` for the UI)
- `match_marking(path_or_text)` → `moss.matches` = `{matches:[{id,label,score,thumbnail}], latencyMs}` (plus `verdict`, `queryText`, `resolvedVia`, `kind`, `mpn`)
- `as_counterfeit_flagged(...)` → `counterfeit.flagged` = `{candidateId, imageA, imageB, score, latencyMs, reason, plain}`

**`match_marking` accepts an image path.** It does not embed it — it resolves the photo to the OCR'd marking text via a sidecar `.txt` (`photo.jpg` → `photo.jpg.txt`), then the fixtures table, then fails loudly. It never silently searches the filename. **So if the UI track hands us a real photo at demo time it must arrive with its marking string; `data/markings/` should carry both.** Or wire `ocr_upgrade.py` and let Moss read it.

### Measured results (local backend)

| Beat | Call | Result | latencyMs |
|---|---|---|---|
| 3 | `findEquivalents("MTC20F2085S1RC48BA1")` | 4 true cross-vendor equivalents, near-misses filtered | **0.22** |
| 5 | `matchMarking("…/broker-unit-remarked.jpg")` | `COUNTERFEIT`, 0.875 vs genuine ref 0.807 | **0.20** |
| control | `matchMarking("…/samsung-cqk-genuine.jpg")` | `GENUINE`, 0.941 — does not false-positive | 0.17 |
| control | `matchMarking("<raw marking text>")` | `COUNTERFEIT` on the Micron clone | 0.12 |

The counterfeit fixture has three tells visible in the marking string, which is the line to say out loud: FBGA die code `BCPB` is a 4000 MT/s die wearing a 4800 label; the lot code is 6 chars where Samsung uses 8; the date code `2402` predates the label it is printed under.

**Offline mode is stage insurance, not a hack.** Zero keys, zero network, identical payload shapes, real measured latency. The UI cannot tell the difference. Per the cut ladder, replay is a legitimate feature — same argument applies here.

## Status

- **M1 (14:20) — DONE.** NO-GO on image embedding, GO on the text path. Answered inside the window.
- **M7 (15:45) — code complete and verified end-to-end offline.** Needs only `MOSS_PROJECT_ID`/`MOSS_PROJECT_KEY` exported to hit the live service; the real-SDK path was exercised to the network boundary with dummy keys and fails exactly at auth, so the wrapper itself is correct.

### What I need from other tracks

- **DATA**: put the marking strings in `data/markings/` as `<photo>.jpg` + `<photo>.jpg.txt` pairs. My fixture IDs and thumbnail paths are in `fixtures.py` — reuse those exact paths and nothing breaks.
- **UI**: `latencyMs` is on every payload. `counterfeit.flagged.imageA/imageB` are the two paths for the side-by-side. Honour the noise floor — an empty `equivalents` list means "no equivalent found", not an error.
