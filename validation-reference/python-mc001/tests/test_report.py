from __future__ import annotations

import json
import sys
import unittest

from common import PACKAGE_ROOT, run_command_json


class ReportTests(unittest.TestCase):
    def test_deterministic_report_generation(self):
        first = run_command_json([sys.executable, "compare/generate_report.py", "--all"], cwd=PACKAGE_ROOT)
        second = run_command_json([sys.executable, "compare/generate_report.py", "--all"], cwd=PACKAGE_ROOT)
        self.assertEqual(first["status"], "PASS")
        self.assertEqual(first, second)
        report_path = PACKAGE_ROOT / "reports" / "p3v_differential_report.json"
        report = json.loads(report_path.read_text(encoding="utf-8"))
        self.assertEqual(report["p3v_gate_result"], "PASS")
        self.assertEqual(report["reference_building_count"], 3)


if __name__ == "__main__":
    unittest.main()
