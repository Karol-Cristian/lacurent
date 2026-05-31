const SESSION_DAYS = 30;
const RESET_MINUTES = 30;
const PASSWORD_ITERATIONS = 100000;

function value(body, key) {
  return body[key] === undefined || body[key] === "" ? null : body[key];
}

function numberValue(body, key) {
  const raw = value(body, key);
  if (raw === null) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(body, key) {
  const raw = value(body, key);
  if (raw === null) {
    return null;
  }

  return raw === "Da" ? 1 : 0;
}

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...init.headers,
      "Content-Type": "application/json"
    }
  });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function bytesToBase64Url(bytes) {
  let value = "";
  bytes.forEach(byte => {
    value += String.fromCharCode(byte);
  });

  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = bytesToBase64Url(saltBytes);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations: PASSWORD_ITERATIONS
    },
    key,
    256
  );

  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${salt}$${bytesToBase64Url(
    new Uint8Array(bits)
  )}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return false;
  }

  const [algorithm, iterationsText, salt, expectedHash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsText || !salt || !expectedHash) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64UrlToBytes(salt),
      iterations: Number(iterationsText)
    },
    key,
    256
  );
  const actualHash = bytesToBase64Url(new Uint8Array(bits));

  return actualHash === expectedHash;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function createSession(env, userId) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = addDays(new Date(), SESSION_DAYS);

  await env.DB.prepare(`
    INSERT INTO user_sessions(user_id, token_hash, expires_at)
    VALUES(?, ?, ?)
  `)
    .bind(userId, tokenHash, expiresAt)
    .run();

  return {
    token,
    expires_at: expiresAt
  };
}

async function getCurrentUser(request, env) {
  const token = bearerToken(request);
  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);
  return env.DB.prepare(`
    SELECT users.id, users.email, users.name
    FROM user_sessions
    JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token_hash = ?
      AND datetime(user_sessions.expires_at) > datetime('now')
    LIMIT 1
  `)
    .bind(tokenHash)
    .first();
}

async function register(request, env, corsHeaders) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const name = String(body.name || "").trim();
  const password = String(body.password || "");

  if (!email || !name || password.length < 8) {
    return jsonResponse(
      {
        success: false,
        error: "Completeaza numele, emailul si o parola de minimum 8 caractere."
      },
      {
        status: 400,
        headers: corsHeaders
      }
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await env.DB.prepare(`
      INSERT INTO users(email, name, password_hash)
      VALUES(?, ?, ?)
    `)
      .bind(email, name, passwordHash)
      .run();
    const userId = result.meta?.last_row_id;
    const session = await createSession(env, userId);

    return jsonResponse(
      {
        success: true,
        token: session.token,
        expires_at: session.expires_at,
        user: {
          id: userId,
          email,
          name
        }
      },
      {
        headers: corsHeaders
      }
    );
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: "Emailul exista deja sau contul nu poate fi creat."
      },
      {
        status: 409,
        headers: corsHeaders
      }
    );
  }
}

async function login(request, env, corsHeaders) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const user = await env.DB.prepare(`
    SELECT id, email, name, password_hash
    FROM users
    WHERE email = ?
    LIMIT 1
  `)
    .bind(email)
    .first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return jsonResponse(
      {
        success: false,
        error: "Email sau parola incorecta."
      },
      {
        status: 401,
        headers: corsHeaders
      }
    );
  }

  const session = await createSession(env, user.id);
  return jsonResponse(
    {
      success: true,
      token: session.token,
      expires_at: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    },
    {
      headers: corsHeaders
    }
  );
}

async function me(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      {
        success: false,
        error: "Not authenticated"
      },
      {
        status: 401,
        headers: corsHeaders
      }
    );
  }

  return jsonResponse(
    {
      success: true,
      user
    },
    {
      headers: corsHeaders
    }
  );
}

async function logout(request, env, corsHeaders) {
  const token = bearerToken(request);
  if (token) {
    await env.DB.prepare("DELETE FROM user_sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }

  return jsonResponse(
    {
      success: true
    },
    {
      headers: corsHeaders
    }
  );
}

async function forgotPassword(request, env, corsHeaders, url) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const user = email
    ? await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
      .bind(email)
      .first()
    : null;
  let resetUrl = null;

  if (user) {
    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = addMinutes(new Date(), RESET_MINUTES);

    await env.DB.prepare(`
      INSERT INTO password_reset_tokens(user_id, token_hash, expires_at)
      VALUES(?, ?, ?)
    `)
      .bind(user.id, tokenHash, expiresAt)
      .run();

    resetUrl = `${url.origin}/pages/reset-password.html?token=${encodeURIComponent(
      token
    )}`;
  }

  return jsonResponse(
    {
      success: true,
      message: "Daca emailul exista, vei primi instructiuni de resetare.",
      reset_url: resetUrl
    },
    {
      headers: corsHeaders
    }
  );
}

async function resetPassword(request, env, corsHeaders) {
  const body = await readJson(request);
  const token = String(body.token || "");
  const password = String(body.password || "");

  if (!token || password.length < 8) {
    return jsonResponse(
      {
        success: false,
        error: "Token invalid sau parola prea scurta."
      },
      {
        status: 400,
        headers: corsHeaders
      }
    );
  }

  const tokenHash = await sha256(token);
  const reset = await env.DB.prepare(`
    SELECT id, user_id
    FROM password_reset_tokens
    WHERE token_hash = ?
      AND used_at IS NULL
      AND datetime(expires_at) > datetime('now')
    LIMIT 1
  `)
    .bind(tokenHash)
    .first();

  if (!reset) {
    return jsonResponse(
      {
        success: false,
        error: "Linkul de resetare este invalid sau expirat."
      },
      {
        status: 400,
        headers: corsHeaders
      }
    );
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(
      await hashPassword(password),
      reset.user_id
    ),
    env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").bind(
      new Date().toISOString(),
      reset.id
    ),
    env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(reset.user_id)
  ]);

  return jsonResponse(
    {
      success: true
    },
    {
      headers: corsHeaders
    }
  );
}

async function saveHouse(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      {
        success: false,
        error: "Trebuie sa fii autentificat pentru a salva analiza."
      },
      {
        status: 401,
        headers: corsHeaders
      }
    );
  }

  const body = await readJson(request);
  const houseResult = await env.DB.prepare(`
    INSERT INTO houses(
      user_id,
      house_type,
      surface,
      rooms,
      year,
      city
    )
    VALUES(?, ?, ?, ?, ?, ?)
  `)
    .bind(
      user.id,
      value(body, "house_type"),
      numberValue(body, "surface"),
      numberValue(body, "rooms"),
      numberValue(body, "year"),
      value(body, "city")
    )
    .run();

  const houseId = houseResult.meta?.last_row_id;

  if (!houseId) {
    throw new Error("House insert did not return an id");
  }

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO household_profiles(
        house_id,
        consumer_type,
        people_count,
        children_count,
        senior_count,
        work_from_home,
        work_from_home_days,
        occupancy_pattern,
        frequent_travel
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      houseId,
      value(body, "consumer_type"),
      numberValue(body, "people_count"),
      numberValue(body, "children_count"),
      numberValue(body, "senior_count"),
      value(body, "work_from_home"),
      numberValue(body, "work_from_home_days"),
      value(body, "occupancy_pattern"),
      value(body, "frequent_travel")
    ),

    env.DB.prepare(`
      INSERT INTO building_features(
        house_id,
        built_surface,
        floors,
        bathrooms,
        ceiling_height,
        basement,
        attic,
        mansard,
        garage
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      houseId,
      numberValue(body, "built_surface"),
      numberValue(body, "floors"),
      numberValue(body, "bathrooms"),
      numberValue(body, "ceiling_height"),
      value(body, "basement"),
      value(body, "attic"),
      value(body, "mansard"),
      value(body, "garage")
    ),

    env.DB.prepare(`
      INSERT INTO envelope_profiles(
        house_id,
        wall_material,
        wall_thickness,
        wall_insulation,
        windows
      )
      VALUES(?, ?, ?, ?, ?)
    `).bind(
      houseId,
      value(body, "wall_material"),
      numberValue(body, "wall_thickness"),
      value(body, "wall_insulation"),
      value(body, "windows")
    ),

    env.DB.prepare(`
      INSERT INTO energy_profiles(
        house_id,
        heating,
        temperature_day,
        temperature_night,
        smart_thermostat,
        provider,
        monthly_bill,
        monthly_kwh
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      houseId,
      value(body, "heating"),
      numberValue(body, "temperature_day"),
      numberValue(body, "temperature_night"),
      value(body, "smart_thermostat"),
      value(body, "provider"),
      numberValue(body, "monthly_bill"),
      numberValue(body, "monthly_kwh")
    ),

    env.DB.prepare(`
      INSERT INTO appliances(
        house_id,
        fridge_class,
        washer_class,
        dryer,
        dishwasher
      )
      VALUES(?, ?, ?, ?, ?)
    `).bind(
      houseId,
      value(body, "fridge_class"),
      value(body, "washer_class"),
      boolValue(body, "dryer"),
      null
    ),

    env.DB.prepare(`
      INSERT INTO billing_documents(
        house_id,
        invoice_file_name
      )
      VALUES(?, ?)
    `).bind(
      houseId,
      value(body, "invoice_pdf")
    ),

    env.DB.prepare(`
      INSERT INTO green_mobility_profiles(
        house_id,
        solar_panels,
        installed_power,
        electric_car
      )
      VALUES(?, ?, ?, ?)
    `).bind(
      houseId,
      value(body, "solar_panels"),
      numberValue(body, "installed_power"),
      value(body, "electric_car")
    )
  ]);

  return jsonResponse(
    {
      success: true,
      house_id: houseId
    },
    {
      headers: corsHeaders
    }
  );
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const routes = {
      "/api/register": register,
      "/api/login": login,
      "/api/me": me,
      "/api/logout": logout,
      "/api/forgot-password": forgotPassword,
      "/api/reset-password": resetPassword,
      "/api/save-house": saveHouse
    };
    const handler = routes[url.pathname];

    if (!handler) {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST" && url.pathname !== "/api/me") {
      return jsonResponse(
        {
          success: false,
          error: "Method not allowed"
        },
        {
          status: 405,
          headers: corsHeaders
        }
      );
    }

    try {
      return await handler(request, env, corsHeaders, url);
    } catch (e) {
      return jsonResponse(
        {
          success: false,
          error: e.toString()
        },
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
};
