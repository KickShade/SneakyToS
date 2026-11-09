
from sneakytos.segmentation.segmenter import segment_text


def test_segment_text_returns_clauses():
    policy = """
    Information We Collect

    We collect your name and email address when you create an account.

    We may share your personal information with service providers
    to operate and maintain our services.
    """

    clauses = segment_text(policy, version="old")

    assert len(clauses) > 0
    assert all(clause.text.strip() for clause in clauses)
    assert all(clause.clause_id.startswith("old_") for clause in clauses)


def test_empty_policy_returns_no_clauses():
    assert segment_text("") == []
    assert segment_text("   ") == []


def test_standalone_plain_text_headings_assign_section_context():
    policy = """Privacy Policy

Information We Collect

We collect your name and email address when you create an account.

Data Retention

We retain account information while your account remains active.
"""

    clauses = segment_text(policy, version="plain")

    assert [clause.section for clause in clauses] == [
        "Information We Collect",
        "Data Retention",
    ]


def test_heading_detection_does_not_promote_sentence_prose():
    policy = """Information We Collect

We may collect your name and email address.
"""

    clauses = segment_text(policy)

    assert len(clauses) == 1
    assert clauses[0].section == "Information We Collect"
    assert clauses[0].text == "We may collect your name and email address."


def test_numbered_and_all_caps_plain_headings_are_recognized():
    policy = """1. INFORMATION WE COLLECT

We collect account details to provide the requested service.

YOUR RIGHTS

You may request access to the personal information we hold about you.
"""

    clauses = segment_text(policy)

    assert [clause.section for clause in clauses] == [
        "1. INFORMATION WE COLLECT",
        "YOUR RIGHTS",
    ]
