import os
import pandas as pd
import numpy as np

# ============================================================
# SneakyToS — Alignment Audit Sampler
# ============================================================

INPUT = "candidate_out_v1/clause_alignments.csv"
OUTDIR = "alignment_audit"

SEED = 42
TOTAL_AUDIT_PAIRS = 150

# Similarity bins for empirical alignment calibration
BINS = [
    (0.55, 0.60),
    (0.60, 0.65),
    (0.65, 0.70),
    (0.70, 0.75),
    (0.75, 0.80),
    (0.80, 0.85),
    (0.85, 0.90),
    (0.90, 0.95),
    (0.95, 1.000001),
]

os.makedirs(OUTDIR, exist_ok=True)

rng = np.random.default_rng(SEED)

print("=" * 70)
print("SneakyToS — Alignment Audit Sampler")
print("=" * 70)

# ------------------------------------------------------------
# Load
# ------------------------------------------------------------

print("\nLoading:")
print(f"  {INPUT}")

df = pd.read_csv(INPUT)

print(f"Total alignment rows: {len(df):,}")

# We only audit actual matched pairs.
matched = df[df["alignment_status"] == "MATCHED"].copy()

print(f"MATCHED rows: {len(matched):,}")

# ------------------------------------------------------------
# Clean similarity
# ------------------------------------------------------------

matched["semantic_similarity"] = pd.to_numeric(
    matched["semantic_similarity"],
    errors="coerce"
)

matched = matched.dropna(subset=["semantic_similarity"])

# Avoid numerical >1 artifacts such as 1.000001
matched["semantic_similarity"] = matched["semantic_similarity"].clip(0, 1)

# ------------------------------------------------------------
# Create similarity bins
# ------------------------------------------------------------

def assign_bin(x):
    for i, (lo, hi) in enumerate(BINS):
        if lo <= x < hi:
            return f"{lo:.2f}-{min(hi, 1.0):.2f}"
    return None


matched["similarity_bin"] = matched["semantic_similarity"].apply(assign_bin)

# ------------------------------------------------------------
# Sample evenly across bins
# ------------------------------------------------------------

# 9 bins × 16 = 144
# Remaining 6 are sampled from the full eligible pool.
PER_BIN = 16

samples = []

print("\nSampling similarity bins:")

for lo, hi in BINS:
    label = f"{lo:.2f}-{min(hi, 1.0):.2f}"

    pool = matched[matched["similarity_bin"] == label]

    n = min(PER_BIN, len(pool))

    if n > 0:
        chosen_idx = rng.choice(
            pool.index.to_numpy(),
            size=n,
            replace=False
        )

        chosen = pool.loc[chosen_idx].copy()
        samples.append(chosen)

    print(
        f"  {label:>11} : "
        f"{len(pool):>6,} available → {n:>2} sampled"
    )

audit = pd.concat(samples, ignore_index=True)

# ------------------------------------------------------------
# Add remaining random pairs
# ------------------------------------------------------------

remaining = TOTAL_AUDIT_PAIRS - len(audit)

if remaining > 0:

    already = set(
        zip(
            audit["transition_id"].astype(str),
            audit["old_clause_id"].astype(str),
            audit["new_clause_id"].astype(str),
        )
    )

    eligible = matched[
        ~matched.apply(
            lambda r: (
                str(r["transition_id"]),
                str(r["old_clause_id"]),
                str(r["new_clause_id"])
            ) in already,
            axis=1
        )
    ]

    n = min(remaining, len(eligible))

    if n > 0:
        chosen_idx = rng.choice(
            eligible.index.to_numpy(),
            size=n,
            replace=False
        )

        audit = pd.concat(
            [audit, eligible.loc[chosen_idx]],
            ignore_index=True
        )

# ------------------------------------------------------------
# Hub cases
# ------------------------------------------------------------

# We deliberately add a small stress set of low-confidence /
# potentially hub-prone matches if available.
#
# These are NOT part of the 150 core bin-balanced pairs.
# They are a separate diagnostic set.

hub_candidates = matched[
    matched["semantic_similarity"].between(0.55, 0.75, inclusive="both")
].copy()

hub_candidates = hub_candidates.sample(
    n=min(20, len(hub_candidates)),
    random_state=SEED
)

hub_candidates["audit_set"] = "HUB_STRESS"

# ------------------------------------------------------------
# Prepare core audit set
# ------------------------------------------------------------

audit["audit_set"] = "CORE"

audit = audit.sample(
    frac=1,
    random_state=SEED
).reset_index(drop=True)

audit.insert(
    0,
    "audit_id",
    [f"A{i:03d}" for i in range(1, len(audit) + 1)]
)

# ------------------------------------------------------------
# Add human-label columns
# ------------------------------------------------------------

audit["alignment_label"] = ""
audit["notes"] = ""

# Keep only useful audit columns
columns = [
    "audit_id",
    "audit_set",
    "similarity_bin",
    "transition_id",
    "site_id",
    "domain",
    "normalized_domain",
    "old_year",
    "old_phase",
    "new_year",
    "new_phase",
    "old_clause_id",
    "new_clause_id",
    "old_section",
    "new_section",
    "old_text",
    "new_text",
    "semantic_similarity",
    "lexical_similarity",
    "token_change_ratio",
    "alignment_status",
    "alignment_label",
    "notes",
]

# Some columns may not exist in unusual files
columns = [c for c in columns if c in audit.columns]

audit = audit[columns]

# ------------------------------------------------------------
# Save
# ------------------------------------------------------------

core_path = os.path.join(
    OUTDIR,
    "alignment_audit_150.csv"
)

audit.to_csv(
    core_path,
    index=False,
    encoding="utf-8-sig"
)

hub_path = os.path.join(
    OUTDIR,
    "alignment_hub_stress_20.csv"
)

hub_columns = [
    "transition_id",
    "site_id",
    "domain",
    "normalized_domain",
    "old_clause_id",
    "new_clause_id",
    "old_text",
    "new_text",
    "semantic_similarity",
    "lexical_similarity",
    "token_change_ratio",
]

hub_columns = [c for c in hub_columns if c in hub_candidates.columns]

hub_candidates[hub_columns].to_csv(
    hub_path,
    index=False,
    encoding="utf-8-sig"
)

# ------------------------------------------------------------
# Summary
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("AUDIT SAMPLE CREATED")
print("=" * 70)

print(f"\nCore audit pairs : {len(audit)}")
print(f"Hub stress pairs : {len(hub_candidates)}")

print("\nCore similarity distribution:")

print(
    audit["similarity_bin"]
    .value_counts()
    .sort_index()
    .to_string()
)

print("\nCreated:")
print(f"  {core_path}")
print(f"  {hub_path}")

print("\n" + "=" * 70)
print("LABELS TO USE")
print("=" * 70)

print("""
For each CORE pair, compare OLD and NEW.

alignment_label:

SAME_STATEMENT
    The two clauses express essentially the same policy statement.
    They may contain wording, punctuation, formatting, or small edits.

RELATED
    They discuss the same general topic/function, but are not
    actually counterparts of the same statement.

UNRELATED
    They are not meaningful counterparts.

notes:
    Optional short explanation, e.g.
    "same statement, new example added"
    "generic collection language only"
    "old paragraph split across several new clauses"
""")

print("\nIMPORTANT:")
print("Do NOT label rights expansion/restriction yet.")
print("This audit is ONLY about clause correspondence.")