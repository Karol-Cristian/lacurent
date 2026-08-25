"""Chapter 2 useful cooling demand helpers."""

from __future__ import annotations

from .._p3v_kernel import ensure_p3v_path

ensure_p3v_path()

from mc001_reference.cooling import cooling_need, eta_cht  # noqa: E402,F401
