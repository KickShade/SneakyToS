from sneakytos.ingestion.parser import _strip_pdf_page_furniture


def test_repeated_page_headers_footers_and_page_counters_are_removed():
    pages = [
        "Privacy Policy\nWe collect account data for service delivery.\nPage 1 of 2",
        "Privacy Policy\nWe retain account data while your account is active.\nPage 2 of 2",
    ]
    cleaned = _strip_pdf_page_furniture(pages)
    assert cleaned == [
        "We collect account data for service delivery.",
        "We retain account data while your account is active.",
    ]


def test_nonrepeated_policy_text_at_page_boundary_is_preserved():
    pages = [
        "We collect account data for service delivery.",
        "We retain account data while your account is active.",
    ]
    assert _strip_pdf_page_furniture(pages) == pages
