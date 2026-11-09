from sneakytos.ingestion.parser import _pdf_page_text


class FakePage:
    def get_text(self, kind, sort=False):
        assert kind == "dict"
        return {
            "blocks": [
                {
                    "type": 0,
                    "lines": [
                        {"spans": [{"text": "INFORMATION WE COLLECT", "size": 16, "flags": 16, "font": "Arial-Bold"}]},
                    ],
                },
                {
                    "type": 0,
                    "lines": [
                        {"spans": [{"text": "We collect your name and email address.", "size": 11, "flags": 0, "font": "Arial"}]},
                    ],
                },
            ]
        }


def test_visually_distinct_pdf_heading_is_marked_for_segmentation():
    assert _pdf_page_text(FakePage()) == (
        "# INFORMATION WE COLLECT\n\n"
        "We collect your name and email address."
    )
