from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    chunks: list[str] = []

    for i, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:  # pragma: no cover
            text = f"[extract_text failed: {exc}]"

        chunks.append(f"\n\n===== PAGE {i} =====\n\n{text.strip()}\n")

    return "\n".join(chunks)


def main() -> None:
    pdf_path = Path("docs/Presentation_SyrymSayatNuraskan.pdf")
    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")

    out_path = pdf_path.with_suffix(".extracted.txt")
    extracted = extract_pdf_text(pdf_path)
    out_path.write_text(extracted, encoding="utf-8")

    print(f"pages: {len(PdfReader(str(pdf_path)).pages)}")
    print(f"wrote: {out_path}")


if __name__ == "__main__":
    main()
