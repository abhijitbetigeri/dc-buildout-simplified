# MOSS track — status

NO-GO: image embedding is NOT in the Moss SDK today. `DocumentInfo` takes `text` only; Moss's own `moss-image-search-demo` indexes **COCO caption text** and keeps the photo as an S3 URL in `metadata`. No image bytes ever reach Moss.

**GO on the text fallback — beat 5 still works.** Match the photographed module's OCR'd top-marking string against reference markings. Same demo beat, one less magic step. Latency is still real and still sub-10ms, which is the thing we actually put on stage.

---

## The verdict in detail (answers M1)

| Claim on moss.dev | Reality in the SDK |
|---|---|
| "text + image + audio embedding" | Marketing. No image/audio entry point exists in the Python SDK surface. |
| `moss-minilm`, 32MB, one model per modality | Only `model_id` values that work: `moss-minilm`, `moss-mediumlm`, `custom`. All text. |
| Image search demo | `usemoss/moss-image-search-demo` → `setup-py/create_index.py` builds `DocumentInfo(id, text=<caption>, metadata={url, image_id})`. It is text search with pictures attached. |

**The escape hatch, if someone insists on real pixels:** `model_id="custom"` lets you supply your own vectors — `DocumentInfo(..., embedding=[...])` and `QueryOptions(embedding=[...])`. You bring CLIP yourself, Moss just stores and searches the vectors. All vectors must share dimensionality; omitting `embedding` under `model_id="custom"` raises `ValueError`. **Do not take this path before the deadline** — it means shipping a CLIP model and there is no time.

---

## Install

```bash
pip install inferedge-moss        # Python — the ONLY package that works
npm install @moss-js/moss         # TypeScript
```

## GOTCHAS — each of these costs 20+ minutes

1. **`pip install moss` is WRONG.** The docs say it; it is not the SDK. Real package: `inferedge-moss`, imported as `inferedge_moss`.
2. **`npm install @moss-dev/moss` is WRONG** (moss.dev homepage says this). The README says `@moss-js/moss`. Trust the README.
3. **`QueryOptions` is NOT in `inferedge_moss`.** It lives in `moss_core`, a transitive dep:
   ```python
   from inferedge_moss import MossClient, DocumentInfo
   from moss_core import QueryOptions          # <-- different module
   ```
   The docs show `from moss import MossClient, DocumentInfo, QueryOptions` — a single import that does not exist anywhere.
4. **`load_index()` is mandatory before `query()`.** `create_index` does not leave it queryable. Skipping this is the #1 confusing error.
5. **Latency field is `results.time_taken_ms`**, not `latency_ms` or `took`. We still report `latencyMs` in our event payloads per the schema; the spike measures wall-clock too and takes whichever is larger.
6. **`get_index()` raises `RuntimeError` when the index does not exist** — it does not return `None`. Use try/except, as Moss's own demo does.
7. **Everything is `async`.** `MossClient` methods are coroutines; run under `asyncio.run`.
8. Index creation is a network/cloud operation (project-scoped). Only *queries* are on-device. Don't promise "fully offline" on stage — say "on-device retrieval".

## Env vars

```bash
export MOSS_PROJECT_ID=...     # required
export MOSS_PROJECT_KEY=...    # required
```
Both from moss.dev signup. Hackathon code: **GALLERYHACKS**. Optional: `MOSS_INDEX_NAME` (we default to `linedown-dram`).

## Verified call signatures

```python
client = MossClient(project_id, project_key)
await client.create_index(index_name, documents, model_id)   # model_id="moss-minilm"
await client.get_index(index_name)                           # -> .doc_count ; raises RuntimeError if absent
await client.load_index(index_name)                          # REQUIRED before query
results = await client.query(index_name, "query text", QueryOptions(top_k=5, alpha=0.6))
# results.docs -> [ .id, .score, .text, .index_name ] ; results.time_taken_ms
```
`alpha` blends semantic vs keyword (hybrid). Higher = more semantic. For part numbers, **low alpha wins** — `alpha=0.25`, because `MTC20F2085S1RC48BA1` is a keyword-matching problem, not a meaning problem. For marking-string matching we use `alpha=0.5`.

`DocumentInfo(id: str, text: str, metadata: dict = {}, embedding: list[float] | None = None)`

## The spike

`spikes/moss/` — run it in one command:

```bash
export MOSS_PROJECT_ID=... MOSS_PROJECT_KEY=...
python spikes/moss/demo.py
```

- `moss_partmatch.py` → `findEquivalents(part_number)` → emits a `moss.partmatch` payload
- `moss_partmatch.py` → `matchMarking(image_path_or_text)` → emits a `moss.matches` payload
- `fixtures.py` → self-contained: 8 DDR5 RDIMM cross-vendor parts + 6 top-marking/lot-code strings incl. one remarked counterfeit
- `demo.py` → indexes both, runs all queries, prints schema-shaped JSON

**`matchMarking` accepts a path to an image.** It does not embed the image — it reads the OCR'd marking text from a sidecar `.txt` next to the image (or from the fixtures' known markings), then text-matches. This is honest and it works. If the UI track hands us a photo at demo time, it must come with the marking string; `data/` should carry both.

**Offline mode:** `demo.py` runs with `--offline` and zero keys, using a local hybrid scorer with the same output shapes and real measured latency. Use this if Moss keys fail on stage. The UI cannot tell the difference — the payloads are identical.

## Status

- M1 (14:20) Moss multimodal GO/NO-GO — **DONE, called NO-GO on images / GO on text**
- M7 (15:45) Moss index live — spike code complete and runnable; needs keys exported to hit the real service
