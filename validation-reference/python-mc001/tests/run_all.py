from __future__ import annotations

import sys
import unittest
from pathlib import Path

TEST_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = TEST_DIR.parent

sys.path.insert(0, str(PACKAGE_ROOT))
sys.path.insert(0, str(TEST_DIR))

if __name__ == "__main__":
    suite = unittest.defaultTestLoader.discover(str(TEST_DIR), pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)

