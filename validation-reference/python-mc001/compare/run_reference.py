"""CLI wrapper for the independent Python MC001 reference calculator."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from mc001_reference.calculator import calculate_fixture_file  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fixture", help="Path to a P3V reference-building JSON fixture")
    parser.add_argument("--engine", default="python_reference")
    args = parser.parse_args(argv)

    result = calculate_fixture_file(args.fixture, engine=args.engine)
    json.dump(result, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
