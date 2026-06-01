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

function billTotal(row) {
  return [
    "electricity_cost_ron",
    "gas_cost_ron",
    "wood_cost_ron",
    "pellets_cost_ron",
    "other_cost_ron"
  ].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
}

function monthNumber(value) {
  const month = Number(String(value || "").slice(5, 7));
  return Number.isFinite(month) ? month : 0;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const average = values.reduce((sum, item) => sum + item, 0) / values.length;
  const variance = values.reduce((sum, item) => sum + ((item - average) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function analyzeBillingHistory(rows = [], profile = null, baseScore = null) {
  const sorted = [...rows].sort((a, b) => String(a.billing_month).localeCompare(String(b.billing_month)));
  const actualRows = sorted.filter(row => {
    const readingType = row.reading_type || "actual";
    return readingType === "actual" && Number(row.is_regularization || 0) !== 1;
  });
  const averageActual = actualRows.length
    ? actualRows.reduce((sum, row) => sum + billTotal(row), 0) / actualRows.length
    : 0;

  const monthly = sorted.map(row => {
    const rawTotal = billTotal(row);
    const readingType = row.reading_type || "actual";
    const isRegularization = Number(row.is_regularization || 0) === 1;
    const normalizedTotal = readingType === "actual" && !isRegularization
      ? rawTotal
      : averageActual || rawTotal;
    return {
      ...row,
      total_cost_ron: Math.round(rawTotal),
      normalized_cost_ron: Math.round(normalizedTotal),
      reading_type: readingType,
      is_regularization: isRegularization ? 1 : 0
    };
  });

  const totals = monthly.reduce((acc, row) => {
    acc.electricity += Number(row.electricity_cost_ron) || 0;
    acc.gas += Number(row.gas_cost_ron) || 0;
    acc.wood += Number(row.wood_cost_ron) || 0;
    acc.pellets += Number(row.pellets_cost_ron) || 0;
    acc.other += Number(row.other_cost_ron) || 0;
    acc.total += row.total_cost_ron || 0;
    acc.normalized += row.normalized_cost_ron || 0;
    return acc;
  }, { electricity: 0, gas: 0, wood: 0, pellets: 0, other: 0, total: 0, normalized: 0 });

  const normalizedValues = monthly.map(row => row.normalized_cost_ron).filter(value => value > 0);
  const normalizedAverage = normalizedValues.length
    ? normalizedValues.reduce((sum, value) => sum + value, 0) / normalizedValues.length
    : 0;
  const volatility = normalizedAverage ? stdev(normalizedValues) / normalizedAverage : 0;
  const regularizedMonths = monthly.filter(row => row.is_regularization || row.reading_type !== "actual").length;
  const winter = monthly.filter(row => [11, 12, 1, 2, 3].includes(monthNumber(row.billing_month)));
  const summer = monthly.filter(row => [6, 7, 8, 9].includes(monthNumber(row.billing_month)));
  const winterAverage = winter.length ? winter.reduce((sum, row) => sum + row.normalized_cost_ron, 0) / winter.length : 0;
  const summerAverage = summer.length ? summer.reduce((sum, row) => sum + row.normalized_cost_ron, 0) / summer.length : 0;
  const dominantCarrier = Object.entries({
    electricity: totals.electricity,
    gas: totals.gas,
    wood: totals.wood,
    pellets: totals.pellets,
    other: totals.other
  }).sort((a, b) => b[1] - a[1])[0] || ["unknown", 0];

  const modelMonthly = profile?.assessment?.estimatedAnnualCostRon
    ? profile.assessment.estimatedAnnualCostRon / 12
    : 0;
  let scoreDelta = 0;
  const conclusions = [];
  if (monthly.length >= 10) {
    scoreDelta += 2;
    conclusions.push("Ai introdus aproape un an de facturi, deci estimarea devine mai credibila.");
  } else if (monthly.length >= 4) {
    scoreDelta += 1;
    conclusions.push("Exista cateva luni de facturi, dar un an complet ar clarifica sezonalitatea.");
  } else if (monthly.length > 0) {
    conclusions.push("Istoricul este inca scurt; scorul foloseste prudent facturile introduse.");
  }
  if (modelMonthly && normalizedAverage > modelMonthly * 1.25) {
    scoreDelta -= 3;
    conclusions.push("Costul lunar normalizat este peste estimarea modelului, posibil din cauza consumului real mai ridicat sau a preturilor energiei.");
  } else if (modelMonthly && normalizedAverage < modelMonthly * 0.85 && monthly.length >= 4) {
    scoreDelta += 1;
    conclusions.push("Facturile normalizate sunt sub estimarea modelului; poate fi eficienta mai buna sau utilizare mai redusa.");
  }
  if (regularizedMonths) {
    scoreDelta -= 1;
    conclusions.push("Unele luni sunt estimari sau regularizari, deci le tratam ca semnal mai slab in curba normalizata.");
  }
  if (volatility > 0.45) {
    conclusions.push("Curba are variatii mari; merita separat consumul real de regularizari si facturi estimate.");
  }
  if (winterAverage && summerAverage && winterAverage > summerAverage * 1.35) {
    conclusions.push("Iarna costurile cresc vizibil, semn ca incalzirea domina consumul anual.");
  }
  if (dominantCarrier[1] > 0) {
    const labels = { electricity: "curent", gas: "gaz", wood: "lemn", pellets: "peleti", other: "alte surse" };
    conclusions.push(`Cea mai mare parte a banilor merge catre ${labels[dominantCarrier[0]]}.`);
  }

  const adjustedScore = baseScore === null || baseScore === undefined
    ? null
    : clampScore(baseScore + scoreDelta);

  return {
    months_count: monthly.length,
    complete_year: monthly.length >= 12,
    total_cost_ron: Math.round(totals.total),
    normalized_monthly_average_ron: Math.round(normalizedAverage),
    regularized_months: regularizedMonths,
    volatility: Number(volatility.toFixed(2)),
    dominant_carrier: dominantCarrier[0],
    score_delta: scoreDelta,
    adjusted_score: adjustedScore,
    conclusions,
    monthly
  };
}

function buildMoneyWallet(profile, benchmark, implementedRows = []) {
  const recommendations = profile.recommendations || [];
  const implementedIds = new Set(implementedRows.map(row => row.recommendation_id));
  const implementedSavings = recommendations
    .filter(item => implementedIds.has(item.id))
    .reduce((sum, item) => sum + (Number(item.estimatedSavingsRonYearMin) || 0), 0);
  const potentialMin = profile.assessment.estimatedAnnualSavingsMinRon || 0;
  const potentialMax = profile.assessment.estimatedAnnualSavingsMaxRon || 0;
  const remainingMin = Math.max(0, potentialMin - implementedSavings);
  const remainingMax = Math.max(0, potentialMax - implementedSavings);
  const lostMonth = remainingMin / 12;
  const percentile = benchmark?.percentile ? clampScore(benchmark.percentile) : null;
  return {
    implementedSavingsRonYear: Math.round(implementedSavings),
    potentialSavingsMinRon: Math.round(remainingMin),
    potentialSavingsMaxRon: Math.round(remainingMax),
    lostMoneyRonMonth: Math.round(lostMonth),
    lostMoneyRonFiveYears: Math.round(remainingMin * 5),
    benchmarkPercentile: percentile,
    message: remainingMin
      ? `Daca amani recomandarile prioritare, modelul estimeaza ca pierzi cel putin ${Math.round(lostMonth).toLocaleString("ro-RO")} lei/luna.`
      : implementedSavings
        ? "Ai marcat recomandarile prioritare ca implementate. Urmatorul pas este validarea cu facturi reale."
        : "Completeaza mai multe date sau facturi pentru a estima banii pierduti lunar."
  };
}

function offersByRecommendation(rows = []) {
  return rows.reduce((acc, row) => {
    const id = row.recommendation_id;
    if (!acc[id]) {
      acc[id] = {
        recommendation_id: id,
        offers_count: 0,
        lowest_offer_ron: null,
        contact_requested_count: 0
      };
    }
    acc[id].offers_count += 1;
    if (row.status === "contact_requested") acc[id].contact_requested_count += 1;
    const amount = Number(row.offer_amount_ron);
    if (Number.isFinite(amount) && amount > 0) {
      acc[id].lowest_offer_ron = acc[id].lowest_offer_ron === null
        ? amount
        : Math.min(acc[id].lowest_offer_ron, amount);
    }
    return acc;
  }, {});
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

function requireAdmin(user) {
  return user && user.role === "admin";
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
  const identifier = normalizeEmail(body.email || body.username);
  const user = await env.DB.prepare(`
    SELECT id, email, name, password_hash, role, account_type
    FROM users
    WHERE email = ? OR lower(name) = ?
    ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END
    LIMIT 1
  `)
    .bind(identifier, identifier, identifier)
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

async function latestAnalysisForHouse(env, userId, houseId) {
  return env.DB.prepare(`
    SELECT analyses.id, analyses.house_id, analyses.analysis_type
    FROM analyses
    JOIN houses ON houses.id = analyses.house_id
    WHERE analyses.user_id = ? AND analyses.house_id = ?
      AND analyses.status = 'completed'
      AND COALESCE(houses.active, 1) = 1
    ORDER BY analyses.completed_at DESC, analyses.id DESC
    LIMIT 1
  `)
    .bind(userId, houseId)
    .first();
}

async function latestAnswers(env, analysisId) {
  const answers = await env.DB.prepare(`
    SELECT question_key, answer_value
    FROM analysis_answers
    WHERE analysis_id = ?
  `)
    .bind(analysisId)
    .all();
  return Object.fromEntries((answers.results || []).map(row => [row.question_key, row.answer_value]));
}

async function houseProfile(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat." }, { status: 401, headers: corsHeaders });
  }

  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  if (!houseId) {
    return jsonResponse({ success: false, error: "Lipseste locuinta." }, { status: 400, headers: corsHeaders });
  }

  const house = await env.DB.prepare(`
    SELECT id, display_name, city, surface, year, house_type, analysis_purpose
    FROM houses
    WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1
    LIMIT 1
  `)
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse({ success: false, error: "Locuinta nu apartine contului curent." }, { status: 403, headers: corsHeaders });
  }

  const analysis = await latestAnalysisForHouse(env, user.id, houseId);
  const answers = analysis ? await latestAnswers(env, analysis.id) : {};
  const bills = await env.DB.prepare(`
    SELECT billing_month, electricity_cost_ron, gas_cost_ron, wood_cost_ron, pellets_cost_ron, other_cost_ron, reading_type, is_regularization, notes
    FROM house_monthly_bills
    WHERE user_id = ? AND house_id = ?
    ORDER BY billing_month DESC
    LIMIT 12
  `)
    .bind(user.id, houseId)
    .all();

  return jsonResponse({ success: true, house, analysis, answers, bills: bills.results || [] }, { headers: corsHeaders });
}

async function createAnalysisVersion(env, user, body, houseId, analysisType, changeSummary = "Profil locuinta actualizat") {
  const siteResult = await env.DB.prepare("INSERT INTO sites(user_id, name, city) VALUES(?, ?, ?)")
    .bind(user.id, value(body, "site_name") || displayNameForHouse(body, houseId), value(body, "city"))
    .run();
  const siteId = siteResult.meta?.last_row_id;

  const buildingResult = await env.DB.prepare(`
    INSERT INTO buildings(site_id, house_id, building_type, area, construction_year, heating_type, climate_region)
    VALUES(?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      siteId,
      houseId,
      value(body, "house_type") || value(body, "building_type"),
      numberValue(body, "surface") || numberValue(body, "useful_area_m2"),
      numberValue(body, "year") || numberValue(body, "construction_year"),
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

  const answerStatements = Object.entries(body).map(([key, answer]) =>
    env.DB.prepare("INSERT INTO analysis_answers(analysis_id, question_key, answer_value, answer_group) VALUES(?, ?, ?, ?)")
      .bind(analysisId, key, answer === null || answer === undefined ? null : String(answer), analysisType)
  );

  await env.DB.batch([
    ...answerStatements,
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
      .bind(analysisId),
    env.DB.prepare("INSERT INTO house_change_log(user_id, house_id, change_type, summary) VALUES(?, ?, 'profile_update', ?)")
      .bind(user.id, houseId, changeSummary)
  ]);

  return { analysisId, score: score.overall_score, profile: energyProfile };
}

async function updateHouse(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat pentru a edita locuinta." }, { status: 401, headers: corsHeaders });
  }

  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  if (!houseId) {
    return jsonResponse({ success: false, error: "Lipseste locuinta." }, { status: 400, headers: corsHeaders });
  }

  const house = await env.DB.prepare("SELECT id FROM houses WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1 LIMIT 1")
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse({ success: false, error: "Locuinta nu apartine contului curent." }, { status: 403, headers: corsHeaders });
  }

  await env.DB.prepare(`
    UPDATE houses
    SET display_name = ?, city = ?, surface = ?, year = ?, house_type = ?, analysis_purpose = ?
    WHERE id = ? AND user_id = ?
  `)
    .bind(
      displayNameForHouse(body, houseId),
      value(body, "city"),
      numberValue(body, "surface") || numberValue(body, "useful_area_m2"),
      numberValue(body, "year") || numberValue(body, "construction_year"),
      value(body, "house_type") || value(body, "building_type"),
      value(body, "analysis_purpose"),
      houseId,
      user.id
    )
    .run();

  const result = await createAnalysisVersion(env, user, body, houseId, inferAnalysisType(body, user), "Datele locuintei au fost revizuite");
  return jsonResponse({ success: true, house_id: houseId, analysis_id: result.analysisId, score: result.score }, { headers: corsHeaders });
}

async function simulateHouse(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat pentru simulare." }, { status: 401, headers: corsHeaders });
  }
  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  const newProfile = buildEnergyProfile(body);
  let oldProfile = null;

  if (houseId) {
    const analysis = await latestAnalysisForHouse(env, user.id, houseId);
    if (analysis) {
      oldProfile = buildEnergyProfile(await latestAnswers(env, analysis.id));
    }
  }

  const comparison = oldProfile
    ? {
      oldScore: oldProfile.assessment.score,
      newScore: newProfile.assessment.score,
      scoreDelta: newProfile.assessment.score - oldProfile.assessment.score,
      oldSavingsMinRon: oldProfile.assessment.estimatedAnnualSavingsMinRon,
      oldSavingsMaxRon: oldProfile.assessment.estimatedAnnualSavingsMaxRon,
      newSavingsMinRon: newProfile.assessment.estimatedAnnualSavingsMinRon,
      newSavingsMaxRon: newProfile.assessment.estimatedAnnualSavingsMaxRon,
      savingsDeltaMinRon: (newProfile.assessment.estimatedAnnualSavingsMinRon || 0) - (oldProfile.assessment.estimatedAnnualSavingsMinRon || 0),
      savingsDeltaMaxRon: (newProfile.assessment.estimatedAnnualSavingsMaxRon || 0) - (oldProfile.assessment.estimatedAnnualSavingsMaxRon || 0)
    }
    : null;

  return jsonResponse({ success: true, simulated: true, profile: newProfile, old_profile: oldProfile, comparison }, { headers: corsHeaders });
}

async function monthlyBill(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat pentru a salva factura." }, { status: 401, headers: corsHeaders });
  }
  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  const billingMonth = value(body, "billing_month");
  if (!houseId || !billingMonth) {
    return jsonResponse({ success: false, error: "Lipseste locuinta sau luna facturii." }, { status: 400, headers: corsHeaders });
  }
  const house = await env.DB.prepare("SELECT id FROM houses WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1 LIMIT 1")
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse({ success: false, error: "Locuinta nu apartine contului curent." }, { status: 403, headers: corsHeaders });
  }

  await env.DB.prepare(`
    INSERT INTO house_monthly_bills(
      user_id, house_id, billing_month, electricity_cost_ron, gas_cost_ron,
      wood_cost_ron, pellets_cost_ron, other_cost_ron, reading_type, is_regularization, notes
    )
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      user.id,
      houseId,
      billingMonth,
      numberValue(body, "electricity_cost_ron") || 0,
      numberValue(body, "gas_cost_ron") || 0,
      numberValue(body, "wood_cost_ron") || 0,
      numberValue(body, "pellets_cost_ron") || 0,
      numberValue(body, "other_cost_ron") || 0,
      value(body, "reading_type") || "actual",
      value(body, "is_regularization") === "yes" ? 1 : 0,
      value(body, "notes")
    )
    .run();

  await env.DB.prepare("INSERT INTO house_change_log(user_id, house_id, change_type, summary) VALUES(?, ?, 'monthly_bill', ?)")
    .bind(user.id, houseId, `Factura adaugata pentru ${billingMonth}`)
    .run();

  const bills = await env.DB.prepare(`
    SELECT billing_month, electricity_cost_ron, gas_cost_ron, wood_cost_ron, pellets_cost_ron, other_cost_ron, reading_type, is_regularization, notes
    FROM house_monthly_bills
    WHERE user_id = ? AND house_id = ?
    ORDER BY billing_month DESC
    LIMIT 12
  `)
    .bind(user.id, houseId)
    .all();

  return jsonResponse({ success: true, bill_analysis: analyzeBillingHistory(bills.results || []) }, { headers: corsHeaders });
}

async function adminOverview(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!requireAdmin(user)) {
    return jsonResponse(
      { success: false, error: "Accesul este disponibil doar pentru administratori." },
      { status: 403, headers: corsHeaders }
    );
  }

  const [usersCount, housesCount, analysesCount, billsCount, pendingOffersCount] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM users").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM houses WHERE COALESCE(active, 1) = 1").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM analyses WHERE status = 'completed'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM house_monthly_bills").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM provider_offers WHERE status = 'submitted'").first()
  ]);

  const houses = await env.DB.prepare(`
    SELECT
      houses.id,
      houses.display_name,
      houses.city,
      houses.surface,
      houses.year,
      houses.house_type,
      houses.analysis_purpose,
      users.email AS user_email,
      latest.analysis_id,
      latest.completed_at,
      scores.overall_score,
      scores.estimated_energy_class
    FROM houses
    LEFT JOIN users ON users.id = houses.user_id
    LEFT JOIN (
      SELECT house_id, MAX(id) AS analysis_id, MAX(completed_at) AS completed_at
      FROM analyses
      WHERE status = 'completed'
      GROUP BY house_id
    ) latest ON latest.house_id = houses.id
    LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
    WHERE COALESCE(houses.active, 1) = 1
    ORDER BY houses.id DESC
    LIMIT 200
  `).all();

  const analysisIds = (houses.results || []).map(row => row.analysis_id).filter(Boolean);
  let answers = [];
  if (analysisIds.length) {
    const placeholders = analysisIds.map(() => "?").join(",");
    const result = await env.DB.prepare(`
      SELECT analysis_id, question_key, answer_value
      FROM analysis_answers
      WHERE analysis_id IN (${placeholders})
        AND question_key IN (
          'heating_source', 'heating_system_type', 'building_type', 'wall_insulation',
          'roof_insulated', 'window_type', 'pv_installed', 'monthly_electricity_cost',
          'monthly_gas_cost', 'annual_wood_cost', 'analysis_purpose'
        )
    `).bind(...analysisIds).all();
    answers = result.results || [];
  }

  const answersByAnalysis = new Map();
  answers.forEach(row => {
    if (!answersByAnalysis.has(row.analysis_id)) answersByAnalysis.set(row.analysis_id, {});
    answersByAnalysis.get(row.analysis_id)[row.question_key] = row.answer_value;
  });

  const rows = (houses.results || []).map(row => ({
    ...row,
    answers: answersByAnalysis.get(row.analysis_id) || {}
  }));

  function distribution(key, values) {
    const counts = {};
    values.forEach(value => {
      const normalized = value || "unknown";
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  const validScores = rows.map(row => Number(row.overall_score)).filter(Number.isFinite);
  const scoreAverage = validScores.length
    ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
    : null;

  const monthlyBills = await env.DB.prepare(`
    SELECT billing_month, SUM(electricity_cost_ron + gas_cost_ron + wood_cost_ron + pellets_cost_ron + other_cost_ron) AS total_cost
    FROM house_monthly_bills
    GROUP BY billing_month
    ORDER BY billing_month DESC
    LIMIT 12
  `).all();

  return jsonResponse(
    {
      success: true,
      admin: user,
      metrics: {
        users: usersCount?.count || 0,
        houses: housesCount?.count || 0,
        analyses: analysesCount?.count || 0,
        bills: billsCount?.count || 0,
        pendingOffers: pendingOffersCount?.count || 0,
        scoreAverage
      },
      distributions: {
        classes: distribution("estimated_energy_class", rows.map(row => row.estimated_energy_class)),
        heatingSources: distribution("heating_source", rows.map(row => row.answers.heating_source)),
        buildingTypes: distribution("building_type", rows.map(row => row.answers.building_type || row.house_type)),
        analysisPurpose: distribution("analysis_purpose", rows.map(row => row.analysis_purpose || row.answers.analysis_purpose))
      },
      monthlyBills: monthlyBills.results || [],
      houses: rows
    },
    { headers: corsHeaders }
  );
}

async function adminDataset(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!requireAdmin(user)) {
    return jsonResponse(
      { success: false, error: "Accesul este disponibil doar pentru administratori." },
      { status: 403, headers: corsHeaders }
    );
  }

  const body = await readJson(request);
  const limit = Math.max(1, Math.min(1000, numberValue(body, "limit") || 500));
  const tableQueries = {
    users: `
      SELECT id, email, name, role, account_type, created_at
      FROM users
      ORDER BY id DESC
      LIMIT ?
    `,
    houses: `
      SELECT *
      FROM houses
      ORDER BY id DESC
      LIMIT ?
    `,
    analyses: `
      SELECT *
      FROM analyses
      ORDER BY id DESC
      LIMIT ?
    `,
    analysis_answers: `
      SELECT *
      FROM analysis_answers
      ORDER BY id DESC
      LIMIT ?
    `,
    scores: `
      SELECT *
      FROM scores
      ORDER BY id DESC
      LIMIT ?
    `,
    benchmark_results: `
      SELECT *
      FROM benchmark_results
      ORDER BY id DESC
      LIMIT ?
    `,
    reports: `
      SELECT *
      FROM reports
      ORDER BY id DESC
      LIMIT ?
    `,
    monthly_bills: `
      SELECT *
      FROM house_monthly_bills
      ORDER BY id DESC
      LIMIT ?
    `,
    recommendation_actions: `
      SELECT *
      FROM recommendation_actions
      ORDER BY id DESC
      LIMIT ?
    `,
    savings_events: `
      SELECT *
      FROM savings_events
      ORDER BY id DESC
      LIMIT ?
    `,
    service_providers: `
      SELECT *
      FROM service_providers
      ORDER BY id DESC
      LIMIT ?
    `,
    provider_offers: `
      SELECT
        provider_offers.*,
        service_providers.company_name,
        service_providers.provider_type,
        service_providers.service_area
      FROM provider_offers
      LEFT JOIN service_providers ON service_providers.id = provider_offers.provider_id
      ORDER BY provider_offers.id DESC
      LIMIT ?
    `,
    house_change_log: `
      SELECT *
      FROM house_change_log
      ORDER BY id DESC
      LIMIT ?
    `,
    joined_houses: `
      SELECT
        houses.id AS house_id,
        houses.user_id,
        users.email AS user_email,
        houses.display_name,
        houses.city,
        houses.surface,
        houses.year,
        houses.house_type,
        houses.active,
        houses.analysis_purpose,
        latest.analysis_id,
        latest.completed_at,
        scores.overall_score,
        scores.building_efficiency,
        scores.consumption_efficiency,
        scores.behavior,
        scores.equipment,
        scores.green_energy,
        scores.smart_optimization,
        scores.estimated_energy_class
      FROM houses
      LEFT JOIN users ON users.id = houses.user_id
      LEFT JOIN (
        SELECT house_id, MAX(id) AS analysis_id, MAX(completed_at) AS completed_at
        FROM analyses
        GROUP BY house_id
      ) latest ON latest.house_id = houses.id
      LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
      ORDER BY houses.id DESC
      LIMIT ?
    `
  };

  const tableNames = Object.keys(tableQueries);
  const datasets = {};
  for (const table of tableNames) {
    const result = await env.DB.prepare(tableQueries[table]).bind(limit).all();
    datasets[table] = result.results || [];
  }

  const answerKeys = await env.DB.prepare(`
    SELECT question_key, COUNT(*) AS count
    FROM analysis_answers
    GROUP BY question_key
    ORDER BY count DESC, question_key ASC
    LIMIT 200
  `).all();

  return jsonResponse(
    {
      success: true,
      limit,
      tables: tableNames,
      datasets,
      answerKeys: answerKeys.results || [],
      notes: [
        "password_hash si tokenurile de sesiune nu sunt expuse in admin UI.",
        "Seturile sunt limitate pentru performanta; creste limit pana la 1000 daca ai nevoie."
      ]
    },
    { headers: corsHeaders }
  );
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

  const benchmark = await env.DB.prepare(`
    SELECT percentile, cluster_average, score_comparison
    FROM benchmark_results
    WHERE analysis_id = ?
    ORDER BY id DESC
    LIMIT 1
  `)
    .bind(analysis.id)
    .first();

  const reportBills = await env.DB.prepare(`
    SELECT billing_month, electricity_cost_ron, gas_cost_ron, wood_cost_ron, pellets_cost_ron, other_cost_ron, reading_type, is_regularization, notes
    FROM house_monthly_bills
    WHERE user_id = ? AND house_id = ?
    ORDER BY billing_month DESC
    LIMIT 12
  `)
    .bind(user.id, requestedHouseId || analysis.house_id)
    .all();
  const billAnalysis = analyzeBillingHistory(reportBills.results || [], profile, profile.assessment.score);
  if (billAnalysis.adjusted_score !== null && billAnalysis.score_delta !== 0) {
    profile.assessment.score = billAnalysis.adjusted_score;
    profile.assessment.estimatedEnergyClass = estimateEnergyClass(profile.assessment.score);
  }
  const providerOffers = await env.DB.prepare(`
    SELECT recommendation_id, offer_amount_ron, status
    FROM provider_offers
    WHERE house_id = ? AND status IN ('approved', 'contact_requested')
  `)
    .bind(requestedHouseId || analysis.house_id)
    .all();

  return jsonResponse(
    {
      success: true,
      has_report: true,
      analysis_id: analysis.id,
      house_id: requestedHouseId || analysis.house_id,
      implemented_recommendations: implementedIds,
      savings_history: savingsHistory(profile, implementedRows),
      money_wallet: buildMoneyWallet(profile, benchmark, implementedRows),
      benchmark,
      provider_offers: offersByRecommendation(providerOffers.results || []),
      bill_analysis: billAnalysis,
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

async function providerForUser(env, userId) {
  return env.DB.prepare("SELECT * FROM service_providers WHERE user_id = ? ORDER BY id DESC LIMIT 1")
    .bind(userId)
    .first();
}

async function providerRegister(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat pentru a inscrie o firma." }, { status: 401, headers: corsHeaders });
  }
  const body = await readJson(request);
  const companyName = value(body, "company_name");
  if (!companyName) {
    return jsonResponse({ success: false, error: "Lipseste numele firmei." }, { status: 400, headers: corsHeaders });
  }

  const existing = await providerForUser(env, user.id);
  if (existing) {
    await env.DB.prepare(`
      UPDATE service_providers
      SET company_name = ?, provider_type = ?, service_area = ?, certifications = ?
      WHERE id = ? AND user_id = ?
    `)
      .bind(companyName, value(body, "provider_type"), value(body, "service_area"), value(body, "certifications"), existing.id, user.id)
      .run();
    return jsonResponse({ success: true, provider_id: existing.id }, { headers: corsHeaders });
  }

  const result = await env.DB.prepare(`
    INSERT INTO service_providers(user_id, company_name, provider_type, service_area, certifications)
    VALUES(?, ?, ?, ?, ?)
  `)
    .bind(user.id, companyName, value(body, "provider_type"), value(body, "service_area"), value(body, "certifications"))
    .run();

  await env.DB.prepare("UPDATE users SET role = 'business', account_type = 'provider' WHERE id = ?")
    .bind(user.id)
    .run();

  return jsonResponse({ success: true, provider_id: result.meta?.last_row_id }, { headers: corsHeaders });
}

async function providerOpportunities(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat." }, { status: 401, headers: corsHeaders });
  }
  const provider = await providerForUser(env, user.id);
  if (!provider && !requireAdmin(user)) {
    return jsonResponse({ success: false, error: "Inscrie firma inainte de a vedea oportunitati." }, { status: 403, headers: corsHeaders });
  }

  const rows = await env.DB.prepare(`
    SELECT
      houses.id AS house_id,
      houses.house_type,
      houses.surface,
      houses.city,
      houses.year,
      latest.analysis_id,
      scores.overall_score,
      scores.estimated_energy_class
    FROM houses
    JOIN (
      SELECT house_id, MAX(id) AS analysis_id
      FROM analyses
      WHERE status = 'completed'
      GROUP BY house_id
    ) latest ON latest.house_id = houses.id
    LEFT JOIN scores ON scores.analysis_id = latest.analysis_id
    WHERE COALESCE(houses.active, 1) = 1
    ORDER BY latest.analysis_id DESC
    LIMIT 20
  `).all();

  const opportunities = [];
  for (const row of rows.results || []) {
    const answers = await latestAnswers(env, row.analysis_id);
    const profile = buildEnergyProfile(answers);
    opportunities.push({
      opportunity_id: row.house_id,
      area_bucket: row.surface ? `${Math.round(Number(row.surface) / 25) * 25} m2 +/-` : "necunoscut",
      building_type: profile.input.general.buildingType,
      city_hint: row.city ? String(row.city).split(" ")[0] : "zona anonima",
      estimated_class: profile.assessment.estimatedEnergyClass || row.estimated_energy_class,
      score_bucket: row.overall_score ? `${Math.floor(Number(row.overall_score) / 10) * 10}-${Math.floor(Number(row.overall_score) / 10) * 10 + 9}` : "necunoscut",
      recommendations: profile.recommendations.slice(0, 3).map(item => ({
        id: item.id,
        title: item.title,
        estimatedSavingsRonYearMin: item.estimatedSavingsRonYearMin,
        estimatedSavingsRonYearMax: item.estimatedSavingsRonYearMax,
        estimatedInvestmentRonMin: item.estimatedInvestmentRonMin,
        estimatedInvestmentRonMax: item.estimatedInvestmentRonMax
      }))
    });
  }

  return jsonResponse({ success: true, provider, opportunities }, { headers: corsHeaders });
}

async function providerOffer(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat." }, { status: 401, headers: corsHeaders });
  }
  const provider = await providerForUser(env, user.id);
  if (!provider && !requireAdmin(user)) {
    return jsonResponse({ success: false, error: "Inscrie firma inainte de a trimite oferte." }, { status: 403, headers: corsHeaders });
  }
  const body = await readJson(request);
  const houseId = numberValue(body, "opportunity_id");
  const recommendationId = value(body, "recommendation_id");
  const amount = numberValue(body, "offer_amount_ron");
  if (!houseId || !recommendationId) {
    return jsonResponse({ success: false, error: "Lipseste oportunitatea sau recomandarea." }, { status: 400, headers: corsHeaders });
  }

  const result = await env.DB.prepare(`
    INSERT INTO provider_offers(provider_id, house_id, recommendation_id, offer_amount_ron, estimated_duration_days, message)
    VALUES(?, ?, ?, ?, ?, ?)
  `)
    .bind(provider?.id || null, houseId, recommendationId, amount, numberValue(body, "estimated_duration_days"), value(body, "message"))
    .run();

  return jsonResponse({ success: true, offer_id: result.meta?.last_row_id }, { headers: corsHeaders });
}

async function adminProviderOfferAction(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!requireAdmin(user)) {
    return jsonResponse({ success: false, error: "Acces disponibil doar pentru administratori." }, { status: 403, headers: corsHeaders });
  }
  const body = await readJson(request);
  const offerId = numberValue(body, "offer_id");
  const status = value(body, "status");
  if (!offerId || !["approved", "rejected", "submitted"].includes(status)) {
    return jsonResponse({ success: false, error: "Status invalid pentru oferta." }, { status: 400, headers: corsHeaders });
  }

  await env.DB.prepare("UPDATE provider_offers SET status = ? WHERE id = ?")
    .bind(status, offerId)
    .run();

  return jsonResponse({ success: true, offer_id: offerId, status }, { headers: corsHeaders });
}

async function providerContactRequest(request, env, corsHeaders) {
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse({ success: false, error: "Trebuie sa fii autentificat." }, { status: 401, headers: corsHeaders });
  }
  const body = await readJson(request);
  const houseId = numberValue(body, "house_id");
  const recommendationId = value(body, "recommendation_id");
  if (!houseId || !recommendationId) {
    return jsonResponse({ success: false, error: "Lipseste locuinta sau recomandarea." }, { status: 400, headers: corsHeaders });
  }

  const house = await env.DB.prepare("SELECT id FROM houses WHERE id = ? AND user_id = ? AND COALESCE(active, 1) = 1 LIMIT 1")
    .bind(houseId, user.id)
    .first();
  if (!house) {
    return jsonResponse({ success: false, error: "Locuinta nu apartine contului curent." }, { status: 403, headers: corsHeaders });
  }

  const result = await env.DB.prepare(`
    UPDATE provider_offers
    SET status = 'contact_requested'
    WHERE house_id = ? AND recommendation_id = ? AND status = 'approved'
  `)
    .bind(houseId, recommendationId)
    .run();

  return jsonResponse({ success: true, requested: result.meta?.changes || 0 }, { headers: corsHeaders });
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
    if (request.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/")) {
      return Response.redirect(`${url.origin}/pages/admin.html`, 302);
    }
    if (request.method === "GET" && (url.pathname === "/furnizori" || url.pathname === "/furnizori/")) {
      return Response.redirect(`${url.origin}/pages/furnizori.html`, 302);
    }

    const routes = {
      "/api/register": register,
      "/api/login": login,
      "/api/me": me,
      "/api/logout": logout,
      "/api/forgot-password": forgotPassword,
      "/api/reset-password": resetPassword,
      "/api/save-house": saveHouse,
      "/api/update-house": updateHouse,
      "/api/house-profile": houseProfile,
      "/api/simulate-house": simulateHouse,
      "/api/monthly-bill": monthlyBill,
      "/api/admin/overview": adminOverview,
      "/api/admin/dataset": adminDataset,
      "/api/admin/provider-offer-action": adminProviderOfferAction,
      "/api/dashboard-summary": dashboardSummary,
      "/api/energy-report": energyReport,
      "/api/demo-energy-report": demoEnergyReport,
      "/api/homes": homes,
      "/api/recommendations": recommendations,
      "/api/recommendation-action": recommendationAction,
      "/api/provider/register": providerRegister,
      "/api/provider/opportunities": providerOpportunities,
      "/api/provider/offer": providerOffer,
      "/api/provider/contact-request": providerContactRequest,
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
