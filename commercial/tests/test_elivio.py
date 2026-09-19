from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)


def test_elivio_page_is_standalone_and_transparent() -> None:
    response = client.get("/elivio-consilio")
    assert response.status_code == 200
    assert 'class="ec-wordmark">elivio' in response.text
    assert "Violeta Munteanu" in response.text
    assert "Consilier ICL" in response.text
    assert "Asistent social" in response.text
    assert "Maxwell Leadership Certified Team" in response.text
    assert "EQUIP" in response.text
    assert "Spune ce ai în minte." in response.text
    assert "Vreau o programare" in response.text
    assert "1 / 4" not in response.text
    assert "data-chat-launcher" in response.text
    assert "data-chat-panel" in response.text
    assert "data-contact-form" in response.text
    assert "data-chat-context-note" in response.text
    assert "ICL-Logo-weiss-R.svg" in response.text
    assert "ec-mark" not in response.text
    assert "check-in bun" not in response.text
    assert "reveni către tine" not in response.text
    assert "Exemplu compozit" in response.text
    assert "Nu sunt mărturii reale" in response.text
    assert "LaCurent" not in response.text
    assert 'href="/software-testing"' not in response.text
    assert 'href="/instalatii"' not in response.text


def test_elivio_privacy_page_is_available() -> None:
    response = client.get("/elivio-consilio/confidentialitate")
    assert response.status_code == 200
    assert "Confidențialitate și AI" in response.text
    assert "nu stabilește diagnostice" in response.text


def test_elivio_chat_has_safe_local_orientation_fallback() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={"messages": [{"role": "user", "content": "Nu știu de unde să încep."}]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "orientation"
    assert payload["crisis"] is False
    assert payload["stage"] == 2
    assert payload["stage_label"] == "Ce vrei să se schimbe"
    assert "diferit" in payload["reply"]


def test_elivio_chat_escalates_immediate_safety_language() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={"messages": [{"role": "user", "content": "Vreau să mă sinucid."}]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "safety"
    assert payload["crisis"] is True
    assert payload["stage"] == 4
    assert "112" in payload["reply"]


def test_elivio_fallback_advances_instead_of_repeating() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={
            "messages": [
                {"role": "user", "content": "Am o decizie grea în familie."},
                {"role": "assistant", "content": "Ce ai vrea să fie diferit?"},
                {"role": "user", "content": "Aș vrea să pot lua decizia fără să mă simt blocat."},
            ]
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["stage"] == 3
    assert payload["stage_label"] == "Ce sprijin se potrivește"
    assert "tema ține" in payload["reply"]


def test_elivio_chat_booking_intent_skips_intake() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={"messages": [{"role": "user", "content": "Vreau să mă programez."}]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "booking"
    assert payload["stage"] == 4
    assert payload["action"]["type"] == "booking"
    assert payload["action"]["target"] == "#contact"


def test_elivio_chat_rejects_cnp_before_ai() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={"messages": [{"role": "user", "content": "CNP-ul meu este 1960528123456 și vreau să vorbim."}]},
    )
    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "sensitive_data"
    assert payload["sensitive_kind"] == "cnp"


def test_elivio_chat_rejects_payment_card_before_ai() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={"messages": [{"role": "user", "content": "Cardul meu este 4111 1111 1111 1111."}]},
    )
    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "sensitive_data"
    assert payload["sensitive_kind"] == "card"


def test_elivio_chat_summary_prefills_contact_context_without_ai() -> None:
    response = client.post(
        "/elivio-consilio/api/chat-summary",
        json={
            "messages": [
                {"role": "user", "content": "Am o decizie grea în familie."},
                {"role": "assistant", "content": "Ce ai vrea să fie diferit?"},
                {"role": "user", "content": "Aș vrea să mă simt mai clar și mai puțin blocat."},
            ]
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "fallback"
    assert "decizie grea în familie" in payload["summary"]
    assert "mai puțin blocat" in payload["summary"]
    assert "Ce ai vrea să fie diferit?" not in payload["summary"]


def test_elivio_chat_summary_does_not_copy_crisis_details() -> None:
    response = client.post(
        "/elivio-consilio/api/chat-summary",
        json={
            "messages": [
                {"role": "user", "content": "Vreau să mă sinucid."},
            ]
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "sinucid" not in payload["summary"].casefold()
    assert "Aș dori să discut cu Violeta" in payload["summary"]


def test_elivio_chat_does_not_answer_general_heating_question() -> None:
    response = client.post(
        "/elivio-consilio/api/chat",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "Îmi poți spune cum e mai ieftin să te încălzești? Cu gaz sau lemne?",
                }
            ]
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "out_of_scope"
    assert payload["crisis"] is False
    assert "orientării pentru consiliere" in payload["reply"]
    assert "lemne poate fi mai ieftină" not in payload["reply"]
    assert payload["action"] is None


def test_elivio_contact_summary_ignores_out_of_scope_heating_question() -> None:
    response = client.post(
        "/elivio-consilio/api/chat-summary",
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "Îmi poți spune cum e mai ieftin să te încălzești? Cu gaz sau lemne?",
                }
            ]
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "gaz" not in payload["summary"].casefold()
    assert "lemne" not in payload["summary"].casefold()
    assert "Aș dori să discut cu Violeta" in payload["summary"]
