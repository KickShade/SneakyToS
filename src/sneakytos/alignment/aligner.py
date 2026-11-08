
from __future__ import annotations

import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any, Optional

import numpy as np
from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

SEMANTIC_STRONG = 0.75
SEMANTIC_FALLBACK = 0.60
LEXICAL_FALLBACK = 0.40

# Provisional combined restructuring thresholds.
RESTRUCTURE_SEMANTIC = 0.78
RESTRUCTURE_LEXICAL = 0.35

# Additional safeguards: every unmatched restructuring member
# must independently relate to the opposite-side clause.
RESTRUCTURE_MEMBER_SEMANTIC = 0.60
RESTRUCTURE_MEMBER_LEXICAL = 0.20

UNCHANGED_SEMANTIC = 0.94
UNCHANGED_TOKEN_CHANGE = 0.10

# Second pass over clauses left unmatched by the strict first pass.
# A reworded or reorganised paragraph often scores below SEMANTIC_STRONG
# and has low Jaccard overlap (different length), so it used to fall through
# as DELETED + ADDED. The floor equals the event validator's MIN_PAIR_SIMILARITY.
SEMANTIC_RELAXED = 0.60
RELAXED_LEXICAL = 0.25
RELAXED_CONTENT_OVERLAP = 0.50
MIN_CONTENT_WORDS = 3

STOPWORDS = frozenset(
    "a an and are as at be been but by can could do does for from had has have "
    "if in into is it its may might of on or our shall should so such that the "
    "their them then there these they this those to us was we were will with "
    "would you your yours".split()
)

WORD_RE = re.compile(r"\b[\w'-]+\b", re.UNICODE)

PRIVACY_SIGNAL_PATTERNS = {
    "collection": r"\b(collect|gather|obtain|capture|record)\b",
    "sharing": r"\b(share|disclose|transfer|sell|provide)\b",
    "recipients": r"\b(third[- ]part(?:y|ies)|partner|vendor|service provider|advertiser)\b",
    "retention": r"\b(retain|retention|store|keep|delete|erase)\b",
    "tracking": r"\b(cookie|tracking|track|pixel|beacon|analytics)\b",
    "ai_training": r"\b(artificial intelligence|machine learning|training|train|generative ai)\b",
    "consent_control": r"\b(opt[- ]?out|consent|withdraw|object|permission)\b",
    "data_location": r"\b(location|geolocation|gps|precise location|coordinates)\b",
    "data_contact": r"\b(email|phone number|telephone|contact details)\b",
    "data_identity": r"\b(name|identity|date of birth|government id|passport)\b",
    "data_financial": r"\b(payment|financial|bank account|credit card)\b",
    "data_device": r"\b(device id|ip address|device information|browser information)\b",
    "data_biometric": r"\b(biometric|fingerprint|facial recognition|voiceprint)\b",
}


@dataclass
class ClauseChange:
    change_id: str
    change_type: str
    old_clause: Optional[Any]
    new_clause: Optional[Any]
    semantic_similarity: Optional[float]
    lexical_similarity: float
    token_change_ratio: float
    char_change_ratio: float
    old_clauses: list[Any] = field(default_factory=list)
    new_clauses: list[Any] = field(default_factory=list)


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text)).strip()


def words(text: str) -> list[str]:
    return WORD_RE.findall(normalize_text(text).lower())


def lexical_similarity(a: str, b: str) -> float:
    sa, sb = set(words(a)), set(words(b))

    if not sa and not sb:
        return 1.0
    if not sa or not sb:
        return 0.0

    return len(sa & sb) / len(sa | sb)


def content_words(text: str) -> set[str]:
    return {w for w in words(text) if w not in STOPWORDS and len(w) > 2}


def content_overlap(a: str, b: str) -> float:
    """Overlap coefficient on content words (robust to length differences)."""
    sa, sb = content_words(a), content_words(b)

    if min(len(sa), len(sb)) < MIN_CONTENT_WORDS:
        return 0.0

    return len(sa & sb) / min(len(sa), len(sb))


def token_change_ratio(a: str, b: str) -> float:
    sa, sb = set(words(a)), set(words(b))
    union = sa | sb

    if not union:
        return 0.0

    return len(sa ^ sb) / len(union)


def char_change_ratio(a: str, b: str) -> float:
    a = normalize_text(a).lower()
    b = normalize_text(b).lower()

    if not a and not b:
        return 0.0

    return 1.0 - SequenceMatcher(None, a, b).ratio()


def privacy_signal_changed(a: str, b: str) -> bool:
    """Vocabulary-presence guard, not a privacy-impact classification."""
    a = normalize_text(a).lower()
    b = normalize_text(b).lower()

    return any(
        bool(re.search(pattern, a)) != bool(re.search(pattern, b))
        for pattern in PRIVACY_SIGNAL_PATTERNS.values()
    )


class ClauseAligner:

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        batch_size: int = 128,
        semantic_strong: float = SEMANTIC_STRONG,
        semantic_fallback: float = SEMANTIC_FALLBACK,
        lexical_fallback: float = LEXICAL_FALLBACK,
        restructure_semantic: float = RESTRUCTURE_SEMANTIC,
        restructure_lexical: float = RESTRUCTURE_LEXICAL,
        restructure_member_semantic: float = RESTRUCTURE_MEMBER_SEMANTIC,
        restructure_member_lexical: float = RESTRUCTURE_MEMBER_LEXICAL,
        semantic_relaxed: float = SEMANTIC_RELAXED,
        relaxed_lexical: float = RELAXED_LEXICAL,
        relaxed_content_overlap: float = RELAXED_CONTENT_OVERLAP,
    ):
        self.model = SentenceTransformer(model_name)
        self.batch_size = batch_size
        self.semantic_strong = semantic_strong
        self.semantic_fallback = semantic_fallback
        self.lexical_fallback = lexical_fallback
        self.restructure_semantic = restructure_semantic
        self.restructure_lexical = restructure_lexical
        self.restructure_member_semantic = restructure_member_semantic
        self.restructure_member_lexical = restructure_member_lexical
        self.semantic_relaxed = semantic_relaxed
        self.relaxed_lexical = relaxed_lexical
        self.relaxed_content_overlap = relaxed_content_overlap

    def _encode(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, 0), dtype=np.float32)

        return self.model.encode(
            texts,
            batch_size=self.batch_size,
            show_progress_bar=False,
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).astype(np.float32)

    def _pair_similarity(self, a: str, b: str) -> float:
        embeddings = self._encode([a, b])
        return float(embeddings[0] @ embeddings[1])

    def _member_is_related(self, source_text: str, member_text: str) -> bool:
        """Check an unmatched member independently before grouping it."""
        semantic = self._pair_similarity(source_text, member_text)
        lexical = lexical_similarity(source_text, member_text)

        return (
            semantic >= self.restructure_member_semantic
            and lexical >= self.restructure_member_lexical
        )

    def _match_leftovers(
        self,
        old_texts: list[str],
        new_texts: list[str],
        similarity_matrix: np.ndarray,
        matches: list[tuple[int, int, float]],
        matched_old: set[int],
        matched_new: set[int],
    ) -> None:
        """
        Second pass restricted to clauses the strict pass left unmatched.

        A leftover pair is accepted only if it is semantically related
        (>= semantic_relaxed), shares real content (Jaccard or content-word
        overlap), and is the mutual best partner among the leftovers.
        Matches are appended in place.
        """
        left_old = [i for i in range(len(old_texts)) if i not in matched_old]
        left_new = [j for j in range(len(new_texts)) if j not in matched_new]

        if not left_old or not left_new:
            return

        candidates: dict[tuple[int, int], float] = {}

        for i in left_old:
            for j in left_new:
                semantic = float(similarity_matrix[i, j])

                if semantic < self.semantic_relaxed:
                    continue

                if (
                    lexical_similarity(old_texts[i], new_texts[j])
                    >= self.relaxed_lexical
                    or content_overlap(old_texts[i], new_texts[j])
                    >= self.relaxed_content_overlap
                ):
                    candidates[(i, j)] = semantic

        best_for_old: dict[int, tuple[float, int]] = {}
        best_for_new: dict[int, tuple[float, int]] = {}

        for (i, j), semantic in sorted(
            candidates.items(), key=lambda kv: (-kv[1], kv[0])
        ):
            best_for_old.setdefault(i, (semantic, j))
            best_for_new.setdefault(j, (semantic, i))

        for (i, j), semantic in sorted(
            candidates.items(), key=lambda kv: (-kv[1], kv[0])
        ):
            if best_for_old[i][1] != j or best_for_new[j][1] != i:
                continue

            matches.append((i, j, semantic))
            matched_old.add(i)
            matched_new.add(j)

    def _find_restructures(
        self,
        old_texts: list[str],
        new_texts: list[str],
        matches: list[tuple[int, int, float]],
        matched_old: set[int],
        matched_new: set[int],
    ) -> list[tuple[list[int], list[int], float]]:

        candidates = []

        # One OLD clause -> two NEW clauses.
        for old_i, matched_new_i, _ in matches:

            for start in (matched_new_i - 1, matched_new_i):
                group_new = [start, start + 1]

                if start < 0 or group_new[-1] >= len(new_texts):
                    continue

                matched_members = [
                    j for j in group_new if j in matched_new
                ]
                unmatched_members = [
                    j for j in group_new if j not in matched_new
                ]

                if len(matched_members) != 1 or len(unmatched_members) != 1:
                    continue

                if matched_members[0] != matched_new_i:
                    continue

                unmatched_new_i = unmatched_members[0]

                # Critical safeguard: the unmatched NEW clause must
                # independently relate to the original OLD clause.
                if not self._member_is_related(
                    old_texts[old_i],
                    new_texts[unmatched_new_i],
                ):
                    continue

                combined_new = " ".join(
                    new_texts[j] for j in group_new
                )

                semantic = self._pair_similarity(
                    old_texts[old_i],
                    combined_new,
                )

                candidates.append(
                    ([old_i], group_new, semantic)
                )

        # Two OLD clauses -> one NEW clause.
        for matched_old_i, new_j, _ in matches:

            for start in (matched_old_i - 1, matched_old_i):
                group_old = [start, start + 1]

                if start < 0 or group_old[-1] >= len(old_texts):
                    continue

                matched_members = [
                    i for i in group_old if i in matched_old
                ]
                unmatched_members = [
                    i for i in group_old if i not in matched_old
                ]

                if len(matched_members) != 1 or len(unmatched_members) != 1:
                    continue

                if matched_members[0] != matched_old_i:
                    continue

                unmatched_old_i = unmatched_members[0]

                # Critical safeguard: the unmatched OLD clause must
                # independently relate to the NEW clause.
                if not self._member_is_related(
                    new_texts[new_j],
                    old_texts[unmatched_old_i],
                ):
                    continue

                combined_old = " ".join(
                    old_texts[i] for i in group_old
                )

                semantic = self._pair_similarity(
                    combined_old,
                    new_texts[new_j],
                )

                candidates.append(
                    (group_old, [new_j], semantic)
                )

        # Apply combined-text thresholds as a second check.
        eligible = []

        for old_group, new_group, semantic in candidates:

            old_combined = " ".join(
                old_texts[i] for i in old_group
            )
            new_combined = " ".join(
                new_texts[j] for j in new_group
            )

            lexical = lexical_similarity(
                old_combined,
                new_combined,
            )

            if (
                semantic >= self.restructure_semantic
                and lexical >= self.restructure_lexical
            ):
                eligible.append(
                    (old_group, new_group, semantic)
                )

        # Select non-overlapping groups deterministically.
        eligible.sort(
            key=lambda item: (-item[2], item[0], item[1])
        )

        selected = []
        used_old = set()
        used_new = set()

        for old_group, new_group, semantic in eligible:

            if used_old.intersection(old_group):
                continue

            if used_new.intersection(new_group):
                continue

            selected.append(
                (old_group, new_group, semantic)
            )

            used_old.update(old_group)
            used_new.update(new_group)

        return selected

    def align(
        self,
        old_clauses: list[Any],
        new_clauses: list[Any],
    ) -> list[ClauseChange]:

        old_texts = [
            normalize_text(c.text) for c in old_clauses
        ]
        new_texts = [
            normalize_text(c.text) for c in new_clauses
        ]

        if not old_clauses and not new_clauses:
            return []

        old_embeddings = self._encode(old_texts)
        new_embeddings = self._encode(new_texts)

        if old_texts and new_texts:
            similarity_matrix = (
                old_embeddings @ new_embeddings.T
            )
        else:
            similarity_matrix = np.empty(
                (len(old_texts), len(new_texts)),
                dtype=np.float32,
            )

        # Generate eligible one-to-one pairs.
        eligible_pairs = []

        for i, old_text in enumerate(old_texts):
            for j, new_text in enumerate(new_texts):

                semantic = float(similarity_matrix[i, j])
                lexical = lexical_similarity(old_text, new_text)

                if (
                    semantic >= self.semantic_strong
                    or (
                        semantic >= self.semantic_fallback
                        and lexical >= self.lexical_fallback
                    )
                ):
                    eligible_pairs.append(
                        (semantic, i, j)
                    )

        # Greedy one-to-one matching.
        eligible_pairs.sort(
            key=lambda item: (-item[0], item[1], item[2])
        )

        matches = []
        matched_old = set()
        matched_new = set()

        for semantic, i, j in eligible_pairs:

            if i in matched_old or j in matched_new:
                continue

            matches.append((i, j, semantic))
            matched_old.add(i)
            matched_new.add(j)

        # Rescue related-but-reworded clauses that the strict pass missed,
        # so they become MODIFIED instead of DELETED + ADDED.
        self._match_leftovers(
            old_texts,
            new_texts,
            similarity_matrix,
            matches,
            matched_old,
            matched_new,
        )

        # Detect restructuring before ADDED/DELETED generation.
        restructures = self._find_restructures(
            old_texts,
            new_texts,
            matches,
            matched_old,
            matched_new,
        )

        restructured_old = set()
        restructured_new = set()
        changes = []

        # Emit restructuring events.
        for old_group, new_group, semantic in restructures:

            restructured_old.update(old_group)
            restructured_new.update(new_group)

            old_group_clauses = [
                old_clauses[i] for i in old_group
            ]
            new_group_clauses = [
                new_clauses[j] for j in new_group
            ]

            old_combined = " ".join(
                old_texts[i] for i in old_group
            )
            new_combined = " ".join(
                new_texts[j] for j in new_group
            )

            changes.append(
                ClauseChange(
                    change_id="",
                    change_type="RESTRUCTURED",
                    old_clause=(
                        old_group_clauses[0]
                        if len(old_group_clauses) == 1
                        else None
                    ),
                    new_clause=(
                        new_group_clauses[0]
                        if len(new_group_clauses) == 1
                        else None
                    ),
                    semantic_similarity=semantic,
                    lexical_similarity=lexical_similarity(
                        old_combined, new_combined
                    ),
                    token_change_ratio=token_change_ratio(
                        old_combined, new_combined
                    ),
                    char_change_ratio=char_change_ratio(
                        old_combined, new_combined
                    ),
                    old_clauses=old_group_clauses,
                    new_clauses=new_group_clauses,
                )
            )

        # Emit ordinary matched pairs not consumed by restructuring.
        for i, j, semantic in matches:

            if i in restructured_old or j in restructured_new:
                continue

            old_text = old_texts[i]
            new_text = new_texts[j]

            token_change = token_change_ratio(
                old_text, new_text
            )

            change_type = (
                "UNCHANGED"
                if (
                    semantic >= UNCHANGED_SEMANTIC
                    and token_change < UNCHANGED_TOKEN_CHANGE
                    and not privacy_signal_changed(
                        old_text, new_text
                    )
                )
                else "MODIFIED"
            )

            changes.append(
                ClauseChange(
                    change_id="",
                    change_type=change_type,
                    old_clause=old_clauses[i],
                    new_clause=new_clauses[j],
                    semantic_similarity=semantic,
                    lexical_similarity=lexical_similarity(
                        old_text, new_text
                    ),
                    token_change_ratio=token_change,
                    char_change_ratio=char_change_ratio(
                        old_text, new_text
                    ),
                    old_clauses=[old_clauses[i]],
                    new_clauses=[new_clauses[j]],
                )
            )

        # Only genuinely unmatched OLD clauses become DELETED.
        for i, clause in enumerate(old_clauses):

            if (
                i not in matched_old
                and i not in restructured_old
            ):
                changes.append(
                    ClauseChange(
                        change_id="",
                        change_type="DELETED",
                        old_clause=clause,
                        new_clause=None,
                        semantic_similarity=None,
                        lexical_similarity=0.0,
                        token_change_ratio=1.0,
                        char_change_ratio=1.0,
                        old_clauses=[clause],
                    )
                )

        # Only genuinely unmatched NEW clauses become ADDED.
        for j, clause in enumerate(new_clauses):

            if (
                j not in matched_new
                and j not in restructured_new
            ):
                changes.append(
                    ClauseChange(
                        change_id="",
                        change_type="ADDED",
                        old_clause=None,
                        new_clause=clause,
                        semantic_similarity=None,
                        lexical_similarity=0.0,
                        token_change_ratio=1.0,
                        char_change_ratio=1.0,
                        new_clauses=[clause],
                    )
                )

        # Stable IDs after all event types have been assembled.
        for index, change in enumerate(changes, start=1):
            change.change_id = f"change_{index:05d}"

        return changes
