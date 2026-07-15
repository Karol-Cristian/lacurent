"""Command line entry point for the Python reference calculator."""

from __future__ import annotations

import argparse
import json
import sys

from .calculator import calculate_fixture_file


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run independent MC001 Python reference calculator")
    parser.add_argument("fixture", help="Path to a reference-building fixture JSON file")
    args = parser.parse_args(argv)
    result = calculate_fixture_file(args.fixture)
    json.dump(result, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

