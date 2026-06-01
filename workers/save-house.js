import { ENERGY_ASSESSMENT_DISCLAIMER, buildEnergyProfile, demoOldHouseInput } from "./energy-model.js";

const SESSION_DAYS = 30;
const RESET_MINUTES = 30;
const PASSWORD_ITERATIONS = 100000;
const ENERGY_CLASS_DISCLAIMER =
  "Estimare energetică generată automat. Nu reprezintă certificat energetic oficial.";

function value(body, key) {
  return body[key] === undefined || body[key] === "" ? null : body[key];
}

function numberValue(body, key) {
  const raw = value(body, key);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(body, key) {
  const raw = value(body, key);
  if (raw === null) return null;
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

function displayNameForHouse(body, houseId) {
  return value(body, "display_name") ||
    value(body, "home_name") ||
    value(body, "house_name") ||
    value(body, "site_name") ||
    `${value(body, "city") || "Locuință"} #${houseId || ""}`.trim();
}

function savingsHistory(profile, implementedRows = []) {
  const implementedById = new Map(implementedRows.map(row => [row.recommendation_id, row]));
  return (profile.recommendations || [])
    .filter(item => implementedById.has(item.id))
    .map(item => ({
      recommendation_id: item.id,
      title: item.title,
      estimatedSavingsRonYearMin: item.estimatedSavingsRonYearMin,
      estimatedSavingsRonYearMax: item.estimatedSavingsRonYearMax,
      implemented_at: implementedById.get(item.id)?.implemented_at
    }));
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
  let raw = "";
  bytes.forEach(byte => {
    raw += String.fromCharCode(byte);
  });
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
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

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
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
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToBase64Url(saltBytes)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
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
  return bytesToBase64Url(new Uint8Array(bits)) === expectedHash;
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

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function estimateEnergyClass(score) {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 55) return "D";
  if (score >= 45) return "E";
  if (score >= 35) return "F";
  return "G";
}

function inferAnalysisType(body, user) {
  if (user?.role === "business" || body.user_type === "business") return "business";
  if (user?.role === "industry" || body.user_type === "industry") return "industry";
  if (user?.role === "institution" || body.user_type === "institution") return "institution";
  if (user?.role === "auditor") return "auditor";
  return "residential";
}

function calculateScore(body, analysisType) {
  if (analysisType === "business" || analysisType === "industry" || analysisType === "institution") {
    const consumptionEfficiency = numberValue(body, "monthly_kwh") ? 62 : 52;
    const equipment = value(body, "energy_consumers") ? 64 : 48;
    const overall = clampScore((consumptionEfficiency + equipment + 58) / 3);
    return {
      overall_score: overall,
      building_efficiency: 58,
      consumption_efficiency: consumptionEfficiency,
      behavior: 55,
      equipment,
      green_energy: 45,
      smart_optimization: equipment,
      estimated_energy_class: estimateEnergyClass(overall)
    };
  }

  const insulation = value(body, "wall_insulation");
  const windows = value(body, "windows");
  const heating = value(body, "heating");
  const solarPanels = value(body, "solar_panels");
  const smartThermostat = value(body, "smart_thermostat");
  const monthlyBill = numberValue(body, "monthly_bill") || 0;
  const area = numberValue(body, "surface") || 100;
  const costPerSquareMeter = monthlyBill && area ? monthlyBill / area : 0;

  const buildingEfficiency = clampScore(
    45 +
    (insulation && insulation !== "Fără" ? 18 : 0) +
    (windows === "Tripan" ? 14 : windows === "Termopan" ? 8 : 0)
  );
  const consumptionEfficiency = clampScore(82 - costPerSquareMeter * 7);
  const behavior = clampScore(62 + (value(body, "work_from_home") === "Nu" ? 6 : 0));
  const equipment = clampScore(58 + (heating === "Pompă căldură" ? 16 : 0));
  const greenEnergy = clampScore(45 + (solarPanels === "Da" ? 30 : 0));
  const smartOptimization = clampScore(50 + (smartThermostat === "Da" ? 22 : 0));
  const overall = clampScore(
    buildingEfficiency * 0.24 +
    consumptionEfficiency * 0.22 +
    behavior * 0.12 +
    equipment * 0.18 +
    greenEnergy * 0.12 +
    smartOptimization * 0.12
  );

  return {
    overall_score: overall,
    building_efficiency: buildingEfficiency,
    consumption_efficiency: consumptionEfficiency,
    behavior,
    equipment,
    green_energy: greenEnergy,
    smart_optimization: smartOptimization,
    estimated_energy_class: estimateEnergyClass(overall)
  };
}

async function createSession(env, userId) {
  const token = randomToken();
  const expiresAt = addDays(new Date(), SESSION_DAYS);
  await env.DB.prepare(`
    INSERT INTO user_sessions(user_id, token_hash, expires_at)
    VALUES(?, ?, ?)
  `)
    .bind(userId, await sha256(token), expiresAt)
    .run();
  return { token, expires_at: expiresAt };
}

async function getCurrentUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  return env.DB.prepare(`
    SELECT users.id, users.email, users.name, users.role, users.account_type
    FROM user_sessions
    JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token_hash = ?
      AND datetime(user_sessions.expires_at) > datetime('now')
    LIMIT 1
  `)
    .bind(await sha256(token))
    .first();
}

async function register(request, env, corsHeaders) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  const allowedRoles = ["residential", "business", "industry", "institution", "auditor"];
  const role = allowedRoles.includes(body.role) ? body.role : "residential";
  const accountType = role === "residential" ? "registered" : role;

  if (!email || !name || password.length < 8) {
    return jsonResponse(
      { success: false, error: "Completeaza numele, emailul si o parola de minimum 8 caractere." },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const result = await env.DB.prepare(`
      INSERT INTO users(email, name, password_hash, role, account_type)
      VALUES(?, ?, ?, ?, ?)
    `)
      .bind(email, name, await hashPassword(password), role, accountType)
      .run();
    const userId = result.meta?.last_row_id;
    let organization = null;

    if (role !== "residential") {
      const organizationName = value(body, "organization_name") || name;
      const organizationType = value(body, "organization_type") || role;
      const orgResult = await env.DB.prepare(`
        INSERT INTO organizations(owner_user_id, name, organization_type)
        VALUES(?, ?, ?)
      `)
        .bind(userId, organizationName, organizationType)
        .run();
      const organizationId = orgResult.meta?.last_row_id;
      organization = {
        id: organizationId,
        name: organizationName,
        organization_type: organizationType
      };

      await env.DB.prepare(`
        INSERT INTO sites(organization_id, user_id, name, city, address)
        VALUES(?, ?, ?, ?, ?)
      `)
        .bind(
          organizationId,
          userId,
          value(body, "site_name") || "Sediu principal",
          value(body, "city"),
          value(body, "address")
        )
        .run();
    }

    const session = await createSession(env, userId);
    return jsonResponse(
      {
        success: true,
        token: session.token,
        expires_at: session.expires_at,
        user: { id: userId, email, name, role, account_type: accountType, organization }
      },
      { headers: corsHeaders }
    );
  } catch {
    return jsonResponse(
      { success: false, error: "Emailul exista deja sau contul nu poate fi creat." },
      { status: 409, headers: corsHeaders }
    );
  }
}

async function login(request, env, corsHeaders) {
  const body = await readJson(request);
  const user = await env.DB.prepare(`
    SELECT id, email, name, password_hash, role, account_type
    FROM users
    WHERE email = ?
    LIMIT 1
  `)
    .bind(normalizeEmail(body.email))
    .first();

  if (!user || !(await verifyPassword(String(body.password || ""), user.password_hash))) {
    return jsonResponse(
      { success: false, error: "Email sau parola incorecta." },
      { status: 401, headers: corsHeaders }
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
        name: user.name,
        role: user.role,
        account_type: user.account_type
      }
    },
    { headers: corsHeaders }
  );
}

async function me(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Not authenticated" }, { status: 401, headers: corsHeaders });
  }
  return jsonResponse({ success: true, user }, { headers: corsHeaders });
}

async function logout(request, env, corsHeaders) {
  const token = bearerToken(request);
  if (token) {
    await env.DB.prepare("DELETE FROM user_sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }
  return jsonResponse({ success: true }, { headers: corsHeaders });
}

async function forgotPassword(request, env, corsHeaders, url) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const user = email
    ? await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first()
    : null;
  let resetUrl = null;

  if (user) {
    const token = randomToken();
    await env.DB.prepare(`
      INSERT INTO password_reset_tokens(user_id, token_hash, expires_at)
      VALUES(?, ?, ?)
    `)
      .bind(user.id, await sha256(token), addMinutes(new Date(), RESET_MINUTES))
      .run();
    resetUrl = `${url.origin}/pages/reset-password.html?token=${encodeURIComponent(token)}`;
  }

  return jsonResponse(
    {
      success: true,
      message: "Daca emailul exista, vei primi instructiuni de resetare.",
      reset_url: resetUrl
    },
    { headers: corsHeaders }
  );
}

async function resetPassword(request, env, corsHeaders) {
  const body = await readJson(request);
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token || password.length < 8) {
    return jsonResponse({ success: false, error: "Token invalid sau parola prea scurta." }, { status: 400, headers: corsHeaders });
  }

  const reset = await env.DB.prepare(`
    SELECT id, user_id
    FROM password_reset_tokens
    WHERE token_hash = ?
      AND used_at IS NULL
      AND datetime(expires_at) > datetime('now')
    LIMIT 1
  `)
    .bind(await sha256(token))
    .first();

  if (!reset) {
    return jsonResponse({ success: false, error: "Linkul de resetare este invalid sau expirat." }, { status: 400, headers: corsHeaders });
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(password), reset.user_id),
    env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").bind(new Date().toISOString(), reset.id),
    env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(reset.user_id)
  ]);
  return jsonResponse({ success: true }, { headers: corsHeaders });
}

async function saveHouse(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie sa fii autentificat pentru a salva analiza." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const analysisType = inferAnalysisType(body, user);
  if (analysisType === "auditor") {
    return jsonResponse(
      { success: false, error: "Auditorii folosesc portalul dedicat, nu fluxul standard de analiză." },
      { status: 403, headers: corsHeaders }
    );
  }

  const houseResult = await env.DB.prepare(`
    INSERT INTO houses(user_id, house_type, surface, rooms, year, city, display_name, active, analysis_purpose)
    VALUES(?, ?, ?, ?, ?, ?, ?, 1, ?)
  `)
    .bind(
      user.id,
      value(body, "house_type") || value(body, "business_type") || value(body, "industry_type") || value(body, "institution_type"),
      numberValue(body, "surface") || numberValue(body, "useful_area_m2") || numberValue(body, "building_area"),
      numberValue(body, "rooms"),
      numberValue(body, "year") || numberValue(body, "construction_year") || numberValue(body, "building_year"),
      value(body, "city"),
      displayNameForHouse(body),
      value(body, "analysis_purpose")
    )
    .run();
  const houseId = houseResult.meta?.last_row_id;
  if (!houseId) throw new Error("House insert did not return an id");

  const siteResult = await env.DB.prepare("INSERT INTO sites(user_id, name, city) VALUES(?, ?, ?)")
    .bind(user.id, value(body, "site_name") || "Locuință principală", value(body, "city"))
    .run();
  const siteId = siteResult.meta?.last_row_id;

  const buildingResult = await env.DB.prepare(`
    INSERT INTO buildings(site_id, house_id, building_type, area, construction_year, heating_type, climate_region)
    VALUES(?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      siteId,
      houseId,
      value(body, "house_type") || value(body, "business_type") || value(body, "industry_type") || value(body, "institution_type"),
      numberValue(body, "surface") || numberValue(body, "useful_area_m2") || numberValue(body, "building_area"),
      numberValue(body, "year") || numberValue(body, "construction_year") || numberValue(body, "building_year"),
      value(body, "heating") || value(body, "heating_source"),
      value(body, "climate_region")
    )
    .run();
  const buildingId = buildingResult.meta?.last_row_id;

  const analysisResult = await env.DB.prepare(`
    INSERT INTO analyses(user_id, site_id, building_id, house_id, analysis_type, status, completed_at)
    VALUES(?, ?, ?, ?, ?, 'completed', ?)
  `)
    .bind(user.id, siteId, buildingId, houseId, analysisType, new Date().toISOString())
    .run();
  const analysisId = analysisResult.meta?.last_row_id;
  const energyProfile = analysisType === "residential" ? buildEnergyProfile(body) : null;
  const score = energyProfile
    ? {
      overall_score: energyProfile.assessment.score,
      building_efficiency: clampScore(100 - energyProfile.assessment.topProblems.filter(item => ["walls", "roof", "floor", "windows"].includes(item.area)).length * 15),
      consumption_efficiency: clampScore(100 - ((energyProfile.derived.demand.estimatedFinalEnergyKwhM2Year || 160) - 80) / 2),
      behavior: energyProfile.derived.systems.heating.controlQuality === "smart" ? 85 : energyProfile.derived.systems.heating.controlQuality === "none" ? 45 : 65,
      equipment: energyProfile.derived.systems.heating.quality === "very_good" ? 90 : energyProfile.derived.systems.heating.quality === "good" ? 75 : energyProfile.derived.systems.heating.quality === "poor" ? 40 : 60,
      green_energy: energyProfile.input.renewables.photovoltaic.installed === "yes" ? 80 : 45,
      smart_optimization: energyProfile.derived.systems.heating.controlQuality === "smart" ? 85 : 55,
      estimated_energy_class: energyProfile.assessment.estimatedEnergyClass
    }
    : calculateScore(body, analysisType);
  const percentile = clampScore(100 - score.overall_score + 44);

  const batch = [
    env.DB.prepare(`
      INSERT INTO household_profiles(
        house_id, consumer_type, people_count, children_count, senior_count,
        work_from_home, work_from_home_days, occupancy_pattern, frequent_travel
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
        house_id, built_surface, floors, bathrooms, ceiling_height,
        basement, attic, mansard, garage
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
    env.DB.prepare("INSERT INTO envelope_profiles(house_id, wall_material, wall_thickness, wall_insulation, windows) VALUES(?, ?, ?, ?, ?)")
      .bind(houseId, value(body, "wall_material"), numberValue(body, "wall_thickness"), value(body, "wall_insulation"), value(body, "windows")),
    env.DB.prepare(`
      INSERT INTO energy_profiles(
        house_id, heating, temperature_day, temperature_night,
        smart_thermostat, provider, monthly_bill, monthly_kwh
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
    env.DB.prepare("INSERT INTO appliances(house_id, fridge_class, washer_class, dryer, dishwasher) VALUES(?, ?, ?, ?, ?)")
      .bind(houseId, value(body, "fridge_class"), value(body, "washer_class"), boolValue(body, "dryer"), null),
    env.DB.prepare("INSERT INTO billing_documents(house_id, invoice_file_name) VALUES(?, ?)")
      .bind(houseId, value(body, "invoice_pdf")),
    env.DB.prepare("INSERT INTO green_mobility_profiles(house_id, solar_panels, installed_power, electric_car) VALUES(?, ?, ?, ?)")
      .bind(houseId, value(body, "solar_panels"), numberValue(body, "installed_power"), value(body, "electric_car")),
    ...Object.entries(body).map(([key, answer]) =>
      env.DB.prepare("INSERT INTO analysis_answers(analysis_id, question_key, answer_value, answer_group) VALUES(?, ?, ?, ?)")
        .bind(analysisId, key, answer === null || answer === undefined ? null : String(answer), analysisType)
    ),
    env.DB.prepare(`
      INSERT INTO scores(
        analysis_id, overall_score, building_efficiency, consumption_efficiency,
        behavior, equipment, green_energy, smart_optimization,
        estimated_energy_class, disclaimer
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      analysisId,
      score.overall_score,
      score.building_efficiency,
      score.consumption_efficiency,
      score.behavior,
      score.equipment,
      score.green_energy,
      score.smart_optimization,
      score.estimated_energy_class,
      energyProfile?.metadata.disclaimer || ENERGY_CLASS_DISCLAIMER
    ),
    env.DB.prepare("INSERT INTO benchmark_results(analysis_id, benchmark_group_id, percentile, cluster_average, score_comparison) VALUES(?, NULL, ?, ?, ?)")
      .bind(analysisId, percentile, 68, score.overall_score - 68),
    env.DB.prepare("INSERT INTO reports(analysis_id, report_type, status) VALUES(?, 'energy_intelligence_pdf', 'planned')")
      .bind(analysisId)
  ];

  await env.DB.batch(batch);
  return jsonResponse({ success: true, house_id: houseId, analysis_id: analysisId, score: score.overall_score }, { headers: corsHeaders });
}

async function dashboardSummary(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  const body = await readJson(request);
  const requestedHouseId = numberValue(body, "house_id");
  const locked = {
    success: true,
    authenticated: Boolean(user),
    has_analysis: false,
    user,
    message: "Completează analiza pentru a debloca scorul energetic, benchmark-ul și recomandările personalizate."
  };

  if (!user) return jsonResponse(locked, { headers: corsHeaders });

  const houseFilter = requestedHouseId ? "AND analyses.house_id = ?" : "";
  const summaryStatement = env.DB.prepare(`
    SELECT
      analyses.id AS analysis_id,
      analyses.house_id,
      analyses.analysis_type,
      houses.display_name,
      scores.overall_score,
      scores.building_efficiency,
      scores.consumption_efficiency,
      scores.behavior,
      scores.equipment,
      scores.green_energy,
      scores.smart_optimization,
      scores.estimated_energy_class,
      scores.disclaimer,
      benchmark_results.percentile,
      benchmark_results.cluster_average,
      benchmark_results.score_comparison,
      COUNT(recommendation_actions.id) AS implemented_actions
    FROM analyses
    LEFT JOIN houses ON houses.id = analyses.house_id
    LEFT JOIN scores ON scores.analysis_id = analyses.id
    LEFT JOIN benchmark_results ON benchmark_results.analysis_id = analyses.id
    LEFT JOIN recommendation_actions ON recommendation_actions.house_id = analyses.house_id
      AND recommendation_actions.user_id = analyses.user_id
      AND recommendation_actions.status = 'implemented'
    WHERE analyses.user_id = ? AND analyses.status = 'completed' ${houseFilter}
      AND COALESCE(houses.active, 1) = 1
    GROUP BY analyses.id
    ORDER BY analyses.completed_at DESC, analyses.id DESC
    LIMIT 1
  `);
  const summary = requestedHouseId
    ? await summaryStatement.bind(user.id, requestedHouseId).first()
    : await summaryStatement.bind(user.id).first();

  if (!summary || summary.overall_score === null) {
    return jsonResponse(locked, { headers: corsHeaders });
  }
  summary.overall_score = clampScore(summary.overall_score + (summary.implemented_actions || 0) * 3);
  summary.estimated_energy_class = estimateEnergyClass(summary.overall_score);

  return jsonResponse({ success: true, authenticated: true, has_analysis: true, user, summary }, { headers: corsHeaders });
}

async function energyReport(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie să fii autentificat pentru a vedea raportul." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const requestedHouseId = numberValue(body, "house_id");
  const houseFilter = requestedHouseId ? "AND analyses.house_id = ?" : "";
  const analysisStatement = env.DB.prepare(`
    SELECT analyses.id, analyses.house_id, analyses.analysis_type
    FROM analyses
    LEFT JOIN houses ON houses.id = analyses.house_id
    WHERE analyses.user_id = ? AND analyses.status = 'completed' ${houseFilter}
      AND COALESCE(houses.active, 1) = 1
    ORDER BY analyses.completed_at DESC, analyses.id DESC
    LIMIT 1
  `);
  const analysis = requestedHouseId
    ? await analysisStatement.bind(user.id, requestedHouseId).first()
    : await analysisStatement.bind(user.id).first();

  if (!analysis) {
    return jsonResponse(
      { success: true, has_report: false, message: "Completează analiza locuinței pentru a genera raportul estimativ." },
      { headers: corsHeaders }
    );
  }

  const answers = await env.DB.prepare(`
    SELECT question_key, answer_value
    FROM analysis_answers
    WHERE analysis_id = ?
  `)
    .bind(analysis.id)
    .all();
  const rawInput = Object.fromEntries((answers.results || []).map(row => [row.question_key, row.answer_value]));
  const profile = buildEnergyProfile(rawInput);
  const implemented = await env.DB.prepare(`
    SELECT recommendation_id, implemented_at
    FROM recommendation_actions
    WHERE user_id = ? AND house_id = ? AND status = 'implemented'
  `)
    .bind(user.id, requestedHouseId || analysis.house_id)
    .all();
  const implementedRows = implemented.results || [];
  const implementedIds = implementedRows.map(row => row.recommendation_id);
  if (implementedIds.length) {
    profile.assessment.score = clampScore(profile.assessment.score + implementedIds.length * 3);
    profile.assessment.estimatedEnergyClass = estimateEnergyClass(profile.assessment.score);
    profile.assessment.mainConclusion = `${profile.assessment.mainConclusion} Ai implementat ${implementedIds.length} decizie${implementedIds.length === 1 ? "" : "i"} din recomandări.`;
  }

  return jsonResponse(
    {
      success: true,
      has_report: true,
      analysis_id: analysis.id,
      house_id: requestedHouseId || analysis.house_id,
      implemented_recommendations: implementedIds,
      savings_history: savingsHistory(profile, implementedRows),
      profile
    },
    { headers: corsHeaders }
  );
}

async function demoEnergyReport(request, env, corsHeaders) {
  return jsonResponse(
    {
      success: true,
      has_report: true,
      demo: true,
      profile: buildEnergyProfile(demoOldHouseInput)
    },
    { headers: corsHeaders }
  );
}

async function homes(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie să fii autentificat pentru a vedea locuințele." },
      { status: 401, headers: corsHeaders }
    );
  }

  const result = await env.DB.prepare(`
    SELECT
      houses.id,
      houses.display_name,
      houses.house_type,
      houses.surface,
      houses.city,
      latest.analysis_id,
      latest.completed_at,
      scores.overall_score,
      scores.estimated_energy_class,
      COUNT(recommendation_actions.id) AS implemented_actions
    FROM houses
    LEFT JOIN (
      SELECT house_id, MAX(id) AS analysis_id, MAX(completed_at) AS completed_at
      FROM analyses
      WHERE user_id = ? AND status = 'completed'
      GROUP BY house_id
    ) latest ON latest.house_id = houses.id
    LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
    LEFT JOIN recommendation_actions ON recommendation_actions.house_id = houses.id
      AND recommendation_actions.user_id = houses.user_id
      AND recommendation_actions.status = 'implemented'
    WHERE houses.user_id = ? AND COALESCE(houses.active, 1) = 1
    GROUP BY houses.id
    ORDER BY houses.id DESC
  `)
    .bind(user.id, user.id)
    .all();

  const normalizedHomes = (result.results || []).map(home => ({
    ...home,
    overall_score: home.overall_score === null || home.overall_score === undefined
      ? home.overall_score
      : clampScore(home.overall_score + (home.implemented_actions || 0) * 3),
    estimated_energy_class: home.overall_score === null || home.overall_score === undefined
      ? home.estimated_energy_class
      : estimateEnergyClass(clampScore(home.overall_score + (home.implemented_actions || 0) * 3))
  }));

  return jsonResponse({ success: true, homes: normalizedHomes }, { headers: corsHeaders });
}

async function recommendations(request, env, corsHeaders) {
  return energyReport(request, env, corsHeaders);
}

async function archiveHome(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie sa fii autentificat pentru a modifica locuinta." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  if (!houseId) {
    return jsonResponse({ success: false, error: "Lipseste locuinta." }, { status: 400, headers: corsHeaders });
  }

  await env.DB.prepare(`
    UPDATE houses
    SET active = 0, archived_at = ?
    WHERE id = ? AND user_id = ?
  `)
    .bind(new Date().toISOString(), houseId, user.id)
    .run();

  return jsonResponse({ success: true, house_id: houseId }, { headers: corsHeaders });
}

async function recommendationAction(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: "Trebuie să fii autentificat pentru a salva decizia." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  const recommendationId = value(body, "recommendation_id");
  const implemented = value(body, "status") !== "planned";

  if (!houseId || !recommendationId) {
    return jsonResponse(
      { success: false, error: "Lipsește locuința sau recomandarea." },
      { status: 400, headers: corsHeaders }
    );
  }

  const house = await env.DB.prepare("SELECT id FROM houses WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse(
      { success: false, error: "Locuința nu aparține contului curent." },
      { status: 403, headers: corsHeaders }
    );
  }

  await env.DB.prepare("DELETE FROM recommendation_actions WHERE user_id = ? AND house_id = ? AND recommendation_id = ?")
    .bind(user.id, houseId, recommendationId)
    .run();

  if (implemented) {
    await env.DB.prepare(`
      INSERT INTO recommendation_actions(user_id, house_id, recommendation_id, status, notes)
      VALUES(?, ?, ?, 'implemented', ?)
    `)
      .bind(user.id, houseId, recommendationId, value(body, "notes"))
      .run();

    await env.DB.prepare(`
      INSERT INTO savings_events(user_id, house_id, event_type, amount_ron, source)
      VALUES(?, ?, 'recommendation_implemented', NULL, ?)
    `)
      .bind(user.id, houseId, recommendationId)
      .run();
  }

  return jsonResponse({ success: true, implemented }, { headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const routes = {
      "/api/register": register,
      "/api/login": login,
      "/api/me": me,
      "/api/logout": logout,
      "/api/forgot-password": forgotPassword,
      "/api/reset-password": resetPassword,
      "/api/save-house": saveHouse,
      "/api/dashboard-summary": dashboardSummary,
      "/api/energy-report": energyReport,
      "/api/demo-energy-report": demoEnergyReport,
      "/api/homes": homes,
      "/api/recommendations": recommendations,
      "/api/recommendation-action": recommendationAction,
      "/api/archive-home": archiveHome
    };
    const handler = routes[url.pathname];

    if (!handler) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    try {
      return await handler(request, env, corsHeaders, url);
    } catch (e) {
      return jsonResponse({ success: false, error: e.toString() }, { status: 500, headers: corsHeaders });
    }
  }
};
