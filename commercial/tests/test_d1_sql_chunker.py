from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "split_d1_sql.py"

spec = importlib.util.spec_from_file_location("split_d1_sql", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_release_catalog_migrations_split_into_d1_command_sized_chunks() -> None:
    for name in (
        "015_energy_product_catalog.sql",
        "016_energy_product_catalog_smoke_pack.sql",
        "017_unify_energy_product_catalog.sql",
    ):
        source = (ROOT / "migrations" / name).read_text(encoding="utf-8")
        statements = module.split_sql_statements(source)
        assert statements, name
        module.reject_explicit_transactions(statements)
        chunks = module.make_chunks(statements, 60000)
        assert chunks, name
        assert max(map(len, chunks)) <= 60000


def test_splitter_rejects_explicit_transactions() -> None:
    statements = module.split_sql_statements(
        "CREATE TABLE x(id INTEGER);\nBEGIN TRANSACTION;\nINSERT INTO x VALUES (1);"
    )
    try:
        module.reject_explicit_transactions(statements)
    except ValueError as exc:
        assert "transaction control" in str(exc)
    else:
        raise AssertionError("Explicit transaction control should be rejected.")


def test_splitter_preserves_semicolons_inside_strings() -> None:
    source = "INSERT INTO x(v) VALUES ('a;b');\nINSERT INTO x(v) VALUES ('c');"
    statements = module.split_sql_statements(source)
    assert len(statements) == 2
    assert "'a;b'" in statements[0]
