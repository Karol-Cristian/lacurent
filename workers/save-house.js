const SESSION_DAYS = 30;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET, POST, OPTIONS"
    }
  });
}

async function requestBody(request) {
  if (request.method === "GET") return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function passwordHash(password) {
  return `sha256:${await sha256(String(password))}`;
}

async function verifyPassword(password, stored) {
  if (!stored) return false;
  return stored === await passwordHash(password);
}

function requireDb(env) {
  if (!env.DB) throw new Error("D1 database binding DB is not configured.");
  return env.DB;
}

function tokenFromRequest(request) {
  const header = request.headers.get("authorization") || "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role || "residential",
    account_type: row.account_type || "registered"
  };
}

async function currentUser(request, env) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  return await requireDb(env)
    .prepare(`
      SELECT users.id, users.email, users.name, users.role, users.account_type
      FROM user_sessions
      JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > datetime('now')
      LIMIT 1
    `)
    .bind(tokenHash)
    .first();
}

async function createSession(userId, env) {
  const token = crypto.randomUUID();
  const tokenHash = await sha256(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await requireDb(env)
    .prepare("INSERT INTO user_sessions(user_id, token_hash, expires_at) VALUES (?, ?, ?)")
    .bind(userId, tokenHash, expires)
    .run();
  return token;
}

async function register(request, env) {
  const body = await requestBody(request);
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  const role = String(body.role || "residential");
  if (!email || !name || password.length < 8) {
    return json({ success: false, error: "Completeaza numele, emailul si o parola de cel putin 8 caractere." }, 400);
  }
  const db = requireDb(env);
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return json({ success: false, error: "Exista deja un cont cu acest email." }, 409);
  }
  await db
    .prepare("INSERT INTO users(email, name, password_hash, role, account_type) VALUES (?, ?, ?, ?, 'registered')")
    .bind(email, name, await passwordHash(password), role)
    .run();
  const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  const token = await createSession(user.id, env);
  return json({ success: true, token, user: publicUser(user) });
}

async function login(request, env) {
  const body = await requestBody(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const user = await requireDb(env).prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ success: false, error: "Email sau parola invalida." }, 401);
  }
  const token = await createSession(user.id, env);
  return json({ success: true, token, user: publicUser(user) });
}

async function logout(request, env) {
  const token = tokenFromRequest(request);
  if (token) {
    await requireDb(env).prepare("DELETE FROM user_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json({ success: true });
}

async function me(request, env) {
  const user = await currentUser(request, env);
  return user ? json({ success: true, user: publicUser(user) }) : json({ success: false, error: "Nu esti autentificat." }, 401);
}

async function saveProject(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ success: false, error: "Autentificare necesara pentru salvare." }, 401);
  const body = await requestBody(request);
  const projectId = String(body.projectId || crypto.randomUUID());
  const name = String(body.name || "Proiect LaCurent");
  const workspace = body.workspace && typeof body.workspace === "object" ? body.workspace : {};
  const serialized = JSON.stringify(workspace);
  const fingerprint = await sha256(serialized);
  const db = requireDb(env);
  const existingProject = await db
    .prepare("SELECT owner_user_id FROM building_platform_projects WHERE project_id = ? LIMIT 1")
    .bind(projectId)
    .first();
  if (existingProject && existingProject.owner_user_id !== user.id) {
    return json({ success: false, error: "Proiectul apartine altui cont." }, 403);
  }
  await db
    .prepare(`
      INSERT INTO building_platform_projects(project_id, owner_user_id, project_name, project_status, schema_version, updated_at)
      VALUES (?, ?, ?, 'active', 'lacurent_workspace_simple_v1', datetime('now'))
      ON CONFLICT(project_id) DO UPDATE SET
        project_name = excluded.project_name,
        project_status = 'active',
        schema_version = 'lacurent_workspace_simple_v1',
        updated_at = datetime('now')
    `)
    .bind(projectId, user.id, name)
    .run();
  await db
    .prepare(`
      INSERT INTO building_platform_project_drafts(
        draft_id, project_id, owner_user_id, editable_building_dna_json,
        draft_fingerprint, concurrency_token, draft_status, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'saved', datetime('now'))
      ON CONFLICT(project_id, owner_user_id) DO UPDATE SET
        editable_building_dna_json = excluded.editable_building_dna_json,
        draft_fingerprint = excluded.draft_fingerprint,
        concurrency_token = excluded.concurrency_token,
        draft_status = 'saved',
        updated_at = datetime('now')
    `)
    .bind(`draft-${projectId}`, projectId, user.id, serialized, fingerprint, crypto.randomUUID())
    .run();
  return json({ success: true, projectId, fingerprint });
}

async function listProjects(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ success: false, error: "Autentificare necesara." }, 401);
  const rows = await requireDb(env)
    .prepare(`
      SELECT project_id, project_name, project_status, updated_at, schema_version
      FROM building_platform_projects
      WHERE owner_user_id = ? AND archived_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 50
    `)
    .bind(user.id)
    .all();
  return json({ success: true, projects: rows.results || [] });
}

async function loadProject(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ success: false, error: "Autentificare necesara." }, 401);
  const body = await requestBody(request);
  const projectId = String(body.projectId || "");
  const row = await requireDb(env)
    .prepare(`
      SELECT projects.project_id, projects.project_name, drafts.editable_building_dna_json
      FROM building_platform_projects projects
      LEFT JOIN building_platform_project_drafts drafts
        ON drafts.project_id = projects.project_id AND drafts.owner_user_id = projects.owner_user_id
      WHERE projects.project_id = ? AND projects.owner_user_id = ?
      LIMIT 1
    `)
    .bind(projectId, user.id)
    .first();
  if (!row) return json({ success: false, error: "Proiectul nu a fost gasit." }, 404);
  return json({
    success: true,
    project: {
      projectId: row.project_id,
      name: row.project_name,
      workspace: row.editable_building_dna_json ? JSON.parse(row.editable_building_dna_json) : null
    }
  });
}

async function calculateWithPython(request, env) {
  const body = await requestBody(request);
  const input = body.input || body;
  if (!env.PYTHON_ENGINE_URL) {
    return json({
      success: false,
      error: "Serviciul Python MC001 nu este configurat in acest mediu.",
      diagnostic: {
        code: "PYTHON_ENGINE_SERVICE_UNCONFIGURED",
        severity: "blocking",
        message: "Produsul nu cade inapoi pe JS physics; configureaza PYTHON_ENGINE_URL pentru calcul."
      }
    }, 503);
  }
  const upstream = await fetch(`${String(env.PYTHON_ENGINE_URL).replace(/\/$/, "")}/calculate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  const output = await upstream.json();
  return json({ success: upstream.ok, output }, upstream.ok ? 200 : upstream.status);
}

async function passwordResetPlaceholder() {
  return json({
    success: false,
    error: "Resetarea parolei necesita configurarea canalului de email in infrastructura curenta."
  }, 501);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({ success: true });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/register") return await register(request, env);
      if (url.pathname === "/api/login") return await login(request, env);
      if (url.pathname === "/api/logout") return await logout(request, env);
      if (url.pathname === "/api/me") return await me(request, env);
      if (url.pathname === "/api/projects/save") return await saveProject(request, env);
      if (url.pathname === "/api/projects/list") return await listProjects(request, env);
      if (url.pathname === "/api/projects/load") return await loadProject(request, env);
      if (url.pathname === "/api/python/calculate") return await calculateWithPython(request, env);
      if (url.pathname === "/api/forgot-password" || url.pathname === "/api/reset-password") {
        return await passwordResetPlaceholder();
      }
      if (url.pathname.startsWith("/api/")) {
        return json({ success: false, error: "Endpointul apartine produsului vechi sau nu exista." }, 404);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ success: false, error: error.message || "Eroare server." }, 500);
    }
  }
};
