from __future__ import annotations

import math
import unittest

from common import fixture_path, load_json
from lacurent_engine import ENGINE_INPUT_SCHEMA_VERSION, build_engine_input_from_p3v_fixture, calculate
from lacurent_engine.api.schemas import validate_engine_input


class EngineContractTests(unittest.TestCase):
    def test_reference_fixture_builds_stable_engine_contract(self):
        fixture = load_json(fixture_path("rb001.json"))
        engine_input = build_engine_input_from_p3v_fixture(fixture)

        self.assertEqual(engine_input["schemaVersion"], ENGINE_INPUT_SCHEMA_VERSION)
        self.assertIn("building", engine_input)
        self.assertIn("climate", engine_input)
        self.assertIn("envelope", engine_input)
        self.assertIn("use", engine_input)
        self.assertIn("systems", engine_input)
        self.assertIn("renewables", engine_input)
        self.assertIn("calculationOptions", engine_input)
        self.assertEqual(validate_engine_input(engine_input), [])

    def test_missing_is_not_treated_as_zero(self):
        fixture = load_json(fixture_path("rb001.json"))
        engine_input = build_engine_input_from_p3v_fixture(fixture)
        del engine_input["envelope"]

        diagnostics = validate_engine_input(engine_input)
        self.assertEqual(diagnostics[0]["code"], "MISSING_ENGINE_INPUT")
        result = calculate(engine_input)
        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["chapter2"]["annual"], {})

    def test_non_finite_numbers_are_rejected(self):
        fixture = load_json(fixture_path("rb001.json"))
        engine_input = build_engine_input_from_p3v_fixture(fixture)
        engine_input["building"]["bad"] = math.inf

        diagnostics = validate_engine_input(engine_input)
        self.assertTrue(any(item["code"] == "INVALID_ENGINE_INPUT" for item in diagnostics))

    def test_solar_blocker_is_structured_not_zero(self):
        fixture = load_json(fixture_path("rb001.json"))
        engine_input = build_engine_input_from_p3v_fixture(fixture)
        engine_input["climate"]["solarGainPreprocessingStatus"] = "blocked_qsky"
        engine_input["climate"]["monthly"][0]["solarGainPreprocessingStatus"] = "blocked_qsky"

        result = calculate(engine_input)
        self.assertEqual(result["status"], "incomplete")
        self.assertEqual(result["diagnostics"][0]["code"], "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED")
        self.assertIn("blocked", result["executionTrace"][-1]["status"])


if __name__ == "__main__":
    unittest.main()
