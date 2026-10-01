from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "commercial" / "templates" / "home_lab_editorial.html"
JS = ROOT / "commercial" / "static" / "home-lab-editorial.js"
CSS = ROOT / "commercial" / "static" / "home-lab-editorial.css"
MAIN = ROOT / "commercial" / "app" / "main.py"
MIGRATION = ROOT / "migrations" / "019_home_lab_account_persistence.sql"


def test_editorial_account_ui_and_client_flow_are_wired() -> None:
    html = HTML.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")

    for marker in (
        'id="edAccountDialog"',
        'id="edLoginForm"',
        'id="edRegisterForm"',
        'id="edProjectSave"',
        'id="edProjectsList"',
        'id="edProjectQuickSave"',
    ):
        assert marker in html

    for marker in (
        '"/api/login"',
        '"/api/register"',
        '"/api/me"',
        '"/api/logout"',
        '"/api/projects/save"',
        '"/api/projects/list"',
        '"/api/projects/load"',
        "accountWorkspaceSnapshot",
        "applyEditorialDraft",
        "rememberCurrentProject",
        "Authorization",
    ):
        assert marker in js

    assert ".ed-account-dialog" in css
    assert ".ed-account-project" in css
    assert ".ed-account-save" in css


def test_editorial_account_backend_routes_and_schema_exist() -> None:
    main = MAIN.read_text(encoding="utf-8")
    migration = MIGRATION.read_text(encoding="utf-8")

    for route in (
        '@app.post("/api/register")',
        '@app.post("/api/login")',
        '@app.post("/api/logout")',
        '@app.get("/api/me")',
        '@app.post("/api/projects/save")',
        '@app.get("/api/projects/list")',
        '@app.post("/api/projects/load")',
    ):
        assert route in main

    for table in (
        "users",
        "user_sessions",
        "building_platform_projects",
        "building_platform_project_drafts",
    ):
        assert f"CREATE TABLE IF NOT EXISTS {table}" in migration


def test_editorial_account_assets_are_cache_busted() -> None:
    html = HTML.read_text(encoding="utf-8")
    assert "home-lab-editorial.css?v=38" in html
    assert "home-lab-editorial.js?v=72" in html
