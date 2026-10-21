import os
import re
import json
import math
import argparse
from collections import Counter, defaultdict

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer


# ============================================================
# CONFIG
# ============================================================

SEED = 42

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Coverage thresholds
COVERAGE_HIGH = 0.80
COVERAGE_MEDIUM = 0.60

# Semantic background sample
BACKGROUND_PAIRS_PER_TRANSITION = 20

# Number of opposite-side clauses used for coverage
TOP_K = 5

# Minimum n-gram size
NGRAM_N = 3

# Hubness threshold
HUB_SIM_THRESHOLD = 0.60


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text):
    """
    Conservative normalization for exact duplicate detection.
    Does NOT remove meaningful words.
    """
    if pd.isna(text):
        return ""

    text = str(text).lower()

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # Remove simple markdown emphasis/backticks
    text = re.sub(r"[*_`]", "", text)

    # Normalize curly quotes/dashes
    replacements = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u00a0": " ",
    }

    for a, b in replacements.items():
        text = text.replace(a, b)

    return text.strip()


def tokenize(text):
    """
    Tokenization for lexical coverage.
    """
    if pd.isna(text):
        return []

    return re.findall(r"\b[a-zA-Z0-9]+(?:['-][a-zA-Z0-9]+)*\b", str(text).lower())


def ngrams(tokens, n=NGRAM_N):
    if len(tokens) < n:
        return set()

    return {
        tuple(tokens[i:i+n])
        for i in range(len(tokens) - n + 1)
    }


# ============================================================
# COVERAGE
# ============================================================

def lexical_coverage(query_text, candidate_texts):
    """
    Measures what fraction of query n-grams occur in the
    UNION of candidate n-grams.

    This is deliberately directional.

    coverage(NEW, OLD) asks:

        How much of NEW is already represented by OLD?

    coverage(OLD, NEW) asks:

        How much of OLD is represented by NEW?
    """

    query_tokens = tokenize(query_text)

    if len(query_tokens) < NGRAM_N:
        # Fall back to token coverage for very short clauses.
        q = set(query_tokens)

        if not q:
            return 0.0

        candidate_tokens = set()

        for text in candidate_texts:
            candidate_tokens.update(tokenize(text))

        return len(q & candidate_tokens) / len(q)

    query_ngrams = ngrams(query_tokens)

    candidate_ngrams = set()

    for text in candidate_texts:
        candidate_ngrams.update(ngrams(tokenize(text)))

    if not query_ngrams:
        return 0.0

    return len(query_ngrams & candidate_ngrams) / len(query_ngrams)


# ============================================================
# ID NORMALIZATION
# ============================================================

def clean_id(x):
    if pd.isna(x):
        return ""

    if isinstance(x, float) and x.is_integer():
        return str(int(x))

    return str(x)


# ============================================================
# MAIN
# ============================================================

def main():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--alignments",
        default="candidate_out_v1/clause_alignments.csv"
    )

    parser.add_argument(
        "--segmented",
        default="segmented_policy_clauses.csv"
    )

    parser.add_argument(
        "--outdir",
        default="alignment_diagnostics"
    )

    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    np.random.seed(SEED)

    print("=" * 70)
    print("SneakyToS Alignment Diagnostics v2")
    print("=" * 70)

    print(f"\nLoading alignments:")
    print(f"  {args.alignments}")

    align = pd.read_csv(args.alignments)

    print(f"Alignment rows: {len(align):,}")

    required = [
        "transition_id",
        "site_id",
        "normalized_domain",
        "old_clause_id",
        "new_clause_id",
        "old_text",
        "new_text",
        "semantic_similarity",
        "alignment_status",
    ]

    missing = [c for c in required if c not in align.columns]

    if missing:
        raise RuntimeError(
            f"Missing required columns: {missing}"
        )

    # Normalize IDs
    align["transition_id"] = align["transition_id"].map(clean_id)
    align["old_clause_id"] = align["old_clause_id"].map(clean_id)
    align["new_clause_id"] = align["new_clause_id"].map(clean_id)

    # ========================================================
    # BASIC COUNTS
    # ========================================================

    print("\nAlignment status:")
    print(
        align["alignment_status"]
        .value_counts()
        .to_string()
    )

    unmatched = align[
        align["alignment_status"].isin(["ADDED", "DELETED"])
    ].copy()

    print(
        f"\nTotal unmatched clauses: {len(unmatched):,}"
    )

    # ========================================================
    # BUILD TRANSITION INVENTORIES
    # ========================================================

    transition_groups = {}

    for tid, g in align.groupby("transition_id", sort=False):

        old_rows = (
            g[g["old_clause_id"] != ""]
            [["old_clause_id", "old_text", "alignment_status"]]
            .drop_duplicates("old_clause_id")
            .copy()
        )

        new_rows = (
            g[g["new_clause_id"] != ""]
            [["new_clause_id", "new_text", "alignment_status"]]
            .drop_duplicates("new_clause_id")
            .copy()
        )

        transition_groups[tid] = {
            "all": g,
            "old": old_rows,
            "new": new_rows,
        }

    print(
        f"Transitions analyzed: {len(transition_groups):,}"
    )

    # ========================================================
    # DIAGNOSTIC 1:
    # EXACT NORMALIZED-TEXT DUPLICATES
    # ========================================================

    print("\n" + "=" * 70)
    print("DIAGNOSTIC 1 — EXACT NORMALIZED DUPLICATES")
    print("=" * 70)

    duplicate_rows = []

    for tid, data in transition_groups.items():

        old = data["old"]
        new = data["new"]

        old_map = defaultdict(list)
        new_map = defaultdict(list)

        for _, r in old.iterrows():
            text = normalize_text(r["old_text"])

            if text:
                old_map[text].append(r["old_clause_id"])

        for _, r in new.iterrows():
            text = normalize_text(r["new_text"])

            if text:
                new_map[text].append(r["new_clause_id"])

        # ADDED clauses with exact OLD twin
        for _, r in new.iterrows():

            if r["alignment_status"] != "ADDED":
                continue

            norm = normalize_text(r["new_text"])

            if norm in old_map:

                for old_id in old_map[norm]:

                    duplicate_rows.append({
                        "transition_id": tid,
                        "relation": "ADDED_HAS_OLD_EXACT_TWIN",
                        "old_clause_id": old_id,
                        "new_clause_id": r["new_clause_id"],
                        "old_text": old.loc[
                            old["old_clause_id"] == old_id,
                            "old_text"
                        ].iloc[0],
                        "new_text": r["new_text"],
                    })

        # DELETED clauses with exact NEW twin
        for _, r in old.iterrows():

            if r["alignment_status"] != "DELETED":
                continue

            norm = normalize_text(r["old_text"])

            if norm in new_map:

                for new_id in new_map[norm]:

                    duplicate_rows.append({
                        "transition_id": tid,
                        "relation": "DELETED_HAS_NEW_EXACT_TWIN",
                        "old_clause_id": r["old_clause_id"],
                        "new_clause_id": new_id,
                        "old_text": r["old_text"],
                        "new_text": new.loc[
                            new["new_clause_id"] == new_id,
                            "new_text"
                        ].iloc[0],
                    })

    duplicate_df = pd.DataFrame(duplicate_rows)

    duplicate_path = os.path.join(
        args.outdir,
        "unmatched_exact_duplicates.csv"
    )

    duplicate_df.to_csv(
        duplicate_path,
        index=False
    )

    print(
        f"Unmatched clauses with exact normalized twin: "
        f"{len(duplicate_df):,}"
    )

    if len(unmatched) > 0:
        print(
            f"Approx. duplicate residue: "
            f"{100 * len(duplicate_df) / len(unmatched):.2f}%"
        )

    # ========================================================
    # DIAGNOSTIC 2:
    # N-GRAM COVERAGE
    # ========================================================

    print("\n" + "=" * 70)
    print("DIAGNOSTIC 2 — N-GRAM COVERAGE")
    print("=" * 70)

    coverage_rows = []

    for counter, (tid, data) in enumerate(
        transition_groups.items(),
        start=1
    ):

        old = data["old"]
        new = data["new"]

        old_texts = old["old_text"].tolist()
        new_texts = new["new_text"].tolist()

        # ----------------------------------------------------
        # ADDED: how much NEW is covered by OLD?
        # ----------------------------------------------------

        for _, r in new.iterrows():

            if r["alignment_status"] != "ADDED":
                continue

            query = r["new_text"]

            # First calculate individual lexical overlap
            individual = []

            for _, o in old.iterrows():

                c = lexical_coverage(
                    query,
                    [o["old_text"]]
                )

                individual.append(
                    (c, o["old_clause_id"], o["old_text"])
                )

            individual.sort(
                key=lambda x: x[0],
                reverse=True
            )

            top = individual[:TOP_K]

            coverage = lexical_coverage(
                query,
                [x[2] for x in top]
            )

            coverage_rows.append({
                "transition_id": tid,
                "direction": "NEW_COVERED_BY_OLD",
                "clause_id": r["new_clause_id"],
                "clause_text": query,
                "coverage": coverage,
                "top1_clause_id": top[0][1] if top else "",
                "top1_coverage": top[0][0] if top else 0.0,
                "top2_clause_id": top[1][1] if len(top) > 1 else "",
                "top3_clause_id": top[2][1] if len(top) > 2 else "",
                "status": (
                    "HIGH_COVERAGE"
                    if coverage >= COVERAGE_HIGH
                    else "MEDIUM_COVERAGE"
                    if coverage >= COVERAGE_MEDIUM
                    else "LOW_COVERAGE"
                ),
            })

        # ----------------------------------------------------
        # DELETED: how much OLD is covered by NEW?
        # ----------------------------------------------------

        for _, r in old.iterrows():

            if r["alignment_status"] != "DELETED":
                continue

            query = r["old_text"]

            individual = []

            for _, n in new.iterrows():

                c = lexical_coverage(
                    query,
                    [n["new_text"]]
                )

                individual.append(
                    (c, n["new_clause_id"], n["new_text"])
                )

            individual.sort(
                key=lambda x: x[0],
                reverse=True
            )

            top = individual[:TOP_K]

            coverage = lexical_coverage(
                query,
                [x[2] for x in top]
            )

            coverage_rows.append({
                "transition_id": tid,
                "direction": "OLD_COVERED_BY_NEW",
                "clause_id": r["old_clause_id"],
                "clause_text": query,
                "coverage": coverage,
                "top1_clause_id": top[0][1] if top else "",
                "top1_coverage": top[0][0] if top else 0.0,
                "top2_clause_id": top[1][1] if len(top) > 1 else "",
                "top3_clause_id": top[2][1] if len(top) > 2 else "",
                "status": (
                    "HIGH_COVERAGE"
                    if coverage >= COVERAGE_HIGH
                    else "MEDIUM_COVERAGE"
                    if coverage >= COVERAGE_MEDIUM
                    else "LOW_COVERAGE"
                ),
            })

        if counter % 100 == 0:
            print(
                f"Processed coverage: "
                f"{counter:,}/{len(transition_groups):,}"
            )

    coverage_df = pd.DataFrame(coverage_rows)

    coverage_path = os.path.join(
        args.outdir,
        "unmatched_coverage.csv"
    )

    coverage_df.to_csv(
        coverage_path,
        index=False
    )

    print("\nCoverage summary:")

    if len(coverage_df):

        print(
            coverage_df["status"]
            .value_counts()
            .to_string()
        )

        print("\nCoverage statistics:")

        print(
            coverage_df["coverage"]
            .describe(
                percentiles=[
                    0.25,
                    0.50,
                    0.75,
                    0.90,
                    0.95,
                    0.99,
                ]
            )
            .to_string()
        )

    # ========================================================
    # DIAGNOSTIC 3:
    # HUBNESS
    # ========================================================

    print("\n" + "=" * 70)
    print("DIAGNOSTIC 3 — SEMANTIC HUBNESS")
    print("=" * 70)

    model = SentenceTransformer(
        MODEL_NAME
    )

    # Collect all unique texts from unmatched clauses
    all_texts = []

    all_texts.extend(
        unmatched["old_text"]
        .dropna()
        .astype(str)
        .tolist()
    )

    all_texts.extend(
        unmatched["new_text"]
        .dropna()
        .astype(str)
        .tolist()
    )

    # Also need opposite-side matched clauses as possible hubs.
    matched = align[
        align["alignment_status"] == "MATCHED"
    ]

    all_texts.extend(
        matched["old_text"]
        .dropna()
        .astype(str)
        .tolist()
    )

    all_texts.extend(
        matched["new_text"]
        .dropna()
        .astype(str)
        .tolist()
    )

    all_texts = list(
        dict.fromkeys(all_texts)
    )

    print(
        f"Unique texts to encode: {len(all_texts):,}"
    )

    embeddings = model.encode(
        all_texts,
        batch_size=256,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True
    )

    text_to_idx = {
        text: i
        for i, text in enumerate(all_texts)
    }

    # --------------------------------------------------------
    # For each transition, calculate best opposite-side
    # semantic neighbour for unmatched clauses.
    # --------------------------------------------------------

    hub_counter = Counter()

    hub_rows = []

    for counter, (tid, data) in enumerate(
        transition_groups.items(),
        start=1
    ):

        old = data["old"]
        new = data["new"]

        if len(old) == 0 or len(new) == 0:
            continue

        old_texts_local = old["old_text"].astype(str).tolist()
        new_texts_local = new["new_text"].astype(str).tolist()

        old_emb = embeddings[
            [text_to_idx[t] for t in old_texts_local]
        ]

        new_emb = embeddings[
            [text_to_idx[t] for t in new_texts_local]
        ]

        sim = new_emb @ old_emb.T

        old_ids = old["old_clause_id"].tolist()
        new_ids = new["new_clause_id"].tolist()

        old_status = dict(
            zip(
                old["old_clause_id"],
                old["alignment_status"]
            )
        )

        new_status = dict(
            zip(
                new["new_clause_id"],
                new["alignment_status"]
            )
        )

        # ----------------------------------------------------
        # ADDED → best OLD
        # ----------------------------------------------------

        for i, new_id in enumerate(new_ids):

            if new_status[new_id] != "ADDED":
                continue

            j = int(np.argmax(sim[i]))
            score = float(sim[i, j])
            old_id = old_ids[j]

            if score >= HUB_SIM_THRESHOLD:

                key = (
                    tid,
                    "OLD",
                    old_id
                )

                hub_counter[key] += 1

                hub_rows.append({
                    "transition_id": tid,
                    "direction": "ADDED_TO_OLD",
                    "unmatched_clause_id": new_id,
                    "hub_clause_id": old_id,
                    "similarity": score,
                    "hub_status": old_status[old_id],
                })

        # ----------------------------------------------------
        # DELETED → best NEW
        # ----------------------------------------------------

        for j, old_id in enumerate(old_ids):

            if old_status[old_id] != "DELETED":
                continue

            i = int(np.argmax(sim[:, j]))
            score = float(sim[i, j])
            new_id = new_ids[i]

            if score >= HUB_SIM_THRESHOLD:

                key = (
                    tid,
                    "NEW",
                    new_id
                )

                hub_counter[key] += 1

                hub_rows.append({
                    "transition_id": tid,
                    "direction": "DELETED_TO_NEW",
                    "unmatched_clause_id": old_id,
                    "hub_clause_id": new_id,
                    "similarity": score,
                    "hub_status": new_status[new_id],
                })

        if counter % 100 == 0:
            print(
                f"Processed hubness: "
                f"{counter:,}/{len(transition_groups):,}"
            )

    hub_df = pd.DataFrame(hub_rows)

    hub_path = os.path.join(
        args.outdir,
        "unmatched_hubness.csv"
    )

    hub_df.to_csv(
        hub_path,
        index=False
    )

    if len(hub_df):

        hub_counts = (
            hub_df
            .groupby(
                [
                    "transition_id",
                    "direction",
                    "hub_clause_id",
                ]
            )
            .size()
            .reset_index(
                name="unmatched_clauses_pointing_to_hub"
            )
            .sort_values(
                "unmatched_clauses_pointing_to_hub",
                ascending=False
            )
        )

        hub_counts_path = os.path.join(
            args.outdir,
            "hubness_summary.csv"
        )

        hub_counts.to_csv(
            hub_counts_path,
            index=False
        )

        print("\nTop semantic hubs:")

        print(
            hub_counts.head(20)
            .to_string(index=False)
        )

        print("\nHubness statistics:")

        print(
            hub_counts[
                "unmatched_clauses_pointing_to_hub"
            ]
            .describe(
                percentiles=[
                    0.50,
                    0.75,
                    0.90,
                    0.95,
                    0.99,
                ]
            )
            .to_string()
        )

    # ========================================================
    # DIAGNOSTIC 4:
    # BACKGROUND COSINE
    # ========================================================

    print("\n" + "=" * 70)
    print("DIAGNOSTIC 4 — EMPIRICAL BACKGROUND COSINE")
    print("=" * 70)

    # Build site-level clause pools.
    # We only use MATCHED/UNMATCHED texts from the alignment file.
    #
    # Background pairs are drawn from OTHER SITES but the SAME
    # normalized domain where possible.

    transition_meta = (
        align[
            [
                "transition_id",
                "site_id",
                "normalized_domain"
            ]
        ]
        .drop_duplicates("transition_id")
    )

    site_domain = (
        transition_meta
        .groupby("site_id")["normalized_domain"]
        .first()
        .to_dict()
    )

    # Build text pools by domain/site.
    site_texts = defaultdict(list)

    for _, r in align.iterrows():

        site = clean_id(r["site_id"])
        domain = str(r["normalized_domain"])

        if pd.notna(r["old_text"]):
            site_texts[(site, domain)].append(
                str(r["old_text"])
            )

        if pd.notna(r["new_text"]):
            site_texts[(site, domain)].append(
                str(r["new_text"])
            )

    # Deduplicate within each site
    for key in list(site_texts.keys()):
        site_texts[key] = list(
            dict.fromkeys(site_texts[key])
        )

    domain_sites = defaultdict(list)

    for (site, domain), texts in site_texts.items():
        domain_sites[domain].append(site)

    background_rows = []

    # We don't need every possible pair.
    # Sample a fixed number of cross-site pairs per transition.

    rng = np.random.default_rng(SEED)

    for counter, (tid, data) in enumerate(
        transition_groups.items(),
        start=1
    ):

        g = data["all"]

        if g.empty:
            continue

        site = clean_id(
            g["site_id"].iloc[0]
        )

        domain = str(
            g["normalized_domain"].iloc[0]
        )

        other_sites = [
            s for s in domain_sites.get(domain, [])
            if s != site
        ]

        if not other_sites:
            continue

        # Pick a small set of other sites.
        n_sites = min(
            5,
            len(other_sites)
        )

        sampled_sites = rng.choice(
            other_sites,
            size=n_sites,
            replace=False
        )

        # Local clauses
        local_texts = []

        local_texts.extend(
            g["old_text"]
            .dropna()
            .astype(str)
            .tolist()
        )

        local_texts.extend(
            g["new_text"]
            .dropna()
            .astype(str)
            .tolist()
        )

        if not local_texts:
            continue

        local_texts = list(
            dict.fromkeys(local_texts)
        )

        # Sample local clauses
        if len(local_texts) > BACKGROUND_PAIRS_PER_TRANSITION:
            local_sample = rng.choice(
                local_texts,
                size=BACKGROUND_PAIRS_PER_TRANSITION,
                replace=False
            )
        else:
            local_sample = local_texts

        for local_text in local_sample:

            local_idx = text_to_idx.get(local_text)

            if local_idx is None:
                continue

            for other_site in sampled_sites:

                candidates = site_texts[
                    (other_site, domain)
                ]

                if not candidates:
                    continue

                other_text = candidates[
                    rng.integers(len(candidates))
                ]

                other_idx = text_to_idx.get(
                    other_text
                )

                if other_idx is None:
                    continue

                score = float(
                    np.dot(
                        embeddings[local_idx],
                        embeddings[other_idx]
                    )
                )

                background_rows.append({
                    "transition_id": tid,
                    "site_id": site,
                    "normalized_domain": domain,
                    "other_site_id": other_site,
                    "local_text": local_text,
                    "background_text": other_text,
                    "cosine_similarity": score,
                })

        if counter % 100 == 0:
            print(
                f"Processed background: "
                f"{counter:,}/{len(transition_groups):,}"
            )

    background_df = pd.DataFrame(
        background_rows
    )

    background_path = os.path.join(
        args.outdir,
        "background_similarity.csv"
    )

    background_df.to_csv(
        background_path,
        index=False
    )

    print(
        f"\nBackground pairs sampled: "
        f"{len(background_df):,}"
    )

    if len(background_df):

        print(
            "\nBackground cosine statistics:"
        )

        print(
            background_df["cosine_similarity"]
            .describe(
                percentiles=[
                    0.50,
                    0.75,
                    0.90,
                    0.95,
                    0.99,
                ]
            )
            .to_string()
        )

    # ========================================================
    # COMBINED SUMMARY
    # ========================================================

    print("\n" + "=" * 70)
    print("FINAL DIAGNOSTIC SUMMARY")
    print("=" * 70)

    summary = {
        "config": {
            "seed": SEED,
            "model": MODEL_NAME,
            "coverage_high": COVERAGE_HIGH,
            "coverage_medium": COVERAGE_MEDIUM,
            "top_k_coverage": TOP_K,
            "ngram_n": NGRAM_N,
            "hub_similarity_threshold": HUB_SIM_THRESHOLD,
            "background_pairs_per_transition":
                BACKGROUND_PAIRS_PER_TRANSITION,
        },

        "input": {
            "alignment_rows": int(len(align)),
            "unmatched_rows": int(len(unmatched)),
            "transitions": int(len(transition_groups)),
        },

        "exact_duplicates": {
            "rows": int(len(duplicate_df)),
            "fraction_of_unmatched": (
                float(len(duplicate_df) / len(unmatched))
                if len(unmatched)
                else 0.0
            ),
        },

        "coverage": {},

        "hubness": {},

        "background_similarity": {},
    }

    if len(coverage_df):

        summary["coverage"] = {
            "rows": int(len(coverage_df)),
            "high_coverage_ge_0_80": int(
                (
                    coverage_df["coverage"]
                    >= COVERAGE_HIGH
                ).sum()
            ),
            "medium_or_high_ge_0_60": int(
                (
                    coverage_df["coverage"]
                    >= COVERAGE_MEDIUM
                ).sum()
            ),
            "median": float(
                coverage_df["coverage"].median()
            ),
            "p90": float(
                coverage_df["coverage"].quantile(0.90)
            ),
            "p95": float(
                coverage_df["coverage"].quantile(0.95)
            ),
        }

    if len(hub_df):

        hub_counts = (
            hub_df
            .groupby(
                [
                    "transition_id",
                    "direction",
                    "hub_clause_id",
                ]
            )
            .size()
        )

        summary["hubness"] = {
            "hub_links": int(len(hub_df)),
            "unique_hubs": int(
                hub_df[
                    [
                        "transition_id",
                        "direction",
                        "hub_clause_id",
                    ]
                ]
                .drop_duplicates()
                .shape[0]
            ),
            "max_unmatched_to_single_hub": int(
                hub_counts.max()
            ),
            "hubs_with_5_or_more": int(
                (hub_counts >= 5).sum()
            ),
            "hubs_with_10_or_more": int(
                (hub_counts >= 10).sum()
            ),
        }

    if len(background_df):

        scores = background_df[
            "cosine_similarity"
        ]

        summary["background_similarity"] = {
            "pairs": int(len(scores)),
            "mean": float(scores.mean()),
            "median": float(scores.median()),
            "p90": float(scores.quantile(0.90)),
            "p95": float(scores.quantile(0.95)),
            "p99": float(scores.quantile(0.99)),
            "max": float(scores.max()),
        }

    summary_path = os.path.join(
        args.outdir,
        "alignment_diagnostic_summary.json"
    )

    with open(
        summary_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            summary,
            f,
            indent=2
        )

    print("\nKEY NUMBERS")

    print(
        f"Unmatched clauses           : "
        f"{len(unmatched):,}"
    )

    print(
        f"Exact duplicate residues   : "
        f"{len(duplicate_df):,}"
    )

    if len(coverage_df):
        print(
            f"Coverage >= 0.80            : "
            f"{(coverage_df['coverage'] >= 0.80).sum():,}"
        )

        print(
            f"Coverage >= 0.60            : "
            f"{(coverage_df['coverage'] >= 0.60).sum():,}"
        )

    if len(hub_df):

        hub_counts = (
            hub_df
            .groupby(
                [
                    "transition_id",
                    "direction",
                    "hub_clause_id",
                ]
            )
            .size()
        )

        print(
            f"Max clauses → one hub       : "
            f"{hub_counts.max():,}"
        )

        print(
            f"Hubs with >=10 clauses     : "
            f"{(hub_counts >= 10).sum():,}"
        )

    if len(background_df):

        print(
            f"Background cosine median   : "
            f"{background_df['cosine_similarity'].median():.4f}"
        )

        print(
            f"Background cosine p95      : "
            f"{background_df['cosine_similarity'].quantile(0.95):.4f}"
        )

        print(
            f"Background cosine p99      : "
            f"{background_df['cosine_similarity'].quantile(0.99):.4f}"
        )

    print("\nCreated:")

    print(
        f"  {duplicate_path}"
    )

    print(
        f"  {coverage_path}"
    )

    print(
        f"  {hub_path}"
    )

    if len(hub_df):
        print(
            f"  {hub_counts_path}"
        )

    print(
        f"  {background_path}"
    )

    print(
        f"  {summary_path}"
    )

    print("\nDone.")


if __name__ == "__main__":
    main()