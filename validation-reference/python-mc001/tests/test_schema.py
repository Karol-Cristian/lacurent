from __future__ import annotations

import unittest

from common import fixture_path
from mc001_reference.calculator import calculate_fixture_file


class SchemaTests(unittest.TestCase):
    def test_normalized_schema_contains_required_sections(self):
        result = calculate_fixture_file(fixture_path("rb003.json"))
        for key in ("schema", "engine", "fixture", "materials", "assemblies", "envelope", "monthly", "annual", "latent", "units", "formulas", "diagnostics"):
            self.assertIn(key, result)
        self.assertEqual(result["schema"], "p3v.normalized.v1")

    def test_formula_coverage_contains_required_groups(self):
        result = calculate_fixture_file(fixture_path("rb001.json"))
        for key in ("design_lambda", "u_value", "htr", "monthly_transmission", "monthly_ventilation", "monthly_gains", "qhnd", "qcnd", "annual_sums"):
            self.assertIn(key, result["formulas"])
            self.assertIn("source", result["formulas"][key])

    def test_monthly_audit_intermediates_present_when_positive(self):
        result = calculate_fixture_file(fixture_path("rb003.json"))
        for month in result["monthly"]:
            if month["q_hnd_kwh"] > 0:
                for key in ("gamma_h", "tau_h", "a_h", "eta_hgn"):
                    self.assertIsNotNone(month[key])
            if month["q_cnd_kwh"] > 0:
                for key in ("gamma_c", "tau_c", "a_c", "eta_cht"):
                    self.assertIsNotNone(month[key])


if __name__ == "__main__":
    unittest.main()

