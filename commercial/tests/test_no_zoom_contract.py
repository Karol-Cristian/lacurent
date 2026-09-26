from pathlib import Path


TEMPLATES = Path(__file__).resolve().parents[1] / "templates"
STATIC = Path(__file__).resolve().parents[1] / "static"


def test_every_full_html_template_disables_page_zoom() -> None:
    full_documents = []
    for template in sorted(TEMPLATES.glob("*.html")):
        text = template.read_text(encoding="utf-8")
        if "<!doctype html" not in text.lower():
            continue
        full_documents.append(template.name)
        assert 'name="viewport"' in text, template.name
        assert "maximum-scale=1" in text, template.name
        assert "user-scalable=no" in text, template.name
        assert "/static/no-zoom.js?v=1" in text, template.name

    assert full_documents, "Expected at least one full HTML template."


def test_no_zoom_runtime_blocks_touch_and_browser_zoom_gestures() -> None:
    script = (STATIC / "no-zoom.js").read_text(encoding="utf-8")
    for token in (
        "gesturestart",
        "gesturechange",
        "gestureend",
        "touchmove",
        "event.touches.length > 1",
        "wheel",
        "event.ctrlKey",
        "event.metaKey",
        "keydown",
    ):
        assert token in script
