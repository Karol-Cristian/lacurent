from __future__ import annotations

import copy
import unittest

from common import fixture_path, load_json
from mc001_reference.calculator import calculate_building
from mc001_reference.diagnostics import validate_full_fixture, validate_hidden_output_patterns


class HiddenInputDetectionTests(unittest.TestCase):
    def test_missing_provenance_is_blocked(self):
        fixture = load_json(fixture_path("rb001.json"))
        fixture.pop("profile_provenance")
        codes = {item["code"] for item in validate_full_fixture(fixture)}
        self.assertIn("missing_climate_profile_provenance", codes)

    def test_demo_fallback_is_blocked(self):
        fixture = load_json(fixture_path("rb001.json"))
        fixture["profile_provenance"]["source_type"] = "demo_fixture"
        codes = {item["code"] for item in validate_full_fixture(fixture)}
        self.assertIn("implicit_demo_fallback", codes)

    def test_isolated_gain_spike_is_blocked(self):
        fixture = load_json(fixture_path("rb001.json"))
        fixture["monthly"][8]["solar_gains_kwh"] = 10_000
        codes = {item["code"] for item in validate_full_fixture(fixture)}
        self.assertIn("isolated_extreme_gain_month", codes)

    def test_constant_transfer_pattern_is_blocked(self):
        result = calculate_building(load_json(fixture_path("rb001.json")))
        mutated = copy.deepcopy(result)
        for month in mutated["monthly"]:
            month["qtr_heating_kwh"] = 123.0
            month["qve_heating_kwh"] = 45.0
        codes = {item["code"] for item in validate_hidden_output_patterns(mutated)}
        self.assertIn("identical_qtr_across_unequal_duration_months", codes)
        self.assertIn("identical_qve_across_unequal_duration_months", codes)


if __name__ == "__main__":
    unittest.main()

