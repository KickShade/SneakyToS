
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
