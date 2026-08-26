from __future__ import annotations

import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from lacurent_engine.api.service import CalculateHandler


MONTHS = ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")


def month_profile(month: str) -> dict:
    return {
        "month": month,
        "transmission": {
            "heating": {
                "duration": {"amount": 720, "unit": "h"},
                "indoorTemperature": {"amount": 20, "unit": "degC"},
                "outdoorTemperature": {"amount": 0, "unit": "degC"},
            },
            "cooling": {
                "duration": {"amount": 720, "unit": "h"},
                "indoorTemperature": {"amount": 26, "unit": "degC"},
                "outdoorTemperature": {"amount": 30, "unit": "degC"},
            },
        },
        "ventilation": {
            "heating": {
                "airHeatCapacity": {"amount": 1200, "unit": "J/m3K"},
                "airFlowRate": {"amount": 1 / 60, "unit": "m3/s"},
            }
        },
        "heatGains": {
            "internalGains": {"amount": 250, "unit": "kWh"},
            "solarGains": {"amount": 150, "unit": "kWh"},
        },
        "utilization": {
            "effectiveInternalHeatCapacity": {"amount": 100000000, "unit": "J/K"},
            "heating": {"aH0": {"amount": 1, "unit": "dimensionless"}, "tauH0": {"amount": 15, "unit": "h"}},
            "cooling": {
                "aC0": {"amount": 1, "unit": "dimensionless"},
                "tauC0": {"amount": 15, "unit": "h"},
                "aCred": {"amount": 1, "unit": "dimensionless"},
            },
        },
    }


def simple_input() -> dict:
    return {
        "schemaVersion": "lacurent_simple_input_v1",
        "project": {"projectId": "p12b-service", "name": "P12B service"},
        "location": {"locality": "Bucuresti", "station": "Bucuresti"},
        "building": {
            "type": "single_family_house",
            "lengthM": 10,
            "widthM": 8,
            "levels": 1,
            "floorHeightM": 2.7,
        },
        "envelope": {
            "wallAreaM2": 120,
            "wallUValueWPerM2K": 0.4,
            "roofUValueWPerM2K": 0.2,
            "floorUValueWPerM2K": 0.3,
            "windowAreaM2": 16,
            "windowUValueWPerM2K": 1.2,
        },
        "use": {"category": "residential"},
        "systems": {
            "heating": {"enabled": False},
            "domesticHotWater": {"enabled": False},
            "cooling": {"enabled": False},
            "ventilation": {"enabled": False},
        },
        "renewables": {"photovoltaic": {"enabled": True, "annualProductionKWh": 4200}},
        "calculation": {
            "monthlyProfiles": [month_profile(month) for month in MONTHS],
            "solarGainPreprocessingStatus": "available_or_explicit",
        },
    }


class PythonServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), CalculateHandler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def url(self, path: str) -> str:
        return f"http://127.0.0.1:{self.port}{path}"

    def post(self, payload: dict | str, *, content_type: str = "application/json") -> tuple[int, dict]:
        data = payload if isinstance(payload, str) else json.dumps(payload, allow_nan=False)
        request = urllib.request.Request(
            self.url("/calculate"),
            data=data.encode("utf-8"),
            headers={"content-type": content_type, "x-lacurent-compact-output": "true"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8"))

    def test_health(self) -> None:
        with urllib.request.urlopen(self.url("/health"), timeout=5) as response:
            body = json.loads(response.read().decode("utf-8"))
        self.assertEqual(response.status, 200)
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["engine"], "python")
        self.assertTrue(body["engineVersion"])

    def test_calculate_delegates_to_python_engine(self) -> None:
        status, body = self.post(simple_input())
        self.assertEqual(status, 200)
        self.assertEqual(body["engine"], "python")
        self.assertEqual(body["status"], "ready")
        self.assertEqual(body["chapter4"]["annualProductionKWh"], 4200)
        self.assertTrue(body["performance"]["runtimeMs"] >= 0)

    def test_invalid_content_type_is_rejected(self) -> None:
        status, body = self.post("{}", content_type="text/plain")
        self.assertEqual(status, 415)
        self.assertEqual(body["diagnostics"][0]["code"], "PYTHON_ENGINE_INVALID_CONTENT_TYPE")

    def test_invalid_json_is_rejected(self) -> None:
        status, body = self.post("{", content_type="application/json")
        self.assertEqual(status, 400)
        self.assertEqual(body["diagnostics"][0]["code"], "PYTHON_ENGINE_INVALID_JSON")

    def test_nan_json_constant_is_rejected(self) -> None:
        status, body = self.post('{"schemaVersion": "lacurent_simple_input_v1", "building": {"lengthM": NaN}}')
        self.assertEqual(status, 400)
        self.assertEqual(body["diagnostics"][0]["code"], "PYTHON_ENGINE_INVALID_JSON")


if __name__ == "__main__":
    unittest.main()
