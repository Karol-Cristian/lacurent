document.addEventListener("DOMContentLoaded", async () => {
  const loginPanel = document.getElementById("adminLoginPanel");
  const content = document.getElementById("adminContent");
  const loginForm = document.getElementById("adminLoginForm");
  const loginMessage = document.getElementById("adminLoginMessage");
  let adminData = null;
  let activeTable = "joined_houses";
  let filteredRows = [];

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "--";
  }

  function showLogin(message = "") {
    loginPanel.hidden = false;
    content.hidden = true;
    if (loginMessage) {
      loginMessage.textContent = message;
      loginMessage.classList.toggle("error", Boolean(message));
    }
  }

  function money(value) {
    return Number(value || 0).toLocaleString("ro-RO");
  }

  function barChart(id, rows = []) {
    const root = document.getElementById(id);
    if (!root) return;
    const max = Math.max(1, ...rows.map(row => row.count));
    root.innerHTML = rows.length ? "" : "<p class='form-message'>Nu exista date.</p>";
    rows.forEach(row => {
      const item = document.createElement("div");
      item.className = "admin-bar-row";
      item.innerHTML = `
        <span title="${row.label}">${row.label}</span>
        <div class="admin-bar-track"><div style="width:${Math.max(8, (row.count / max) * 100)}%"></div></div>
        <strong>${row.count}</strong>
      `;
      root.append(item);
    });
  }

  function renderOverview(result) {
    setText("metricUsers", result.metrics.users);
    setText("metricHouses", result.metrics.houses);
    setText("metricAnalyses", result.metrics.analyses);
    setText("metricScore", result.metrics.scoreAverage || "--");
    setText("metricBills", result.metrics.bills);
    setText("metricPendingOffers", result.metrics.pendingOffers);
    barChart("classChart", result.distributions.classes);
    barChart("heatingChart", result.distributions.heatingSources);
    barChart("buildingChart", result.distributions.buildingTypes);
    barChart("purposeChart", result.distributions.analysisPurpose);
    renderOverviewTable(result.houses);
  }

  async function moderateOffer(offerId, status) {
    await window.LaCurentAuth.api("/api/admin/provider-offer-action", {
      offer_id: offerId,
      status
    });
    await loadDataset();
  }

  function renderOffersModeration() {
    const root = document.getElementById("adminOffersList");
    if (!root) return;
    const offers = adminData?.datasets?.provider_offers || [];
    root.innerHTML = offers.length ? "" : "<p class='form-message'>Nu exista oferte.</p>";
    offers.forEach(offer => {
      const article = document.createElement("article");
      article.className = "recommendation-detail-card provider-card";
      article.innerHTML = `
        <div class="recommendation-rank">${offer.status || "--"}</div>
        <div>
          <h3>${offer.company_name || "Furnizor"} · ${offer.recommendation_id || "--"}</h3>
          <p>Locuinta #${offer.house_id}. Tip: ${offer.provider_type || "--"}. Zona: ${offer.service_area || "--"}.</p>
          <div class="recommendation-metrics">
            <span>Preoferta: <strong>${offer.offer_amount_ron ? `${money(offer.offer_amount_ron)} lei` : "fara suma"}</strong></span>
            <span>Mesaj: <strong>${offer.message || "--"}</strong></span>
            <span>Creat: <strong>${offer.created_at || "--"}</strong></span>
          </div>
          <div class="provider-admin-actions">
            <button class="secondary-btn" type="button" data-offer-action="approved" data-offer-id="${offer.id}">Aproba</button>
            <button class="secondary-btn danger-soft" type="button" data-offer-action="rejected" data-offer-id="${offer.id}">Respinge</button>
            <button class="secondary-btn" type="button" data-offer-action="submitted" data-offer-id="${offer.id}">Reanalizeaza</button>
          </div>
        </div>
      `;
      root.append(article);
    });

    root.querySelectorAll("[data-offer-action]").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Se salveaza...";
        await moderateOffer(button.dataset.offerId, button.dataset.offerAction);
      });
    });
  }

  function renderOverviewTable(houses = []) {
    const tbody = document.getElementById("housesTableBody");
    tbody.innerHTML = "";
    houses.forEach(house => {
      const answers = house.answers || {};
      const monthlyCost = Number(answers.monthly_electricity_cost || 0) + Number(answers.monthly_gas_cost || 0);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${house.id}</td>
        <td>${house.user_email || "--"}</td>
        <td>${house.display_name || "--"}</td>
        <td>${house.city || "--"}</td>
        <td>${house.surface || "--"}</td>
        <td>${house.year || "--"}</td>
        <td>${house.overall_score ? Math.round(house.overall_score) : "--"}</td>
        <td>${house.estimated_energy_class || "--"}</td>
        <td>${answers.heating_source || "--"} / ${answers.heating_system_type || "--"}</td>
        <td>${answers.wall_insulation || "--"}</td>
        <td>${answers.pv_installed || "--"}</td>
        <td>${monthlyCost ? `${money(monthlyCost)} lei` : "--"}</td>
        <td><a class="secondary-btn compact-btn" href="raport-v1.html?admin_house_id=${house.id}">Raport</a></td>
      `;
      tbody.append(row);
    });
  }

  function setAdminTab(tab) {
    document.querySelectorAll("[data-admin-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.adminTab === tab);
    });
    document.querySelectorAll("[data-admin-panel]").forEach(panel => {
      panel.hidden = panel.dataset.adminPanel !== tab;
    });
  }

  function columnsFor(rows) {
    const columns = new Set();
    rows.forEach(row => Object.keys(row || {}).forEach(key => columns.add(key)));
    return [...columns];
  }

  function cell(value) {
    if (value === null || value === undefined || value === "") return "--";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function visibleRows() {
    const rows = adminData?.datasets?.[activeTable] || [];
    const search = document.getElementById("adminSearchInput")?.value?.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter(row => JSON.stringify(row).toLowerCase().includes(search));
  }

  function renderDatasetTable() {
    filteredRows = visibleRows();
    const columns = columnsFor(filteredRows).slice(0, 40);
    const head = document.getElementById("datasetTableHead");
    const body = document.getElementById("datasetTableBody");
    head.innerHTML = `<tr>${columns.map(column => `<th>${column}</th>`).join("")}</tr>`;
    body.innerHTML = "";
    filteredRows.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.dataset.rowIndex = String(index);
      tr.innerHTML = columns.map(column => `<td>${cell(row[column])}</td>`).join("");
      tr.addEventListener("click", () => {
        document.getElementById("rowInspector").textContent = JSON.stringify(row, null, 2);
      });
      body.append(tr);
    });
    renderFieldProfile();
  }

  function populateDatasetControls() {
    const tableSelect = document.getElementById("adminTableSelect");
    const profileSelect = document.getElementById("profileTableSelect");
    const options = (adminData?.tables || []).map(table => `<option value="${table}">${table}</option>`).join("");
    tableSelect.innerHTML = options;
    profileSelect.innerHTML = options;
    tableSelect.value = activeTable;
    profileSelect.value = activeTable;
    document.getElementById("datasetNotes").textContent = (adminData?.notes || []).join(" ");
  }

  function renderFieldProfile() {
    const table = document.getElementById("profileTableSelect")?.value || activeTable;
    const rows = adminData?.datasets?.[table] || [];
    const columns = columnsFor(rows);
    const root = document.getElementById("fieldProfileList");
    root.innerHTML = "";
    columns.forEach(column => {
      const present = rows.filter(row => row[column] !== null && row[column] !== undefined && row[column] !== "").length;
      const unique = new Set(rows.map(row => row[column]).filter(value => value !== null && value !== undefined && value !== "")).size;
      const completion = rows.length ? Math.round((present / rows.length) * 100) : 0;
      const item = document.createElement("div");
      item.className = "admin-profile-row";
      item.innerHTML = `
        <strong>${column}</strong>
        <span>${completion}% complet</span>
        <span>${unique} valori unice</span>
      `;
      root.append(item);
    });
  }

  function renderAnalysisTools() {
    barChart("answerKeysList", adminData?.answerKeys || []);
    const scores = (adminData?.datasets?.scores || []).map(row => Number(row.overall_score)).filter(Number.isFinite);
    const buckets = [
      { label: "0-39", count: scores.filter(score => score < 40).length },
      { label: "40-59", count: scores.filter(score => score >= 40 && score < 60).length },
      { label: "60-79", count: scores.filter(score => score >= 60 && score < 80).length },
      { label: "80-100", count: scores.filter(score => score >= 80).length }
    ];
    barChart("scoreBucketsChart", buckets);
    renderFieldProfile();
  }

  function csvEscape(value) {
    const text = cell(value);
    return `"${text.replaceAll('"', '""')}"`;
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const rows = filteredRows.length ? filteredRows : visibleRows();
    const columns = columnsFor(rows);
    const csv = [
      columns.join(","),
      ...rows.map(row => columns.map(column => csvEscape(row[column])).join(","))
    ].join("\n");
    download(`${activeTable}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportJson() {
    download(`${activeTable}.json`, JSON.stringify(visibleRows(), null, 2), "application/json");
  }

  async function loadDataset() {
    const limit = Number(document.getElementById("adminLimitInput")?.value || 500);
    adminData = await window.LaCurentAuth.api("/api/admin/dataset", { limit });
    populateDatasetControls();
    renderDatasetTable();
    renderAnalysisTools();
    renderOffersModeration();
  }

  async function loadAdmin() {
    const result = await window.LaCurentAuth.api("/api/admin/overview");
    loginPanel.hidden = true;
    content.hidden = false;
    renderOverview(result);
    await loadDataset();
  }

  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", () => setAdminTab(button.dataset.adminTab));
  });

  document.getElementById("adminTableSelect")?.addEventListener("change", event => {
    activeTable = event.target.value;
    document.getElementById("profileTableSelect").value = activeTable;
    renderDatasetTable();
  });

  document.getElementById("profileTableSelect")?.addEventListener("change", renderFieldProfile);
  document.getElementById("adminSearchInput")?.addEventListener("input", renderDatasetTable);
  document.getElementById("reloadDatasetBtn")?.addEventListener("click", loadDataset);
  document.getElementById("exportCsvBtn")?.addEventListener("click", exportCsv);
  document.getElementById("exportJsonBtn")?.addEventListener("click", exportJson);

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    loginMessage.textContent = "Se autentifica...";
    loginMessage.classList.remove("error");
    try {
      const credentials = Object.fromEntries(new FormData(loginForm).entries());
      const result = await window.LaCurentAuth.api("/api/login", credentials);
      window.LaCurentAuth.saveAuth(result);
      await loadAdmin();
    } catch (error) {
      showLogin(error.message);
    }
  });

  try {
    const me = await window.LaCurentAuth.api("/api/me");
    if (me.user?.role !== "admin") {
      showLogin("Contul curent nu are rol admin.");
      return;
    }
    await loadAdmin();
  } catch {
    showLogin();
  }
});
