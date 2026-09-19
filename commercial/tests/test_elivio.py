from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)


def test_elivio_page_is_standalone_and_transparent() -> None:
    response = client.get("/elivio-consilio")
    assert response.status_code == 200
    assert "ELIVIO" in response.text
    assert "Violeta Munteanu" in response.text
    assert "Consilier ICL" in response.text
    assert "MAXWELL" in response.text
    assert "EQUIP" in response.text
    assert "Exemplu compozit" in response.text
    assert "Nu sunt mărturii reale" in response.text
    assert "LaCurent" not in response.text
    assert 'href="/software-testing"' not in response.text
    assert 'href="/instalatii"' not in response.text


def test_elivio_privacy_page_is_available() -> None:
    response = client.get("/elivio-consilio/confidentialitate")
    assert response.status_code == 200
    assert "Confidențialitate & AI" in response.text
    assert "nu oferă diagnostic" in response.text


def test_elivio_chat_has_safe_local_orientation_fallback() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={"messages": [{"role": "user", "content": "Nu știu de unde să încep."}]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "orientation"
    assert payload["crisis"] is False
    assert "asistentul virtual" in payload["reply"]


def test_elivio_chat_escalates_immediate_safety_language() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={"messages": [{"role": "user", "content": "Vreau să mă sinucid."}]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "safety"
    assert payload["crisis"] is True
    assert "112" in payload["reply"]
