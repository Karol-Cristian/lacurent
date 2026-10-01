from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

SESSION_DAYS = 30
PASSWORD_ITERATIONS = 180_000
PASSWORD_PREFIX = "pbkdf2_sha256"
MAX_WORKSPACE_BYTES = 512 * 1024
MAX_PROJECT_NAME_CHARS = 120
PROJECT_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class AccountError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


def _rows(result: Any) -> list[dict[str, Any]]:
    rows = getattr(result, "results", None)
    if rows is None and isinstance(result, dict):
        rows = result.get("results")
    if not isinstance(rows, list):
        return []
    return [dict(row) for row in rows if isinstance(row, dict)]


def _utc_sql(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _normalize_email(value: Any) -> str:
    email = str(value or "").strip().lower()
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        raise AccountError("Introdu o adresă de email validă.", 400)
    return email


def _normalize_name(value: Any) -> str:
    name = " ".join(str(value or "").strip().split())
    if len(name) < 2 or len(name) > 100:
        raise AccountError("Numele trebuie să aibă între 2 și 100 de caractere.", 400)
    return name


def _normalize_password(value: Any) -> str:
    password = str(value or "")
    if len(password) < 10:
        raise AccountError("Parola trebuie să aibă cel puțin 10 caractere.", 400)
    if len(password) > 256:
        raise AccountError("Parola este prea lungă.", 400)
    return password


def password_hash(password: str) -> str:
    password = _normalize_password(password)
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ITERATIONS
    ).hex()
    return "$".join((PASSWORD_PREFIX, str(PASSWORD_ITERATIONS), salt, digest))


def _legacy_sha256_hash(password: str) -> str:
    return "sha256:" + hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, stored: str | None) -> tuple[bool, bool]:
    if not stored:
        return False, False
    value = str(stored)
    if value.startswith(PASSWORD_PREFIX + "$"):
        try:
            prefix, iterations_raw, salt, expected = value.split("$", 3)
            if prefix != PASSWORD_PREFIX:
                return False, False
            iterations = int(iterations_raw)
            if iterations < 100_000 or iterations > 1_000_000:
                return False, False
            actual = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), bytes.fromhex(salt), iterations
            ).hex()
        except (ValueError, TypeError):
            return False, False
        return hmac.compare_digest(actual, expected), iterations < PASSWORD_ITERATIONS
    if value.startswith("sha256:"):
        matches = hmac.compare_digest(_legacy_sha256_hash(password), value)
        return matches, matches
    return False, False


def bearer_token(request: Any) -> str:
    header = str(request.headers.get("authorization") or "")
    if not header.lower().startswith("bearer "):
        return ""
    return header[7:].strip()


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "email": str(row.get("email") or ""),
        "name": str(row.get("name") or ""),
        "role": str(row.get("role") or "residential"),
        "account_type": str(row.get("account_type") or "registered"),
    }


async def user_by_email(db: Any, email: str) -> dict[str, Any] | None:
    result = await db.prepare(
        "SELECT id,email,name,password_hash,role,account_type FROM users WHERE email = ? LIMIT 1"
    ).bind(email).run()
    rows = _rows(result)
    return rows[0] if rows else None


async def create_session(db: Any, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires = _utc_sql(datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS))
    await db.prepare(
        "INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES (?,?,?)"
    ).bind(int(user_id), token_hash, expires).run()
    return token


async def current_user(db: Any, token: str) -> dict[str, Any] | None:
    if not token:
        return None
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    result = await db.prepare(
        """
        SELECT users.id,users.email,users.name,users.role,users.account_type
        FROM user_sessions
        JOIN users ON users.id = user_sessions.user_id
        WHERE user_sessions.token_hash = ?
          AND user_sessions.expires_at > datetime('now')
        LIMIT 1
        """
    ).bind(token_hash).run()
    rows = _rows(result)
    return public_user(rows[0]) if rows else None


async def register(db: Any, payload: dict[str, Any]) -> dict[str, Any]:
    email = _normalize_email(payload.get("email"))
    name = _normalize_name(payload.get("name"))
    password = _normalize_password(payload.get("password"))
    if await user_by_email(db, email):
        raise AccountError("Există deja un cont cu acest email.", 409)
    encoded = password_hash(password)
    try:
        await db.prepare(
            "INSERT INTO users(email,name,password_hash,role,account_type) "
            "VALUES (?,?,?,'residential','registered')"
        ).bind(email, name, encoded).run()
    except Exception as exc:
        if await user_by_email(db, email):
            raise AccountError("Există deja un cont cu acest email.", 409) from exc
        raise
    row = await user_by_email(db, email)
    if not row:
        raise AccountError("Contul nu a putut fi creat.", 500)
    token = await create_session(db, int(row["id"]))
    return {"success": True, "token": token, "user": public_user(row)}


async def login(db: Any, payload: dict[str, Any]) -> dict[str, Any]:
    email = _normalize_email(payload.get("email"))
    password = str(payload.get("password") or "")
    if not password:
        raise AccountError("Email sau parolă invalidă.", 401)
    row = await user_by_email(db, email)
    matches, needs_upgrade = verify_password(password, row.get("password_hash") if row else None)
    if not row or not matches:
        raise AccountError("Email sau parolă invalidă.", 401)
    if needs_upgrade:
        await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(
            password_hash(password), int(row["id"])
        ).run()
    token = await create_session(db, int(row["id"]))
    return {"success": True, "token": token, "user": public_user(row)}


async def logout(db: Any, token: str) -> dict[str, Any]:
    if token:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        await db.prepare("DELETE FROM user_sessions WHERE token_hash = ?").bind(token_hash).run()
    return {"success": True}


def _normalize_project_id(value: Any) -> str:
    project_id = str(value or "").strip() or str(uuid.uuid4())
    if not PROJECT_ID_PATTERN.fullmatch(project_id):
        raise AccountError("Identificatorul proiectului este invalid.", 400)
    return project_id


def _normalize_project_name(value: Any) -> str:
    name = " ".join(str(value or "Casa mea").strip().split()) or "Casa mea"
    if len(name) > MAX_PROJECT_NAME_CHARS:
        raise AccountError("Numele proiectului este prea lung.", 400)
    return name


async def save_project(db: Any, owner_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    project_id = _normalize_project_id(payload.get("projectId"))
    name = _normalize_project_name(payload.get("name"))
    workspace = payload.get("workspace")
    if not isinstance(workspace, dict):
        raise AccountError("Datele casei lipsesc sau sunt invalide.", 400)
    serialized = json.dumps(workspace, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    encoded = serialized.encode("utf-8")
    if len(encoded) > MAX_WORKSPACE_BYTES:
        raise AccountError("Proiectul este prea mare pentru salvare.", 413)
    fingerprint = hashlib.sha256(encoded).hexdigest()

    existing_result = await db.prepare(
        "SELECT owner_user_id FROM building_platform_projects WHERE project_id = ? LIMIT 1"
    ).bind(project_id).run()
    existing = _rows(existing_result)
    if existing and int(existing[0].get("owner_user_id") or 0) != int(owner_user_id):
        raise AccountError("Proiectul aparține altui cont.", 403)

    await db.prepare(
        """
        INSERT INTO building_platform_projects(
          project_id,owner_user_id,project_name,project_status,schema_version,updated_at
        )
        VALUES (?, ?, ?, 'active', 'home_lab_editorial_project_v1', CURRENT_TIMESTAMP)
        ON CONFLICT(project_id) DO UPDATE SET
          project_name = excluded.project_name,
          project_status = 'active',
          schema_version = 'home_lab_editorial_project_v1',
          updated_at = CURRENT_TIMESTAMP
        """
    ).bind(project_id, int(owner_user_id), name).run()

    concurrency_token = str(uuid.uuid4())
    await db.prepare(
        """
        INSERT INTO building_platform_project_drafts(
          draft_id,project_id,owner_user_id,editable_building_dna_json,
          draft_fingerprint,concurrency_token,draft_status,updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'saved', CURRENT_TIMESTAMP)
        ON CONFLICT(project_id,owner_user_id) DO UPDATE SET
          editable_building_dna_json = excluded.editable_building_dna_json,
          draft_fingerprint = excluded.draft_fingerprint,
          concurrency_token = excluded.concurrency_token,
          draft_status = 'saved',
          updated_at = CURRENT_TIMESTAMP
        """
    ).bind(
        "draft-" + project_id,
        project_id,
        int(owner_user_id),
        serialized,
        fingerprint,
        concurrency_token,
    ).run()

    return {
        "success": True,
        "projectId": project_id,
        "name": name,
        "fingerprint": fingerprint,
        "concurrencyToken": concurrency_token,
    }


async def list_projects(db: Any, owner_user_id: int) -> dict[str, Any]:
    result = await db.prepare(
        """
        SELECT project_id,project_name,project_status,updated_at,schema_version
        FROM building_platform_projects
        WHERE owner_user_id = ? AND archived_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 50
        """
    ).bind(int(owner_user_id)).run()
    return {"success": True, "projects": _rows(result)}


async def load_project(db: Any, owner_user_id: int, project_id_value: Any) -> dict[str, Any]:
    project_id = _normalize_project_id(project_id_value)
    result = await db.prepare(
        """
        SELECT p.project_id,p.project_name,p.updated_at,p.schema_version,
               d.editable_building_dna_json,d.draft_fingerprint,d.concurrency_token
        FROM building_platform_projects AS p
        LEFT JOIN building_platform_project_drafts AS d
          ON d.project_id = p.project_id AND d.owner_user_id = p.owner_user_id
        WHERE p.project_id = ? AND p.owner_user_id = ? AND p.archived_at IS NULL
        LIMIT 1
        """
    ).bind(project_id, int(owner_user_id)).run()
    rows = _rows(result)
    if not rows:
        raise AccountError("Proiectul nu a fost găsit.", 404)
    row = rows[0]
    raw_workspace = row.get("editable_building_dna_json")
    try:
        workspace = json.loads(raw_workspace) if raw_workspace else None
    except (TypeError, json.JSONDecodeError) as exc:
        raise AccountError("Proiectul salvat este corupt.", 500) from exc
    return {
        "success": True,
        "project": {
            "projectId": str(row["project_id"]),
            "name": str(row.get("project_name") or "Casa mea"),
            "updatedAt": row.get("updated_at"),
            "schemaVersion": row.get("schema_version"),
            "fingerprint": row.get("draft_fingerprint"),
            "concurrencyToken": row.get("concurrency_token"),
            "workspace": workspace,
        },
    }
