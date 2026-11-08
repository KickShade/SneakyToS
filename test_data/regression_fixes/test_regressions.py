"""
Regression tests for alignment, user controls, validation, and explanations.

Run:  python -m unittest test_regressions -v
(or:  python -m pytest test_regressions.py -v)

No model download is needed: the sentence-transformer is replaced by a small
deterministic bag-of-words encoder while testing the production alignment code.
"""
import hashlib
import re
import unittest
from types import SimpleNamespace

import numpy as np

from sneakytos.alignment import aligner as alignment_module
from sneakytos.classification import PrivacyImpactClassifier
from sneakytos.validation import EventValidator

_STOP = set(
    "the a an of to and or in on for with we you your our us is are be may can "
    "will that this which who by from as at it its".split()
)


class FakeSentenceTransformer:
    """Deterministic content-word hashing encoder (unit-normalised)."""

    def __init__(self, *args, **kwargs):
        pass

    def encode(self, texts, **kwargs):
        vectors = []
        for text in texts:
            v = np.zeros(256, dtype=np.float32)
            for w in re.findall(r"[a-z']+", text.lower()):
                if w not in _STOP:
                    v[int(hashlib.md5(w.encode()).hexdigest(), 16) % 256] += 1
            norm = np.linalg.norm(v)
            vectors.append(v / norm if norm else v)
        return np.array(vectors)


def clause(text):
    return SimpleNamespace(text=text)


def change(change_type, old=None, new=None, similarity=None, cid="c1"):
    return SimpleNamespace(
        change_id=cid,
        change_type=change_type,
        old_clause=clause(old) if old else None,
        new_clause=clause(new) if new else None,
        old_clauses=[clause(old)] if old else [],
        new_clauses=[clause(new)] if new else [],
        semantic_similarity=similarity,
    )


def classify(chg):
    validation = EventValidator().validate(chg)
    return validation, PrivacyImpactClassifier().classify(chg, validation=validation)


class TestAlignment(unittest.TestCase):
    def setUp(self):
        self._orig = alignment_module.SentenceTransformer
        alignment_module.SentenceTransformer = FakeSentenceTransformer
        self.aligner = alignment_module.ClauseAligner()

    def tearDown(self):
        alignment_module.SentenceTransformer = self._orig

    def _types(self, old, new):
        changes = self.aligner.align([clause(t) for t in old], [clause(t) for t in new])
        return sorted(c.change_type for c in changes)

    def test_reworded_paragraph_is_modified_not_deleted_and_added(self):
        old = ("We keep your personal data for two years after your last visit.")
        new = (
            "Your personal data is kept for a period of two years after your last "
            "visit to the website, after which it is deleted from our systems, "
            "backups and any records maintained by our service providers."
        )
        # Precondition: this pair is missed by the strict first pass.
        e = self.aligner._encode([old, new])
        sem = float(e[0] @ e[1])
        lex = alignment_module.lexical_similarity(old, new)
        self.assertFalse(sem >= 0.75 or (sem >= 0.60 and lex >= 0.40))

        self.assertEqual(self._types([old], [new]), ["MODIFIED"])

    def test_unrelated_clauses_stay_deleted_and_added(self):
        old = "We keep your personal data for two years after your last visit."
        new = "Our office is open Monday to Friday between nine and five."
        self.assertEqual(self._types([old], [new]), ["ADDED", "DELETED"])


class TestUserControls(unittest.TestCase):
    RIGHTS = "You have the right to access, correct or delete the personal information we hold about you."
    REQUEST = "You may request that we delete the personal data we collect about you."

    def test_added_rights_are_privacy_better(self):
        for text in (self.RIGHTS, self.REQUEST):
            _, result = classify(change("ADDED", new=text))
            self.assertEqual(result.privacy_impact, "PRIVACY_BETTER", text)
            self.assertIn("user control", result.facets, text)

    def test_removed_rights_are_privacy_worse(self):
        _, result = classify(change("DELETED", old=self.RIGHTS))
        self.assertEqual(result.privacy_impact, "PRIVACY_WORSE")
        self.assertIn("user control", result.facets)

    def test_modified_adding_correction_and_deletion_is_better(self):
        old = "You may request access to your personal information by contacting us."
        new = (
            "You may request access to, correction of, or deletion of your "
            "personal information by contacting us."
        )
        _, result = classify(change("MODIFIED", old=old, new=new, similarity=0.85))
        self.assertEqual(result.privacy_impact, "PRIVACY_BETTER")
        self.assertIn("USER_RIGHT_ADDED", result.rules_fired)


class TestValidation(unittest.TestCase):
    def label(self, chg):
        return EventValidator().validate(chg).event_validity

    def test_titles_and_version_metadata_are_invalid(self):
        for text in (
            "Acme Inc. Privacy Policy",
            "Acme Corporation Global Privacy Policy and Cookie Notice",
            "Last updated: January 1, 2024",
            "This Privacy Policy was last updated on 12th February 2007.",
            "Version 2.1",
            "Copyright (c) 2010 Navy Federal NFCU 198 (6-10)",
        ):
            self.assertEqual(self.label(change("ADDED", new=text)), "HEADING_ONLY", text)

    def test_date_only_edit_is_not_a_policy_change(self):
        chg = change(
            "MODIFIED",
            old="Last updated: May 2020",
            new="Last updated: June 2021",
            similarity=0.80,
        )
        self.assertEqual(self.label(chg), "HEADING_ONLY")

    def test_irrelevant_commentary_is_invalid(self):
        text = "Join the conversation with our positive and enthusiast community on Facebook here."
        self.assertEqual(self.label(change("ADDED", new=text)), "CONTAMINATED")

    def test_real_policy_statements_remain_valid(self):
        for text in (
            "We may share your personal information with advertising partners.",
            "This policy is effective as of January 1, 2020 and we may share your information with service providers.",
        ):
            self.assertEqual(self.label(change("ADDED", new=text)), "VALID", text)

    def test_invalid_events_are_not_classified(self):
        _, result = classify(change("ADDED", new="Last updated: January 1, 2024"))
        self.assertIsNone(result.privacy_impact)


class TestExplanations(unittest.TestCase):
    def test_recipient_change_quotes_old_and_new_text(self):
        old = "We may share your information with service providers."
        new = "We may share your information with service providers and advertising partners."
        _, result = classify(change("MODIFIED", old=old, new=new, similarity=0.9))

        self.assertEqual(result.privacy_impact, "PRIVACY_WORSE")
        joined = " ".join(result.evidence)
        self.assertIn('NEW: "We may share your information with service providers and advertising partners."', joined)
        self.assertIn("advertising partners", result.rationale)

    def test_deleted_right_quotes_removed_text(self):
        text = "You have the right to delete the personal information we hold about you."
        _, result = classify(change("DELETED", old=text))
        self.assertTrue(any(f'OLD: "{text}"' in e for e in result.evidence))
        self.assertIn("deletion", result.rationale)

    def test_wording_only_change_shows_what_changed(self):
        old = "We collect your name and email address when you register for an account."
        new = "We collect your name and email address when you create an account."
        _, result = classify(change("MODIFIED", old=old, new=new, similarity=0.95))
        self.assertEqual(result.privacy_impact, "NO_PRIVACY_EFFECT")
        self.assertTrue(any(e.startswith("Changed wording:") and "create" in e for e in result.evidence))


if __name__ == "__main__":
    unittest.main()
