from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PRODUCTION_WORKFLOW = ROOT / ".github" / "workflows" / "commercial-v2-cloudflare-worker.yml"
RELIABILITY_WORKFLOW = ROOT / ".github" / "workflows" / "release-reliability-staging.yml"


def test_production_deploy_auto_promotes_only_uat_approved_green_merge() -> None:
    source = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")
    trigger_block = source.split("concurrency:", 1)[0]

    assert "workflow_dispatch:" in trigger_block
    assert "\n  push:" in trigger_block
    assert "codex/commercial-v2-cloudflare-python" in trigger_block
    assert "release_sha:" in trigger_block
    assert "promotion_mode:" in trigger_block
    assert "- rollback" in trigger_block

    assert "Validate UAT-approved automatic promotion or explicit rollback" in source
    assert 'PRODUCTION_BRANCH: codex/commercial-v2-cloudflare-python' in source
    assert "Promotion SHA must equal current production branch HEAD" in source
    assert "Rollback SHA must be an ancestor of current production HEAD" in source
    assert "uat-approved" in source
    assert "Release Reliability Staging" in source
    assert "Commercial PR Checks" in source
    assert "TEO Blackbox 1000" in source
    assert "Editorial UI Preview" in source
    assert "Merged production tree differs from the UAT-tested PR head" in source

    assert "Check out exact release SHA" in source
    assert "github.event_name == 'push'" in source


def test_release_reliability_gate_tracks_release_pipeline_changes() -> None:
    source = RELIABILITY_WORKFLOW.read_text(encoding="utf-8")

    assert "Release Reliability Staging" in source
    assert 'RBPE_STRESS_SEQUENTIAL: "1000"' in source
    assert 'RBPE_STRESS_BURST_CONCURRENCY: "8"' in source
    assert 'RBPE_STRESS_PV_ROUNDS: "10"' in source
    assert 'TEO_SOAK_RUNS: "25"' in source
    assert "release-browser-matrix.mjs" in source
    assert "test_energy_product_catalog_scale.py" in source
    assert '".github/workflows/commercial-v2-cloudflare-worker.yml"' in source
