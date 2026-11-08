
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, is_dataclass
from difflib import SequenceMatcher
from typing import Any


PRIVACY_LABELS = {
    "PRIVACY_WORSE",
    "PRIVACY_BETTER",
    "NO_PRIVACY_EFFECT",
    "UNCLEAR",
}

INVALID_EVENT_LABELS = {
    "FRAGMENT",
    "HEADING_ONLY",
    "CONTAMINATED",
    "MISMATCHED_PAIR",
    "FALSE_ADDED_DELETED",
    "GARBLED",
    "TRUNCATED",
}

SUPPORTED_CHANGE_TYPES = {
    "ADDED", "DELETED", "MODIFIED", "RESTRUCTURED", "UNCHANGED"
}


DATA_TERMS = {
    "location": r"\b(gps|geolocation|location|coordinates)\b",
    "contact": r"\b(email|phone number|telephone|contact details)\b",
    "identity": r"\b(name|date of birth|government id|passport|identity)\b",
    "financial": r"\b(payment|financial|bank account|credit card)\b",
    "device": r"\b(device id|ip address|device information|browser information)\b",
    "biometric data": r"\b(biometric|fingerprint|facial recognition|voiceprint)\b",
    "health data": r"\b(health|medical|diagnosis|health records)\b",
}

RECIPIENT_TERMS = {
    "advertising partners": r"\badvertising partners?\b",
    "advertisers": r"\badvertisers?\b",
    "affiliates": r"\baffiliates?\b",
    "third parties": r"\bthird[- ]part(?:y|ies)\b",
    "service providers": r"\bservice providers?\b",
    "data brokers": r"\bdata brokers?\b",
    "business partners": r"\bbusiness partners?\b",
}

PURPOSE_TERMS = {
    "advertising": r"\b(advertis(?:e|ement|ing)|targeted ads?)\b",
    "marketing": r"\bmarketing\b",
    "profiling": r"\bprofil(?:e|ing)\b",
    "AI training": r"\b(artificial intelligence|machine learning|generative ai|train(?:ing)? models?)\b",
    "analytics": r"\b(analytics|analytical purposes|usage analysis)\b",
}

PERMISSION_VERBS = (
    "collect", "use", "share", "sell", "disclose",
    "transfer", "retain", "track", "process",
)

ALLOW_RE = re.compile(
    r"\b(?:may|can|could|will|must|reserve the right to)\s+"
    r"(?:also\s+)?(?:collect|use|share|sell|disclose|transfer|retain|track|process)\b",
    re.I,
)

ACTIVE_PRACTICE_RE = re.compile(
    r"\bwe\s+(?:collect|use|share|sell|disclose|transfer|retain|track|process)\b",
    re.I,
)

DENY_RE = re.compile(
    r"\b(?:we\s+)?(?:do not|does not|never|will not|shall not|"
    r"will never|cannot|may not)\s+"
    r"(?:collect|use|share|sell|disclose|transfer|retain|track|process)\b",
    re.I,
)

COMMITMENT_RE = re.compile(
    r"\b(we will not|we do not|we never|we shall not|"
    r"we will never|we commit to|we guarantee|"
    r"only with your consent|only with your permission|"
    r"will obtain your consent|will keep .* confidential)\b",
    re.I,
)

CONTROL_RE = re.compile(
    r"\b(opt[- ]?out|withdraw consent|delete your data|"
    r"request deletion|access your data|correct your data|"
    r"object to processing|restrict processing|"
    r"control your information)\b",
    re.I,
)

# Arbitration and class-action procedures concern dispute resolution rather
# than personal-data processing. They must not be interpreted as privacy gains.
DISPUTE_RESOLUTION_RE = re.compile(
    r"\b(arbitration|arbitrate|class[- ]action|jury trial|waive.{0,30}court|"
    r"dispute resolution|small claims court)\b",
    re.I,
)

# A restricted opt-out channel is not a general privacy improvement. Keep the
# event direction uncertain unless another rule identifies a concrete change.
RESTRICTED_OPT_OUT_RE = re.compile(
    r"\b(opt[- ]?out|object to|withdraw consent).{0,100}\b"
    r"(postal mail|physical mail|written notice|certified mail|"
    r"within \d+ days|only by mail|must mail)\b",
    re.I,
)

NOTIFICATION_RE = re.compile(
    r"\b(notif(?:y|ies|ied|ication|ications)|notice|inform(?:s|ed|ing)?)\b",
    re.I,
)

SECURITY_RE = re.compile(
    r"\b(encrypt(?:ion|ed)?|multi[- ]factor authentication|"
    r"access controls|security safeguards|firewalls|"
    r"secure transmission|reasonable safeguards|"
    r"protect(?:ion)? against unauthorized access)\b",
    re.I,
)

CONSENT_RE = re.compile(
    r"\b(only with your consent|only with consent|"
    r"with your explicit consent|with your prior consent|"
    r"will obtain your consent|subject to your consent|"
    r"only with your permission|"
    r"only after you (?:provide|give) your explicit consent)\b",
    re.I,
)

ANALYTICS_RE = re.compile(
    r"\b(analytics|analytical purposes|usage analysis)\b",
    re.I,
)

# Explicit access / correction / deletion rights (issue: these were missed
# because CONTROL_RE only matched a few fixed phrases).
USER_RIGHTS_RE = re.compile(
    r"\b(?:"
    r"(?:right|rights|ability|entitled|entitlement)\s+(?:to|of)\s+"
    r"(?:request\s+)?(?:access|correct|rectif|amend|delet|eras|port|obtain|restrict|object)\w*"
    r"|you\s+(?:may|can|are\s+able\s+to|are\s+entitled\s+to|"
    r"have\s+the\s+right\s+to|will\s+be\s+able\s+to)\s+"
    r"(?!not\b|never\b)(?:\w+\s+){0,4}?"
    r"(?:access|review|correct|rectify|amend|update|delete|erase|remove|export)\b"
    r"|(?:request|ask)\s+(?:us\s+)?(?:to\s+|that\s+we\s+)?"
    r"(?:access|correct|rectify|amend|update|delete|erase|remove)\b"
    r"|request\s+(?:access\s+to|correction\s+of|deletion\s+of|erasure\s+of|a\s+copy\s+of)"
    r"|(?:access|correction|rectification|deletion|erasure)\s+requests?"
    r"|data\s+subject\s+rights"
    r")",
    re.I,
)

COMMIT_OR_DENY_RE = re.compile(
    COMMITMENT_RE.pattern + "|" + DENY_RE.pattern, re.I
)

PERMISSION_RE = re.compile(
    ALLOW_RE.pattern + "|" + ACTIVE_PRACTICE_RE.pattern, re.I
)

RIGHT_LABEL = {
    "access": "access",
    "correction": "correct",
    "deletion": "delete",
}

NEGATED_RIGHT_RE = re.compile(
    r"\b(?:cannot|can't|may not|do not have|don't have|have no|no right|"
    r"not entitled|no longer|unable to)\b",
    re.I,
)

RIGHT_TYPE_RES = {
    "access": re.compile(r"\b(?:access|review|copy of|obtain a copy|export|port\w*)\b", re.I),
    "correction": re.compile(r"\b(?:correct\w*|rectif\w*|amend\w*|update)\b", re.I),
    "deletion": re.compile(r"\b(?:delet\w*|eras\w*|remov\w*)\b", re.I),
}

ADMINISTRATIVE_RE = re.compile(
    r"\b(customer support team|business hours|"
    r"monday to friday|office hours|contact our support team)\b",
    re.I,
)

HIGH_SEVERITY = {
    "advertising", "AI training", "tracking",
    "biometric data", "health data", "financial data",
    "sale",
}

MEDIUM_SEVERITY = {
    "collection", "sharing", "recipients", "retention",
    "user control", "consent", "purpose",
}


@dataclass
class PrivacyClassificationResult:
    change_id: str
    privacy_impact: str | None
    confidence: float | None
    confidence_level: str
    severity: str | None
    rationale: str
    evidence: list[str]
    facets: list[str]
    rules_fired: list[str]
    mixed: bool
    event_validity: str


def _clause_text(clause: Any) -> str:
    if clause is None:
        return ""
    if isinstance(clause, str):
        return clause.strip()
    return str(getattr(clause, "text", "") or "").strip()


def _group_text(clauses: Any) -> str:
    if not clauses:
        return ""
    return " ".join(
        _clause_text(c) for c in clauses if _clause_text(c)
    ).strip()


def _side_text(change: Any, side: str) -> str:
    clauses = getattr(change, f"{side}_clauses", None) or []
    if clauses:
        return _group_text(clauses)
    return _clause_text(getattr(change, f"{side}_clause", None))


def _sentences(text: str) -> list[str]:
    return [
        part.strip()
        for part in re.split(r"(?<=[.!?;])\s+", text or "")
        if part.strip()
    ]


def _user_right_sentences(text: str) -> list[str]:
    return [
        sentence for sentence in _sentences(text)
        if USER_RIGHTS_RE.search(sentence)
        and not NEGATED_RIGHT_RE.search(sentence)
    ]


def _user_right_types(text: str) -> set[str]:
    types: set[str] = set()

    for sentence in _user_right_sentences(text):
        for name, pattern in RIGHT_TYPE_RES.items():
            if pattern.search(sentence):
                types.add(name)

    return types


def _right_sentence(text: str, right_type: str) -> str | None:
    for sentence in _user_right_sentences(text):
        if RIGHT_TYPE_RES[right_type].search(sentence):
            return sentence
    return None


def _control_pattern(text: str) -> Any:
    return USER_RIGHTS_RE if _user_right_sentences(text) else CONTROL_RE


def _types_suffix(types: set[str]) -> str:
    return f" ({', '.join(sorted(types))})" if types else ""


def _has_user_control(text: str) -> bool:
    return bool(CONTROL_RE.search(text)) or bool(_user_right_sentences(text))


def _snippet(text: str, pattern: Any = None, limit: int = 200) -> str:
    """The sentence of `text` matching `pattern` (else the first sentence)."""
    sentences = _sentences(text) or ([text.strip()] if text else [])
    chosen = None

    if pattern is not None:
        regex = re.compile(pattern, re.I) if isinstance(pattern, str) else pattern
        chosen = next((s for s in sentences if regex.search(s)), None)

    chosen = re.sub(r"\s+", " ", chosen or (sentences[0] if sentences else "")).strip()

    if len(chosen) > limit:
        chosen = chosen[: limit - 1].rstrip() + "\u2026"

    return chosen


def _quote(label: str, text: str, pattern: Any = None) -> str:
    snippet = _snippet(text, pattern)
    return f'{label}: "{snippet}"' if snippet else ""


def _diff_summary(old: str, new: str, max_items: int = 3, max_len: int = 60) -> str:
    a, b = old.split(), new.split()
    matcher = SequenceMatcher(None, [w.lower() for w in a], [w.lower() for w in b])
    parts: list[str] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue

        before = " ".join(a[i1:i2])[:max_len]
        after = " ".join(b[j1:j2])[:max_len]

        if tag == "replace":
            parts.append(f'"{before}" -> "{after}"')
        elif tag == "delete":
            parts.append(f'removed "{before}"')
        else:
            parts.append(f'added "{after}"')

        if len(parts) >= max_items:
            break

    return "; ".join(parts)


def _find_terms(text: str, patterns: dict[str, str]) -> set[str]:
    return {
        name for name, pattern in patterns.items()
        if re.search(pattern, text, re.I)
    }


def _is_permission(text: str) -> bool:
    # Sentences that grant the USER a right ("you may request that we delete
    # the data we collect") mention company practices only as the object of
    # that right; they are not company permissions.
    parts = [
        p.strip()
        for p in re.split(r"(?<=[.!?;])\s+|,\s+(?:and|but)\s+", text or "")
        if p.strip()
    ]
    rights = {
        p for p in parts
        if USER_RIGHTS_RE.search(p) and not NEGATED_RIGHT_RE.search(p)
    }
    if rights:
        text = " ".join(p for p in parts if p not in rights)
        if not text.strip():
            return False

    # Security statements describe protections, not data-use permissions.
    if SECURITY_RE.search(text):
        return False

    if _is_denial(text):
        return False

    # Processing explicitly conditioned on consent is not an unconditional
    # expansion of company permission. The consent rule handles this change.
    if CONSENT_RE.search(text):
        return False

    return bool(ALLOW_RE.search(text) or ACTIVE_PRACTICE_RE.search(text))


def _is_denial(text: str) -> bool:
    return bool(DENY_RE.search(text))


def _is_commitment(text: str) -> bool:
    return bool(COMMITMENT_RE.search(text) or _is_denial(text))


def _retention_days(text: str) -> float | None:
    match = re.search(
        r"\b(\d+)\s*(day|days|week|weeks|month|months|year|years)\b",
        text,
        re.I,
    )
    if not match:
        return None

    amount = float(match.group(1))
    factors = {
        "day": 1, "days": 1,
        "week": 7, "weeks": 7,
        "month": 365.25 / 12, "months": 365.25 / 12,
        "year": 365.25, "years": 365.25,
    }
    return amount * factors[match.group(2).lower()]

def _same_account_active_retention(old: str, new: str) -> bool:
    """Recognise equivalent account-active retention conditions."""
    retention_pattern = re.compile(
        r"\b(retain|retains|retained|keeping|keeps|kept|store|stores|stored)\b",
        re.I,
    )
    account_pattern = re.compile(r"\baccount information\b", re.I)
    active_condition = re.compile(
    r"\baccount\s+(?:(?:remains|is)\s+)?active\b",
    re.I,
)

    return all(
        pattern.search(text)
        for text in (old, new)
        for pattern in (
            retention_pattern,
            account_pattern,
            active_condition,
        )
    )

def _confidence_level(score: float) -> str:
    if score >= 0.85:
        return "HIGH"
    if score >= 0.65:
        return "MEDIUM"
    return "LOW"


def _is_modal_strengthening(old: str, new: str) -> bool:
    """Detect a change from permissive to mandatory language."""
    for verb in PERMISSION_VERBS:
        old_may = bool(re.search(rf"\bmay\s+{verb}\b", old, re.I))
        new_must = bool(re.search(rf"\bmust\s+{verb}\b", new, re.I))

        if old_may and new_must:
            return True

    return False


def _is_company_name_only_change(old: str, new: str) -> bool:
    """
    Detect a likely organization-name substitution while preserving
    the rest of the sentence.

    Example:
      ABC Ltd. processes your account information.
      ABC Technologies Ltd. processes your account information.
    """
    pattern = re.compile(
        r"^\s*(?P<entity>.+?)\s+"
        r"(?P<verb>processes|process|collects|collect|"
        r"handles|handle|stores|store|uses|use)\s+"
        r"(?P<rest>.+?)\s*$",
        re.I,
    )

    old_match = pattern.match(old)
    new_match = pattern.match(new)

    if not old_match or not new_match:
        return False

    old_rest = (
        old_match.group("verb").lower(),
        re.sub(r"\s+", " ", old_match.group("rest").lower()).strip(),
    )
    new_rest = (
        new_match.group("verb").lower(),
        re.sub(r"\s+", " ", new_match.group("rest").lower()).strip(),
    )

    if old_rest != new_rest:
        return False

    old_entity = old_match.group("entity").strip().lower()
    new_entity = new_match.group("entity").strip().lower()

    # Do not interpret grammatical subjects or modal phrases ("We may",
    # "We must", "Our company") as organization-name substitutions.
    generic_entities = {"we", "we may", "we must", "we will", "our", "our company", "the company"}
    if old_entity in generic_entities or new_entity in generic_entities:
        return False
    if old_entity.startswith(("we ", "our ")) or new_entity.startswith(("we ", "our ")):
        return False

    return old_entity != new_entity


class PrivacyImpactClassifier:
    """Deterministic, rules-first privacy-impact classifier."""

    def classify(
        self,
        change: Any,
        validation: Any = None,
        nli_result: Any = None,
        privacy_features: Any = None,
        privacy_interpretation: Any = None,
    ) -> PrivacyClassificationResult:

        change_id = str(getattr(change, "change_id", "unknown"))
        change_type = str(getattr(change, "change_type", "")).upper()

        validity = str(
            getattr(validation, "event_validity", "VALID")
        ).upper()

        if validation is not None and not getattr(validation, "is_valid", False):
            return self._invalid(change_id, validity)

        if validity in INVALID_EVENT_LABELS:
            return self._invalid(change_id, validity)

        if change_type not in SUPPORTED_CHANGE_TYPES:
            return self._invalid(change_id, "GARBLED")

        old = _side_text(change, "old")
        new = _side_text(change, "new")

        # Do not treat unrelated dispute-resolution language as a privacy
        # benefit, nor infer a data-category addition from a notification
        # clause that merely mentions personal data as the subject of notice.
        if DISPUTE_RESOLUTION_RE.search(old + " " + new):
            return self._make(
                change_id,
                "NO_PRIVACY_EFFECT",
                0.90,
                "The change concerns dispute resolution rather than a stated data practice.",
                [_quote("OLD", old), _quote("NEW", new)],
                [],
                ["DISPUTE_RESOLUTION_NOT_PRIVACY_CHANGE"],
                False,
                validity,
                "LOW",
            )

        if (old and new and RESTRICTED_OPT_OUT_RE.search(new)
                and not RESTRICTED_OPT_OUT_RE.search(old)):
            return self._unclear(
                change_id,
                validity,
                "NEW describes a restricted opt-out channel; its practical effect is unclear without the surrounding process details.",
                [_quote("OLD", old), _quote("NEW", new)],
            )

        if change_type == "UNCHANGED":
            return self._make(
                change_id,
                "NO_PRIVACY_EFFECT",
                0.99,
                "No policy change was identified.",
                ["The aligned clauses are unchanged."],
                [],
                ["UNCHANGED_EVENT"],
                False,
                validity,
                "LOW",
            )

        evidence: list[str] = []
        reasons: list[str] = []
        facets: list[str] = []
        rules: list[str] = []
        worse = 0
        better = 0

        def _record(facet, reason, rule, old_pat, new_pat):
            quotes = []
            if old_pat is not None and old:
                quotes.append(_quote("OLD", old, old_pat))
            if new_pat is not None and new:
                quotes.append(_quote("NEW", new, new_pat))

            facets.append(facet)
            reasons.append(reason)
            rules.append(rule)
            evidence.append(
                " ".join([reason] + [q for q in quotes if q])
            )

        def add_worse(
            facet: str,
            reason: str,
            rule: str,
            points: int = 2,
            old_pat: Any = None,
            new_pat: Any = None,
        ):
            nonlocal worse
            worse += points
            _record(facet, reason, rule, old_pat, new_pat)

        def add_better(
            facet: str,
            reason: str,
            rule: str,
            points: int = 2,
            old_pat: Any = None,
            new_pat: Any = None,
        ):
            nonlocal better
            better += points
            _record(facet, reason, rule, old_pat, new_pat)

        # -----------------------------------------------------
        # ADDED
        # -----------------------------------------------------
        if change_type == "ADDED":
            if not new:
                return self._unclear(
                    change_id, validity, "Missing NEW clause."
                )

            if SECURITY_RE.search(new):
                add_better(
                    "security",
                    "The added clause introduces a security protection statement.",
                    "SECURITY_COMMITMENT_ADDED",
                    2,
                    new_pat=SECURITY_RE,
                )

            if _is_denial(new) or _is_commitment(new):
                add_better(
                    "commitment",
                    "The added clause states a company restriction or commitment.",
                    "ADDED_PROTECTIVE_COMMITMENT",
                    new_pat=COMMIT_OR_DENY_RE,
                )

            if _has_user_control(new):
                add_better(
                    "user control",
                    "The added clause describes a user right or control"
                    + _types_suffix(_user_right_types(new)) + ".",
                    "ADDED_USER_CONTROL",
                    new_pat=_control_pattern(new),
                )

            if CONSENT_RE.search(new):
                add_better(
                    "consent",
                    "The added clause makes processing conditional on user consent.",
                    "CONSENT_REQUIREMENT_ADDED",
                    new_pat=CONSENT_RE,
                )

            if _is_permission(new):
                add_worse(
                    "permission",
                    "The added clause describes a company data-use permission or practice.",
                    "ADDED_PERMISSION",
                    new_pat=PERMISSION_RE,
                )

        # -----------------------------------------------------
        # DELETED
        # -----------------------------------------------------
        elif change_type == "DELETED":
            if not old:
                return self._unclear(
                    change_id, validity, "Missing OLD clause."
                )

            if SECURITY_RE.search(old):
                add_worse(
                    "security",
                    "A previously stated security protection was removed.",
                    "SECURITY_COMMITMENT_REMOVED",
                    2,
                    old_pat=SECURITY_RE,
                )

            if _is_denial(old) or _is_commitment(old):
                add_worse(
                    "commitment",
                    "A previous company restriction or commitment was removed.",
                    "REMOVED_PROTECTIVE_COMMITMENT",
                    old_pat=COMMIT_OR_DENY_RE,
                )

            if _has_user_control(old):
                add_worse(
                    "user control",
                    "A previously stated user right or control was removed"
                    + _types_suffix(_user_right_types(old)) + ".",
                    "REMOVED_USER_CONTROL",
                    old_pat=_control_pattern(old),
                )

            if CONSENT_RE.search(old):
                add_worse(
                    "consent",
                    "A previous consent requirement was removed.",
                    "CONSENT_REQUIREMENT_REMOVED",
                    old_pat=CONSENT_RE,
                )

            if _is_permission(old):
                add_better(
                    "permission",
                    "A previously stated company data-use permission was removed.",
                    "REMOVED_PERMISSION",
                    old_pat=PERMISSION_RE,
                )

        # -----------------------------------------------------
        # MODIFIED / RESTRUCTURED
        # -----------------------------------------------------
        else:
            if not old or not new:
                return self._unclear(
                    change_id,
                    validity,
                    "A paired change is missing OLD or NEW text.",
                )

            # Organization name substitutions are not privacy changes.
            if _is_company_name_only_change(old, new):
                return self._make(
                    change_id,
                    "NO_PRIVACY_EFFECT",
                    0.90,
                    "The organization name changed, but the stated processing activity did not.",
                    [
                        "The processing statement after the organization name is unchanged.",
                        _quote("OLD", old),
                        _quote("NEW", new),
                    ],
                    [],
                    ["ORGANIZATION_NAME_ONLY_CHANGE"],
                    False,
                    validity,
                    "LOW",
                )

            # Modal strengthening from may to must is not automatically
            # a privacy improvement or deterioration.
            if _is_modal_strengthening(old, new):
                return self._make(
                    change_id,
                    "UNCLEAR",
                    0.55,
                    "The wording changes from permissive to mandatory language; the privacy direction depends on the surrounding policy context.",
                    [
                        "NEW uses mandatory language where OLD used permissive language.",
                        _quote("OLD", old, r"\bmay\b"),
                        _quote("NEW", new, r"\bmust\b"),
                    ],
                    ["modality"],
                    ["MODAL_STRENGTHENED_CONTEXT_DEPENDENT"],
                    False,
                    validity,
                    "LOW",
                )

            # A newly strengthened confidentiality / non-disclosure commitment
            # is protective; removing one weakens the user's stated protection.
            old_commitment = _is_commitment(old)
            new_commitment = _is_commitment(new)
            if new_commitment and not old_commitment:
                add_better(
                    "commitment",
                    "NEW introduces an explicit company restriction or confidentiality commitment.",
                    "PROTECTIVE_COMMITMENT_ADDED",
                    new_pat=COMMIT_OR_DENY_RE,
                )
            elif old_commitment and not new_commitment:
                add_worse(
                    "commitment",
                    "NEW removes a previously stated company restriction or confidentiality commitment.",
                    "PROTECTIVE_COMMITMENT_REMOVED",
                    old_pat=COMMIT_OR_DENY_RE,
                )

            # Explicit permission / prohibition flips.
            for verb in PERMISSION_VERBS:
                old_allowed = bool(re.search(
                    rf"\b(?:may|can|could|will)\s+(?:also\s+)?{verb}\b",
                    old,
                    re.I,
                ))
                new_allowed = bool(re.search(
                    rf"\b(?:may|can|could|will)\s+(?:also\s+)?{verb}\b",
                    new,
                    re.I,
                ))
                old_denied = bool(re.search(
                    rf"\b(?:do not|does not|never|will not|shall not)\s+{verb}\b",
                    old,
                    re.I,
                ))
                new_denied = bool(re.search(
                    rf"\b(?:do not|does not|never|will not|shall not)\s+{verb}\b",
                    new,
                    re.I,
                ))

                if old_denied and new_allowed:
                    add_worse(
                        "permission",
                        f"NEW changes from prohibiting {verb} to permitting it.",
                        "PROHIBITION_TO_PERMISSION",
                        old_pat=rf"\b(?:do not|does not|never|will not|shall not)\s+{verb}\b",
                        new_pat=rf"\b(?:may|can|could|will)\s+(?:also\s+)?{verb}\b",
                    )
                elif old_allowed and new_denied:
                    add_better(
                        "permission",
                        f"NEW changes from permitting {verb} to prohibiting it.",
                        "PERMISSION_TO_PROHIBITION",
                        old_pat=rf"\b(?:may|can|could|will)\s+(?:also\s+)?{verb}\b",
                        new_pat=rf"\b(?:do not|does not|never|will not|shall not)\s+{verb}\b",
                    )

            # New consent requirement.
            old_consent = bool(CONSENT_RE.search(old))
            new_consent = bool(CONSENT_RE.search(new))

            if new_consent and not old_consent:
                add_better(
                    "consent",
                    "NEW introduces an explicit consent requirement.",
                    "CONSENT_REQUIREMENT_ADDED",
                    new_pat=CONSENT_RE,
                )
            elif old_consent and not new_consent:
                add_worse(
                    "consent",
                    "NEW removes an explicit consent requirement.",
                    "CONSENT_REQUIREMENT_REMOVED",
                    old_pat=CONSENT_RE,
                )

            # Data categories.
            data_context_old = not NOTIFICATION_RE.search(old)
            data_context_new = not NOTIFICATION_RE.search(new)
            old_data = _find_terms(old, DATA_TERMS) if data_context_old else set()
            new_data = _find_terms(new, DATA_TERMS) if data_context_new else set()

            for item in sorted(new_data - old_data):
                add_worse(
                    "collection",
                    f"NEW introduces a data category not identified in OLD: {item}.",
                    "ADDED_DATA_CATEGORY",
                    new_pat=DATA_TERMS[item],
                )
            for item in sorted(old_data - new_data):
                add_better(
                    "collection",
                    f"NEW no longer identifies a previously stated data category: {item}.",
                    "REMOVED_DATA_CATEGORY",
                    old_pat=DATA_TERMS[item],
                )

            # Recipient categories. Do not treat a recipient mentioned
            # only inside a prohibition/confidentiality commitment as
            # a newly permitted recipient.
            old_recipient_context = (
                bool(re.search(r"\b(share|disclose|sell|transfer)\b", old, re.I))
                and not _is_denial(old)
            )
            new_recipient_context = (
                bool(re.search(r"\b(share|disclose|sell|transfer)\b", new, re.I))
                and not _is_denial(new)
            )

            old_recipients = (
                _find_terms(old, RECIPIENT_TERMS)
                if old_recipient_context else set()
            )
            new_recipients = (
                _find_terms(new, RECIPIENT_TERMS)
                if new_recipient_context else set()
            )

            for item in sorted(new_recipients - old_recipients):
                add_worse(
                    "recipients",
                    f"NEW introduces an additional recipient category: {item}.",
                    "ADDED_RECIPIENT_CATEGORY",
                    new_pat=RECIPIENT_TERMS[item],
                )

           

            # Material purposes.
            old_purposes = _find_terms(old, PURPOSE_TERMS)
            new_purposes = _find_terms(new, PURPOSE_TERMS)
            material = {
                "advertising", "marketing", "profiling",
                "AI training", "analytics",
            }

            for item in sorted((new_purposes - old_purposes) & material):
                add_worse(
                    "purpose",
                    f"NEW introduces an additional purpose: {item}.",
                    "ADDED_MATERIAL_PURPOSE",
                    new_pat=PURPOSE_TERMS[item],
                )

            for item in sorted((old_purposes - new_purposes) & material):
                add_better(
                    "purpose",
                    f"NEW removes a previously stated purpose: {item}.",
                    "REMOVED_MATERIAL_PURPOSE",
                    old_pat=PURPOSE_TERMS[item],
                )

            # Retention duration.
            old_days = _retention_days(old)
            new_days = _retention_days(new)

            if old_days is not None and new_days is not None:
                if new_days > old_days:
                    add_worse(
                        "retention",
                        "The explicit retention duration increases.",
                        "RETENTION_EXTENDED",
                        old_pat=r"\\b\\d+\\s*(?:days?|weeks?|months?|years?)\\b",
                        new_pat=r"\\b\\d+\\s*(?:days?|weeks?|months?|years?)\\b",
                    )
                elif new_days < old_days:
                    add_better(
                        "retention",
                        "The explicit retention duration decreases.",
                        "RETENTION_REDUCED",
                        old_pat=r"\\b\\d+\\s*(?:days?|weeks?|months?|years?)\\b",
                        new_pat=r"\\b\\d+\\s*(?:days?|weeks?|months?|years?)\\b",
                    )

                        # User controls. An explicit-consent change is evaluated by the
            # consent rule above; do not separately treat its opt-out wording
            # as an independent gain or loss of user control.
            consent_changed = old_consent != new_consent

            old_types = _user_right_types(old)
            new_types = _user_right_types(new)

            if new_types - old_types:
                for right in sorted(new_types - old_types):
                    add_better(
                        "user control",
                        f"NEW adds an explicit right to {RIGHT_LABEL[right]} personal data.",
                        "USER_RIGHT_ADDED",
                        new_pat=re.escape(_right_sentence(new, right) or ""),
                    )
            elif old_types - new_types:
                for right in sorted(old_types - new_types):
                    add_worse(
                        "user control",
                        f"NEW no longer states a right to {RIGHT_LABEL[right]} personal data.",
                        "USER_RIGHT_REMOVED",
                        old_pat=re.escape(_right_sentence(old, right) or ""),
                    )
            elif not consent_changed:
                old_control = _has_user_control(old)
                new_control = _has_user_control(new)

                if new_control and not old_control:
                    add_better(
                        "user control",
                        "NEW adds a user right or control.",
                        "USER_CONTROL_ADDED",
                        new_pat=_control_pattern(new),
                    )
                elif old_control and not new_control:
                    add_worse(
                        "user control",
                        "NEW removes a previously stated user right or control.",
                        "USER_CONTROL_REMOVED",
                        old_pat=_control_pattern(old),
                    )
            

            # Security protections.
            old_security = bool(SECURITY_RE.search(old))
            new_security = bool(SECURITY_RE.search(new))

            if new_security and not old_security:
                add_better(
                    "security",
                    "NEW introduces a concrete security protection statement.",
                    "SECURITY_COMMITMENT_ADDED",
                    new_pat=SECURITY_RE,
                )
            elif old_security and not new_security:
                add_worse(
                    "security",
                    "NEW removes a previously stated security protection.",
                    "SECURITY_COMMITMENT_REMOVED",
                    old_pat=SECURITY_RE,
                )

        # -----------------------------------------------------
        # No directional signal
        # -----------------------------------------------------
        if not worse and not better:
            similarity = SequenceMatcher(
                None,
                old.lower().strip(),
                new.lower().strip(),
            ).ratio()

            if change_type == "ADDED" and ADMINISTRATIVE_RE.search(new):
                return self._make(
                    change_id,
                    "NO_PRIVACY_EFFECT",
                    0.85,
                    "The added statement is administrative and does not establish a privacy-policy change.",
                    [
                        "No collection, use, sharing, retention, or user-control change was identified.",
                        _quote("NEW", new),
                    ],
                    [],
                    ["NON_PRIVACY_ADMINISTRATIVE_ADDITION"],
                    False,
                    validity,
                    "LOW",
                )

            if change_type == "DELETED" and ADMINISTRATIVE_RE.search(old):
                return self._make(
                    change_id,
                    "NO_PRIVACY_EFFECT",
                    0.85,
                    "The removed statement is administrative and does not establish a privacy-policy change.",
                    [
                        "No collection, use, sharing, retention, or user-control change was identified.",
                        _quote("OLD", old),
                    ],
                    [],
                    ["NON_PRIVACY_ADMINISTRATIVE_DELETION"],
                    False,
                    validity,
                    "LOW",
                )
            if _same_account_active_retention(old, new):
                return self._make(
                    change_id,
                    "NO_PRIVACY_EFFECT",
                    0.90,
                    "The wording changed, but both clauses retain account information under the same account-active condition.",
                    [
                        "Both clauses specify retention while the account is active.",
                        _quote("OLD", old),
                        _quote("NEW", new),
                    ],
                    ["retention"],
                    ["EQUIVALENT_RETENTION_CONDITION"],
                    False,
                    validity,
                    "LOW",
                )
            
            if similarity >= 0.88:
                return self._make(
                    change_id,
                    "NO_PRIVACY_EFFECT",
                    0.80,
                    "The wording changed, but no material privacy effect was identified.",
                    [
                        "No material privacy signal was detected.",
                        "Changed wording: " + (_diff_summary(old, new) or "none"),
                        _quote("OLD", old),
                        _quote("NEW", new),
                    ],
                    [],
                    ["NO_MATERIAL_SIGNAL", "HIGH_TEXTUAL_SIMILARITY"],
                    False,
                    validity,
                    "LOW",
                )

            return self._unclear(
                change_id,
                validity,
                "The current rules do not establish a clear direction of privacy impact.",
                [
                    q for q in (
                        _quote("OLD", old) if old else "",
                        _quote("NEW", new) if new else "",
                    ) if q
                ],
            )

        # -----------------------------------------------------
        # Resolve opposing effects
        # -----------------------------------------------------
        mixed = worse > 0 and better > 0

        specifics = "; ".join(dict.fromkeys(reasons))

        if mixed and abs(worse - better) < 2:
            return self._make(
                change_id,
                "UNCLEAR",
                0.55,
                "The event has opposing privacy effects without a clear dominant direction. "
                f"Specifically: {specifics}",
                evidence,
                facets,
                rules + ["MIXED_EFFECTS"],
                True,
                validity,
                "LOW",
            )

        if worse > better:
            impact = "PRIVACY_WORSE"
            rationale = (
                "NEW expands data permissions or weakens a user-facing privacy protection. "
                f"Specifically: {specifics}"
            )
        else:
            impact = "PRIVACY_BETTER"
            rationale = (
                "NEW narrows data permissions or strengthens a user-facing privacy protection. "
                f"Specifically: {specifics}"
            )

        confidence = 0.90 if not mixed else 0.72

        return self._make(
            change_id,
            impact,
            confidence,
            rationale,
            evidence,
            facets,
            rules,
            mixed,
            validity,
            self._severity(facets),
        )

    def _severity(self, facets: list[str]) -> str:
        if any(f in HIGH_SEVERITY for f in facets):
            return "HIGH"
        if any(f in MEDIUM_SEVERITY for f in facets):
            return "MEDIUM"
        return "LOW"

    def _invalid(self, change_id: str, validity: str):
        return PrivacyClassificationResult(
            change_id=change_id,
            privacy_impact=None,
            confidence=None,
            confidence_level="NOT_APPLICABLE",
            severity=None,
            rationale="Event is invalid; privacy-impact classification was skipped.",
            evidence=[],
            facets=[],
            rules_fired=["INVALID_EVENT_GUARD"],
            mixed=False,
            event_validity=validity,
        )

    def _unclear(
        self,
        change_id: str,
        validity: str,
        reason: str,
        extra: list[str] | None = None,
    ):
        return self._make(
            change_id,
            "UNCLEAR",
            0.40,
            reason,
            [reason] + list(extra or []),
            [],
            ["INSUFFICIENT_DIRECTIONAL_EVIDENCE"],
            False,
            validity,
            "LOW",
        )

    def _make(
        self,
        change_id: str,
        impact: str,
        confidence: float,
        rationale: str,
        evidence: list[str],
        facets: list[str],
        rules: list[str],
        mixed: bool,
        validity: str,
        severity: str,
    ):
        return PrivacyClassificationResult(
            change_id=change_id,
            privacy_impact=impact,
            confidence=confidence,
            confidence_level=_confidence_level(confidence),
            severity=severity,
            rationale=rationale,
            evidence=list(dict.fromkeys(e for e in evidence if e)),
            facets=list(dict.fromkeys(facets)),
            rules_fired=list(dict.fromkeys(rules)),
            mixed=mixed,
            event_validity=validity,
        )
