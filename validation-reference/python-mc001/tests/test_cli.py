from __future__ import annotations

import sys
import unittest

from common import PACKAGE_ROOT, fixture_path, run_command_json


class CliTests(unittest.TestCase):
    def test_python_reference_cli(self):
        result = run_command_json([sys.executable, "-m", "mc001_reference", str(fixture_path("rb001.json"))])
        self.assertEqual(result["schema"], "p3v.normalized.v1")
        self.assertEqual(result["fixture"]["fixture_id"], "RB-001")

    def test_compare_reference_cli(self):
        result = run_command_json([sys.executable, "compare/run_reference.py", str(fixture_path("rb001.json"))], cwd=PACKAGE_ROOT)
        self.assertEqual(result["engine"], "python_reference")


if __name__ == "__main__":
    unittest.main()

