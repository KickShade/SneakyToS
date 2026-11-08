from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional, Tuple


@dataclass
class InterpretedSignal:
    old_value: Optional[str]
    new_value: Optional[str]
    direction: str
    evidence: Dict[str, List[str]]
    explanation: str


@dataclass
class PrivacyInterpretation:
    change_id: str
    signals: Dict[str, InterpretedSignal]

    def to_dict(self) -> dict:
        return asdict(self)


def _side_text(change, side: str) -> str:
    group = getattr(change, f"{side}_clauses", None) or []

    if group:
        return " ".join(
            str(getattr(clause, "text", ""))
            for clause in group
            if getattr(clause, "text", None)
        )

    clause = getattr(change, f"{side}_clause", None)

    if clause is not None:
        return str(getattr(clause, "text", "") or "")

    return ""


def _sentences(text: str) -> List[str]:
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?;])\s+", text)
        if sentence.strip()
    ]


# ------------------------------------------------------------------
# Sharing permission interpretation
# ------------------------------------------------------------------

SHARING_VERBS = re.compile(
    r"\b(?:share|shares|shared|sharing|disclose|discloses|"
    r"disclosed|disclosing"
    r"transfer|transfers|transferred|transferring)\b",
    re.IGNORECASE,
)

NEGATED_SHARING = re.compile(
    r"\b(?:do not|does not|did not|will not|shall not|"
    r"cannot|can not|never|not|without)\b",
    re.IGNORECASE,
)

POSITIVE_SHARING = re.compile(
    r"\b(?:may|can|could|might|will|shall|must|"
    r"agree to|intend to)\b",
    re.IGNORECASE,
)





def _sharing_status(text: str) -> Tuple[str, List[str]]:
    statements = []

    for sentence in _sentences(text):
        for match in SHARING_VERBS.finditer(sentence):
            verb = match.group(0).lower()

            # Only negation immediately governing the sharing verb counts.
            # "share ... without consent" is still permission to share.
            prefix = sentence[max(0, match.start() - 45):match.start()]
            negated = bool(re.search(
                r"\b(?:do not|does not|did not|will not|shall not|"
                r"cannot|can not|never|may not|must not)\s+$",
                prefix,
                re.IGNORECASE,
            ))

            if negated:
                status = "PROHIBITED"
            else:
                modal = bool(re.search(
                    r"\b(?:may|can|could|might|will|shall|must|"
                    r"agree to|intend to)\b",
                    prefix,
                    re.IGNORECASE,
                ))
                status = (
                    "PERMITTED_OR_REQUIRED"
                    if modal or verb in {"share", "sharing", "sell", "selling",
                                         "disclose", "disclosing", "transfer",
                                         "transferring"}
                    else "MENTIONED_UNCLEAR"
                )

            statements.append((status, sentence))
            break

    if not statements:
        return "NOT_STATED", []

    statuses = {status for status, _ in statements}
    evidence = list(dict.fromkeys(sentence for _, sentence in statements))

    if statuses == {"PROHIBITED"}:
        return "PROHIBITED", evidence
    if statuses == {"PERMITTED_OR_REQUIRED"}:
        return "PERMITTED_OR_REQUIRED", evidence
    return "MIXED_OR_UNCLEAR", evidence

def _interpret_sharing(old_text: str, new_text: str) -> InterpretedSignal:
    old_status, old_evidence = _sharing_status(old_text)
    new_status, new_evidence = _sharing_status(new_text)

    if old_status == new_status:
        direction = "NO_DETECTED_CHANGE"
        explanation = "The sharing-language status is unchanged."

    elif old_status == "PROHIBITED" and new_status == "PERMITTED_OR_REQUIRED":
        direction = "PERMISSION_EXPANSION"
        explanation = (
            "The new text permits or requires sharing "
            "where the old text prohibited it."
        )

    elif old_status == "PERMITTED_OR_REQUIRED" and new_status == "PROHIBITED":
        direction = "PERMISSION_RESTRICTION"
        explanation = (
            "The new text prohibits sharing "
            "where the old text permitted or required it."
        )

    elif old_status == "NOT_STATED" or new_status == "NOT_STATED":
        direction = "POSSIBLE_CHANGE"
        explanation = (
            "Sharing language appears on only one side; context is needed."
        )

    else:
        direction = "UNCLEAR"
        explanation = (
            "The sharing language could not be interpreted consistently."
        )

    return InterpretedSignal(
        old_value=old_status,
        new_value=new_status,
        direction=direction,
        evidence={"old": old_evidence, "new": new_evidence},
        explanation=explanation,
    )


# ------------------------------------------------------------------
# Recipient interpretation
# ------------------------------------------------------------------

RECIPIENT_PATTERNS = {
    "SERVICE_PROVIDER": r"\bservice providers?\b",
    "ADVERTISER": r"\badvertisers?\b",
    "ADVERTISING_PARTNER": r"\badvertising partners?\b",
    "AFFILIATE": r"\baffiliates?\b",
    "THIRD_PARTY": r"\bthird[- ]part(?:y|ies)\b",
    "BUSINESS_PARTNER": r"\bbusiness partners?\b",
    "ANALYTICS_PROVIDER": r"\banalytics providers?\b",
    "GOVERNMENT": r"\bgovernment (?:agencies|authorities)\b",
    "LAW_ENFORCEMENT": r"\blaw enforcement\b",
    "VENDOR": r"\bvendors?\b",
}





def _recipient_categories(text: str) -> List[str]:
    categories = [
        category
        for category, pattern in RECIPIENT_PATTERNS.items()
        if re.search(pattern, text, re.IGNORECASE)
    ]

    if re.search(r"\bthird[- ]party\s+service providers?\b", text, re.I):
        categories = [c for c in categories if c != "THIRD_PARTY"]

    return categories

def _interpret_recipients(old_text: str, new_text: str) -> InterpretedSignal:
    old_categories = _recipient_categories(old_text)
    new_categories = _recipient_categories(new_text)

    old_set = set(old_categories)
    new_set = set(new_categories)

    added = sorted(new_set - old_set)
    removed = sorted(old_set - new_set)

    if added and not removed:
        direction = "RECIPIENT_EXPANSION"
        explanation = "New recipient categories appear in the updated text."
    elif removed and not added:
        direction = "RECIPIENT_REDUCTION"
        explanation = (
            "Previously mentioned recipient categories are absent "
            "from the updated text."
        )
    elif added or removed:
        direction = "RECIPIENTS_CHANGED"
        explanation = "Recipient categories changed in both directions."
    else:
        direction = "NO_DETECTED_CHANGE"
        explanation = "No change in the detected recipient categories."

    return InterpretedSignal(
        old_value=", ".join(old_categories) or None,
        new_value=", ".join(new_categories) or None,
        direction=direction,
        evidence={
            "old": old_categories,
            "new": new_categories,
            "added": added,
            "removed": removed,
        },
        explanation=explanation,
    )


# ------------------------------------------------------------------
# Retention duration interpretation
# ------------------------------------------------------------------

DURATION_PATTERN = re.compile(
    r"\b(?P<number>\d+)\s*"
    r"(?P<unit>days?|weeks?|months?|years?)\b",
    re.IGNORECASE,
)

# Average Gregorian duration conversions.
# These are approximate comparison units, not exact calendar arithmetic.
UNIT_TO_DAYS = {
    "day": 1.0,
    "days": 1.0,
    "week": 7.0,
    "weeks": 7.0,
    "month": 365.25 / 12,
    "months": 365.25 / 12,
    "year": 365.25,
    "years": 365.25,
}


def _retention_period(
    text: str,
) -> Tuple[Optional[float], Optional[str]]:
    matches = list(DURATION_PATTERN.finditer(text))

    for match in matches:
        start = max(0, match.start() - 100)
        end = min(len(text), match.end() + 100)
        context = text[start:end]

        if not re.search(
            r"\b(retain|retention|store|stored|keep|kept|delete|deletion)\w*\b",
            context,
            re.IGNORECASE,
        ):
            continue

        number = int(match.group("number"))
        unit = match.group("unit").lower()

        days = number * UNIT_TO_DAYS[unit]

        return days, match.group(0)

    return None, None


def _interpret_retention(old_text: str, new_text: str) -> InterpretedSignal:
    old_days, old_evidence = _retention_period(old_text)
    new_days, new_evidence = _retention_period(new_text)

    if old_days is None and new_days is None:
        direction = "NOT_COMPARABLE"
        explanation = (
            "No explicit comparable retention duration was detected."
        )

    elif old_days is None or new_days is None:
        direction = "INSUFFICIENT_INFORMATION"
        explanation = (
            "An explicit duration appears on only one side."
        )

    elif abs(new_days - old_days) < 0.000001:
        direction = "NO_DETECTED_CHANGE"
        explanation = (
            "The explicit retention durations are approximately equal."
        )

    elif new_days > old_days:
        direction = "DURATION_INCREASED"
        explanation = "The explicit retention duration increased."

    else:
        direction = "DURATION_DECREASED"
        explanation = "The explicit retention duration decreased."

    return InterpretedSignal(
        old_value=old_evidence,
        new_value=new_evidence,
        direction=direction,
        evidence={
            "old": [old_evidence] if old_evidence else [],
            "new": [new_evidence] if new_evidence else [],
        },
        explanation=explanation,
    )


# ------------------------------------------------------------------
# Modality interpretation
# ------------------------------------------------------------------

MODALITY_PATTERN = re.compile(
    r"\b(?:may|can|could|might|will|shall|must|"
    r"should|cannot|can't|will not|won't|shall not|"
    r"do not|does not|must not)\b",
    re.IGNORECASE,
)


def _modalities(text: str) -> List[str]:
    return list(dict.fromkeys(
        match.group(0).lower()
        for match in MODALITY_PATTERN.finditer(text)
    ))


def _interpret_modality(old_text: str, new_text: str) -> InterpretedSignal:
    old_values = _modalities(old_text)
    new_values = _modalities(new_text)

    if old_values == new_values:
        direction = "NO_DETECTED_CHANGE"
        explanation = "The detected modal terms are unchanged."
    else:
        direction = "MODALITY_CHANGED"
        explanation = (
            "The modal language changed. Its legal and privacy significance "
            "requires contextual interpretation."
        )

    return InterpretedSignal(
        old_value=", ".join(old_values) or None,
        new_value=", ".join(new_values) or None,
        direction=direction,
        evidence={"old": old_values, "new": new_values},
        explanation=explanation,
    )


# ------------------------------------------------------------------
# Main interpreter
# ------------------------------------------------------------------

class PrivacyFeatureInterpreter:
    """
    Interprets selected extracted privacy signals.

    Outputs are intermediate signals, not final privacy-impact labels.
    """

    def interpret(self, change) -> PrivacyInterpretation:
        change_id = str(getattr(change, "change_id", "unknown"))

        old_text = _side_text(change, "old")
        new_text = _side_text(change, "new")

        signals = {
            "sharing_permission": _interpret_sharing(old_text, new_text),
            "recipient_categories": _interpret_recipients(
                old_text, new_text
            ),
            "retention_duration": _interpret_retention(
                old_text, new_text
            ),
            "modality": _interpret_modality(old_text, new_text),
        }

        return PrivacyInterpretation(
            change_id=change_id,
            signals=signals,
        )


def interpret_privacy_features(change) -> PrivacyInterpretation:
    return PrivacyFeatureInterpreter().interpret(change)