
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
)


MODEL_NAME = "cross-encoder/nli-deberta-v3-base"
MAX_LENGTH = 512

# The documented output order for this checkpoint.
# Index 0 = contradiction, 1 = entailment, 2 = neutral.
DOCUMENTED_LABEL_ORDER = [
    "contradiction",
    "entailment",
    "neutral",
]


@dataclass
class NLIScores:
    entailment: float
    contradiction: float
    neutral: float


@dataclass
class NLIResult:
    change_id: str
    change_type: str
    old_to_new: Optional[NLIScores]
    new_to_old: Optional[NLIScores]
    model_name: str


class NLIAnalyzer:

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        max_length: int = MAX_LENGTH,
        device: Optional[str] = None,
        local_files_only: bool = False,
    ):
        self.model_name = model_name
        self.max_length = max_length

        if device is None:
            self.device = torch.device(
                "cuda" if torch.cuda.is_available() else "cpu"
            )
        else:
            self.device = torch.device(device)

        print(f"Loading NLI model: {model_name}")
        print(f"Device: {self.device}")

        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            use_fast=False,
            local_files_only=local_files_only,
        )

        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            local_files_only=local_files_only,
        )

        self.model.to(self.device)
        self.model.eval()

        self.label_indices = self._resolve_label_indices()

        print("NLI model loaded successfully.")
        print("Label mapping:", self.label_indices)

    def _resolve_label_indices(self) -> dict[str, int]:
        """
        Resolve labels from model configuration.

        Some checkpoints expose generic LABEL_0/LABEL_1/LABEL_2 names.
        For our selected, documented checkpoint, use its published
        output order as a fallback.
        """
        id2label = getattr(self.model.config, "id2label", {}) or {}

        resolved = {}

        for raw_index, raw_label in id2label.items():
            try:
                index = int(raw_index)
            except (TypeError, ValueError):
                continue

            label = str(raw_label).strip().lower()

            if "contradiction" in label:
                resolved["contradiction"] = index
            elif "entailment" in label:
                resolved["entailment"] = index
            elif "neutral" in label:
                resolved["neutral"] = index

        expected = {
            "contradiction",
            "entailment",
            "neutral",
        }

        if set(resolved) == expected:
            return resolved

        # Explicit fallback for the selected checkpoint only.
        if self.model_name == MODEL_NAME:
            if self.model.config.num_labels != 3:
                raise ValueError(
                    "Expected three output labels for the selected NLI model."
                )

            return {
                label: index
                for index, label in enumerate(DOCUMENTED_LABEL_ORDER)
            }

        raise ValueError(
            "Unable to resolve NLI label mapping from model config. "
            f"Model: {self.model_name}, id2label: {id2label}"
        )

    def _infer(
        self,
        premise: str,
        hypothesis: str,
    ) -> NLIScores:

        premise = str(premise or "").strip()
        hypothesis = str(hypothesis or "").strip()

        if not premise or not hypothesis:
            raise ValueError(
                "NLI requires non-empty premise and hypothesis."
            )

        inputs = self.tokenizer(
            premise,
            hypothesis,
            truncation=True,
            max_length=self.max_length,
            padding=True,
            return_tensors="pt",
        )

        inputs = {
            key: value.to(self.device)
            for key, value in inputs.items()
        }

        with torch.inference_mode():
            outputs = self.model(**inputs)
            probabilities = torch.softmax(
                outputs.logits,
                dim=-1,
            )[0]

        return NLIScores(
            contradiction=float(
                probabilities[
                    self.label_indices["contradiction"]
                ].cpu()
            ),
            entailment=float(
                probabilities[
                    self.label_indices["entailment"]
                ].cpu()
            ),
            neutral=float(
                probabilities[
                    self.label_indices["neutral"]
                ].cpu()
            ),
        )

    def analyze_pair(
        self,
        old_text: str,
        new_text: str,
        change_id: str = "",
        change_type: str = "MODIFIED",
    ) -> NLIResult:
        """
        Run NLI in both directions.

        OLD -> NEW:
            premise = old_text
            hypothesis = new_text

        NEW -> OLD:
            premise = new_text
            hypothesis = old_text
        """

        old_text = str(old_text or "").strip()
        new_text = str(new_text or "").strip()

        if not old_text or not new_text:
            raise ValueError(
                "Both OLD and NEW text are required for pair analysis."
            )

        old_to_new = self._infer(
            premise=old_text,
            hypothesis=new_text,
        )

        new_to_old = self._infer(
            premise=new_text,
            hypothesis=old_text,
        )

        return NLIResult(
            change_id=change_id,
            change_type=change_type,
            old_to_new=old_to_new,
            new_to_old=new_to_old,
            model_name=self.model_name,
        )

    @staticmethod
    def _extract_text(
        clauses: list[Any],
        fallback: Any = None,
    ) -> str:

        if clauses:
            return " ".join(
                str(getattr(clause, "text", "")).strip()
                for clause in clauses
                if str(getattr(clause, "text", "")).strip()
            ).strip()

        if fallback is not None:
            return str(
                getattr(fallback, "text", "")
            ).strip()

        return ""

    def analyze_change(self, change: Any) -> NLIResult:
        """
        Accept a ClauseChange-like object.

        MODIFIED / RESTRUCTURED:
            Run bidirectional NLI.

        ADDED / DELETED / UNCHANGED:
            Return no pair scores. There is no genuine pair to compare.
        """

        change_id = str(
            getattr(change, "change_id", "")
        )

        change_type = str(
            getattr(change, "change_type", "")
        )

        old_clauses = (
            getattr(change, "old_clauses", []) or []
        )

        new_clauses = (
            getattr(change, "new_clauses", []) or []
        )

        old_text = self._extract_text(
            old_clauses,
            getattr(change, "old_clause", None),
        )

        new_text = self._extract_text(
            new_clauses,
            getattr(change, "new_clause", None),
        )

        if change_type in {"MODIFIED", "RESTRUCTURED"}:

            if not old_text or not new_text:
                raise ValueError(
                    f"{change_type} event {change_id} "
                    "requires both OLD and NEW text."
                )

            return self.analyze_pair(
                old_text=old_text,
                new_text=new_text,
                change_id=change_id,
                change_type=change_type,
            )

        if change_type in {
            "ADDED",
            "DELETED",
            "UNCHANGED",
        }:
            return NLIResult(
                change_id=change_id,
                change_type=change_type,
                old_to_new=None,
                new_to_old=None,
                model_name=self.model_name,
            )

        raise ValueError(
            f"Unsupported change type: {change_type}"
        )

    def analyze_many(
        self,
        changes: list[Any],
    ) -> list[NLIResult]:

        return [
            self.analyze_change(change)
            for change in changes
        ]
