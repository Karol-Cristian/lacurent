from __future__ import annotations

import unittest

from compare.differential import main


class DifferentialHarnessTests(unittest.TestCase):
    def test_golden_and_randomized_differential_harness(self):
        self.assertEqual(main(["--randomized", "6"]), 0)


if __name__ == "__main__":
    unittest.main()
