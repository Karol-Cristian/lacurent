import {
  dashboardRefreshMs,
  extractEditorialHomeDashboard,
  solarPowerForecastUrl,
} from "./home-dashboard-contract.mjs";

const TOKEN_KEY = "lacurent_auth_token";
const CURRENT_PROJECT_KEY = "lacurent-home-lab-editorial-v2:official:account-project-id";
const select = document.getElementById("hdProjectSelect");
const content = document.getElementById("hdContent");
const empty = document.getElementById("hdEmpty");
let currentProjectId = "";
let currentModel = null;
let timer = 0;

function token() {
  try { return String(localStorage.getItem(TOKEN_KEY) || "").trim(); }
  catch (_) { return ""; }
}

function currentSavedProject() {
  try { return String(localStorage.getItem(CURRENT_PROJECT_KEY) || "").trim(); }
  catch (_) { return ""; }
}

async function accountRequest(path, { method = "GET", body = null } = {}) {
  const auth = token();
  if (!auth) throw Object.assign(new Error("Autentificare necesară."), { status: 401 });
  const headers = { Accept: "application/json", Authorization: `Bearer ${auth}` };
  if (body !== null) headers["Content-Type"] = "application/json";
  const response = await fetch(path, {
    method,
    headers,
    cache: "no-store",
    body: body === null ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw Object.assign(new Error(data?.detail || data?.error || `HTTP ${response.status}`), { status: response.status });
  }
  return data;
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function pill(id, text, kind = "") {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = text;
  node.className = `hd-pill${kind ? ` ${kind}` : ""}`;
}

function showEmpty(title, text) {
  content.hidden = true;
  empty.hidden = false;
  setText("hdEmptyTitle", title);
  setText("hdEmptyText", text);
}

function showDashboard() {
  empty.hidden = true;
  content.hidden = false;
}

function mwToKw(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 1000).toLocaleString("ro-RO", { maximumFractionDigits: n < 0.01 ? 2 : 1 })} kW`;
}

function mwhToKwh(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 1000).toLocaleString("ro-RO", { maximumFractionDigits: 1 })} kWh`;
}

function radiation(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString("ro-RO")} W/m²` : "—";
}

async function resolveLocality(model) {
  const identifier = model.location.locality_id || model.location.locality_name;
  if (!identifier) return null;
  const response = await fetch(`/api/locality/${encodeURIComponent(identifier)}`, { cache: "force-cache" });
  if (!response.ok) return null;
  return response.json();
}

function renderStatic(model) {
  setText("hdHomeName", model.project_name);
  setText("hdHomeLocation",
    [model.location.locality_name, model.location.county].filter(Boolean).join(", ") || "Localizare incompletă");
  const house = document.getElementById("hdHouse");
  house.dataset.pv = String(Boolean(model.pv.enabled));
  setText("hdTwinLabel", model.pv.enabled
    ? `Digital twin · ${model.pv.installed_kwp.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} kWp PV`
    : "Digital twin al proiectului salvat");
  pill("hdAnalysisStatus",
    model.analysis.optimization_available ? "Plan TEO salvat" : model.analysis.baseline_available ? "Analiză salvată" : "Fără calcul",
    model.analysis.baseline_available ? "ok" : "warn");

  if (!model.pv.enabled) {
    setText("hdPvNow", "Fără PV"); setText("hdPvHour", "—"); setText("hdPvToday", "—");
    setText("hdPvNowNote", "PV nu este activ în proiect.");
  } else if (!model.pv.forecast_ready) {
    setText("hdPvNow", "—"); setText("hdPvHour", "—"); setText("hdPvToday", "—");
    setText("hdPvNowNote", "Completează puterea, orientarea și înclinarea PV.");
  } else {
    setText("hdPvNowNote", `${model.pv.installed_kwp.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} kWp · ${model.pv.orientation || "—"} · ${model.pv.tilt_deg}°`);
  }

  if (model.solar_thermal.enabled) {
    pill("hdThermalStatus", "Sistem detectat", "warn");
    setText("hdThermalArea", Number.isFinite(model.solar_thermal.collector_area_m2)
      ? `${model.solar_thermal.collector_area_m2.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} m²`
      : "—");
    setText("hdThermalGeometry",
      [model.solar_thermal.orientation, Number.isFinite(model.solar_thermal.tilt_deg) ? `${model.solar_thermal.tilt_deg}°` : null]
        .filter(Boolean).join(" · ") || "geometrie incompletă");
    setText("hdThermalNote",
      "Sistemul este salvat. Nu transformăm iradierea în kWh termici până când randamentul/colectorul sunt suficient definite și validate.");
  } else {
    pill("hdThermalStatus", "Neconfigurat");
    setText("hdThermalArea", "—"); setText("hdThermalGeometry", "—");
  }

  const env = model.envelope_solar;
  setText("hdWindowArea", Number.isFinite(env.window_area_m2)
    ? `${env.window_area_m2.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} m²`
    : "—");
  setText("hdWindowOrientation", env.window_orientation || "orientare neprecizată");
  setText("hdSolarG", Number.isFinite(env.solar_g_value) ? env.solar_g_value.toLocaleString("ro-RO", { maximumFractionDigits: 2 }) : "—");
  if (env.static_status === "calculated") {
    pill("hdEnvelopeStatus", "Qsol static disponibil", "ok");
    setText("hdEnvelopeLive", "De validat");
    setText("hdEnvelopeNote",
      `Ultimul calcul conține ${Math.round(env.annual_kwh).toLocaleString("ro-RO")} kWh/an câștig solar. Forecastul live rămâne separat până la contractul Qsky/Qsol complet.`);
  } else if (env.static_status === "blocked_missing_qsol_inputs") {
    pill("hdEnvelopeStatus", "Qsol blocat", "warn");
    setText("hdEnvelopeNote",
      "Motorul a semnalat SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED. Lipsa nu este tratată ca zero; afișăm radiația live separat.");
  } else {
    pill("hdEnvelopeStatus", "Qsol neconfirmat", "warn");
    setText("hdEnvelopeNote",
      "Home Lab are geometria și Hsol source-backed unde este disponibil, dar dashboard-ul nu inventează un aport termic live fără Qsky/Qsol și proprietățile complete ale elementelor.");
  }
}

function renderCurve(series, enabled) {
  const line = document.getElementById("hdPvLine");
  const area = document.getElementById("hdPvArea");
  if (!enabled || !Array.isArray(series)) {
    line.setAttribute("d", ""); area.setAttribute("d", ""); return;
  }
  const now = Date.now() - 10 * 60 * 1000;
  const rows = series.filter((point) => {
    const raw = String(point?.time || "");
    const ms = Date.parse(raw.endsWith("Z") ? raw : raw + "Z");
    return Number.isFinite(ms) && ms >= now;
  }).slice(0, 96);
  if (rows.length < 2) {
    line.setAttribute("d", ""); area.setAttribute("d", ""); return;
  }
  const powers = rows.map((row) => Math.max(0, Number(row.power_mw) || 0));
  const max = Math.max(...powers, 0.000001);
  const coords = powers.map((value, index) => [
    index / (powers.length - 1) * 900,
    168 - value / max * 150,
  ]);
  const d = coords.map(([x,y], index) => `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  line.setAttribute("d", d);
  area.setAttribute("d", `${d} L 900 168 L 0 168 Z`);
}

async function refreshForecast() {
  const model = currentModel;
  if (!model?.location?.ready) {
    pill("hdForecastStatus", "Lipsește localizarea", "warn");
    setText("hdRadiationNow", "—");
    renderCurve([], false);
    return;
  }
  const url = solarPowerForecastUrl(model);
  pill("hdForecastStatus", "Se actualizează");
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`SolarPowerAPI HTTP ${response.status}`);
    const data = await response.json();
    const current = data?.summary?.current || data?.forecast?.[data?.current_index ?? 0] || null;
    if (model.pv.forecast_ready) {
      setText("hdPvNow", mwToKw(current?.power_mw));
      setText("hdPvHour", mwToKw(data?.summary?.nextHour?.power_mw));
      setText("hdPvToday", mwhToKwh(data?.summary?.todayEnergyMwh));
    }
    setText("hdRadiationNow", radiation(current?.gti_wm2 ?? current?.ghi_wm2));
    setText("hdRadiationNote", Number.isFinite(Number(current?.gti_wm2)) ? "GTI pe planul selectat" : "GHI");
    renderCurve(data?.forecast || [], model.pv.forecast_ready);
    pill("hdForecastStatus", "Actualizat", "ok");
  } catch (error) {
    pill("hdForecastStatus", "Forecast indisponibil", "warn");
    if (model.pv.enabled) setText("hdPvNowNote", "Datele casei rămân salvate; forecastul va fi reîncercat la următorul ciclu.");
  }
}

async function loadProject(projectId) {
  currentProjectId = projectId;
  const loaded = await accountRequest("/api/projects/load", {
    method: "POST",
    body: { projectId },
  });
  let model = extractEditorialHomeDashboard(loaded.project);
  const locality = await resolveLocality(model).catch(() => null);
  model = extractEditorialHomeDashboard(loaded.project, locality);
  currentModel = model;
  renderStatic(model);
  showDashboard();
  await refreshForecast();
  window.clearInterval(timer);
  timer = window.setInterval(() => {
    if (document.visibilityState === "visible" && currentProjectId === projectId) refreshForecast();
  }, dashboardRefreshMs());
}

async function boot() {
  if (!token()) {
    showEmpty("Autentificare necesară", "Intră în cont din Home Lab și salvează casa. Dashboard-ul folosește proiectul salvat, nu o copie locală.");
    return;
  }
  try {
    const data = await accountRequest("/api/projects/list");
    const projects = Array.isArray(data.projects) ? data.projects : [];
    if (!projects.length) {
      showEmpty("Nu ai încă o casă salvată", "Finalizează Home Lab și salvează proiectul; apoi Casa mea devine dashboard-ul lui permanent.");
      return;
    }
    select.replaceChildren();
    for (const project of projects) {
      const option = document.createElement("option");
      option.value = String(project.project_id || "");
      option.textContent = String(project.project_name || "Casa mea");
      select.appendChild(option);
    }
    const requested = new URLSearchParams(location.search).get("project");
    const preferred = requested || currentSavedProject();
    if (preferred && projects.some((project) => String(project.project_id) === preferred)) select.value = preferred;
    select.addEventListener("change", () => loadProject(select.value));
    await loadProject(select.value);
  } catch (error) {
    if (Number(error?.status) === 401) {
      showEmpty("Sesiunea a expirat", "Autentifică-te din nou în Home Lab pentru a încărca proiectele.");
    } else {
      showEmpty("Dashboard indisponibil", error?.message || "Proiectele nu au putut fi încărcate.");
    }
  }
}

window.addEventListener("DOMContentLoaded", boot);
