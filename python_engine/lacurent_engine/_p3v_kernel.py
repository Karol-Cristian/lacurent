"""Access to the existing independent P3V calculation kernel.

P3V is a Python implementation maintained under validation-reference.  The P11
engine uses it as an independent formula kernel instead of translating the JS
runtime.  The import path is resolved from the repository layout and never calls
the JavaScript engine.
"""

from __future__ import annotations

import sys
from pathlib import Path


def ensure_p3v_path() -> Path:
    repo_root = Path(__file__).resolve().parents[2]
    package_root = repo_root / "validation-reference" / "python-mc001"
    if not package_root.exists():
        raise ImportError(f"P3V package not found at {package_root}")
    package_text = str(package_root)
    if package_text not in sys.path:
        sys.path.insert(0, package_text)
    return package_root


def import_calculator():
    ensure_p3v_path()
    from mc001_reference.calculator import calculate_building

    return calculate_building
