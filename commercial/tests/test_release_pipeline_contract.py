from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PRODUCTION_WORKFLOW = ROOT / ".github" / "workflows" / "commercial-v2-cloudflare-worker.yml"
RELIABILITY_WORKFLOW = ROOT / ".github" / "workflows" / "release-reliability-staging.yml"


def test_production_deploy_is_manual_only_with_explicit_release_sha() -> None:
    source = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")
    trigger_block = source.split("concurrency:", 1)[0]

    assert "workflow_dispatch:" in trigger_block
    assert "\n  push:" not in trigger_block
    assert "release_sha:" in trigger_block
    assert "promotion_mode:" in trigger_block
    assert "- promote" in trigger_block
    assert "- rollback" in trigger_block

    assert "Validate explicit production promotion or rollback" in source
    assert 'PRODUCTION_BRANCH: codex/commercial-v2-cloudflare-python' in source
    assert "Promotion SHA must equal current production branch HEAD" in source
    assert "Rollback SHA must be an ancestor of current production HEAD" in source
    assert "Promotion SHA is not the merge commit of a merged PR" in source

    assert "Check out exact release SHA" in source
    assert "ref: ${{ inputs.release_sha }}" in source


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
