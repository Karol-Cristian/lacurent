from __future__ import annotations

import unittest

from mc001_reference.materials import design_lambda, layer_resistance


class MaterialsTests(unittest.TestCase):
    def test_masonry_correction_manual_spot_check(self):
        result = design_lambda({
            "material_id": "old_masonry",
            "lambda_normat_w_mk": 0.600,
            "correction_coefficient": 1.03,
        })
        self.assertAlmostEqual(result["lambda_design_w_mk"], 0.618, places=12)

    def test_layer_resistance_manual_spot_check(self):
        self.assertAlmostEqual(layer_resistance(0.300, 0.618), 0.4854368932038835, places=12)

    def test_explicit_lambda(self):
        result = design_lambda({"material_id": "eps", "lambda_w_mk": 0.04})
        self.assertEqual(result["lambda_origin"], "explicit_lambda")
        self.assertAlmostEqual(result["lambda_design_w_mk"], 0.04, places=12)


if __name__ == "__main__":
    unittest.main()

