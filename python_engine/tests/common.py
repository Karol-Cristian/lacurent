from __future__ import annotations

import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
P3V_ROOT = REPO_ROOT / "validation-reference" / "python-mc001"

sys.path.insert(0, str(PACKAGE_ROOT))


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def fixture_path(name: str) -> Path:
    return P3V_ROOT / "fixtures" / name


def expected_path(name: str) -> Path:
    stem = name.removesuffix(".json")
    return P3V_ROOT / "expected" / f"{stem}_expected.json"


def close(left: float, right: float, tolerance: float = 1e-7) -> None:
    if abs(float(left) - float(right)) > tolerance:
        raise AssertionError(f"{left} != {right} within {tolerance}")
