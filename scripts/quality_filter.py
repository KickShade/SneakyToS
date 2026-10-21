import sqlite3
import csv
import re
import statistics
from collections import Counter


# =========================================================
# CONFIGURATION
# =========================================================

DB = "release_db.sqlite"

INPUT_FILE = "sampled_transitions.csv"

ACCEPTED_FILE = "quality_checked_transitions.csv"
REJECTED_FILE = "rejected_transitions.csv"

MIN_WORDS = 200

# Very high non-text ratio can indicate corrupted extraction.
MAX_NON_TEXT_RATIO = 0.35

# Minimum alphabetic characters.
MIN_ALPHA_CHARS = 100


# =========================================================
# DATABASE
# =========================================================

conn = sqlite3.connect(DB)


# =========================================================
# LOAD SAMPLED TRANSITIONS
# =========================================================

with open(
    INPUT_FILE,
    "r",
    encoding="utf-8",
    newline=""
) as f:

    reader = csv.DictReader(f)

    transitions = list(reader)


print(
    f"Sampled transitions loaded: "
    f"{len(transitions):,}"
)


# =========================================================
# LOAD POLICY TEXTS
# =========================================================

policy_text_ids = set()

for row in transitions:

    policy_text_ids.add(
        int(row["old_policy_text_id"])
    )

    policy_text_ids.add(
        int(row["new_policy_text_id"])
    )


placeholders = ",".join(
    "?"
    for _ in policy_text_ids
)


query = f"""
SELECT
    id,
    policy_text,
    length,
    sha1
FROM policy_texts
WHERE id IN ({placeholders})
"""


policy_rows = conn.execute(
    query,
    list(policy_text_ids)
).fetchall()


policy_texts = {
    row[0]: {
        "text": row[1],
        "length": row[2],
        "sha1": row[3]
    }
    for row in policy_rows
}


print(
    f"Policy texts retrieved: "
    f"{len(policy_texts):,}"
)


# =========================================================
# QUALITY FUNCTIONS
# =========================================================

def word_count(text):

    if not text:
        return 0

    return len(
        re.findall(
            r"\b[\w'-]+\b",
            text
        )
    )


def alpha_count(text):

    if not text:
        return 0

    return sum(
        char.isalpha()
        for char in text
    )


def non_text_ratio(text):

    if not text:
        return 1.0

    # Characters that are not letters, numbers,
    # whitespace, or normal punctuation.

    suspicious = sum(
        not (
            char.isalnum()
            or char.isspace()
            or char in
            ".,;:!?-'\"()[]{}"
        )

        for char in text
    )

    return suspicious / max(
        len(text),
        1
    )


def repeated_character_ratio(text):

    if not text:
        return 1.0

    repeated = 0

    previous = None

    for char in text:

        if char == previous:
            repeated += 1

        previous = char

    return repeated / max(
        len(text),
        1
    )


# =========================================================
# QUALITY CHECK
# =========================================================

def check_policy(text):

    reasons = []

    if text is None:

        reasons.append(
            "missing_text"
        )

        return reasons


    text = text.strip()


    if not text:

        reasons.append(
            "empty_text"
        )

        return reasons


    words = word_count(text)

    alpha = alpha_count(text)

    suspicious_ratio = non_text_ratio(text)


    if words < MIN_WORDS:

        reasons.append(
            "too_short"
        )


    if alpha < MIN_ALPHA_CHARS:

        reasons.append(
            "too_few_alpha_chars"
        )


    if suspicious_ratio > MAX_NON_TEXT_RATIO:

        reasons.append(
            "high_non_text_ratio"
        )


    return reasons


# =========================================================
# PROCESS TRANSITIONS
# =========================================================

accepted = []

rejected = []

reason_counter = Counter()

old_word_counts = []

new_word_counts = []


for row in transitions:

    old_id = int(
        row["old_policy_text_id"]
    )

    new_id = int(
        row["new_policy_text_id"]
    )


    old_data = policy_texts.get(
        old_id
    )

    new_data = policy_texts.get(
        new_id
    )


    old_text = (
        old_data["text"]
        if old_data
        else None
    )

    new_text = (
        new_data["text"]
        if new_data
        else None
    )


    old_reasons = check_policy(
        old_text
    )

    new_reasons = check_policy(
        new_text
    )


    reasons = []


    for reason in old_reasons:

        reasons.append(
            f"old_{reason}"
        )


    for reason in new_reasons:

        reasons.append(
            f"new_{reason}"
        )


    old_words = word_count(
        old_text
    )

    new_words = word_count(
        new_text
    )


    # -----------------------------------------------------
    # ACCEPT
    # -----------------------------------------------------

    if not reasons:

        output = dict(row)

        output["old_word_count"] = old_words
        output["new_word_count"] = new_words

        output["old_char_count"] = (
            len(old_text)
        )

        output["new_char_count"] = (
            len(new_text)
        )

        output["quality_status"] = "ACCEPT"

        output["rejection_reason"] = ""

        accepted.append(output)

        old_word_counts.append(
            old_words
        )

        new_word_counts.append(
            new_words
        )


    # -----------------------------------------------------
    # REJECT
    # -----------------------------------------------------

    else:

        output = dict(row)

        output["old_word_count"] = old_words
        output["new_word_count"] = new_words

        output["old_char_count"] = (
            len(old_text)
            if old_text
            else 0
        )

        output["new_char_count"] = (
            len(new_text)
            if new_text
            else 0
        )

        output["quality_status"] = "REJECT"

        output["rejection_reason"] = (
            ";".join(reasons)
        )

        rejected.append(output)


        for reason in reasons:

            reason_counter[reason] += 1


# =========================================================
# WRITE ACCEPTED
# =========================================================

output_fields = [
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
    "new_sha1",

    "old_word_count",
    "new_word_count",

    "old_char_count",
    "new_char_count",

    "quality_status",
    "rejection_reason"
]


with open(
    ACCEPTED_FILE,
    "w",
    encoding="utf-8",
    newline=""
) as f:

    writer = csv.DictWriter(
        f,
        fieldnames=output_fields
    )

    writer.writeheader()

    writer.writerows(
        accepted
    )


# =========================================================
# WRITE REJECTED
# =========================================================

with open(
    REJECTED_FILE,
    "w",
    encoding="utf-8",
    newline=""
) as f:

    writer = csv.DictWriter(
        f,
        fieldnames=output_fields
    )

    writer.writeheader()

    writer.writerows(
        rejected
    )


# =========================================================
# SUMMARY
# =========================================================

print("\n" + "=" * 60)
print("POLICY QUALITY FILTER RESULTS")
print("=" * 60)

print(
    f"Input transitions       : {len(transitions):,}"
)

print(
    f"Accepted transitions    : {len(accepted):,}"
)

print(
    f"Rejected transitions    : {len(rejected):,}"
)


if transitions:

    acceptance_rate = (
        len(accepted)
        / len(transitions)
        * 100
    )

    rejection_rate = (
        len(rejected)
        / len(transitions)
        * 100
    )

    print(
        f"Acceptance rate         : "
        f"{acceptance_rate:.2f}%"
    )

    print(
        f"Rejection rate          : "
        f"{rejection_rate:.2f}%"
    )


# =========================================================
# REJECTION REASONS
# =========================================================

print(
    "\n=== REJECTION REASONS ==="
)

if reason_counter:

    for reason, count in (
        reason_counter.most_common()
    ):

        print(
            f"{reason:30s} "
            f"{count:5d}"
        )

else:

    print("No transitions rejected.")


# =========================================================
# WORD-COUNT STATISTICS
# =========================================================

print(
    "\n=== ACCEPTED POLICY LENGTHS ==="
)

if old_word_counts:

    print(
        "OLD policies:"
    )

    print(
        f"  min    : "
        f"{min(old_word_counts):,}"
    )

    print(
        f"  median : "
        f"{statistics.median(old_word_counts):,.0f}"
    )

    print(
        f"  max    : "
        f"{max(old_word_counts):,}"
    )


if new_word_counts:

    print(
        "NEW policies:"
    )

    print(
        f"  min    : "
        f"{min(new_word_counts):,}"
    )

    print(
        f"  median : "
        f"{statistics.median(new_word_counts):,.0f}"
    )

    print(
        f"  max    : "
        f"{max(new_word_counts):,}"
    )


# =========================================================
# OUTPUT
# =========================================================

print(
    "\nCreated:"
)

print(
    f"  {ACCEPTED_FILE}"
)

print(
    f"  {REJECTED_FILE}"
)


conn.close()