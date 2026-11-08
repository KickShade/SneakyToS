from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

from sneakytos.classification import PrivacyImpactClassifier
from sneakytos.analysis_pipeline import analyze_policy_pair
from sneakytos.validation import EventValidator


def change(old, new):
    return SimpleNamespace(
        change_id="edge_1",
        change_type="MODIFIED",
        old_clause=SimpleNamespace(text=old),
        new_clause=SimpleNamespace(text=new),
        old_clauses=[SimpleNamespace(text=old)],
        new_clauses=[SimpleNamespace(text=new)],
        semantic_similarity=0.9,
    )


def classify(old, new):
    event = change(old, new)
    validation = EventValidator().validate(event)
    return PrivacyImpactClassifier().classify(event, validation=validation)


def test_arbitration_waiver_is_not_classified_as_privacy_better():
    result = classify(
        "Disputes may be brought in court.",
        "You waive your right to a jury trial and agree to individual arbitration; class actions are not permitted.",
    )
    assert result.privacy_impact == "NO_PRIVACY_EFFECT"
    assert "DISPUTE_RESOLUTION_NOT_PRIVACY_CHANGE" in result.rules_fired


def test_restricted_postal_opt_out_is_unclear():
    result = classify(
        "You may opt out of targeted advertising online.",
        "You may opt out of targeted advertising only by sending written notice by postal mail within 10 days.",
    )
    assert result.privacy_impact == "UNCLEAR"


def test_notification_reference_does_not_create_data_category_change():
    result = classify(
        "We will notify you of material changes to this policy.",
        "We will notify you of material changes to this policy by email.",
    )
    assert result.privacy_impact == "NO_PRIVACY_EFFECT"
    assert "ADDED_DATA_CATEGORY" not in result.rules_fired


def test_unchanged_alignment_is_omitted_from_comparison_summary():
    with TemporaryDirectory(prefix="sneakytos_test_", dir=Path(__file__).parent) as folder:
        old_path = Path(folder) / "old.txt"
        new_path = Path(folder) / "new.txt"
        policy = "We collect your name and email address to provide our services."
        old_path.write_text(policy, encoding="utf-8")
        new_path.write_text(policy, encoding="utf-8")

        class UnchangedAligner:
            def align(self, old_clauses, new_clauses):
                return [
                    SimpleNamespace(
                        change_id="change_00001",
                        change_type="UNCHANGED",
                        old_clause=old_clauses[0],
                        new_clause=new_clauses[0],
                        old_clauses=[old_clauses[0]],
                        new_clauses=[new_clauses[0]],
                        semantic_similarity=1.0,
                        lexical_similarity=1.0,
                        token_change_ratio=0.0,
                        char_change_ratio=0.0,
                    )
                ]

        result = analyze_policy_pair(
            str(old_path), str(new_path), aligner=UnchangedAligner()
        )
        assert result.total_changes == 0
        assert result.to_dict()["changes"] == []
