(() => {
  const root = document.querySelector("[data-editorial-lab]");
  const form = document.getElementById("edForm");
  if (!root || !form) return;

  const pages = [...root.querySelectorAll("[data-page]")];
  const wizardOrder = ["intro", "house", "envelope", "systems", "goal"];
  const stepNames = {intro:"Start",house:"Casa",envelope:"Anvelopa",systems:"Instalații",goal:"Obiectiv",run:"Calcul",done:"Gata",report:"Raport",error:"Eroare"};
  const stepNumber = document.getElementById("edStepNumber");
  const stepName = document.getElementById("edStepName");
  const runLog = document.getElementById("runLog");
  const logDialog = document.getElementById("logDialog");
  const logDialogBody = document.getElementById("logDialogBody");
  const stageEls = Object.fromEntries([...document.querySelectorAll("[data-run-stage]")].map(el => [el.dataset.runStage, el]));
  const localityInput = document.getElementById("localityInput");
  const localityId = document.getElementById("localityId");
  const pvToggle = document.getElementById("pvToggle");
  const pvEnabled = document.getElementById("pvEnabled");
  const pvPowerField = document.getElementById("pvPowerField");
  const pvPower = pvPowerField.querySelector("input");
  const goalWrap = document.getElementById("goalValueWrap");
  const goalValue = document.getElementById("goalValue");
  const goalLabel = document.getElementById("goalValueLabel");
  const goalUnit = document.getElementById("goalValueUnit");

  let current = "intro";
  let baselineResult = null;
  let optimizationResult = null;
  let lastPlan = null;
  let branchResults = [];
  let logLines = [];

  const fmt = (value, digits = 0) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    return new Intl.NumberFormat("ro-RO", {maximumFractionDigits:digits, minimumFractionDigits:digits}).format(Number(value));
  };
  const money = value => value === null || value === undefined ? "—" : fmt(value, 0) + " lei";
  const energy = value => value === null || value === undefined ? "—" : fmt(value, 0) + " kWh/an";

  function showPage(name) {
    current = name;
    pages.forEach(page => page.classList.toggle("is-active", page.dataset.page === name));
    const wizardIndex = wizardOrder.indexOf(name);
    stepNumber.textContent = wizardIndex >= 0 ? String(wizardIndex + 1).padStart(2, "0") : (name === "run" ? "05" : name === "done" ? "06" : name === "report" ? "07" : "—");
    stepName.textContent = stepNames[name] || name;
    window.scrollTo({top:0, behavior:"instant"});
  }

  function validatePage(name) {
    const page = pages.find(p => p.dataset.page === name);
    if (!page) return true;
    const fields = [...page.querySelectorAll("input:not([type=hidden]),select")].filter(el => !el.disabled);
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  document.querySelectorAll("[data-next]").forEach(button => {
    button.addEventListener("click", () => {
      if (!validatePage(current)) return;
      const i = wizardOrder.indexOf(current);
      if (i >= 0 && i < wizardOrder.length - 1) showPage(wizardOrder[i + 1]);
    });
  });
  document.querySelectorAll("[data-back]").forEach(button => {
    button.addEventListener("click", () => {
      const i = wizardOrder.indexOf(current);
      if (i > 0) showPage(wizardOrder[i - 1]);
    });
  });

  document.querySelectorAll("[data-choice-group]").forEach(group => {
    const field = form.querySelector(`[name="${group.dataset.choiceGroup}"]`);
    group.querySelectorAll("button[data-value]").forEach(button => {
      button.addEventListener("click", () => {
        group.querySelectorAll("button").forEach(x => x.classList.remove("is-selected"));
        button.classList.add("is-selected");
        field.value = button.dataset.value;
        if (group.dataset.choiceGroup === "_optimization_mode") syncGoalField();
      });
    });
  });

  function syncGoalField() {
    const mode = form.elements["_optimization_mode"].value;
    goalValue.removeAttribute("name");
    goalWrap.hidden = mode === "auto_economic";
    if (mode === "investment_budget") {
      goalValue.name = "_investment_budget_lei";
      goalLabel.textContent = "Buget maxim";
      goalUnit.textContent = "lei";
      goalValue.step = "1000";
      goalValue.min = "1000";
      goalValue.value = goalValue.value || "50000";
    } else if (mode === "annual_bill_target") {
      goalValue.name = "_annual_bill_target_lei";
      goalLabel.textContent = "Factură anuală țintă";
      goalUnit.textContent = "lei/an";
      goalValue.step = "100";
      goalValue.min = "0";
      goalValue.value = goalValue.value || "3000";
    } else if (mode === "max_payback_years") {
      goalValue.name = "_max_payback_years";
      goalLabel.textContent = "Recuperare în maximum";
      goalUnit.textContent = "ani";
      goalValue.step = "0.5";
      goalValue.min = "0.5";
      goalValue.max = "50";
      goalValue.value = goalValue.value || "10";
    }
  }

  localityInput.addEventListener("input", () => { localityId.value = ""; });

  pvToggle.addEventListener("click", () => {
    const on = pvToggle.getAttribute("aria-pressed") !== "true";
    pvToggle.setAttribute("aria-pressed", String(on));
    pvToggle.querySelector("span").textContent = on ? "Da" : "Nu";
    pvEnabled.value = on ? "on" : "";
    pvPower.disabled = !on;
    pvPowerField.classList.toggle("is-muted", !on);
  });

  function log(message) {
    const now = new Date();
    const stamp = now.toLocaleTimeString("ro-RO", {hour:"2-digit", minute:"2-digit", second:"2-digit"});
    logLines.push(`[${stamp}] ${message}`);
    const row = document.createElement("div");
    row.innerHTML = `<time>${stamp}</time>${escapeHtml(message)}`;
    runLog.appendChild(row);
    runLog.scrollTop = runLog.scrollHeight;
  }

  function stage(name, status, text) {
    const el = stageEls[name];
    if (!el) return;
    el.classList.remove("is-active","is-done","is-error");
    if (status) el.classList.add("is-" + status);
    el.querySelector("b").textContent = text || (status === "done" ? "gata" : status === "active" ? "rulează" : status === "error" ? "eroare" : "în așteptare");
  }

  function resetRunUi() {
    logLines = [];
    runLog.innerHTML = "";
    Object.keys(stageEls).forEach(key => stage(key, "", "în așteptare"));
  }

  function baseFormData() {
    return new FormData(form);
  }

  function formObject() {
    const out = {};
    for (const [key, value] of baseFormData().entries()) out[key] = String(value);
    return out;
  }

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  async function postForm(url, data) {
    return readJson(await fetch(url, {method:"POST", body:data, headers:{"Accept":"application/json"}}));
  }
  async function postJson(url, data) {
    return readJson(await fetch(url, {
      method:"POST",
      body:JSON.stringify(data),
      headers:{"Content-Type":"application/json","Accept":"application/json"}
    }));
  }

  async function runAnalysis() {
    if (!validatePage("goal")) return;
    resetRunUi();
    baselineResult = null;
    optimizationResult = null;
    lastPlan = null;
    branchResults = [];
    showPage("run");

    try {
      stage("baseline","active","rulează");
      log("Construiesc modelul termic al casei actuale.");
      baselineResult = await postForm("/api/home-lab-next/calculate", baseFormData());
      stage("baseline","done","gata");
      log(`Baseline gata: ${fmt(baselineResult.final_energy_kwh)} kWh/an · necesar ${fmt(baselineResult.design_heat_load_kw,1)} kW.`);

      stage("plan","active","rulează");
      log("Generez shortlist-ul parametric și ramurile tehnice eligibile.");
      lastPlan = await postForm("/api/optimization/home-lab/v2/plan", baseFormData());
      stage("plan","done", `${lastPlan.shortlistSize || 0} configurații`);
      log(`Shortlist: ${lastPlan.shortlistSize || 0} configurații din ${lastPlan.representativePoolSize || 0} puncte reprezentative.`);

      const branchIds = lastPlan.runBranchIds || [];
      if (!branchIds.length) throw new Error("Optimizerul nu a returnat nicio ramură economică eligibilă.");

      stage("branches","active",`0 / ${branchIds.length}`);
      const formPayload = formObject();
      for (let i = 0; i < branchIds.length; i++) {
        const branchId = branchIds[i];
        const branchMeta = (lastPlan.branches || []).find(x => (x.branch_id || x.branchId) === branchId);
        const label = branchMeta?.label || branchId;
        log(`${i + 1}/${branchIds.length} · ${label}: evaluare parametrică.`);
        const result = await postJson("/api/optimization/home-lab/v2/branch", {
          form: formPayload,
          branchId,
          shortlist: lastPlan.shortlist
        });
        branchResults.push(result);
        stage("branches","active",`${i + 1} / ${branchIds.length}`);
        log(`   ${result.candidateCount || 0} candidați · ${result.fastEvaluations || 0} evaluări.`);
      }
      stage("branches","done",`${branchIds.length} / ${branchIds.length}`);

      stage("finalize","active","verifică");
      log("Verific finaliștii cu motorul complet și aplic discretizarea comercială disponibilă.");
      optimizationResult = await postJson("/api/optimization/home-lab/v2/finalize", {
        form: formPayload,
        branchResults,
        representativeEvaluations: lastPlan.representativeEvaluations || 0,
        representativePoolSize: lastPlan.representativePoolSize || 0,
        shortlistSize: lastPlan.shortlistSize || 0,
        priorCalculationTimeMs: Number(lastPlan.calculationTimeMs || 0)
      });
      stage("finalize","done","gata");
      const opt = optimizationResult.optimization || {};
      log(`Finalizat: ${opt.evaluatedCandidates || 0} candidați economici · ${opt.fullEngineVerifications || 0} verificări complete.`);

      renderReport();
      const doneBits = [];
      if (opt.evaluatedCandidates != null) doneBits.push(`${opt.evaluatedCandidates} candidați evaluați`);
      if (opt.fullEngineVerifications != null) doneBits.push(`${opt.fullEngineVerifications} verificări finale`);
      document.getElementById("doneMeta").textContent = doneBits.length ? doneBits.join(" · ") + "." : "Configurațiile au fost evaluate și rezultatul a fost verificat.";
      showPage("done");
    } catch (error) {
      Object.entries(stageEls).forEach(([name, el]) => {
        if (el.classList.contains("is-active")) stage(name,"error","eroare");
      });
      log("EROARE · " + (error?.message || String(error)));
      document.getElementById("errorText").textContent = error?.message || "A apărut o eroare neașteptată.";
      showPage("error");
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  }

  function metric(label, value) {
    return `<div class="ed-metric"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
  }

  function renderReport() {
    if (!baselineResult || !optimizationResult) return;
    const scenario = optimizationResult.scenario || {};
    const opt = optimizationResult.optimization || {};
    const commercial = opt.commercialEvaluation || {};
    const heating = opt.selectedHeating || null;
    const hp = opt.heatPumpPerformanceProfile || null;
    const measures = opt.selected || [];
    const baselineBill = baselineResult.annual_cost_lei;
    const finalBill = commercial.annualBillLei ?? scenario.annual_cost_lei;
    const locality = baselineResult.locality || localityInput.value;

    document.getElementById("reportIntro").textContent =
      `Analiza pornește de la locuința din ${locality} și compară intervențiile tehnice prin același motor energetic folosit pentru baseline și pentru verificarea finală.`;

    let html = `
      <section class="ed-report-section">
        <h2>Situația actuală</h2>
        <p>În configurația introdusă, modelul estimează consumul energetic și puterea termică necesară folosind clima locală și anvelopa selectată.</p>
        <div class="ed-metrics">
          ${metric("Energie finală", energy(baselineResult.final_energy_kwh))}
          ${metric("Cost anual estimat", money(baselineBill))}
          ${metric("Putere termică de calcul", baselineResult.design_heat_load_kw == null ? "—" : fmt(baselineResult.design_heat_load_kw,1) + " kW")}
          ${metric("Clasă energetică", baselineResult.energy_class || "—")}
        </div>
      </section>

      <section class="ed-report-section">
        <h2>Ce a găsit optimizerul</h2>
        <p>${escapeHtml(opt.rationale || "Soluția de mai jos este rezultatul selecției economice și al verificării finale.")}</p>
        <div class="ed-report-callout">
          <small>Investiție estimată</small><br>
          <strong>${money(opt.capexLei)}</strong>
        </div>
        <div class="ed-metrics">
          ${metric("Economii estimate", opt.annualSavingLei == null ? "—" : money(opt.annualSavingLei) + "/an")}
          ${metric("Cost după intervenții", money(finalBill))}
          ${metric("Recuperare", opt.paybackYears == null ? "—" : fmt(opt.paybackYears,1) + " ani")}
          ${metric("Putere finală necesară", commercial.designHeatLoadKw == null ? "—" : fmt(commercial.designHeatLoadKw,1) + " kW")}
        </div>
        <h3>Intervențiile selectate</h3>
        ${measures.length ? measures.map(row => `
          <div class="ed-measure">
            <div><b>${escapeHtml(row.label)}</b><br><span>${escapeHtml(row.note || (fmt(row.parameterValue,2) + " " + (row.parameterUnit || "")))}</span></div>
            <b>${money(row.capexLei)}</b>
          </div>`).join("") : "<p>Optimizerul nu a selectat intervenții cu CAPEX pozitiv.</p>"}
      </section>
    `;

    if (heating) {
      html += `
        <section class="ed-report-section">
          <h2>Dimensionarea încălzirii</h2>
          <p>Sistemul finalist este dimensionat față de necesarul termic de calcul al configurației rezultate, nu față de o putere nominală aleasă arbitrar.</p>
          <div class="ed-metrics">
            ${metric("Necesar termic", heating.requiredPowerKw == null ? "—" : fmt(heating.requiredPowerKw,2) + " kW")}
            ${metric("Echipament selectat", heating.ratedPowerKw == null ? (heating.label || "—") : fmt(heating.ratedPowerKw,2) + " kW")}
          </div>
          <p><b>${escapeHtml(heating.label || "Sistem de încălzire")}</b>${heating.oversizePercent == null ? "" : ` · supradimensionare ${fmt(heating.oversizePercent,1)}%`}.</p>
        </section>
      `;
    }

    if (hp) {
      html += `
        <section class="ed-report-section">
          <h2>Performanța pompei de căldură</h2>
          <p>${escapeHtml(hp.note || "")}</p>
          <div class="ed-metrics">
            ${metric("Tip performanță", hp.profile_kind === "cop_curve" ? "COP lunar + SCOP" : "SCOP sezonier")}
            ${metric("SCOP declarat", hp.declared_scop == null ? "—" : fmt(hp.declared_scop,2))}
            ${metric("SCOP modelat", hp.modeled_scop_from_monthly_cop == null ? "—" : fmt(hp.modeled_scop_from_monthly_cop,2))}
            ${metric("COP la +7 °C", hp.reference_cop_at_7c == null ? "—" : fmt(hp.reference_cop_at_7c,2))}
          </div>
          ${Array.isArray(hp.monthly) && hp.monthly.some(x => x.cop != null) ? `
            <h3>COP lunar raportat la sarcina casei</h3>
            ${hp.monthly.map(row => `<div class="ed-measure"><span>${escapeHtml(row.month)} · ${fmt(row.outdoor_temperature_c,1)} °C · ${fmt(row.useful_heating_kwh,0)} kWh utili</span><b>${row.cop == null ? "—" : "COP " + fmt(row.cop,2)}</b></div>`).join("")}
          ` : ""}
        </section>
      `;
    }

    if (scenario.annual_fuel_use && Object.keys(scenario.annual_fuel_use).length) {
      html += `
        <section class="ed-report-section">
          <h2>Combustibil anual</h2>
          <p>Necesarul fizic anual rezultat din configurația finală:</p>
          ${Object.entries(scenario.annual_fuel_use).map(([key,val]) => `<div class="ed-measure"><span>${escapeHtml(key.replaceAll("_"," "))}</span><b>${typeof val === "number" ? fmt(val,1) : escapeHtml(JSON.stringify(val))}</b></div>`).join("")}
        </section>
      `;
    }

    html += `
      <section class="ed-report-section">
        <h2>Cum a fost verificat rezultatul</h2>
        <p>Optimizerul a folosit un shortlist fizic, a evaluat separat ramurile de încălzire și a verificat finaliștii cu motorul energetic complet înainte de selecția comercială.</p>
        <div class="ed-metrics">
          ${metric("Candidați evaluați", fmt(opt.evaluatedCandidates || 0))}
          ${metric("Evaluări parametrice", fmt(opt.parametricEvaluations || 0))}
          ${metric("Verificări motor complet", fmt(opt.fullEngineVerifications || 0))}
          ${metric("Timp calcul server", opt.calculationTimeMs == null ? "—" : fmt(opt.calculationTimeMs / 1000,1) + " s")}
        </div>
      </section>

      <section class="ed-report-section">
        <h2>Metodologie și ipoteze</h2>
        <p><b>Metodologie:</b> ${escapeHtml(scenario.methodology_version || baselineResult.methodology_version || "—")}. ${escapeHtml(scenario.methodology_source || baselineResult.methodology_source || "")}</p>
        <p><b>Date de preț:</b> ${scenario.price_retrieved_on ? "referință " + escapeHtml(scenario.price_retrieved_on) : "conform surselor active ale motorului"}.</p>
        ${Array.isArray(scenario.assumptions) && scenario.assumptions.length ? `<h3>Ipoteze declarate de motor</h3><ul>${scenario.assumptions.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
        ${Array.isArray(opt.warnings) && opt.warnings.length ? `<h3>Limitări / avertismente</h3><ul>${opt.warnings.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
      </section>
    `;
    document.getElementById("reportBody").innerHTML = html;
  }

  document.getElementById("runAnalysis").addEventListener("click", runAnalysis);
  document.getElementById("openReport").addEventListener("click", () => showPage("report"));
  document.getElementById("reportBack").addEventListener("click", () => showPage("done"));
  document.getElementById("tryAgain").addEventListener("click", () => showPage("goal"));

  function openLog() {
    logDialogBody.textContent = logLines.join("\n");
    if (typeof logDialog.showModal === "function") logDialog.showModal();
    else logDialog.setAttribute("open","");
  }
  document.getElementById("showLog").addEventListener("click", openLog);
  document.getElementById("errorLog").addEventListener("click", openLog);
  document.getElementById("closeLog").addEventListener("click", () => logDialog.close());
  logDialog.addEventListener("click", event => { if (event.target === logDialog) logDialog.close(); });

  syncGoalField();
  showPage("intro");
})();
