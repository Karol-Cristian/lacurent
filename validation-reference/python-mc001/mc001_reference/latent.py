"""Latent demand placeholder for selected P3V fixtures.

The full-chain P3V fixtures do not include humidification or dehumidification
inputs. The calculator still emits explicit zero/null latent outputs so useful
heating and cooling demand remain separate from latent demand.
"""

from __future__ import annotations


def latent_summary() -> dict:
    return {
        "included": False,
        "annual_humidification_kwh": 0.0,
        "annual_dehumidification_kwh": 0.0,
        "branch": "latent_not_in_selected_reference_fixtures",
    }

