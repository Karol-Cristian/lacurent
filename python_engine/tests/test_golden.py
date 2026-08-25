from __future__ import annotations

import unittest

from common import close, expected_path, fixture_path, load_json
from lacurent_engine import build_engine_input_from_p3v_fixture, calculate


class GoldenFixtureTests(unittest.TestCase):
    def test_p3v_golden_fixtures_calculate_chapter2_supported_scope(self):
        for name in ["rb001.json", "rb002.json", "rb003.json"]:
            with self.subTest(name=name):
                fixture = load_json(fixture_path(name))
                expected = load_json(expected_path(name))
                result = calculate(build_engine_input_from_p3v_fixture(fixture))

                self.assertEqual(result["status"], "ready")
                close(result["chapter2"]["annual"]["qHndKWh"], expected["annual"]["q_hnd_kwh"])
                close(result["chapter2"]["annual"]["qCndKWh"], expected["annual"]["q_cnd_kwh"])
                self.assertEqual(result["provenance"]["javascriptRuntimeCalled"], False)
                self.assertGreaterEqual(len(result["executionTrace"]), 12)

    def test_photovoltaic_supported_scope_uses_product_input_not_default(self):
        fixture = load_json(fixture_path("rb001.json"))
        engine_input = build_engine_input_from_p3v_fixture(fixture)
        engine_input["renewables"] = {
            "photovoltaic": {
                "enabled": True,
                "installedPowerKWp": 5,
                "monthlySpecificYieldKWhPerKWp": [50, 60, 85, 100, 115, 125, 130, 120, 95, 75, 55, 45],
            }
        }

        result = calculate(engine_input)
        self.assertEqual(result["chapter4"]["status"], "calculated")
        self.assertEqual(result["chapter4"]["annualProductionKWh"], 5275)


if __name__ == "__main__":
    unittest.main()
