function safeText(value) {
  return String(value ?? "")
    .replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
}

function formatNumber(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "--";
}

function projectStatusLabel(project) {
  const status = project.calculation_status || project.climate_status || "requires_confirmation";
  const labels = {
    calculated: "Calculat",
    calculated_with_overrides: "Calculat cu override-uri",
    estimated: "Estimativ",
    requires_confirmation: "Necesita confirmari",
    synthetic_demo: "Demo sintetic",
    verified_input_ready: "Date verificate"
  };
  return labels[status] || status;
}

function renderProjectRows(projects = []) {
  return projects.map(project => `
    <tr>
      <td>
        <strong>${safeText(project.project_name)}</strong>
        <small>${safeText(project.building_type || "cladire")} - ${safeText(project.useful_area_m2 ? `${formatNumber(project.useful_area_m2, 0)} m2` : "arie nespecificata")}</small>
      </td>
      <td>${safeText(project.locality || "--")}</td>
      <td>
        <span>${safeText(project.climate_profile_id || "profil neprecizat")}</span>
        <small>${safeText(project.climate_profile_version || project.climate_status || "--")}</small>
      </td>
      <td>${safeText(projectStatusLabel(project))}</td>
      <td>${formatNumber(project.annualQHnd)} kWh</td>
      <td>${formatNumber(project.annualQCnd)} kWh</td>
      <td>${safeText(project.version_count)} versiuni</td>
      <td>
        <a class="secondary-btn compact-action" href="pages/analiza-casa.html?analysis_id=${encodeURIComponent(project.latest_analysis_id)}">Deschide</a>
      </td>
    </tr>
  `).join("");
}

function renderProjects(panel, projects = []) {
  if (!projects.length) {
    panel.innerHTML = `
      <div class="section-heading">
        <span class="small-label">PROIECTELE MELE</span>
        <h2>Nu exista inca proiecte termice salvate.</h2>
      </div>
      <p>Creeaza primul proiect pentru a salva Building DNA, calculul Chapter 2 si raportul tehnic.</p>
      <div class="hero-buttons">
        <a class="primary-btn" href="pages/analiza-casa.html">Creeaza proiect termic</a>
        <a class="secondary-btn" href="pages/analiza-casa.html?demo=1">Deschide demo</a>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="section-heading">
      <span class="small-label">PROIECTELE MELE</span>
      <h2>Deschide proiectele Building DNA salvate.</h2>
    </div>
    <p>Lista foloseste analiza Chapter 2 curenta pentru fiecare proiect. Deschiderea restaureaza Building DNA, rezultatele si raportul tehnic salvat.</p>
    <div class="technical-table-wrap my-projects-table-wrap">
      <table class="technical-table my-projects-table">
        <thead>
          <tr>
            <th>Proiect</th>
            <th>Localitate</th>
            <th>Profil climatic</th>
            <th>Status</th>
            <th>QHnd anual</th>
            <th>QCnd anual</th>
            <th>Istoric</th>
            <th>Actiune</th>
          </tr>
        </thead>
        <tbody>${renderProjectRows(projects)}</tbody>
      </table>
    </div>
    <div class="hero-buttons">
      <a class="primary-btn" href="pages/analiza-casa.html">Creeaza proiect nou</a>
      <a class="secondary-btn" href="pages/analiza-casa.html?demo=1">Demo Building DNA</a>
    </div>
  `;
}

async function loadMyProjects() {
  const panel = document.getElementById("myProjectsPanel");
  if (!panel) return;

  const auth = window.LaCurentAuth;
  if (!auth?.token?.()) {
    panel.innerHTML = `
      <div class="section-heading">
        <span class="small-label">PROIECTELE MELE</span>
        <h2>Autentifica-te pentru proiectele salvate.</h2>
      </div>
      <p>Poti explora calculatorul fara cont, dar salvarea si redeschiderea proiectelor necesita autentificare.</p>
      <div class="hero-buttons">
        <a class="primary-btn" href="pages/profil.html?mode=login">Autentificare</a>
        <a class="secondary-btn" href="pages/analiza-casa.html">Creeaza proiect nesalvat</a>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="section-heading">
      <span class="small-label">PROIECTELE MELE</span>
      <h2>Se incarca proiectele salvate...</h2>
    </div>
  `;

  try {
    const response = await auth.api("/api/building-platform/chapter2/list");
    renderProjects(panel, response.projects || []);
  } catch (error) {
    panel.innerHTML = `
      <div class="section-heading">
        <span class="small-label">PROIECTELE MELE</span>
        <h2>Proiectele nu pot fi incarcate.</h2>
      </div>
      <p class="form-message error">${safeText(error.message)}</p>
      <div class="hero-buttons">
        <a class="primary-btn" href="pages/analiza-casa.html">Deschide calculatorul</a>
      </div>
    `;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", loadMyProjects);
}

export {
  formatNumber,
  loadMyProjects,
  projectStatusLabel,
  renderProjectRows,
  renderProjects
};
