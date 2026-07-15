from __future__ import annotations

import shutil
import sys
import unittest


class EnvironmentTests(unittest.TestCase):
    def test_python_version(self):
        self.assertGreaterEqual(sys.version_info, (3, 11))

    def test_node_available_for_runtime_runner(self):
        self.assertIsNotNone(shutil.which("node"))


if __name__ == "__main__":
    unittest.main()
