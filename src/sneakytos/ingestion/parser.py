
from pathlib import Path
import re
from collections import Counter

import pymupdf


SUPPORTED_EXTENSIONS = {".txt", ".pdf"}


def normalize_text(text: str) -> str:
    """Clean extracted text while preserving paragraph structure."""

    text = text.replace("\ufeff", "")
    text = text.replace("\u00a0", " ")
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    lines = [line.rstrip() for line in text.split("\n")]
    text = "\n".join(lines)

    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def extract_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


_PAGE_NUMBER_RE = re.compile(
    r"^\s*(?:(?:page\s*)?\d+\s*(?:of|/|\|)\s*\d+|"
    r"[-–—]\s*\d+\s*[-–—]|page\s+\d+)\s*$",
    re.IGNORECASE,
)


def _strip_pdf_page_furniture(page_texts: list[str]) -> list[str]:
    """Drop obvious page counters and repeated boundary header/footer lines."""
    lines_by_page = [text.splitlines() for text in page_texts]
    boundary_counts: Counter[str] = Counter()

    for lines in lines_by_page:
        boundary = {
            re.sub(r"\s+", " ", line).strip().casefold()
            for line in lines[:2] + lines[-2:]
            if line.strip()
        }
        boundary_counts.update(boundary)

    repeated_boundary = {
        line for line, count in boundary_counts.items()
        if count >= 2
    }

    cleaned = []
    for lines in lines_by_page:
        kept = []
        for line in lines:
            normalized = re.sub(r"\s+", " ", line).strip()
            if not normalized:
                kept.append(line)
                continue
            if _PAGE_NUMBER_RE.fullmatch(normalized):
                continue
            if normalized.casefold() in repeated_boundary:
                continue
            kept.append(line)
        cleaned.append("\n".join(kept))

    return cleaned


def extract_pdf(path: Path) -> str:
    pages = []

    with pymupdf.open(path) as document:
        if document.is_encrypted:
            raise ValueError("Encrypted PDFs are not supported.")

        for page in document:
            pages.append(page.get_text("text"))

    pages = _strip_pdf_page_furniture(pages)
    text = "\n\n".join(pages)

    if not text.strip():
        raise ValueError(
            "No extractable text found. "
            "This PDF may require OCR."
        )

    return text


def extract_policy(path: str) -> str:
    file_path = Path(path)

    if not file_path.exists():
        raise FileNotFoundError(file_path)

    if not file_path.is_file():
        raise ValueError("Expected a file, not a directory.")

    extension = file_path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported format: {extension}. "
            "Supported formats: TXT, PDF."
        )

    if extension == ".txt":
        raw_text = extract_txt(file_path)
    else:
        raw_text = extract_pdf(file_path)

    normalized = normalize_text(raw_text)

    if not normalized:
        raise ValueError("The uploaded policy is empty.")

    return normalized
