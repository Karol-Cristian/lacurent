"""Generate committed fixed expected files from the reviewed Python reference.

This script is intentionally separate from normal tests. It is used only when
the independent Python formulas or fixtures are reviewed and the fixed oracle
files must be refreshed with source-based justification.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from mc001_reference.calculator import calculate_fixture_file  # noqa: E402


def fixture_paths(args: argparse.Namespace) -> list[Path]:
    if args.all:
        return sorted((PACKAGE_ROOT / "fixtures").glob("rb*.json"))
    return [Path(item).resolve() for item in args.fixtures]


def write_expected(fixture_path: Path) -> Path:
    result = calculate_fixture_file(fixture_path, engine="fixed_expected")
    output_path = PACKAGE_ROOT / "expected" / f"{fixture_path.stem}_expected.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return output_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fixtures", nargs="*", help="Fixture JSON paths")
    parser.add_argument("--all", action="store_true", help="Generate expected files for all rb*.json fixtures")
    args = parser.parse_args(argv)
    if not args.all and not args.fixtures:
        parser.error("provide fixtures or --all")
    outputs = [write_expected(path) for path in fixture_paths(args)]
    for output in outputs:
        print(output.relative_to(PACKAGE_ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
