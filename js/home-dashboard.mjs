import {
  buildSolarPowerForecastUrl,
  dashboardRefreshMs,
  extractHomeDashboardModel,
} from './home-dashboard-contract.mjs';

const select = document.getElementById('projectSelect');
const content = document.getElementById('dashboardContent');
const empty = document.getElementById('dashboardEmpty');
let currentProjectId = null;
let refreshTimer = null;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatKw(mw) {
  const value = Number(mw);
  if (!Number.isFinite(value)) return '—';
  return `${(value * 1000).toLocaleString('ro-RO', { maximumFractionDigits: value < 0.01 ? 2 : 1 })} kW`;
}

function formatKwh(mwh) {
  const value = Number(mwh);
  if (!Number.isFinite(value)) return '—';
  return `${(value * 1000).toLocaleString('ro-RO', { maximumFractionDigits: 1 })} kWh`;
}

function formatRadiation(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString('ro-RO')} W/m²` : '—';
}

function status(id, label, kind = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = label;
  el.className = `home-status-pill${kind ? ` ${kind}` : ''}`;
}

function showEmpty(title, text, href = '/pages/profil.html', action = 'Mergi la cont') {
  content.hidden = true;
  empty.hidden = false;
  setText('emptyTitle', title);
  setText('emptyText', text);
  const link = document.getElementById('emptyAction');
  link.href = href;
  link.textContent = action;
}

function showDashboard() {
  empty.hidden = true;
  content.hidden = false;
}

function renderHouse(model) {
  setText('homeName', model.project_name);
  const loc = [model.location.locality, model.location.county].filter(Boolean).join(', ');
  setText('homeLocation', loc || (model.location.ready ? `${model.location.latitude.toFixed(3)}, ${model.location.longitude.toFixed(3)}` : 'Localizare incompletă'));
  document.getElementById('homeTwin').dataset.pv = String(model.pv.enabled);
  setText('homeTwinCaption', model.pv.enabled
    ? `Digital twin · PV ${model.pv.installed_kwp.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} kWp`
    : 'Digital twin al casei salvate');
  status('analysisStatus',
    model.analysis.available ? (model.analysis.fresh ? 'Analiză actuală' : 'Analiză de recalculat') : 'Fără calcul',
    model.analysis.available && model.analysis.fresh ? 'good' : 'warn');

  if (!model.pv.enabled) {
    setText('pvNow', 'Fără PV');
    setText('pvNextHour', '—');
    setText('pvToday', '—');
    setText('pvNowNote', 'Sistemul fotovoltaic nu este activat în proiect.');
  } else if (!model.pv.forecast_ready) {
    setText('pvNow', '—');
    setText('pvNextHour', '—');
    setText('pvToday', '—');
    setText('pvNowNote', 'Completează puterea instalată și localizarea.');
  } else {
    setText('pvNowNote', `${model.pv.installed_kwp.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} kWp instalați`);
  }

  if (model.solar_thermal.enabled) {
    status('solarThermalStatus', 'Sistem detectat', 'warn');
    setText('solarThermalNote', 'Sistemul este salvat; forecastul termic de 15 minute urmează să fie legat de iradiere și contractul colectorului.');
  } else {
    status('solarThermalStatus', 'Neconfigurat');
    setText('solarThermalNow', '—');
  }

  const envelope = model.envelope_solar;
  const windowLabel = envelope.window_area_m2 !== null
    ? `${envelope.window_area_m2.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} m²${envelope.window_orientation ? ` · ${envelope.window_orientation.toUpperCase()}` : ''}`
    : '—';
  setText('windowContext', windowLabel);
  if (envelope.annual_gain_kwh !== null) {
    setText('envelopeSolarAnnual', `${envelope.annual_gain_kwh.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} kWh/an`);
    status('envelopeSolarStatus', 'Calcul static disponibil', 'good');
    const message = document.getElementById('envelopeSolarMessage');
    message.hidden = false;
    message.textContent = 'Valoarea anuală provine din ultimul calcul fizic. Conversia forecastului solar în câștig termic la 15 minute rămâne separată până la validarea contractului Qsol.';
  } else if (envelope.status === 'blocked_missing_qsol_inputs') {
    setText('envelopeSolarAnnual', 'Blocat');
    status('envelopeSolarStatus', 'Qsol incomplet', 'warn');
    const message = document.getElementById('envelopeSolarMessage');
    message.hidden = false;
    message.textContent = 'Motorul are iradierea solară sursată, dar nu are încă toate intrările Qsky/Qsol și proprietățile elementelor necesare. Dashboard-ul nu transformă lipsa în zero.';
  } else {
    setText('envelopeSolarAnnual', '—');
    status('envelopeSolarStatus', model.analysis.available ? 'Nedisponibil' : 'Rulează analiza', 'warn');
    const message = document.getElementById('envelopeSolarMessage');
    message.hidden = false;
    message.textContent = model.analysis.available
      ? 'Ultimul rezultat nu conține un câștig solar al anvelopei valid pentru afișare.'
      : 'Rulează și salvează analiza casei pentru a lega rezultatul fizic de dashboard.';
  }
}

function renderChart(series, pvEnabled) {
  const line = document.getElementById('pvForecastLine');
  const area = document.getElementById('pvForecastArea');
  if (!pvEnabled) {
    line.setAttribute('d', '');
    area.setAttribute('d', '');
    return;
  }
  const now = Date.now() - 10 * 60 * 1000;
  const points = (series || [])
    .filter((p) => Date.parse(String(p.time).endsWith('Z') ? p.time : `${p.time}Z`) >= now)
    .slice(0, 96);
  if (points.length < 2) {
    line.setAttribute('d', '');
    area.setAttribute('d', '');
    return;
  }
  const powers = points.map((p) => Math.max(0, Number(p.power_mw) || 0));
  const max = Math.max(...powers, 0.000001);
  const coords = powers.map((value, i) => {
    const x = (i / (powers.length - 1)) * 900;
    const y = 160 - (value / max) * 145;
    return [x, y];
  });
  const linePath = coords.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L 900 160 L 0 160 Z`;
  line.setAttribute('d', linePath);
  area.setAttribute('d', areaPath);
}

async function loadSolarForecast(model) {
  if (!model.location.ready) {
    status('forecastStatus', 'Lipsește localizarea', 'warn');
    setText('irradianceNow', '—');
    renderChart([], false);
    return;
  }
  const url = buildSolarPowerForecastUrl(model, window.SOLARPOWER_API_BASE || 'https://api.solarpowerapi.com');
  status('forecastStatus', 'Se actualizează');
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), cache: 'no-store' });
    if (!response.ok) throw new Error(`SolarPowerAPI ${response.status}`);
    const forecast = await response.json();
    const current = forecast?.summary?.current || forecast?.forecast?.[forecast?.current_index ?? 0] || null;
    if (model.pv.forecast_ready) {
      setText('pvNow', formatKw(current?.power_mw));
      setText('pvNextHour', formatKw(forecast?.summary?.nextHour?.power_mw));
      setText('pvToday', formatKwh(forecast?.summary?.todayEnergyMwh));
    }
    setText('irradianceNow', formatRadiation(current?.gti_wm2 ?? current?.ghi_wm2));
    setText('irradianceNote', Number.isFinite(Number(current?.gti_wm2)) ? 'GTI pe planul de referință' : 'GHI');
    renderChart(forecast?.forecast || [], model.pv.forecast_ready);
    status('forecastStatus', 'Actualizat', 'good');
  } catch (error) {
    status('forecastStatus', 'Date indisponibile', 'warn');
    setText('pvNowNote', model.pv.enabled ? 'Forecastul nu a putut fi încărcat. Datele casei rămân neschimbate.' : 'Sistemul fotovoltaic nu este activat în proiect.');
  }
}

async function loadProject(projectId) {
  currentProjectId = projectId;
  const result = await window.LaCurentAuth.api('/api/projects/load', { projectId });
  const model = extractHomeDashboardModel(result.project);
  renderHouse(model);
  showDashboard();
  await loadSolarForecast(model);
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && currentProjectId === projectId) loadSolarForecast(model);
  }, dashboardRefreshMs());
}

async function boot() {
  if (!window.LaCurentAuth?.token()) {
    showEmpty('Autentificare necesară', 'Dashboard-ul aparține casei salvate. Autentifică-te pentru a încărca proiectele tale.');
    return;
  }
  try {
    const result = await window.LaCurentAuth.api('/api/projects/list');
    const projects = result.projects || [];
    if (!projects.length) {
      showEmpty('Nu ai încă o casă salvată', 'Completează analiza și salvează proiectul; apoi Casa mea devine dashboard-ul lui permanent.', '/pages/analiza-casa.html', 'Începe analiza');
      return;
    }
    select.innerHTML = projects.map((p) => `<option value="${p.project_id}">${String(p.project_name || 'Proiect LaCurent').replaceAll('<','&lt;').replaceAll('>','&gt;')}</option>`).join('');
    const requested = new URLSearchParams(location.search).get('project');
    if (requested && projects.some((p) => p.project_id === requested)) select.value = requested;
    select.addEventListener('change', () => loadProject(select.value));
    await loadProject(select.value);
  } catch (error) {
    showEmpty('Dashboard indisponibil', error.message || 'Proiectele nu au putut fi încărcate.');
  }
}

window.addEventListener('DOMContentLoaded', boot);
