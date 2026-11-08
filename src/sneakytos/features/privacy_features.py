from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any


# Feature extraction is deliberately descriptive. It does not assign a final
# privacy-impact label; that responsibility belongs to PrivacyImpactClassifier.
FEATURE_PATTERNS: dict[str, dict[str, str]] = {
    "collection": {
        "location": r"\b(gps|geolocation|precise location|location data|coordinates)\b",
        "contact": r"\b(email address|email|phone number|telephone|contact details)\b",
        "identity": r"\b(name|date of birth|government id|passport|identity)\b",
        "financial": r"\b(payment|financial|bank account|credit card|billing information)\b",
        "device": r"\b(device id|device identifier|ip address|device information|browser information)\b",
        "biometric": r"\b(biometric|fingerprint|facial recognition|voiceprint)\b",
        "health": r"\b(health|medical|diagnosis|health records)\b",
    },
    "data_scope": {
        "personal information": r"\b(personal information|personal data)\b",
        "sensitive information": r"\b(sensitive personal|sensitive information|special category)\b",
        "account information": r"\b(account information|account details)\b",
        "usage information": r"\b(usage data|usage information|browsing activity)\b",
    },
    "sharing": {
        "share": r"\b(share|shares|shared|sharing)\b",
        "disclose": r"\b(disclose|discloses|disclosed|disclosing)\b",
        "sell": r"\b(sell|sells|sold|selling|sale)\b",
        "transfer": r"\b(transfer|transfers|transferred|transferring)\b",
    },
    "recipients": {
        "service providers": r"\bservice providers?\b",
        "advertising partners": r"\badvertising partners?\b",
        "advertisers": r"\badvertisers?\b",
        "affiliates": r"\baffiliates?\b",
        "third parties": r"\bthird[- ]part(?:y|ies)\b",
        "business partners": r"\bbusiness partners?\b",
        "data brokers": r"\bdata brokers?\b",
        "government": r"\bgovernment (?:agencies|authorities)\b",
    },
    "purpose": {
        "service delivery": r"\b(provide|deliver|operate|maintain) our services\b",
        "advertising": r"\b(advertis(?:e|ement|ing)|targeted ads?)\b(?!\s+partners?)",
        "marketing": r"\bmarketing\b",
        "analytics": r"\b(analytics|analytical purposes|usage analysis)\b",
        "profiling": r"\bprofil(?:e|ing)\b",
        "research": r"\bresearch\b",
        "personalization": r"\b(personali[sz]ation|personalise|personalize)\b",
        "AI training": r"\b(artificial intelligence|machine learning|generative ai|train(?:ing)? models?)\b",
    },
    "retention": {
        "retention language": r"\b(retain|retention|store|stored|keep|kept|delete|deletion)\b",
        "indefinite retention": r"\b(as long as necessary|for as long as we need|indefinitely)\b",
    },
    "tracking": {
        "cookies": r"\bcookies?\b",
        "tracking": r"\b(track(?:ing)?|tracking technologies)\b",
        "pixels": r"\b(pixels?|web beacons?)\b",
        "cross-site tracking": r"\b(cross[- ]site|across websites|across apps)\b",
    },
    "ai_training": {
        "AI training": r"\b(artificial intelligence|machine learning|generative ai|train(?:ing)? (?:our )?(?:ai|models?))\b",
    },
    "consent": {
        "consent requirement": (
    r"\b(only with (?:your )?(?:prior )?consent|"
    r"with your explicit consent|subject to your consent|"
    r"will obtain your consent|"
    r"only after you (?:provide|give) your explicit consent)\b"
),
        "permission requirement": r"\b(only with your permission|with your permission)\b",
    },
    "user_control": {
        "opt-out": r"\bopt[- ]?out\b",
        "withdraw consent": r"\bwithdraw (?:your )?consent\b",
        "deletion right": r"\b(request|requesting) deletion|delete your (?:personal )?(?:data|information)\b",
        "access right": r"\baccess your (?:personal )?(?:data|information)\b",
        "correction right": r"\bcorrect your (?:personal )?(?:data|information)\b",
        "objection right": r"\bobject to (?:the )?processing\b",
        "restriction right": r"\brestrict processing\b",
    },
    "security": {
        "encryption": r"\bencrypt(?:ion|ed)?\b",
        "access controls": r"\baccess controls?\b",
        "multi-factor authentication": r"\bmulti[- ]factor authentication\b",
        "security safeguards": r"\b(security safeguards|reasonable safeguards|firewalls|secure transmission)\b",
        "unauthorized access protection": r"\bprotect(?:ion)? against unauthorized access\b",
    },
}

MODALITY_PATTERN = re.compile(
    r"\b(may|can|could|might|will|shall|must|should|cannot|can't|"
    r"will not|won't|shall not|do not|does not|must not|never)\b", re.I
)
QUANTIFIER_PATTERN = re.compile(
    r"\b(all|any|each|every|some|certain|limited|only|solely|generally|"
    r"typically|including|such as|as necessary|as required)\b", re.I
)


@dataclass
class FeatureEvidence:
    dimension: str
    feature: str
    side: str
    matched_text: str


@dataclass
class FeatureComparison:
    dimension: str
    old_values: list[str]
    new_values: list[str]
    added: list[str]
    removed: list[str]
    status: str
    evidence: list[FeatureEvidence]


@dataclass
class PrivacyFeatureResult:
    change_id: str
    comparisons: dict[str, FeatureComparison]
    modality: dict[str, list[str]]
    quantifiers: dict[str, list[str]]

    def to_dict(self) -> dict:
        return asdict(self)


def _clause_text(clause: Any) -> str:
    if clause is None:
        return ""
    if isinstance(clause, str):
        return clause.strip()
    return str(getattr(clause, "text", "") or "").strip()


def _side_text(change: Any, side: str) -> str:
    clauses = getattr(change, f"{side}_clauses", None) or []
    if clauses:
        return " ".join(filter(None, (_clause_text(c) for c in clauses)))
    return _clause_text(getattr(change, f"{side}_clause", None))


def _extract_matches(text: str, patterns: dict[str, str]) -> tuple[list[str], dict[str, str]]:
    values: list[str] = []
    evidence: dict[str, str] = {}
    for name, pattern in patterns.items():
        match = re.search(pattern, text, re.I)
        if match:
            values.append(name)
            evidence[name] = match.group(0)
    return values, evidence


def _comparison(dimension: str, old_text: str, new_text: str,
                patterns: dict[str, str]) -> FeatureComparison:
    old_values, old_evidence = _extract_matches(old_text, patterns)
    new_values, new_evidence = _extract_matches(new_text, patterns)
    old_set, new_set = set(old_values), set(new_values)
    added = sorted(new_set - old_set)
    removed = sorted(old_set - new_set)
    if not old_set and not new_set:
        status = "ABSENT"
    elif added and not removed:
        status = "ADDED"
    elif removed and not added:
        status = "REMOVED"
    elif added or removed:
        status = "CHANGED"
    else:
        status = "RETAINED"
    evidence = [
        FeatureEvidence(dimension, feature, "old", text)
        for feature, text in old_evidence.items()
    ] + [
        FeatureEvidence(dimension, feature, "new", text)
        for feature, text in new_evidence.items()
    ]
    return FeatureComparison(dimension, old_values, new_values, added, removed,
                             status, evidence)


class PrivacyFeatureExtractor:
    """Extract lexical privacy dimensions without deciding impact direction."""

    def extract(self, change: Any) -> PrivacyFeatureResult:
        change_id = str(getattr(change, "change_id", "unknown"))
        old_text = _side_text(change, "old")
        new_text = _side_text(change, "new")
        comparisons = {
            dimension: _comparison(dimension, old_text, new_text, patterns)
            for dimension, patterns in FEATURE_PATTERNS.items()
        }
        modality = {
            "old": list(dict.fromkeys(m.group(0).lower() for m in MODALITY_PATTERN.finditer(old_text))),
            "new": list(dict.fromkeys(m.group(0).lower() for m in MODALITY_PATTERN.finditer(new_text))),
        }
        quantifiers = {
            "old": list(dict.fromkeys(m.group(0).lower() for m in QUANTIFIER_PATTERN.finditer(old_text))),
            "new": list(dict.fromkeys(m.group(0).lower() for m in QUANTIFIER_PATTERN.finditer(new_text))),
        }
        return PrivacyFeatureResult(change_id, comparisons, modality, quantifiers)


def extract_privacy_features(change: Any) -> PrivacyFeatureResult:
    return PrivacyFeatureExtractor().extract(change)
