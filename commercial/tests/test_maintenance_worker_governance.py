from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
WORKER_CONFIG = ROOT / "commercial" / "maintenance-worker" / "wrangler.toml"
STAGING_WORKFLOW = ROOT / ".github" / "workflows" / "maintenance-worker-staging.yml"
PRODUCTION_WORKFLOW = ROOT / ".github" / "workflows" / "maintenance-mode-production.yml"
ROUTE_SWITCH = ROOT / "scripts" / "cloudflare-maintenance-mode.mjs"


def test_maintenance_worker_has_no_production_route_in_static_config() -> None:
    source = WORKER_CONFIG.read_text(encoding="utf-8")

    assert 'name = "lacurent-maintenance"' in source
    assert "workers_dev = true" in source
    assert "[[routes]]" not in source
    assert "custom_domain" not in source
    assert "zone_name" not in source


def test_staging_maintenance_preview_is_route_less() -> None:
    source = STAGING_WORKFLOW.read_text(encoding="utf-8")

    assert "lacurent-maintenance-staging" in source
    assert "no lacurent.com route was created" in source
    assert "Maintenance staging Worker must not contain production routes." in source
    assert "/__maintenance/health" in source
    assert 'waitFor("/", 503)' in source


def test_production_maintenance_mutation_is_manual_and_branch_guarded() -> None:
    source = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")
    trigger = source.split("concurrency:", 1)[0]

    assert "workflow_dispatch:" in trigger
    assert "\n  push:" not in trigger
    assert "enable" in trigger
    assert "disable" in trigger
    assert "status" in trigger
    assert "Refuse production mutation outside production branch" in source
    assert "codex/commercial-v2-cloudflare-python" in source
    assert "MAINTENANCE_CONFIRM: lacurent.com" in source


def test_maintenance_route_switch_covers_more_specific_api_routes() -> None:
    source = ROUTE_SWITCH.read_text(encoding="utf-8")

    for pattern in (
        "lacurent.com/*",
        "www.lacurent.com/*",
        "lacurent.com/api/home-lab-next/calculate*",
        "lacurent.com/api/optimization/home-lab/v3/*",
        "lacurent.com/api/optimization/home-lab/v4/*",
    ):
        assert pattern in source

    assert "Maintenance route safety gate failed before mutation" in source
    assert "lacurent-home-lab-calc" in source
    assert "lacurent-teo-router" in source
    assert "lacurent-commercial-v2" in source
