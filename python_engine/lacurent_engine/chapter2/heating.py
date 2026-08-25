"""Chapter 2 useful heating demand helpers."""

from __future__ import annotations

from .._p3v_kernel import ensure_p3v_path

ensure_p3v_path()

from mc001_reference.heating import heating_need, eta_hgn, time_constant_hours  # noqa: E402,F401
