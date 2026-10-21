#!/usr/bin/env python
"""
SneakyToS - Candidate Generation v1

Inputs (same directory as this script by default):
  segmented_policy_clauses.csv
  qc_out_v3_fixed/transition_qc.csv
  qc_out_v3_fixed/clause_qc.csv

Outputs:
  candidate_out_v1/
    clause_alignments.csv
    candidate_changes.csv
    candidate_summary.json

Design goals:
  - high recall; this stage does NOT assign research labels
  - one-to-one semantic clause alignment
  - preserve ADDED / DELETED clauses
  - keep QC provenance
  - keep rights/practice signals as FEATURES, not labels
  - deterministic given the same model/library versions and seed
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer


SEED = 42
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# A relatively permissive threshold is intentional: this is alignment, not
# classification. Weak pairs become ADDED/DELETED instead of being forced
# together.
ALIGN_THRESHOLD = 0.55

# A matched pair is considered "unchanged" only when both semantic and
# surface evidence say that very little changed.
UNCHANGED_SEMANTIC = 0.94
UNCHANGED_LEXICAL = 0.10

MIN_CANDIDATE_WORDS = 5
BATCH_SIZE = 128


# Broad practice/scope vocabulary. These are FEATURES only; they do not
# determine the gold label.
SIGNAL_PATTERNS = {
    "data_collection": r"\b(collect|obtain|gather|receive|capture|record|store)\b",
    "data_use": r"\b(use|process|analy[sz]e|improve|develop|provide|personalize)\b",
    "sharing": r"\b(share|disclose|transfer|provide|sell|rent|exchange)\b",
    "third_party": r"\b(third[- ]part(?:y|ies)|partner|vendor|service provider|affiliate)\b",
    "purpose": r"\b(purpose|reason|provide|improve|develop|research|marketing|advertis)\w*\b",
    "retention": r"\b(retain|retention|keep|preserve|delete|deletion|erase|storage)\b",
    "tracking": r"\b(cookie|tracking|track|analytics|pixel|beacon|advertis)\w*\b",
    "control": r"\b(opt[- ]?out|consent|choice|control|access|correct|delete|withdraw|object|preference)\b",
    "ai_training": r"\b(artificial intelligence|machine learning|training|train|model|generative ai|ai systems?)\b",
    "scope": r"\b(any|all|including|such as|for example|other|additional|certain|wherever|worldwide|globally)\b",
}

WORD_RE = re.compile(r"\b[\w'-]+\b", re.UNICODE)


def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", str(s)).strip()


def words(s: str) -> List[str]:
    return WORD_RE.findall(normalize_text(s).lower())


def lexical_similarity(a: str, b: str) -> float:
    """Token-set Jaccard similarity."""
    sa, sb = set(words(a)), set(words(b))
    if not sa and not sb:
        return 1.0
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def token_change_ratio(a: str, b: str) -> float:
    """Symmetric token-set change ratio in [0,1]."""
    sa, sb = set(words(a)), set(words(b))
    union = sa | sb
    if not union:
        return 0.0
    return len(sa ^ sb) / len(union)


def char_change_ratio(a: str, b: str) -> float:
    """Cheap normalized character edit proxy based on SequenceMatcher."""
    from difflib import SequenceMatcher
    a = normalize_text(a).lower()
    b = normalize_text(b).lower()
    if not a and not b:
        return 0.0
    return 1.0 - SequenceMatcher(None, a, b).ratio()


def signal_features(text: str) -> Dict[str, int]:
    text = normalize_text(text).lower()
    return {name: int(bool(re.search(pattern, text))) for name, pattern in SIGNAL_PATTERNS.items()}


def add_signal_features(row: Dict, old_text: str, new_text: str) -> None:
    old_sig = signal_features(old_text)
    new_sig = signal_features(new_text)
    for name in SIGNAL_PATTERNS:
        row[f"old_{name}"] = old_sig[name]
        row[f"new_{name}"] = new_sig[name]
        row[f"changed_{name}"] = int(old_sig[name] != new_sig[name])

    old_count = sum(old_sig.values())
    new_count = sum(new_sig.values())
    row["old_rights_signal_count"] = old_count
    row["new_rights_signal_count"] = new_count
    row["rights_signal_change_count"] = abs(new_count - old_count)


def greedy_one_to_one_alignment(
    old_indices: List[int],
    new_indices: List[int],
    sim_matrix: np.ndarray,
    threshold: float,
) -> List[Tuple[int, int, float]]:
    """
    Greedy maximum-similarity one-to-one alignment.

    We intentionally do not force every clause into a match. Pairs below the
    threshold remain unmatched and are represented as ADDED/DELETED.
    """
    if not old_indices or not new_indices:
        return []

    candidates = []
    for i in old_indices:
        for j in new_indices:
            candidates.append((float(sim_matrix[i, j]), i, j))

    candidates.sort(reverse=True, key=lambda x: x[0])

    used_old = set()
    used_new = set()
    matches = []

    for sim, i, j in candidates:
        if sim < threshold:
            break
        if i in used_old or j in used_new:
            continue
        used_old.add(i)
        used_new.add(j)
        matches.append((i, j, sim))

    return matches


def process_transition(
    old_df: pd.DataFrame,
    new_df: pd.DataFrame,
    old_embeddings: np.ndarray,
    new_embeddings: np.ndarray,
    transition_meta: Dict,
    qc_masked: Dict[Tuple[str, str, int], int],
) -> Tuple[List[Dict], List[Dict]]:
    """
    Returns:
      alignment rows
      candidate rows
    """
    old_texts = old_df["clause_text"].tolist()
    new_texts = new_df["clause_text"].tolist()

    sim = np.matmul(old_embeddings, new_embeddings.T)

    matches = greedy_one_to_one_alignment(
        list(range(len(old_texts))),
        list(range(len(new_texts))),
        sim,
        ALIGN_THRESHOLD,
    )

    matched_old = {i for i, _, _ in matches}
    matched_new = {j for _, j, _ in matches}

    alignments = []
    candidates = []

    candidate_counter = 0

    def base_row(change_type: str, old_i=None, new_j=None, similarity=np.nan):
        nonlocal candidate_counter
        candidate_counter += 1

        old_row = old_df.iloc[old_i] if old_i is not None else None
        new_row = new_df.iloc[new_j] if new_j is not None else None

        old_text = old_row["clause_text"] if old_row is not None else ""
        new_text = new_row["clause_text"] if new_row is not None else ""

        lex = lexical_similarity(old_text, new_text) if old_i is not None and new_j is not None else 0.0
        tok_change = token_change_ratio(old_text, new_text) if old_i is not None and new_j is not None else 1.0
        char_change = char_change_ratio(old_text, new_text) if old_i is not None and new_j is not None else 1.0

        semantic_change = 1.0 - float(similarity) if not np.isnan(similarity) else 1.0

        # Candidate score is deliberately based on change evidence only.
        # Rights signals remain separate features to avoid baking our
        # hypothesis into candidate generation.
        if change_type == "MODIFIED":
            change_score = 0.60 * semantic_change + 0.25 * tok_change + 0.15 * char_change
        else:
            change_score = 1.0

        row = {
            **transition_meta,
            "candidate_id": f"{transition_meta['transition_id']}_{candidate_counter}",
            "change_type": change_type,
            "old_clause_id": int(old_row["clause_id"]) if old_row is not None else np.nan,
            "new_clause_id": int(new_row["clause_id"]) if new_row is not None else np.nan,
            "old_section": old_row["section"] if old_row is not None else "",
            "new_section": new_row["section"] if new_row is not None else "",
            "old_text": old_text,
            "new_text": new_text,
            "semantic_similarity": float(similarity) if not np.isnan(similarity) else np.nan,
            "semantic_change": semantic_change,
            "lexical_similarity": lex,
            "token_change_ratio": tok_change,
            "char_change_ratio": char_change,
            "old_word_count": len(words(old_text)),
            "new_word_count": len(words(new_text)),
            "length_change_ratio": (
                abs(len(words(new_text)) - len(words(old_text)))
                / max(len(words(old_text)), len(words(new_text)), 1)
            ),
            "change_score": float(change_score),
            "qc_masked_old": int(
                qc_masked.get(
                    (transition_meta["transition_id"], "OLD",
                     int(old_row["clause_id"]) if old_row is not None else -1), 0
                )
            ),
            "qc_masked_new": int(
                qc_masked.get(
                    (transition_meta["transition_id"], "NEW",
                     int(new_row["clause_id"]) if new_row is not None else -1), 0
                )
            ),
        }

        add_signal_features(row, old_text, new_text)

        row["qc_masked_any"] = int(row["qc_masked_old"] or row["qc_masked_new"])

        # A transparent priority bucket, NOT a research label.
        if change_type in ("ADDED", "DELETED"):
            row["priority_bucket"] = "HIGH_CHANGE"
        elif (
            row["semantic_similarity"] <= UNCHANGED_SEMANTIC
            or row["token_change_ratio"] >= UNCHANGED_LEXICAL
        ):
            row["priority_bucket"] = "CHANGE"
        else:
            row["priority_bucket"] = "UNCHANGED"

        return row

    # Matched pairs
    for old_i, new_j, similarity in matches:
        old_text = old_texts[old_i]
        new_text = new_texts[new_j]

        row = base_row("MODIFIED", old_i, new_j, similarity)

        alignments.append({
            **transition_meta,
            "old_clause_id": int(old_df.iloc[old_i]["clause_id"]),
            "new_clause_id": int(new_df.iloc[new_j]["clause_id"]),
            "old_text": old_text,
            "new_text": new_text,
            "semantic_similarity": float(similarity),
            "lexical_similarity": lexical_similarity(old_text, new_text),
            "token_change_ratio": token_change_ratio(old_text, new_text),
            "alignment_status": "MATCHED",
        })

        if row["priority_bucket"] != "UNCHANGED":
            candidates.append(row)

    # Unmatched OLD = deleted
    for old_i in range(len(old_texts)):
        if old_i in matched_old:
            continue

        row = base_row("DELETED", old_i, None, np.nan)
        candidates.append(row)

        alignments.append({
            **transition_meta,
            "old_clause_id": int(old_df.iloc[old_i]["clause_id"]),
            "new_clause_id": np.nan,
            "old_text": old_texts[old_i],
            "new_text": "",
            "semantic_similarity": np.nan,
            "lexical_similarity": 0.0,
            "token_change_ratio": 1.0,
            "alignment_status": "DELETED",
        })

    # Unmatched NEW = added
    for new_j in range(len(new_texts)):
        if new_j in matched_new:
            continue

        row = base_row("ADDED", None, new_j, np.nan)
        candidates.append(row)

        alignments.append({
            **transition_meta,
            "old_clause_id": np.nan,
            "new_clause_id": int(new_df.iloc[new_j]["clause_id"]),
            "old_text": "",
            "new_text": new_texts[new_j],
            "semantic_similarity": np.nan,
            "lexical_similarity": 0.0,
            "token_change_ratio": 1.0,
            "alignment_status": "ADDED",
        })

    return alignments, candidates


def load_qc_masked(path: Path) -> Dict[Tuple[str, str, int], int]:
    if not path.exists():
        return {}

    df = pd.read_csv(path)
    required = {"transition_id", "version", "clause_id"}
    if not required.issubset(df.columns):
        print("Warning: clause_qc.csv does not have expected columns; QC masks will be unavailable.")
        return {}

    # Be permissive because QC versions may name the confidence/mask field
    # slightly differently.
    mask_col = None
    for c in ["mask", "masked", "qc_masked", "decision"]:
        if c in df.columns:
            mask_col = c
            break

    if mask_col is None:
        # v3 commonly exposes confidence/decision information. If no explicit
        # mask column exists, treat HIGH-confidence rows as masked only when
        # the row clearly indicates HIGH.
        if "confidence" in df.columns:
            df["_mask"] = df["confidence"].astype(str).str.upper().eq("HIGH")
            mask_col = "_mask"
        else:
            return {}

    result = {}
    for _, r in df.iterrows():
        value = r[mask_col]
        if isinstance(value, str):
            is_masked = value.strip().upper() in {"1", "TRUE", "YES", "MASK", "MASKED", "HIGH"}
        else:
            is_masked = bool(value)
        result[(str(r["transition_id"]), str(r["version"]), int(r["clause_id"]))] = int(is_masked)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="segmented_policy_clauses.csv")
    parser.add_argument("--qc-dir", default="qc_out_v3_fixed")
    parser.add_argument("--outdir", default="candidate_out_v1")
    parser.add_argument("--model", default=MODEL_NAME)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--align-threshold", type=float, default=ALIGN_THRESHOLD)
    args = parser.parse_args()

    np.random.seed(SEED)

    input_path = Path(args.input)
    qc_dir = Path(args.qc_dir)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("SneakyToS - Candidate Generation v1")
    print("=" * 70)

    df = pd.read_csv(input_path)
    required = {
        "transition_id", "site_id", "domain", "normalized_domain",
        "old_year", "old_phase", "new_year", "new_phase",
        "version", "clause_id", "section", "clause_text"
    }
    missing = required - set(df.columns)
    if missing:
        raise RuntimeError(f"Missing required columns: {sorted(missing)}")

    df["clause_text"] = df["clause_text"].fillna("").map(normalize_text)
    df = df[df["clause_text"].str.len() > 0].copy()

    qc_transition_path = qc_dir / "transition_qc.csv"
    qc_clause_path = qc_dir / "clause_qc.csv"

    qc_transition = pd.read_csv(qc_transition_path) if qc_transition_path.exists() else pd.DataFrame()
    qc_masked = load_qc_masked(qc_clause_path)

    transitions = df["transition_id"].drop_duplicates().tolist()

    print(f"Input clauses       : {len(df):,}")
    print(f"Transitions         : {len(transitions):,}")
    print(f"Model               : {args.model}")
    print(f"Alignment threshold : {args.align_threshold:.2f}")
    print()

    model = SentenceTransformer(args.model)

    # Encode each unique clause once.
    unique_texts = df["clause_text"].drop_duplicates().tolist()
    print(f"Unique clause texts  : {len(unique_texts):,}")
    print("Encoding clauses...")

    embeddings = model.encode(
        unique_texts,
        batch_size=args.batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)

    embedding_lookup = {
        text: embeddings[i] for i, text in enumerate(unique_texts)
    }

    all_alignments = []
    all_candidates = []

    for n, transition_id in enumerate(transitions, 1):
        tdf = df[df["transition_id"] == transition_id]
        old_df = tdf[tdf["version"] == "OLD"].copy().reset_index(drop=True)
        new_df = tdf[tdf["version"] == "NEW"].copy().reset_index(drop=True)

        if old_df.empty or new_df.empty:
            raise RuntimeError(f"Incomplete transition: {transition_id}")

        old_emb = np.vstack([embedding_lookup[t] for t in old_df["clause_text"]])
        new_emb = np.vstack([embedding_lookup[t] for t in new_df["clause_text"]])

        first = tdf.iloc[0]
        transition_meta = {
            "transition_id": transition_id,
            "site_id": int(first["site_id"]),
            "domain": first["domain"],
            "normalized_domain": first["normalized_domain"],
            "old_year": int(first["old_year"]),
            "old_phase": first["old_phase"],
            "new_year": int(first["new_year"]),
            "new_phase": first["new_phase"],
        }

        if not qc_transition.empty and "transition_id" in qc_transition.columns:
            q = qc_transition[qc_transition["transition_id"].astype(str) == str(transition_id)]
            if not q.empty and "qc_status" in q.columns:
                transition_meta["qc_status"] = q.iloc[0]["qc_status"]
            else:
                transition_meta["qc_status"] = "UNKNOWN"
        else:
            transition_meta["qc_status"] = "UNKNOWN"

        aligns, candidates = process_transition(
            old_df, new_df, old_emb, new_emb, transition_meta, qc_masked
        )

        all_alignments.extend(aligns)
        all_candidates.extend(candidates)

        if n % 100 == 0 or n == len(transitions):
            print(f"Processed {n:,}/{len(transitions):,} transitions")

    align_df = pd.DataFrame(all_alignments)
    cand_df = pd.DataFrame(all_candidates)

    if not cand_df.empty:
        # Stable deterministic ordering.
        cand_df = cand_df.sort_values(
            ["change_score", "rights_signal_change_count", "transition_id"],
            ascending=[False, False, True],
            kind="mergesort",
        ).reset_index(drop=True)

        cand_df.insert(0, "candidate_rank", np.arange(1, len(cand_df) + 1))

    align_path = outdir / "clause_alignments.csv"
    cand_path = outdir / "candidate_changes.csv"
    summary_path = outdir / "candidate_summary.json"

    align_df.to_csv(align_path, index=False)
    cand_df.to_csv(cand_path, index=False)

    summary = {
        "seed": SEED,
        "model": args.model,
        "alignment_threshold": args.align_threshold,
        "input_clauses": int(len(df)),
        "input_transitions": int(len(transitions)),
        "alignment_rows": int(len(align_df)),
        "candidate_rows": int(len(cand_df)),
        "candidate_by_type": (
            cand_df["change_type"].value_counts().to_dict()
            if not cand_df.empty else {}
        ),
        "candidate_by_priority": (
            cand_df["priority_bucket"].value_counts().to_dict()
            if not cand_df.empty else {}
        ),
        "candidate_by_domain": (
            cand_df["normalized_domain"].value_counts().to_dict()
            if not cand_df.empty else {}
        ),
        "qc_status": (
            cand_df["qc_status"].value_counts().to_dict()
            if not cand_df.empty and "qc_status" in cand_df.columns else {}
        ),
        "qc_masked_candidates": (
            int(cand_df["qc_masked_any"].sum())
            if not cand_df.empty else 0
        ),
    }

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print()
    print("=" * 70)
    print("CANDIDATE GENERATION RESULTS")
    print("=" * 70)
    print(f"Alignment rows       : {len(align_df):,}")
    print(f"Candidate rows       : {len(cand_df):,}")

    if not cand_df.empty:
        print("\nCandidate type:")
        print(cand_df["change_type"].value_counts().to_string())

        print("\nPriority bucket:")
        print(cand_df["priority_bucket"].value_counts().to_string())

        print("\nDomain:")
        print(cand_df["normalized_domain"].value_counts().to_string())

        print(f"\nQC-masked candidates: {int(cand_df['qc_masked_any'].sum()):,}")

    print("\nCreated:")
    print(f"  {align_path}")
    print(f"  {cand_path}")
    print(f"  {summary_path}")


if __name__ == "__main__":
    main()
