from __future__ import annotations

import platform
import shutil
import sys


def main() -> int:
    if sys.version_info < (3, 11):
        print("P3V requires Python >= 3.11", file=sys.stderr)
        return 1
    if shutil.which("node") is None:
        print("P3V requires Node.js on PATH for the LaCurent runtime runner", file=sys.stderr)
        return 1
    print(f"Python {platform.python_version()} OK")
    print("Dependencies: Python standard library only")
    print("Node.js OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
