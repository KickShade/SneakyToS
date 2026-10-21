import sqlite3
import csv
import re
from collections import Counter


# =========================================================
# CONFIGURATION
# =========================================================

DB = "release_db.sqlite"

INPUT_FILE = "quality_checked_transitions.csv"

OUTPUT_FILE = "segmented_policy_clauses.csv"

# Diagnostic output for transitions that need fallback handling.
FALLBACK_LOG_FILE = "segmentation_fallbacks.csv"

MIN_CLAUSE_WORDS = 5

# Very long blocks are split into sentences.
LONG_BLOCK_WORDS = 80


# =========================================================
# DATABASE
# =========================================================

conn = sqlite3.connect(DB)


# =========================================================
# LOAD QUALITY-VALID TRANSITIONS
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
    f"Quality-valid transitions loaded: "
    f"{len(transitions):,}"
)


# =========================================================
# TRANSITION ID HELPER
# =========================================================

def make_transition_id(row):
    return (
        f"{row['site_id']}_"
        f"{int(row['old_policy_text_id'])}_"
        f"{int(row['new_policy_text_id'])}"
    )


# =========================================================
# RETRIEVE REQUIRED POLICY TEXTS
# =========================================================

policy_text_ids = set()

for row in transitions:

    policy_text_ids.add(
        int(row["old_policy_text_id"])
    )

    policy_text_ids.add(
        int(row["new_policy_text_id"])
    )


if not policy_text_ids:
    raise RuntimeError("No policy text IDs found in input.")


placeholders = ",".join(
    "?"
    for _ in policy_text_ids
)


query = f"""
SELECT
    id,
    policy_text
FROM policy_texts
WHERE id IN ({placeholders})
"""


rows = conn.execute(
    query,
    list(policy_text_ids)
).fetchall()


policy_texts = {
    row[0]: row[1]
    for row in rows
}


print(
    f"Policy texts retrieved: "
    f"{len(policy_texts):,}"
)


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def clean_line(line):

    # Normalize non-breaking spaces.
    line = line.replace(
        "\u00a0",
        " "
    )

    # Normalize horizontal whitespace.
    line = re.sub(
        r"[ \t]+",
        " ",
        line
    )

    return line.strip()


def normalize_block_text(text):

    # Remove Markdown emphasis markers.
    text = re.sub(
        r"[*_`]+",
        "",
        text
    )

    # Normalize whitespace.
    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


def word_count(text):

    return len(
        re.findall(
            r"\b[\w'-]+\b",
            text
        )
    )


# =========================================================
# MARKDOWN HELPERS
# =========================================================

def is_heading(line):

    # ATX Markdown heading:
    # # Introduction
    # ## Information We Collect

    if re.match(
        r"^#{1,6}\s+",
        line
    ):
        return True

    return False


def heading_text(line):

    return re.sub(
        r"^#{1,6}\s+",
        "",
        line
    ).strip()


def is_list_item(line):

    return bool(
        re.match(
            r"^(?:[-*+]|\d+[.)])\s+",
            line
        )
    )


def remove_list_marker(line):

    return re.sub(
        r"^(?:[-*+]|\d+[.)])\s+",
        "",
        line
    ).strip()


# =========================================================
# SENTENCE SPLITTER
# =========================================================

def split_sentences(text):

    """
    Lightweight rule-based sentence segmentation.

    Protects common cases containing periods:
        URLs
        email addresses
        common abbreviations
        decimal-like tokens

    This is intentionally conservative because privacy-policy
    text contains many unusual legal/technical strings.
    """

    text = text.strip()

    if not text:
        return []

    protected = text
    placeholders = {}

    patterns = [
        r"https?://\S+",
        r"www\.\S+",
        r"\b[\w.+-]+@[\w.-]+\.\w+\b",
        r"\b(?:e\.g|i\.e|etc|vs|mr|mrs|ms|dr)\.",
    ]

    counter = 0

    for pattern in patterns:

        matches = list(
            re.finditer(
                pattern,
                protected,
                flags=re.IGNORECASE
            )
        )

        # Replace from right to left so match positions remain valid.
        for match in reversed(matches):

            value = match.group(0)

            token = (
                f"__PROTECTED_{counter}__"
            )

            placeholders[token] = value

            protected = (
                protected[:match.start()]
                + token
                + protected[match.end():]
            )

            counter += 1

    # Split after normal sentence-ending punctuation.
    pieces = re.split(
        r"(?<=[.!?])\s+(?=[A-Z0-9\"'])",
        protected
    )

    result = []

    for piece in pieces:

        piece = piece.strip()

        if not piece:
            continue

        for token, value in placeholders.items():

            piece = piece.replace(
                token,
                value
            )

        piece = normalize_block_text(piece)

        if piece:
            result.append(piece)

    return result


# =========================================================
# FALLBACK SEGMENTATION
# =========================================================

def fallback_segment_policy(text):

    """
    Last-resort segmentation.

    This is deliberately conservative:
      1. Try sentence segmentation on the complete normalized text.
      2. If that produces nothing usable, retain the complete text
         as one clause.

    The purpose is NOT to improve segmentation quality.
    The purpose is to prevent a valid policy from silently
    disappearing from the transition corpus.
    """

    if not text:
        return []

    normalized = normalize_block_text(text)

    if not normalized:
        return []

    sentences = split_sentences(normalized)

    usable = [
        s
        for s in sentences
        if word_count(s) >= MIN_CLAUSE_WORDS
    ]

    if usable:
        return [
            {
                "section": "ROOT_FALLBACK",
                "text": sentence
            }
            for sentence in usable
        ]

    if word_count(normalized) >= MIN_CLAUSE_WORDS:
        return [
            {
                "section": "ROOT_FALLBACK",
                "text": normalized
            }
        ]

    return []


# =========================================================
# CLAUSE SEGMENTATION
# =========================================================

def segment_policy(text):

    """
    Segment one policy into meaningful textual units.

    Priority:

        headings
            ↓
        paragraphs / list items
            ↓
        sentence splitting for long blocks
            ↓
        fallback only if normal segmentation produces zero clauses

    Returns:
        list of dictionaries with:
            section
            text
    """

    if not text:
        return []

    # Normalize line endings.
    text = text.replace(
        "\r\n",
        "\n"
    )

    text = text.replace(
        "\r",
        "\n"
    )

    lines = [
        clean_line(line)
        for line in text.split("\n")
    ]

    clauses = []

    current_section = "ROOT"

    buffer = []

    def flush_buffer():

        nonlocal buffer

        if not buffer:
            return

        block = " ".join(
            buffer
        ).strip()

        buffer = []

        if not block:
            return

        block = normalize_block_text(block)

        if not block:
            return

        words = word_count(block)

        # Short/medium blocks are normally already clause-sized.
        if words <= LONG_BLOCK_WORDS:

            if words >= MIN_CLAUSE_WORDS:

                clauses.append({
                    "section": current_section,
                    "text": block
                })

            return

        # Long blocks get sentence-level segmentation.
        sentences = split_sentences(
            block
        )

        for sentence in sentences:

            sentence = sentence.strip()

            words = word_count(
                sentence
            )

            if words >= MIN_CLAUSE_WORDS:

                clauses.append({
                    "section": current_section,
                    "text": sentence
                })

    # -----------------------------------------------------
    # Process lines.
    # -----------------------------------------------------

    i = 0

    while i < len(lines):

        line = lines[i]

        if not line:

            flush_buffer()

            i += 1

            continue

        # -------------------------------------------------
        # Markdown heading
        # -------------------------------------------------

        if is_heading(line):

            flush_buffer()

            current_section = heading_text(
                line
            )

            i += 1

            continue

        # -------------------------------------------------
        # Setext heading
        # -------------------------------------------------

        if (
            i + 1 < len(lines)
            and line
            and re.match(
                r"^[-=]{3,}\s*$",
                lines[i + 1]
            )
        ):

            flush_buffer()

            current_section = line.strip()

            i += 2

            continue

        # -------------------------------------------------
        # List item
        # -------------------------------------------------

        if is_list_item(line):

            flush_buffer()

            item = remove_list_marker(
                line
            )

            item = normalize_block_text(
                item
            )

            words = word_count(
                item
            )

            if words >= MIN_CLAUSE_WORDS:

                clauses.append({
                    "section": current_section,
                    "text": item
                })

            i += 1

            continue

        # -------------------------------------------------
        # Normal paragraph line
        # -------------------------------------------------

        buffer.append(line)

        i += 1

    flush_buffer()

    # -----------------------------------------------------
    # Critical safeguard:
    # never silently lose a non-empty valid policy.
    # -----------------------------------------------------

    if not clauses:

        return fallback_segment_policy(
            text
        )

    return clauses


# =========================================================
# OUTPUT HELPERS
# =========================================================

def build_output_row(
    row,
    transition_id,
    version,
    clause_number,
    clause
):

    return {
        "transition_id":
            transition_id,

        "site_id":
            row["site_id"],

        "domain":
            row["domain"],

        "normalized_domain":
            row["normalized_domain"],

        "old_year":
            row["old_year"],

        "old_phase":
            row["old_phase"],

        "new_year":
            row["new_year"],

        "new_phase":
            row["new_phase"],

        "version":
            version,

        "clause_id":
            clause_number,

        "section":
            clause["section"],

        "clause_text":
            clause["text"]
    }


# =========================================================
# PROCESS ALL TRANSITIONS
# =========================================================

output_rows = []

fallback_rows = []

total_old_clauses = 0
total_new_clauses = 0

missing_old_text = 0
missing_new_text = 0

zero_old_after_fallback = 0
zero_new_after_fallback = 0

fallback_old_count = 0
fallback_new_count = 0

input_transition_ids = []

for index, row in enumerate(
    transitions,
    start=1
):

    transition_id = make_transition_id(
        row
    )

    input_transition_ids.append(
        transition_id
    )

    site_id = row["site_id"]

    old_id = int(
        row["old_policy_text_id"]
    )

    new_id = int(
        row["new_policy_text_id"]
    )

    old_text = policy_texts.get(
        old_id
    )

    new_text = policy_texts.get(
        new_id
    )

    # -----------------------------------------------------
    # Detect missing DB records explicitly.
    # -----------------------------------------------------

    if old_text is None:
        missing_old_text += 1

    if new_text is None:
        missing_new_text += 1

    # -----------------------------------------------------
    # OLD
    # -----------------------------------------------------

    old_clauses = segment_policy(
        old_text
    )

    # Determine whether the normal segmenter needed fallback.
    old_normal_clauses = []
    if old_text:
        # Re-run only to distinguish fallback use.
        # This does not change the output.
        normalized_old = old_text.replace("\r\n", "\n").replace("\r", "\n")
        old_lines = [clean_line(line) for line in normalized_old.split("\n")]
        # The actual segment_policy already includes fallback, so a
        # fallback event is inferred from ROOT_FALLBACK sections.
        if any(
            c["section"] == "ROOT_FALLBACK"
            for c in old_clauses
        ):
            fallback_old_count += 1
            fallback_rows.append({
                "transition_id": transition_id,
                "version": "OLD",
                "policy_text_id": old_id,
                "reason": "normal_segmentation_returned_zero_clauses",
                "text_length": len(old_text)
            })

    if not old_clauses:
        zero_old_after_fallback += 1

    # -----------------------------------------------------
    # NEW
    # -----------------------------------------------------

    new_clauses = segment_policy(
        new_text
    )

    if new_text:
        if any(
            c["section"] == "ROOT_FALLBACK"
            for c in new_clauses
        ):
            fallback_new_count += 1
            fallback_rows.append({
                "transition_id": transition_id,
                "version": "NEW",
                "policy_text_id": new_id,
                "reason": "normal_segmentation_returned_zero_clauses",
                "text_length": len(new_text)
            })

    if not new_clauses:
        zero_new_after_fallback += 1

    total_old_clauses += len(
        old_clauses
    )

    total_new_clauses += len(
        new_clauses
    )

    # -----------------------------------------------------
    # Store OLD clauses
    # -----------------------------------------------------

    for clause_number, clause in enumerate(
        old_clauses,
        start=1
    ):

        output_rows.append(
            build_output_row(
                row,
                transition_id,
                "OLD",
                clause_number,
                clause
            )
        )

    # -----------------------------------------------------
    # Store NEW clauses
    # -----------------------------------------------------

    for clause_number, clause in enumerate(
        new_clauses,
        start=1
    ):

        output_rows.append(
            build_output_row(
                row,
                transition_id,
                "NEW",
                clause_number,
                clause
            )
        )

    if index % 100 == 0:

        print(
            f"Processed "
            f"{index:,}/"
            f"{len(transitions):,} transitions"
        )


# =========================================================
# WRITE OUTPUT
# =========================================================

fields = [
    "transition_id",
    "site_id",
    "domain",
    "normalized_domain",
    "old_year",
    "old_phase",
    "new_year",
    "new_phase",
    "version",
    "clause_id",
    "section",
    "clause_text"
]


with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8",
    newline=""
) as f:

    writer = csv.DictWriter(
        f,
        fieldnames=fields
    )

    writer.writeheader()

    writer.writerows(
        output_rows
    )


# =========================================================
# WRITE FALLBACK LOG
# =========================================================

fallback_fields = [
    "transition_id",
    "version",
    "policy_text_id",
    "reason",
    "text_length"
]

with open(
    FALLBACK_LOG_FILE,
    "w",
    encoding="utf-8",
    newline=""
) as f:

    writer = csv.DictWriter(
        f,
        fieldnames=fallback_fields
    )

    writer.writeheader()

    writer.writerows(
        fallback_rows
    )


# =========================================================
# COVERAGE VALIDATION
# =========================================================

output_transition_ids = {
    row["transition_id"]
    for row in output_rows
}

input_transition_id_set = set(
    input_transition_ids
)

missing_transition_ids = (
    input_transition_id_set
    - output_transition_ids
)

extra_transition_ids = (
    output_transition_ids
    - input_transition_id_set
)

version_sets = {}

for row in output_rows:

    version_sets.setdefault(
        row["transition_id"],
        set()
    ).add(
        row["version"]
    )

incomplete_transitions = {
    transition_id: versions
    for transition_id, versions in version_sets.items()
    if versions != {"OLD", "NEW"}
}


# =========================================================
# SUMMARY
# =========================================================

print("\n" + "=" * 60)
print("CLAUSE SEGMENTATION RESULTS")
print("=" * 60)

print(
    f"Transitions processed       : "
    f"{len(transitions):,}"
)

print(
    f"Unique input transitions    : "
    f"{len(input_transition_id_set):,}"
)

print(
    f"Unique output transitions   : "
    f"{len(output_transition_ids):,}"
)

print(
    f"OLD clauses                 : "
    f"{total_old_clauses:,}"
)

print(
    f"NEW clauses                 : "
    f"{total_new_clauses:,}"
)

print(
    f"Total clauses               : "
    f"{len(output_rows):,}"
)

if transitions:

    print(
        f"Average OLD clauses/transition : "
        f"{total_old_clauses / len(transitions):.2f}"
    )

    print(
        f"Average NEW clauses/transition : "
        f"{total_new_clauses / len(transitions):.2f}"
    )

print(
    f"\nMissing OLD DB texts        : "
    f"{missing_old_text:,}"
)

print(
    f"Missing NEW DB texts        : "
    f"{missing_new_text:,}"
)

print(
    f"Fallback OLD policies       : "
    f"{fallback_old_count:,}"
)

print(
    f"Fallback NEW policies       : "
    f"{fallback_new_count:,}"
)

print(
    f"Still-zero OLD policies     : "
    f"{zero_old_after_fallback:,}"
)

print(
    f"Still-zero NEW policies     : "
    f"{zero_new_after_fallback:,}"
)

print(
    f"Transitions missing output  : "
    f"{len(missing_transition_ids):,}"
)

print(
    f"Extra output transitions    : "
    f"{len(extra_transition_ids):,}"
)

print(
    f"Incomplete OLD/NEW pairs    : "
    f"{len(incomplete_transitions):,}"
)

print(
    f"\nCreated:"
)

print(
    f"  {OUTPUT_FILE}"
)

print(
    f"  {FALLBACK_LOG_FILE}"
)


# =========================================================
# HARD VALIDATION
# =========================================================

if missing_old_text or missing_new_text:

    raise RuntimeError(
        "One or more policy_text records referenced by "
        "quality_checked_transitions.csv were not found."
    )

if missing_transition_ids:

    print("\nWARNING: Some input transitions produced no clauses:")
    for transition_id in sorted(missing_transition_ids):
        print("  ", transition_id)

    raise RuntimeError(
        "Segmentation coverage check failed."
    )

if incomplete_transitions:

    print("\nWARNING: Some transitions do not contain both OLD and NEW:")
    for transition_id, versions in sorted(
        incomplete_transitions.items()
    ):
        print(
            f"  {transition_id}: "
            f"{sorted(versions)}"
        )

    raise RuntimeError(
        "OLD/NEW coverage check failed."
    )

print("\nCoverage validation: PASSED")
print("Every input transition has both OLD and NEW clauses.")

conn.close()
