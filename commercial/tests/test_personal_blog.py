from fastapi.testclient import TestClient

from commercial.app.main import app


client = TestClient(app)


def test_personal_blog_index_is_public_but_temporarily_noindex() -> None:
    response = client.get("/karol-cristian-lemnaru")
    assert response.status_code == 200
    assert "Karol Cristian Lemnaru" in response.text
    assert "limită → identitate → relație → tensiune → suferință" in response.text
    assert "Lucrările sau inima" in response.text
    assert "Fără verdict" in response.text
    assert 'name="robots" content="noindex,follow"' in response.text


def test_personal_blog_article_route() -> None:
    response = client.get("/karol-cristian-lemnaru/lucrarile-sau-inima")
    assert response.status_code == 200
    assert "<h1>Lucrările sau inima</h1>" in response.text
    assert "Matei 7:21–23" in response.text
    assert "reconstruit editorial" in response.text


def test_personal_blog_unknown_article_is_404() -> None:
    response = client.get("/karol-cristian-lemnaru/nu-exista")
    assert response.status_code == 404
