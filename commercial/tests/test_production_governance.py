from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PR_WORKFLOW = ROOT / ".github" / "workflows" / "commercial-pr-checks.yml"
PROD_WORKFLOW = ROOT / ".github" / "workflows" / "commercial-v2-cloudflare-worker.yml"
WORKER_CONFIG = ROOT / "commercial" / "cloudflare-worker" / "wrangler.toml"


def test_commercial_pr_checks_run_for_every_pr_to_production_branch() -> None:
    source = PR_WORKFLOW.read_text(encoding="utf-8")
    assert "pull_request:" in source
    assert "codex/commercial-v2-cloudflare-python" in source

    trigger_section = source.split("jobs:", 1)[0]
    assert "paths:" not in trigger_section
    assert "paths-ignore:" not in trigger_section


def test_production_workflow_blocks_non_pr_push_deployments() -> None:
    source = PROD_WORKFLOW.read_text(encoding="utf-8")
    assert "Require merged PR origin for production pushes" in source
    assert "github.event_name == 'push'" in source
    assert "/commits/{sha}/pulls" in source
    assert "merge_commit_sha" in source
    assert "Direct-push deployments are blocked." in source
    assert "pull-requests: read" in source


def test_production_cloudflare_credentials_fail_closed() -> None:
    source = PROD_WORKFLOW.read_text(encoding="utf-8")
    assert "Validate production deployment credentials" in source
    assert "Production deploy requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID." in source
    assert "Cloudflare domain preparation requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID." in source
    assert "Cloudflare deploy requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID." in source
    assert "Production verification requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID." in source

    forbidden = (
        "Cloudflare domain preparation skipped",
        "Cloudflare staging deploy skipped",
        "Cloudflare production verification skipped",
    )
    for marker in forbidden:
        assert marker not in source



def test_production_worker_has_explicit_cpu_headroom() -> None:
    source = WORKER_CONFIG.read_text(encoding="utf-8")
    assert "[limits]" in source
    assert "cpu_ms = 120000" in source
