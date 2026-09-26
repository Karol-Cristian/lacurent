import json
from pathlib import Path


COMMERCIAL = Path(__file__).resolve().parents[1]
STATIC = COMMERCIAL / "static"
TEMPLATES = COMMERCIAL / "templates"
DATA = COMMERCIAL / "data"


def test_climate_zone_temperatures_match_normative_dataset() -> None:
    payload = json.loads((DATA / "winter-climate-zones.geojson").read_text(encoding="utf-8"))
    temperatures = {}
    for feature in payload["features"]:
        props = feature["properties"]
        temperatures.setdefault(props["zone"], props["design_temperature_c"])

    assert temperatures == {
        "I": -12,
        "II": -15,
        "III": -18,
        "IV": -21,
        "V": -24,
    }


def test_editorial_map_uses_pale_thermal_palette_and_centered_legend() -> None:
    css = (STATIC / "home-lab-editorial.css").read_text(encoding="utf-8")
    expected = {
        "I": "#f3bf91",
        "II": "#f2d3a6",
        "III": "#dde2c4",
        "IV": "#c8dfdf",
        "V": "#b8cee5",
    }
    for zone, color in expected.items():
        assert f".ed-map-zone.zone-{zone}{{fill:{color}}}" in css
        assert f".ed-map-legend-item.zone-{zone} i{{background:{color}}}" in css

    assert ".ed-map-legend{" in css
    assert "justify-content:center" in css


def test_editorial_map_supports_zoom_pan_and_progressive_localities() -> None:
    script = (STATIC / "home-lab-editorial.js").read_text(encoding="utf-8")
    for token in (
        "MAP_MAX_ZOOM = 6",
        "localityTierLimitForZoom",
        "visibleMapLocalities",
        "projectedLocalities",
        'data-map-zoom="in"',
        'data-map-zoom="out"',
        'data-map-zoom="reset"',
        'addEventListener("wheel"',
        'addEventListener("pointerdown"',
        'addEventListener("pointermove"',
        'addEventListener("dblclick"',
        "design_temperature_c",
        "ed-map-legend",
        "offsetX = (width - projectedWidth) / 2",
        "offsetY = (height - projectedHeight) / 2",
        "mapGeometryOuterOutlinePath",
        'data-selected-zone="',
    ):
        assert token in script


def test_editorial_template_busts_map_asset_cache() -> None:
    template = (TEMPLATES / "home_lab_editorial.html").read_text(encoding="utf-8")
    assert "/static/home-lab-editorial.css?v=9" in template
    assert "/static/home-lab-editorial.js?v=10" in template
