"""X-FACTOR UPGRADE — make Moss itself read the photographed label.

STATUS: implemented, NOT verified against the live service (no keys here).
        The default demo path does NOT depend on this. If it fails, the
        verified text path in moss_partmatch.py still carries beat 5.

Moss cannot embed images. But `moss>=1.14` ships a server-side document parser
with OCR:

    ParseFileInput(name, content_type, path=None, data=None)
      -> content_type accepts ONLY "application/pdf" and the DOCX mime.
    ParseOptions(ocr_mode="full_ocr" | "auto_ocr", use_high_resolution=True, ...)
    MossClient.create_index_from_files(name, files, model_id, parse_options)

So a JPEG cannot be handed to Moss directly -- but a JPEG **wrapped in a
one-page PDF** can, and `ocr_mode="full_ocr"` will read the laser-etched
marking off it. That turns beat 5 back into "photograph the DIMM, Moss reads
it, Moss matches it" with no CLIP and no extra model.

Cost of honesty: parsing is a SERVER round trip, not on-device, and it is
slow (seconds). The sub-10ms number on stage must come from the QUERY step,
which stays local. Time them separately -- `ocr_marking_from_image` returns
`parseMs` distinctly from the query's `latencyMs`. Never add them together
and never show parseMs as "Moss latency".

The PDF writer below is dependency-free: a JPEG is already a valid PDF image
stream via the DCTDecode filter, so we wrap the bytes rather than re-encode.
"""

from __future__ import annotations

import io
import os
import struct
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional, Tuple


# ---------------------------------------------------------------------------
# JPEG -> single-page PDF, no third-party packages
# ---------------------------------------------------------------------------


def jpeg_dimensions(data: bytes) -> Tuple[int, int, int]:
    """Return (width, height, components) by walking JPEG markers to SOF."""
    if data[:2] != b"\xff\xd8":
        raise ValueError("not a JPEG (missing SOI marker)")

    i = 2
    n = len(data)
    while i < n - 1:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        i += 2
        # Standalone markers carry no length.
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            continue
        if i + 2 > n:
            break
        seg_len = struct.unpack(">H", data[i : i + 2])[0]
        # SOF0..SOF15 except DHT(C4), JPGA(C8), DAC(CC) carry the frame header.
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            height, width = struct.unpack(">HH", data[i + 3 : i + 7])
            components = data[i + 7]
            return width, height, components
        i += seg_len
    raise ValueError("no SOF marker found in JPEG")


def jpeg_to_pdf_bytes(jpeg_path: str | Path) -> bytes:
    """Wrap a JPEG in a one-page PDF using the DCTDecode filter (no re-encode)."""
    jpeg = Path(jpeg_path).read_bytes()
    width, height, components = jpeg_dimensions(jpeg)
    colorspace = {1: "/DeviceGray", 3: "/DeviceRGB", 4: "/DeviceCMYK"}.get(
        components, "/DeviceRGB"
    )

    buf = io.BytesIO()
    offsets: Dict[int, int] = {}

    def obj(num: int, body: bytes) -> None:
        offsets[num] = buf.tell()
        buf.write(f"{num} 0 obj\n".encode())
        buf.write(body)
        buf.write(b"\nendobj\n")

    buf.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    obj(1, b"<< /Type /Catalog /Pages 2 0 R >>")
    obj(2, b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    obj(
        3,
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] "
        f"/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>".encode(),
    )
    obj(
        4,
        b"<< /Type /XObject /Subtype /Image "
        + f"/Width {width} /Height {height} /ColorSpace {colorspace} ".encode()
        + f"/BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpeg)} >>\nstream\n".encode()
        + jpeg
        + b"\nendstream",
    )
    content = f"q {width} 0 0 {height} 0 0 cm /Im0 Do Q".encode()
    obj(5, f"<< /Length {len(content)} >>\nstream\n".encode() + content + b"\nendstream")

    xref_pos = buf.tell()
    count = len(offsets) + 1
    buf.write(f"xref\n0 {count}\n".encode())
    buf.write(b"0000000000 65535 f \n")
    for num in sorted(offsets):
        buf.write(f"{offsets[num]:010d} 00000 n \n".encode())
    buf.write(
        f"trailer\n<< /Size {count} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    )
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Moss-side OCR
# ---------------------------------------------------------------------------


async def ocr_marking_from_image(
    image_path: str | Path,
    client=None,
    cleanup: bool = True,
) -> Dict[str, Any]:
    """Have Moss OCR a photographed DRAM label and return the extracted text.

    Pipeline (3 network calls -- this is the slow part, do it OFF the critical
    path or pre-warm it before you go on stage):
        1. wrap the JPEG in a PDF
        2. create_index_from_files(..., ParseOptions(ocr_mode="full_ocr"))
        3. get_docs() to read the parsed text back out

    Returns {"text": str, "parseMs": float, "tempIndex": str}.

    Feed `text` into match_marking() as a plain string -- the query step is
    then the ordinary sub-10ms local search.
    """
    from moss import MossClient, ParseFileInput, ParseOptions

    if client is None:
        project_id = os.getenv("MOSS_PROJECT_ID")
        project_key = os.getenv("MOSS_PROJECT_KEY")
        if not project_id or not project_key:
            raise EnvironmentError("MOSS_PROJECT_ID / MOSS_PROJECT_KEY required for OCR")
        client = MossClient(project_id, project_key)

    pdf_bytes = jpeg_to_pdf_bytes(image_path)
    temp_index = f"ocr-scratch-{uuid.uuid4().hex[:10]}"

    started = time.perf_counter()
    await client.create_index_from_files(
        temp_index,
        [
            ParseFileInput(
                name=f"{Path(image_path).stem}.pdf",
                content_type="application/pdf",
                data=pdf_bytes,
            )
        ],
        None,
        ParseOptions(ocr_mode="full_ocr", use_high_resolution=True),
    )
    docs = await client.get_docs(temp_index)
    parse_ms = (time.perf_counter() - started) * 1000

    text = " ".join(
        (getattr(d, "text", "") or "") for d in (getattr(docs, "docs", None) or docs)
    ).strip()

    if cleanup:
        try:
            await client.delete_index(temp_index)
        except Exception:  # noqa: BLE001 - scratch index, never fail the demo on this
            pass

    return {"text": text, "parseMs": round(parse_ms, 1), "tempIndex": temp_index}


async def match_marking_via_ocr(
    image_path: str | Path, backend=None, top_k: int = 3
) -> Dict[str, Any]:
    """Full X-Factor path: photo -> Moss OCR -> Moss search -> moss.matches.

    Identical output shape to match_marking(), plus `parseMs`. `latencyMs`
    remains the QUERY time only, so the number on stage stays honest.
    """
    from moss_partmatch import match_marking

    ocr = await ocr_marking_from_image(image_path)
    if not ocr["text"]:
        raise RuntimeError(
            f"Moss OCR returned no text for {image_path}. "
            "Fall back to match_marking() with the marking string."
        )

    result = await match_marking(ocr["text"], backend=backend, top_k=top_k)
    result["parseMs"] = ocr["parseMs"]
    result["resolvedVia"] = "moss-ocr"
    result["ocrText"] = ocr["text"]
    return result


if __name__ == "__main__":
    # Verifies the PDF writer without needing any keys.
    import sys

    if len(sys.argv) < 2:
        print("usage: python ocr_upgrade.py <photo.jpg>  # tests PDF wrapping only")
        raise SystemExit(0)

    pdf = jpeg_to_pdf_bytes(sys.argv[1])
    w, h, c = jpeg_dimensions(Path(sys.argv[1]).read_bytes())
    out = Path(sys.argv[1]).with_suffix(".pdf")
    out.write_bytes(pdf)
    print(f"JPEG {w}x{h} ({c} comp) -> {out} ({len(pdf)} bytes)")
    print("Open it. If the photo renders, Moss's OCR will see it too.")
