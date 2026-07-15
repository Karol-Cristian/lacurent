from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parents[1]
FIXTURE_DIR = PACKAGE_ROOT / "fixtures"
EXPECTED_DIR = PACKAGE_ROOT / "expected"

if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))
if str(PACKAGE_ROOT / "compare") not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT / "compare"))


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def run_command_json(command: list[str], cwd: Path = PACKAGE_ROOT):
    result = subprocess.run(
        command,
        cwd=str(cwd),
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "PYTHONPATH": str(PACKAGE_ROOT)},
    )
    return json.loads(result.stdout)


def fixture_path(name: str) -> Path:
    return FIXTURE_DIR / name


def expected_path(name: str) -> Path:
    return EXPECTED_DIR / name

