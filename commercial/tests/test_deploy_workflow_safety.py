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


def test_production_deploy_trigger_covers_executed_catalog_builder() -> None:
    workflow = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")
    script = "scripts/build-heating-catalog-d1-import.py"

    assert f'- "{script}"' in workflow
