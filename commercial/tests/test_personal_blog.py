from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)


def test_personal_blog_index_is_public_but_temporarily_noindex() -> None:
    response = client.get("/lemnaru-karol-cristian")
    assert response.status_code == 200
    assert "Lemnaru Karol Cristian" in response.text
    assert "limită → identitate → relație → tensiune → suferință" in response.text
    assert "Lucrările sau inima" in response.text
    assert "Fără verdict" in response.text
    assert 'id="fragmente"' in response.text
    assert "Existența costă." in response.text
    assert "Poți da aproape orice fără să te dai pe tine." in response.text
    assert 'name="robots" content="noindex,follow"' in response.text


def test_personal_blog_article_route() -> None:
    response = client.get("/lemnaru-karol-cristian/lucrarile-sau-inima")
    assert response.status_code == 200
    assert "<h1>Lucrările sau inima</h1>" in response.text
    assert "Matei 7:21–23" in response.text
    assert "reconstruit editorial" in response.text


def test_personal_blog_unknown_article_is_404() -> None:
    response = client.get("/lemnaru-karol-cristian/nu-exista")
    assert response.status_code == 404


def test_personal_business_technology_money_archive() -> None:
    response = client.get("/lemnaru-karol-cristian/afaceri-tehnologie-bani")
    assert response.status_code == 200
    assert "Principii de construcție" in response.text
    assert "Adevărul tehnic nu poate avea comision." in response.text
    assert "AI-ul poate multiplica ingineria. Nu poate deține adevărul ei." in response.text
    assert "Automatizează birocrația, nu disciplina." in response.text
    assert "Reutilizează înainte să reconstruiești." in response.text
    assert "notițele personale" in response.text
    assert "conversații" not in response.text
    assert 'name="robots" content="noindex,follow"' in response.text
