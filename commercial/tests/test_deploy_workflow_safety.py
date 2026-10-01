from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PRODUCTION_WORKFLOW = (
    REPOSITORY_ROOT / ".github/workflows/commercial-v2-cloudflare-worker.yml"
)


def test_production_deploys_are_serialized_in_fifo_queue() -> None:
    workflow = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")

    assert "concurrency:" in workflow
    assert "group: commercial-v2-production" in workflow
    assert "queue: max" in workflow
    assert "cancel-in-progress: true" not in workflow

    concurrency_index = workflow.index("concurrency:")
    jobs_index = workflow.index("jobs:")
    assert concurrency_index < jobs_index


def test_production_deploy_is_manual_only_and_builds_catalog_before_deploy() -> None:
    workflow = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")
    trigger_section = workflow.split("concurrency:", 1)[0]

    assert "workflow_dispatch:" in trigger_section
    assert "\n  push:" not in trigger_section
    assert "release_sha:" in trigger_section
    assert "promotion_mode:" in trigger_section

    script = "scripts/build-heating-catalog-d1-import.py"
    assert script in workflow


def test_retired_classic_3d_is_not_part_of_production_release_contract() -> None:
    workflow = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")
    prepare_script = (
        REPOSITORY_ROOT / "scripts/prepare-commercial-cloudflare-worker.mjs"
    ).read_text(encoding="utf-8")

    assert 'node --check commercial/static/home-lab-next.js' not in workflow
    assert 'node --check commercial/static/home-lab-3d.js' not in workflow
    assert '"/home-lab-classic": "data-home-lab-next"' not in workflow
    assert '"/static/home-lab-next.js": "function openMeasure"' not in workflow
    assert '"/static/home-lab-next.css": ".hln-before-after"' not in workflow
    assert "Classic Home Lab rollback route is unavailable." not in workflow
    assert "Production partner Home Lab Next is unavailable." not in workflow

    for retired_path in (
        'path.join("static", "home-lab-next.js")',
        'path.join("static", "home-lab-next.css")',
        'path.join("static", "home-lab-3d.js")',
        'path.join("static", "home-lab-3d.css")',
        'path.join("templates", "home_lab_next.html")',
    ):
        assert retired_path in prepare_script

    assert 'expected 404' in workflow
