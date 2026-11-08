from __future__ import annotations

from dataclasses import asdict, dataclass, is_dataclass
from typing import Any, List, Optional

from sneakytos.pipeline import ProcessedPolicy, process_policy
from sneakytos.alignment import ClauseAligner
from sneakytos.validation import EventValidator, EventValidationResult
from sneakytos.features import (
    PrivacyFeatureExtractor,
    PrivacyFeatureResult,
    PrivacyFeatureInterpreter,
    PrivacyInterpretation,
)
from sneakytos.classification import (
    PrivacyImpactClassifier,
    PrivacyClassificationResult,
)


PAIRED_CHANGE_TYPES = {"MODIFIED", "RESTRUCTURED"}


def _serialize(value: Any) -> Any:
    if value is None:
        return None

    if is_dataclass(value):
        return asdict(value)

    if isinstance(value, dict):
        return {
            key: _serialize(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [_serialize(item) for item in value]

    return value


@dataclass
class AnalyzedChange:
    change: Any
    validation: EventValidationResult
    nli_result: Optional[Any] = None
    privacy_features: Optional[PrivacyFeatureResult] = None
    privacy_interpretation: Optional[PrivacyInterpretation] = None
    classification: Optional[PrivacyClassificationResult] = None

    # Backward compatibility with the existing pipeline API.
    @property
    def nli(self):
        return self.nli_result

    @property
    def features(self):
        return self.privacy_features

    @property
    def interpretation(self):
        return self.privacy_interpretation

    @property
    def privacy_impact(self):
        if self.classification is None:
            return None
        return self.classification.privacy_impact

    def to_dict(self) -> dict:
        change_data = _serialize(self.change)

        return {
            "change_id": self.change.change_id,
            "change_type": self.change.change_type,
            "event_validity": self.validation.event_validity,
            "is_valid": self.validation.is_valid,
            "validation_reason": self.validation.reason,
            "before": change_data,
            "nli": _serialize(self.nli_result),
            "privacy_features": _serialize(self.privacy_features),
            "privacy_interpretation": _serialize(
                self.privacy_interpretation
            ),
            "classification": _serialize(self.classification),
            "privacy_impact": self.privacy_impact,
        }


@dataclass
class PolicyPairAnalysis:
    old_policy: ProcessedPolicy
    new_policy: ProcessedPolicy
    changes: List[AnalyzedChange]

    @property
    def total_changes(self) -> int:
        return len(self.changes)

    @property
    def valid_changes(self) -> int:
        return sum(
            item.validation.is_valid
            for item in self.changes
        )

    @property
    def invalid_changes(self) -> int:
        return self.total_changes - self.valid_changes

    @property
    def impact_counts(self) -> dict:
        labels = {
            "PRIVACY_WORSE": 0,
            "PRIVACY_BETTER": 0,
            "NO_PRIVACY_EFFECT": 0,
            "UNCLEAR": 0,
        }

        for item in self.changes:
            impact = item.privacy_impact
            if impact in labels:
                labels[impact] += 1

        return labels

    def to_dict(self) -> dict:
        return {
            "old_policy": {
                "filename": self.old_policy.filename,
                "file_type": self.old_policy.file_type,
                "version": self.old_policy.version,
                "character_count": self.old_policy.character_count,
                "word_count": self.old_policy.word_count,
                "clause_count": len(self.old_policy.clauses),
            },
            "new_policy": {
                "filename": self.new_policy.filename,
                "file_type": self.new_policy.file_type,
                "version": self.new_policy.version,
                "character_count": self.new_policy.character_count,
                "word_count": self.new_policy.word_count,
                "clause_count": len(self.new_policy.clauses),
            },
            "summary": {
                "total_changes": self.total_changes,
                "valid_changes": self.valid_changes,
                "invalid_changes": self.invalid_changes,
                "privacy_impact_counts": self.impact_counts,
            },
            "changes": [
                item.to_dict()
                for item in self.changes
            ],
        }


def analyze_policy_pair(
    old_policy_path: str,
    new_policy_path: str,
    *,
    aligner: Optional[ClauseAligner] = None,
    validator: Optional[EventValidator] = None,
    nli_analyzer: Optional[Any] = None,
    feature_extractor: Optional[PrivacyFeatureExtractor] = None,
    feature_interpreter: Optional[PrivacyFeatureInterpreter] = None,
    classifier: Optional[PrivacyImpactClassifier] = None,
) -> PolicyPairAnalysis:
    """
    Compare two policy files and classify their privacy impact.

    Processing order:
        1. Ingest and segment both policies.
        2. Align clauses and detect changes.
        3. Validate each detected event.
        4. Extract privacy features and interpret them.
        5. Run NLI on valid MODIFIED/RESTRUCTURED events.
        6. Classify privacy impact.

    Invalid events are never assigned a privacy-impact label.
    """

    old_policy = process_policy(
        old_policy_path,
        version="old",
    )

    new_policy = process_policy(
        new_policy_path,
        version="new",
    )

    aligner = aligner or ClauseAligner()
    validator = validator or EventValidator()

    feature_extractor = (
        feature_extractor or PrivacyFeatureExtractor()
    )

    feature_interpreter = (
        feature_interpreter or PrivacyFeatureInterpreter()
    )

    classifier = classifier or PrivacyImpactClassifier()

    detected_changes = aligner.align(
        old_policy.clauses,
        new_policy.clauses,
    )

    # The aligner emits UNCHANGED pairs to make its matching decisions
    # inspectable. They are not change events and should not inflate the
    # comparison summary or frontend explorer.
    detected_changes = [
        change for change in detected_changes
        if change.change_type != "UNCHANGED"
    ]

    analyzed_changes = []
    nli_initialized = nli_analyzer is not None

    for change in detected_changes:

        # Stage 1: Event validity.
        validation = validator.validate(change)

        nli_result = None
        privacy_features = None
        privacy_interpretation = None
        classification = None

        # Stage 2: Features, interpretation, NLI and classification.
        if validation.is_valid:

            privacy_features = feature_extractor.extract(change)

            privacy_interpretation = feature_interpreter.interpret(
                change
            )

            # NLI is only run for paired semantic changes.
            if change.change_type in PAIRED_CHANGE_TYPES:

                if not nli_initialized:
                    from sneakytos.nli import NLIAnalyzer

                    nli_analyzer = NLIAnalyzer()
                    nli_initialized = True

                nli_result = nli_analyzer.analyze_change(change)

            # Stage 3: User-centric privacy-impact classification.
            classification = classifier.classify(
                change=change,
                validation=validation,
                nli_result=nli_result,
                privacy_features=privacy_features,
                privacy_interpretation=privacy_interpretation,
            )

        analyzed_changes.append(
            AnalyzedChange(
                change=change,
                validation=validation,
                nli_result=nli_result,
                privacy_features=privacy_features,
                privacy_interpretation=privacy_interpretation,
                classification=classification,
            )
        )

    return PolicyPairAnalysis(
        old_policy=old_policy,
        new_policy=new_policy,
        changes=analyzed_changes,
    )
