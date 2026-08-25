"""CLI wrapper for `python -m python_engine calculate input.json`."""

from __future__ import annotations

import sys

from .lacurent_engine.api.calculate import main


def _dispatch(argv: list[str]) -> int:
    if argv and argv[0] == "calculate":
        return main(argv[1:])
    return main(argv)


if __name__ == "__main__":
    raise SystemExit(_dispatch(sys.argv[1:]))
