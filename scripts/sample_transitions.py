import sqlite3
import random
import csv
from collections import defaultdict


# =========================================================
# CONFIGURATION
# =========================================================

DB = "release_db.sqlite"

SEED = 42
TARGET_WEBSITES = 600
MAX_TRANSITIONS_PER_SITE = 2

random.seed(SEED)


# =========================================================
# DATABASE CONNECTION
# =========================================================

conn = sqlite3.connect(DB)


# =========================================================
# 1. EXTRACT MEANINGFUL TRANSITIONS
# =========================================================

query = """
WITH ordered AS (
    SELECT
        ps.site_id,
        ps.year,
        ps.phase,
        ps.policy_text_id,
        pt.sha1,

        LAG(pt.sha1) OVER (
            PARTITION BY ps.site_id
            ORDER BY ps.year, ps.phase
        ) AS previous_sha1,

        LAG(ps.policy_text_id) OVER (
            PARTITION BY ps.site_id
            ORDER BY ps.year, ps.phase
        ) AS previous_policy_text_id,

        LAG(ps.year) OVER (
            PARTITION BY ps.site_id
            ORDER BY ps.year, ps.phase
        ) AS previous_year,

        LAG(ps.phase) OVER (
            PARTITION BY ps.site_id
            ORDER BY ps.year, ps.phase
        ) AS previous_phase

    FROM policy_snapshots ps

    JOIN policy_texts pt
        ON pt.id = ps.policy_text_id

    WHERE pt.sha1 IS NOT NULL
)

SELECT
    o.site_id,
    s.domain,
    s.categories,

    o.previous_year,
    o.previous_phase,

    o.year,
    o.phase,

    o.previous_policy_text_id,
    o.policy_text_id,

    o.previous_sha1,
    o.sha1

FROM ordered o

JOIN sites s
    ON s.id = o.site_id

WHERE o.previous_sha1 IS NOT NULL
  AND o.sha1 != o.previous_sha1

  AND s.categories IS NOT NULL
  AND s.categories != ''

  AND s.categories NOT LIKE '%parked%'
"""

rows = conn.execute(query).fetchall()

print(
    f"Meaningful transitions after basic filtering: "
    f"{len(rows):,}"
)


# =========================================================
# 2. NORMALIZE CATEGORIES
# =========================================================

def normalize_domain(categories):

    c = categories.lower()

    if "economyandfinance" in c:
        return "Finance"

    if "health" in c:
        return "Healthcare"

    if "informationtech" in c:
        return "Technology"

    if "shopping" in c:
        return "E-commerce"

    if "travel" in c:
        return "Travel"

    if "games" in c:
        return "Gaming"

    if "sports" in c:
        return "Sports"

    if "foodandrecipes" in c:
        return "Food"

    if "newsandmedia" in c:
        return "News/Media"

    if "entertainment" in c:
        return "Entertainment"

    if "education" in c:
        return "Education"

    if "business" in c:
        return "Business/Services"

    return "Other"


# =========================================================
# 3. GROUP TRANSITIONS BY WEBSITE
# =========================================================

sites = defaultdict(list)

for row in rows:

    (
        site_id,
        domain,
        categories,

        old_year,
        old_phase,

        new_year,
        new_phase,

        old_policy_text_id,
        new_policy_text_id,

        old_sha1,
        new_sha1

    ) = row

    sites[site_id].append({

        "site_id": site_id,

        "domain": domain,

        "categories": categories,

        "normalized_domain":
            normalize_domain(categories),

        "old_year": old_year,
        "old_phase": old_phase,

        "new_year": new_year,
        "new_phase": new_phase,

        "old_policy_text_id":
            old_policy_text_id,

        "new_policy_text_id":
            new_policy_text_id,

        "old_sha1": old_sha1,
        "new_sha1": new_sha1
    })


print(
    f"Eligible websites: "
    f"{len(sites):,}"
)


# =========================================================
# 4. TRANSITION-FREQUENCY BUCKET
# =========================================================

def transition_bucket(n):

    if n == 1:
        return "1"

    if n <= 5:
        return "2-5"

    if n <= 10:
        return "6-10"

    if n <= 20:
        return "11-20"

    return "21+"


BUCKET_ORDER = [
    "1",
    "2-5",
    "6-10",
    "11-20",
    "21+"
]


# =========================================================
# 5. BUILD DOMAIN × FREQUENCY STRATA
# =========================================================

strata = defaultdict(list)

for site_id, transitions in sites.items():

    domain = transitions[0]["normalized_domain"]

    bucket = transition_bucket(
        len(transitions)
    )

    strata[(domain, bucket)].append(
        site_id
    )


# =========================================================
# 6. DETERMINE DOMAINS
# =========================================================

domains = sorted(
    set(
        domain
        for domain, bucket in strata.keys()
    )
)

print("\nAvailable domains:")

for domain in domains:

    count = sum(
        len(site_ids)
        for (d, bucket), site_ids
        in strata.items()
        if d == domain
    )

    print(
        f"{domain:25s} "
        f"{count:6d}"
    )


# =========================================================
# 7. ALLOCATE 600 WEBSITES ACROSS DOMAINS
# =========================================================
#
# 600 / 13 = 46 remainder 2
#
# Therefore:
#   2 domains -> 47 websites
#   11 domains -> 46 websites
#
# This intentionally balances domains rather than
# producing a population-representative sample.
# =========================================================

num_domains = len(domains)

base_target = TARGET_WEBSITES // num_domains

remainder = TARGET_WEBSITES % num_domains

domain_targets = {}

for i, domain in enumerate(domains):

    target = base_target

    if i < remainder:
        target += 1

    domain_targets[domain] = target


print("\nDomain targets:")

for domain in domains:

    print(
        f"{domain:25s} "
        f"{domain_targets[domain]:4d}"
    )


# =========================================================
# 8. SAMPLE WITHIN EACH DOMAIN
#    USING FREQUENCY STRATA
# =========================================================

selected_sites = []


for domain in domains:

    target = domain_targets[domain]

    domain_strata = {

        bucket: site_ids

        for (d, bucket), site_ids
        in strata.items()

        if d == domain
    }


    # -----------------------------------------------------
    # Guarantee one website from every non-empty bucket.
    # -----------------------------------------------------

    allocations = {

        bucket: 1

        for bucket, site_ids
        in domain_strata.items()

        if len(site_ids) > 0
    }


    guaranteed = sum(
        allocations.values()
    )

    remaining = target - guaranteed


    # -----------------------------------------------------
    # Allocate remaining websites proportionally.
    # -----------------------------------------------------

    if remaining > 0:

        capacities = {

            bucket:
                len(site_ids)
                - allocations[bucket]

            for bucket, site_ids
            in domain_strata.items()
        }


        total_capacity = sum(
            capacities.values()
        )


        shares = {}

        for bucket, capacity in capacities.items():

            if total_capacity > 0:

                shares[bucket] = (
                    remaining
                    * capacity
                    / total_capacity
                )

            else:

                shares[bucket] = 0


        # Integer part.

        for bucket in shares:

            extra = int(
                shares[bucket]
            )

            extra = min(
                extra,
                capacities[bucket]
            )

            allocations[bucket] += extra


        # -------------------------------------------------
        # Largest-remainder method.
        # -------------------------------------------------

        allocated = sum(
            allocations.values()
        )

        leftover = target - allocated


        ranked_buckets = sorted(

            shares.keys(),

            key=lambda bucket:
                shares[bucket]
                - int(shares[bucket]),

            reverse=True
        )


        for bucket in ranked_buckets:

            if leftover <= 0:
                break

            if (
                allocations[bucket]
                < len(domain_strata[bucket])
            ):

                allocations[bucket] += 1

                leftover -= 1


    # -----------------------------------------------------
    # Sample websites from each frequency bucket.
    # -----------------------------------------------------

    for bucket, site_ids in domain_strata.items():

        n = min(
            allocations[bucket],
            len(site_ids)
        )

        chosen = random.sample(
            site_ids,
            n
        )

        selected_sites.extend(
            chosen
        )


# =========================================================
# 9. FINAL WEBSITE SAFETY CHECK
# =========================================================

selected_sites = list(
    dict.fromkeys(selected_sites)
)

assert len(selected_sites) == TARGET_WEBSITES, (
    f"Expected {TARGET_WEBSITES} websites, "
    f"but selected {len(selected_sites)}"
)

print(
    f"\nSelected websites: "
    f"{len(selected_sites):,}"
)


# =========================================================
# 10. SELECT UP TO TWO TRANSITIONS PER WEBSITE
# =========================================================

selected_transitions = []

for site_id in selected_sites:

    transitions = sites[site_id]

    n = min(
        MAX_TRANSITIONS_PER_SITE,
        len(transitions)
    )

    chosen = random.sample(
        transitions,
        n
    )

    selected_transitions.extend(
        chosen
    )


print(
    f"Selected transitions: "
    f"{len(selected_transitions):,}"
)


# =========================================================
# 11. DOMAIN DISTRIBUTION
# =========================================================

print(
    "\n=== SELECTED DOMAIN DISTRIBUTION ==="
)

domain_counts = defaultdict(int)

for site_id in selected_sites:

    domain = sites[site_id][0][
        "normalized_domain"
    ]

    domain_counts[domain] += 1


for domain in sorted(domain_counts):

    print(
        f"{domain:25s} "
        f"{domain_counts[domain]:4d}"
    )


# =========================================================
# 12. FREQUENCY DISTRIBUTION
# =========================================================

print(
    "\n=== SELECTED TRANSITION "
    "FREQUENCY DISTRIBUTION ==="
)

bucket_counts = defaultdict(int)

for site_id in selected_sites:

    bucket = transition_bucket(
        len(sites[site_id])
    )

    bucket_counts[bucket] += 1


for bucket in BUCKET_ORDER:

    print(
        f"{bucket:>5} transitions/site : "
        f"{bucket_counts[bucket]:4d} websites"
    )


# =========================================================
# 13. DOMAIN × FREQUENCY MATRIX
# =========================================================

print(
    "\n=== DOMAIN × FREQUENCY MATRIX ==="
)

print(
    f"{'Domain':25s} "
    f"{'1':>4} "
    f"{'2-5':>4} "
    f"{'6-10':>5} "
    f"{'11-20':>6} "
    f"{'21+':>4}"
)

print("-" * 55)


for domain in domains:

    counts = {
        bucket: 0
        for bucket in BUCKET_ORDER
    }


    for site_id in selected_sites:

        site_domain = sites[site_id][0][
            "normalized_domain"
        ]

        if site_domain != domain:
            continue

        bucket = transition_bucket(
            len(sites[site_id])
        )

        counts[bucket] += 1


    print(
        f"{domain:25s} "
        f"{counts['1']:4d} "
        f"{counts['2-5']:4d} "
        f"{counts['6-10']:5d} "
        f"{counts['11-20']:6d} "
        f"{counts['21+']:4d}"
    )


# =========================================================
# 14. SAVE SAMPLED WEBSITES
# =========================================================

with open(
    "sampled_websites.csv",
    "w",
    newline="",
    encoding="utf-8"
) as f:

    writer = csv.writer(f)

    writer.writerow([
        "site_id",
        "domain",
        "raw_categories",
        "normalized_domain",
        "transition_bucket",
        "num_transitions"
    ])


    for site_id in selected_sites:

        transitions = sites[site_id]

        writer.writerow([

            site_id,

            transitions[0]["domain"],

            transitions[0]["categories"],

            transitions[0]["normalized_domain"],

            transition_bucket(
                len(transitions)
            ),

            len(transitions)
        ])


# =========================================================
# 15. SAVE SAMPLED TRANSITIONS
# =========================================================

with open(
    "sampled_transitions.csv",
    "w",
    newline="",
    encoding="utf-8"
) as f:

    writer = csv.writer(f)

    writer.writerow([

        "site_id",

        "domain",

        "raw_categories",

        "normalized_domain",

        "old_year",
        "old_phase",

        "new_year",
        "new_phase",

        "old_policy_text_id",
        "new_policy_text_id",

        "old_sha1",
        "new_sha1"
    ])


    for t in selected_transitions:

        writer.writerow([

            t["site_id"],

            t["domain"],

            t["categories"],

            t["normalized_domain"],

            t["old_year"],
            t["old_phase"],

            t["new_year"],
            t["new_phase"],

            t["old_policy_text_id"],
            t["new_policy_text_id"],

            t["old_sha1"],
            t["new_sha1"]
        ])


# =========================================================
# 16. FINISH
# =========================================================

print("\nDone.")

print("Created:")
print("  sampled_websites.csv")
print("  sampled_transitions.csv")

conn.close()