from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PRODUCTION_WORKFLOW = (
    REPOSITORY_ROOT / ".github/workflows/commercial-v2-cloudflare-worker.yml"
)


def test_production_deploys_are_serialized_in_fifo_queue() -> None:
    workflow = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")

    expected_gate = """concurrency:
  group: commercial-v2-production
  queue: max

jobs:"""

    assert expected_gate in workflow
    assert "cancel-in-progress: true" not in workflow


def test_production_deploy_trigger_covers_executed_catalog_builder() -> None:
    workflow = PRODUCTION_WORKFLOW.read_text(encoding="utf-8")
    script = "scripts/build-heating-catalog-d1-import.py"

    assert f'- "{script}"' in workflow
