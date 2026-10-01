#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


FORBIDDEN_TRANSACTION_PREFIXES = (
    "BEGIN",
    "COMMIT",
    "ROLLBACK",
    "SAVEPOINT",
    "RELEASE SAVEPOINT",
)


def split_sql_statements(source: str) -> list[str]:
    statements: list[str] = []
    buffer: list[str] = []

    for char in source:
        buffer.append(char)
        if char != ";":
            continue
        candidate = "".join(buffer)
        if sqlite3.complete_statement(candidate):
            statement = candidate.strip()
            if statement:
                statements.append(statement)
            buffer = []

    tail = "".join(buffer).strip()
    if tail:
        # Allow comment-only trailers but reject incomplete SQL.
        comment_only = all(
            not line.strip() or line.lstrip().startswith("--")
            for line in tail.splitlines()
        )
        if not comment_only:
            raise ValueError("SQL file ends with an incomplete statement.")

    return statements


def reject_explicit_transactions(statements: list[str]) -> None:
    for statement in statements:
        normalized_lines = [
            line.strip()
            for line in statement.splitlines()
            if line.strip() and not line.lstrip().startswith("--")
        ]
        if not normalized_lines:
            continue
        first = normalized_lines[0].upper()
        if any(first.startswith(prefix) for prefix in FORBIDDEN_TRANSACTION_PREFIXES):
            raise ValueError(
                "D1 remote import must not contain explicit transaction control: "
                + normalized_lines[0]
            )


def make_chunks(statements: list[str], max_chars: int) -> list[str]:
    if max_chars < 4096:
        raise ValueError("max_chars must be at least 4096.")

    chunks: list[str] = []
    current: list[str] = []
    current_chars = 0

    for statement in statements:
        size = len(statement) + 2
        if size > max_chars:
            raise ValueError(
                f"Single SQL statement is too large for D1 --command batching: {size} chars."
            )
        if current and current_chars + size > max_chars:
            chunks.append("\n".join(current) + "\n")
            current = []
            current_chars = 0
        current.append(statement)
        current_chars += size

    if current:
        chunks.append("\n".join(current) + "\n")
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split a D1 SQL migration into transaction-free --command chunks."
    )
    parser.add_argument("sql_file", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--max-chars", type=int, default=60000)
    args = parser.parse_args()

    source = args.sql_file.read_text(encoding="utf-8")
    statements = split_sql_statements(source)
    if not statements:
        raise SystemExit(f"No SQL statements found in {args.sql_file}.")
    reject_explicit_transactions(statements)
    chunks = make_chunks(statements, args.max_chars)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for old in args.output_dir.glob("*.sql"):
        old.unlink()
    for index, chunk in enumerate(chunks, start=1):
        (args.output_dir / f"{index:04d}.sql").write_text(chunk, encoding="utf-8")

    print(
        f"{args.sql_file}: {len(statements)} statements -> "
        f"{len(chunks)} D1 command chunks (max {args.max_chars} chars)."
    )


if __name__ == "__main__":
    main()
