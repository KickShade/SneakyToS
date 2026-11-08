
import re
from dataclasses import dataclass
from typing import List


# Preserve the original research parameters.
MIN_CLAUSE_WORDS = 5
LONG_BLOCK_WORDS = 80


@dataclass
class Clause:
    clause_id: str
    section: str
    text: str
    position: int
    word_count: int


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def clean_line(line: str) -> str:
    line = line.replace("\u00a0", " ")
    line = re.sub(r"[ \t]+", " ", line)
    return line.strip()


def normalize_block_text(text: str) -> str:
    """Normalize inline Markdown without accidentally joining words.

    Formatting delimiters found directly between two words are treated as
    a word boundary. Clear acronym-to-word boundaries such as GPSlocation
    are also repaired. Arbitrary lowercase concatenations are not guessed.
    """
    if not text:
        return ""

    # Preserve a boundary when Markdown delimiters sit between words.
    text = re.sub(r"(?<=\w)(?:\*{1,2}|__|`)(?=\w)", " ", text)

    # Remove remaining Markdown emphasis/code delimiters.
    text = re.sub(r"[*`]+", "", text)

    # Remove underscore emphasis at token edges, but retain internal
    # underscores (which may be part of a legitimate token).
    text = re.sub(r"(?<!\w)__+(?=\w)|(?<=\w)__+(?!\w)", "", text)

    # Recover clear acronym-to-word boundaries: GPSlocation -> GPS location.
    text = re.sub(r"([A-Z]{2,})([a-z]{2,})", r"\1 \2", text)

    text = re.sub(r"\s+", " ", text)
    return text.strip()


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


# =========================================================
# MARKDOWN HELPERS
# =========================================================

def is_heading(line: str) -> bool:
    return bool(re.match(r"^#{1,6}\s+", line))


def heading_text(line: str) -> str:
    return re.sub(r"^#{1,6}\s+", "", line).strip()


def is_list_item(line: str) -> bool:
    return bool(re.match(r"^(?:[-*+]|\d+[.)])\s+", line))


def remove_list_marker(line: str) -> str:
    return re.sub(r"^(?:[-*+]|\d+[.)])\s+", "", line).strip()


# =========================================================
# SENTENCE SPLITTER
# =========================================================

def split_sentences(text: str) -> List[str]:
    text = text.strip()

    if not text:
        return []

    protected = text
    placeholders = {}

    patterns = [
        r"https?://\S+",
        r"www\.\S+",
        r"\b[\w.+-]+@[\w.-]+\.\w+\b",
        r"\b(?:e\.g|i\.e|etc|vs|mr|mrs|ms|dr)\.",
    ]

    counter = 0

    for pattern in patterns:
        matches = list(
            re.finditer(
                pattern,
                protected,
                flags=re.IGNORECASE,
            )
        )

        for match in reversed(matches):
            value = match.group(0)
            token = f"__PROTECTED_{counter}__"

            placeholders[token] = value

            protected = (
                protected[:match.start()]
                + token
                + protected[match.end():]
            )

            counter += 1

    pieces = re.split(
        r"(?<=[.!?])\s+(?=[A-Z0-9\"'])",
        protected,
    )

    result = []

    for piece in pieces:
        piece = piece.strip()

        if not piece:
            continue

        for token, value in placeholders.items():
            piece = piece.replace(token, value)

        piece = normalize_block_text(piece)

        if piece:
            result.append(piece)

    return result


# =========================================================
# FALLBACK SEGMENTATION
# =========================================================

def fallback_segment_policy(text: str) -> List[dict]:
    if not text:
        return []

    normalized = normalize_block_text(text)

    if not normalized:
        return []

    sentences = split_sentences(normalized)

    usable = [
        sentence
        for sentence in sentences
        if word_count(sentence) >= MIN_CLAUSE_WORDS
    ]

    if usable:
        return [
            {
                "section": "ROOT_FALLBACK",
                "text": sentence,
            }
            for sentence in usable
        ]

    if word_count(normalized) >= MIN_CLAUSE_WORDS:
        return [
            {
                "section": "ROOT_FALLBACK",
                "text": normalized,
            }
        ]

    return []


# =========================================================
# ORIGINAL RESEARCH SEGMENTATION ALGORITHM
# =========================================================

def segment_policy(text: str) -> List[dict]:
    if not text:
        return []

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    lines = [
        clean_line(line)
        for line in text.split("\n")
    ]

    clauses = []
    current_section = "ROOT"
    buffer = []

    def flush_buffer():
        nonlocal buffer

        if not buffer:
            return

        block = " ".join(buffer).strip()
        buffer = []

        if not block:
            return

        block = normalize_block_text(block)

        if not block:
            return

        words = word_count(block)

        if words <= LONG_BLOCK_WORDS:
            if words >= MIN_CLAUSE_WORDS:
                clauses.append({
                    "section": current_section,
                    "text": block,
                })

            return

        sentences = split_sentences(block)

        for sentence in sentences:
            sentence = sentence.strip()
            words = word_count(sentence)

            if words >= MIN_CLAUSE_WORDS:
                clauses.append({
                    "section": current_section,
                    "text": sentence,
                })

    i = 0

    while i < len(lines):
        line = lines[i]

        if not line:
            flush_buffer()
            i += 1
            continue

        # Markdown heading
        if is_heading(line):
            flush_buffer()
            current_section = heading_text(line)
            i += 1
            continue

        # Setext heading
        if (
            i + 1 < len(lines)
            and line
            and re.match(r"^[-=]{3,}\s*$", lines[i + 1])
        ):
            flush_buffer()
            current_section = line.strip()
            i += 2
            continue

        # List item
        if is_list_item(line):
            flush_buffer()

            item = remove_list_marker(line)
            item = normalize_block_text(item)

            words = word_count(item)

            if words >= MIN_CLAUSE_WORDS:
                clauses.append({
                    "section": current_section,
                    "text": item,
                })

            i += 1
            continue

        # Normal paragraph
        buffer.append(line)
        i += 1

    flush_buffer()

    # Critical safeguard: don't silently lose a non-empty policy.
    if not clauses:
        return fallback_segment_policy(text)

    return clauses


# =========================================================
# APPLICATION INTERFACE
# =========================================================

def segment_text(
    policy_text: str,
    version: str = "policy",
) -> List[Clause]:

    if not isinstance(policy_text, str):
        raise TypeError("policy_text must be a string")

    if not policy_text.strip():
        return []

    raw_clauses = segment_policy(policy_text)

    clauses = []

    for item in raw_clauses:
        text = item.get("text", "").strip()

        if not text:
            continue

        section = item.get("section", "ROOT")

        clauses.append(
            Clause(
                clause_id=f"{version}_{len(clauses) + 1:05d}",
                section=section,
                text=text,
                position=len(clauses),
                word_count=word_count(text),
            )
        )

    return clauses
