
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Optional


VALIDITY_LABELS = {
    "VALID",
    "FRAGMENT",
    "HEADING_ONLY",
    "CONTAMINATED",
    "MISMATCHED_PAIR",
    "FALSE_ADDED_DELETED",
    "GARBLED",
    "TRUNCATED",
}

# Provisional threshold. Alignment already filters most weak pairs;
# this is a defensive check, not a second alignment algorithm.
MIN_PAIR_SIMILARITY = 0.60

HEADING_PATTERNS = {
    "information we collect",
    "personal information",
    "how we use your information",
    "how we share your information",
    "sharing information",
    "data retention",
    "your rights",
    "cookies",
    "security",
    "contact us",
    "children's privacy",
    "international transfers",
    "third party services",
    "changes to this policy",
}

CONTAMINATION_PATTERNS = [
    r"\[REDACTED\]",
    r"\[MASKED\]",
    r"<MASKED>",
    r"<REDACTED>",
    r"BEGIN OF TEXT",
    r"END OF TEXT",
]

TRUNCATED_ENDINGS = (
    " and",
    " or",
    " but",
    " including",
    " such as",
    " because",
    " unless",
    " subject to",
    " in order to",
    " with respect to",
    " pursuant to",
    " as well as",
    " the",
    " a",
    " an",
    " of",
    " to",
    " for",
    " by",
    " from",
    " that",
    " which",
    " who",
)


_MONTH = (
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|"
    r"nov(?:ember)?|dec(?:ember)?)"
)

DATE_RE = re.compile(
    rf"\b{_MONTH}\.?\s+\d{{1,2}}(?:st|nd|rd|th)?,?\s+\d{{4}}\b"
    rf"|\b\d{{1,2}}(?:st|nd|rd|th)?\s+{_MONTH}\.?,?\s+\d{{4}}\b"
    rf"|\b{_MONTH}\.?\s+\d{{4}}\b"
    r"|\b\d{4}-\d{2}-\d{2}\b"
    r"|\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b",
    re.IGNORECASE,
)

VERSION_RE = re.compile(r"\bv(?:ersion)?\.?\s*\d+(?:\.\d+)*\b", re.IGNORECASE)

METADATA_LEAD_RE = re.compile(
    r"^\W*(?:this\s+(?:privacy\s+(?:policy|notice|statement)|policy|document)"
    r"\s+(?:was\s+|is\s+)?)?"
    r"(?:last\s+(?:updated|modified|revised|reviewed)|(?:date\s+)?effective|"
    r"effective\s+date|updated|revised|modified|version|policy\s+version|"
    r"revision|publication\s+date|date\s+of\s+(?:issue|publication))\b",
    re.IGNORECASE,
)

COPYRIGHT_RE = re.compile(
    r"^\W*(?:\u00a9|\(c\)|copyright\b)",
    re.IGNORECASE,
)

TITLE_RE = re.compile(
    r"(?:privacy\s+(?:policy|notice|statement)|cookie\s+(?:policy|notice)|"
    r"terms\s+of\s+(?:service|use)|terms\s+(?:and|&)\s+conditions)"
    r"(?:\s+(?:and|&)\s+(?:cookie\s+)?(?:policy|notice|statement))?"
    r"(?:\s*[\(\[]?\s*v(?:ersion)?\.?\s*\d+(?:\.\d+)*[\)\]]?)?\W*$",
    re.IGNORECASE,
)

# Sentence-level data-practice verbs: a text containing one of these is a
# policy statement, not metadata or a title.
PRACTICE_VERB_RE = re.compile(
    r"\b(?:collect|collects|collected|share|shares|shared|disclose|discloses|"
    r"sell|sells|retain|retains|process|processes|transfer|transfers|"
    r"use|uses|store|stores|delete|may|will|can|must|agree|consent)\b",
    re.IGNORECASE,
)

COMMENTARY_RE = re.compile(
    r"\b(?:follow\s+us|like\s+us\s+on|join\s+(?:the|our)\s+"
    r"(?:conversation|community)|on\s+(?:facebook|twitter|instagram|"
    r"linkedin|youtube)|click\s+here|read\s+more|back\s+to\s+top|"
    r"skip\s+to\s+(?:main\s+)?content|subscribe\s+to\s+our|"
    r"all\s+rights\s+reserved|thank\s+you\s+for\s+(?:visiting|reading)|"
    r"we\s+hope\s+you\s+(?:enjoy|find)|intentionally\s+brief|"
    r"suitable\s+for\s+ui|policy[- ]comparison\s+testing|"
    r"(?:created|written|provided)\s+for\s+(?:testing|demonstration))\b",
    re.IGNORECASE,
)


def _is_metadata_or_title(text: str) -> bool:
    """
    Document titles, version/date lines and copyright lines.

    These are document furniture, not policy statements, so a change in
    them (for example 'Last updated: May 2020' -> 'Last updated: June 2021')
    is not a privacy-policy change.
    """
    normalized = _normalize(text)

    if not normalized:
        return False

    tokens = normalized.split()

    if len(tokens) > 16:
        return False

    # A bare date or version string.
    stripped = VERSION_RE.sub(" ", DATE_RE.sub(" ", normalized))
    if (
        (DATE_RE.search(normalized) or VERSION_RE.search(normalized))
        and len(re.findall(r"[A-Za-z]{2,}", stripped)) <= 1
    ):
        return True

    # Remove dates first so the month "May" is not read as the verb "may".
    has_practice = bool(
        PRACTICE_VERB_RE.search(DATE_RE.sub(" ", normalized))
    )

    if (
        METADATA_LEAD_RE.search(normalized)
        and (DATE_RE.search(normalized) or VERSION_RE.search(normalized))
        and not has_practice
    ):
        return True

    if COPYRIGHT_RE.search(normalized) and not has_practice:
        return True

    # '<Company> Privacy Policy', 'Privacy Policy of <Company>'.
    if (
        len(tokens) <= 10
        and TITLE_RE.search(normalized)
        and not has_practice
        and not re.search(r"\b(?:we|you|your|our|us)\b", normalized, re.I)
        and not re.search(r"[;!?]", normalized)
    ):
        return True

    return False


def _is_irrelevant_commentary(text: str) -> bool:
    """Promotional / navigation text that is not a privacy statement."""
    normalized = _normalize(text)

    if not normalized or not COMMENTARY_RE.search(normalized):
        return False

    # A real data-practice statement that merely mentions a link is kept.
    return not re.search(
        r"\b(?:collect|share|disclose|sell|retain|process|transfer|"
        r"delete|opt[- ]?out|consent)\w*\b",
        normalized,
        re.IGNORECASE,
    )


@dataclass
class EventValidationResult:
    change_id: str
    event_validity: str
    is_valid: bool
    reason: str
    checked_text: str


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def _get_group_text(clauses: list[Any]) -> str:
    return " ".join(
        _normalize(getattr(clause, "text", ""))
        for clause in clauses
    ).strip()


def _get_event_text(change: Any) -> str:
    change_type = getattr(change, "change_type", "")

    old_clauses = getattr(change, "old_clauses", []) or []
    new_clauses = getattr(change, "new_clauses", []) or []

    if change_type == "ADDED":
        return _get_group_text(new_clauses)

    if change_type == "DELETED":
        return _get_group_text(old_clauses)

    if change_type == "RESTRUCTURED":
        return (
            _get_group_text(old_clauses)
            + " "
            + _get_group_text(new_clauses)
        ).strip()

    if old_clauses or new_clauses:
        return (
            _get_group_text(old_clauses)
            + " "
            + _get_group_text(new_clauses)
        ).strip()

    old_clause = getattr(change, "old_clause", None)
    new_clause = getattr(change, "new_clause", None)

    return " ".join(
        _normalize(getattr(clause, "text", ""))
        for clause in (old_clause, new_clause)
        if clause is not None
    ).strip()


def _has_contamination(text: str) -> bool:
    return any(
        re.search(pattern, text, flags=re.IGNORECASE)
        for pattern in CONTAMINATION_PATTERNS
    )


def _is_garbled(text: str) -> bool:
    if not text:
        return False

    replacement_count = text.count("\ufffd")
    suspicious_count = sum(
        1
        for char in text
        if (
            unicodedata.category(char) == "Cc"
            and char not in "\n\r\t"
        )
    )

    total = len(text)

    return (
        replacement_count >= 2
        or suspicious_count / total > 0.02
    )


def _is_heading_only(text: str) -> bool:
    normalized = _normalize(text).lower().strip(" :.-–—")

    if not normalized:
        return False

    if normalized in HEADING_PATTERNS:
        return True

    # Short title-like text without sentence punctuation.
    tokens = normalized.split()

    return (
        len(tokens) <= 6
        and not re.search(r"[.!?;]", normalized)
        and not re.search(
            r"\b(we|you|your|our|us|is|are|may|will|can|must|collect|use|share|retain)\b",
            normalized,
        )
    )


def _is_truncated(text: str) -> bool:
    normalized = _normalize(text)

    if not normalized:
        return False

    lowered = normalized.lower()

    if normalized.endswith(("...", "…")):
        return True

    if normalized.count("(") > normalized.count(")"):
        return True

    if normalized.count("[") > normalized.count("]"):
        return True

    if normalized.count('"') % 2 == 1:
        return True

    return lowered.endswith(TRUNCATED_ENDINGS)


def _is_fragment(text: str) -> bool:
    normalized = _normalize(text)

    if not normalized:
        return True

    tokens = normalized.split()

    if len(tokens) < 5:
        return True

    # Very short clause-like snippets without a finite verb indicator.
    if (
        len(tokens) <= 7
        and not re.search(
            r"\b(is|are|was|were|be|been|being|have|has|had|"
            r"do|does|did|may|might|must|shall|should|will|would|"
            r"can|could|collect|use|share|retain|process|provide|"
            r"include|contain|store|delete|transfer|sell|disclose)\b",
            normalized,
            flags=re.IGNORECASE,
        )
    ):
        return True

    return False


class EventValidator:
    def __init__(
        self,
        min_pair_similarity: float = MIN_PAIR_SIMILARITY,
    ):
        self.min_pair_similarity = min_pair_similarity

    def validate(self, change: Any) -> EventValidationResult:
        change_id = getattr(change, "change_id", "")
        change_type = getattr(change, "change_type", "")
        text = _get_event_text(change)

        def result(label: str, reason: str) -> EventValidationResult:
            return EventValidationResult(
                change_id=change_id,
                event_validity=label,
                is_valid=(label == "VALID"),
                reason=reason,
                checked_text=text,
            )

        if change_type not in {
            "UNCHANGED",
            "MODIFIED",
            "ADDED",
            "DELETED",
            "RESTRUCTURED",
        }:
            return result(
                "CONTAMINATED",
                f"Unsupported change type: {change_type}",
            )

        if not text:
            return result(
                "FRAGMENT",
                "The event contains no usable clause text.",
            )

        if _has_contamination(text):
            return result(
                "CONTAMINATED",
                "Known masking or extraction contamination marker detected.",
            )

        if _is_garbled(text):
            return result(
                "GARBLED",
                "Text contains suspicious encoding or control characters.",
            )

        # For paired events, check the two sides independently for headings.
        old_text = _get_group_text(
            getattr(change, "old_clauses", []) or []
        )
        new_text = _get_group_text(
            getattr(change, "new_clauses", []) or []
        )

        # Fallback for changes that only carry single clauses.
        if not old_text and not new_text:
            old_text = _get_group_text(
                [getattr(change, "old_clause", None)]
                if getattr(change, "old_clause", None) is not None
                else []
            )
            new_text = _get_group_text(
                [getattr(change, "new_clause", None)]
                if getattr(change, "new_clause", None) is not None
                else []
            )

        sides = [t for t in (old_text, new_text) if t]

        # Document titles, version metadata and copyright lines.
        if sides:
            meta_flags = [_is_metadata_or_title(t) for t in sides]

            if all(meta_flags):
                return result(
                    "HEADING_ONLY",
                    "Document title or version/date metadata, "
                    "not a privacy-policy statement.",
                )

            if any(meta_flags) and len(sides) == 2:
                return result(
                    "MISMATCHED_PAIR",
                    "One side is a title or version/date line and the "
                    "other is a policy statement.",
                )

            # Promotional or navigation commentary.
            if all(_is_irrelevant_commentary(t) for t in sides):
                return result(
                    "CONTAMINATED",
                    "Promotional or navigation text unrelated to "
                    "the privacy policy.",
                )

        if change_type in {"MODIFIED", "RESTRUCTURED"}:
            if (
                old_text and new_text
                and _is_heading_only(old_text)
                and _is_heading_only(new_text)
            ):
                return result(
                    "HEADING_ONLY",
                    "Both sides contain heading-only text.",
                )

        elif _is_heading_only(text):
            return result(
                "HEADING_ONLY",
                "The event contains a heading rather than a policy statement.",
            )

        if _is_truncated(text):
            return result(
                "TRUNCATED",
                "Text appears to end mid-sentence or contains an unclosed delimiter.",
            )

        if _is_fragment(text):
            return result(
                "FRAGMENT",
                "Text is too short or lacks sufficient sentence structure.",
            )

        if change_type in {"MODIFIED", "RESTRUCTURED"}:
            similarity: Optional[float] = getattr(
                change, "semantic_similarity", None
            )

            if (
                similarity is not None
                and similarity < self.min_pair_similarity
            ):
                return result(
                    "MISMATCHED_PAIR",
                    "The paired clauses have insufficient semantic similarity.",
                )

        # ADDED/DELETED false-event detection requires comparison against
        # the complete opposite policy. It is intentionally not guessed here.
        return result(
            "VALID",
            "No local event-quality issue detected.",
        )

    def validate_many(
        self,
        changes: list[Any],
    ) -> list[EventValidationResult]:
        return [self.validate(change) for change in changes]
