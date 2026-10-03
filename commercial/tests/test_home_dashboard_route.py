from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)


def test_casa_mea_route_serves_current_editorial_dashboard() -> None:
    response = client.get("/casa-mea")
    assert response.status_code == 200
    assert "Casa mea — LaCurent" in response.text
    assert 'id="hdProjectSelect"' in response.text
    assert 'src="/static/home-dashboard.js?v=1"' in response.text
    assert 'href="/static/home-dashboard.css?v=1"' in response.text
    assert "/home-lab-editorial" in response.text


def test_compact_locality_endpoint_returns_coordinates() -> None:
    response = client.get("/api/locality/cluj_napoca")
    assert response.status_code == 200
    payload = response.json()
    assert payload["name"]
    assert payload["county"]
    assert isinstance(payload["lat"], (int, float))
    assert isinstance(payload["lon"], (int, float))
