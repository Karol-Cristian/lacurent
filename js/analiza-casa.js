document.addEventListener("DOMContentLoaded", async () => {
  const houseForm = document.getElementById("houseForm");
  const authRequired = document.getElementById("authRequired");
  const progressWrap = document.querySelector(".progress-wrap");
  const existingHomesPanel = document.getElementById("existingHomesPanel");
  const existingHomesList = document.getElementById("existingHomesList");
  const houseToolsPanel = document.getElementById("houseToolsPanel");
  const monthlyBillForm = document.getElementById("monthlyBillForm");
  const params = new URLSearchParams(window.location.search);
  const forceNewHome = params.get("new") === "1";
  const editHouseId = params.get("edit");

  if (!houseForm) return;

  async function hasValidSession() {
    if (!window.LaCurentAuth || !window.LaCurentAuth.token()) return false;
    try {
      const result = await window.LaCurentAuth.api("/api/me");
      if (result.user) {
        localStorage.setItem("lacurent_user", JSON.stringify(result.user));
        window.LaCurentSegments?.apply(result.user.role);
      }
      return true;
    } catch {
      window.LaCurentAuth.clearAuth();
      return false;
    }
  }

  function initAuthGate() {
    const loginForm = document.getElementById("analysisLoginForm");
    const registerForm = document.getElementById("analysisRegisterForm");
    const forgotForm = document.getElementById("analysisForgotForm");
    const forgotLink = document.getElementById("analysisForgotLink");

    function formData(form) {
      return Object.fromEntries(new FormData(form).entries());
    }

    function message(id, text, isError = false) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.classList.toggle("error", isError);
    }

    function setTab(tab) {
      document.querySelectorAll("[data-auth-tab]").forEach(button => {
        button.classList.toggle("active", button.dataset.authTab === tab);
      });
      loginForm?.classList.toggle("active", tab === "login");
      registerForm?.classList.toggle("active", tab === "register");
      forgotForm?.classList.remove("active");
    }

    document.querySelectorAll("[data-auth-tab]").forEach(button => {
      button.addEventListener("click", () => setTab(button.dataset.authTab));
    });

    loginForm?.addEventListener("submit", async event => {
      event.preventDefault();
      message("analysisLoginMessage", "Se autentifica...");
      try {
        const result = await window.LaCurentAuth.api("/api/login", formData(loginForm));
        window.LaCurentAuth.saveAuth(result);
        location.reload();
      } catch (error) {
        message("analysisLoginMessage", error.message, true);
      }
    });

    registerForm?.addEventListener("submit", async event => {
      event.preventDefault();
      message("analysisRegisterMessage", "Se creeaza contul...");
      try {
        const result = await window.LaCurentAuth.api("/api/register", formData(registerForm));
        window.LaCurentAuth.saveAuth(result);
        location.reload();
      } catch (error) {
        message("analysisRegisterMessage", error.message, true);
      }
    });

    forgotLink?.addEventListener("click", event => {
      event.preventDefault();
      loginForm?.classList.remove("active");
      registerForm?.classList.remove("active");
      forgotForm?.classList.add("active");
      document.querySelectorAll("[data-auth-tab]").forEach(button => button.classList.remove("active"));
    });

    forgotForm?.addEventListener("submit", async event => {
      event.preventDefault();
      message("analysisForgotMessage", "Se genereaza linkul...");
      document.getElementById("analysisResetLinkMessage").textContent = "";
      try {
        const result = await window.LaCurentAuth.api("/api/forgot-password", formData(forgotForm));
        message("analysisForgotMessage", result.message);
        if (result.reset_url) {
          document.getElementById("analysisResetLinkMessage").innerHTML =
            `Link temporar: <a href="${result.reset_url}">${result.reset_url}</a>`;
        }
      } catch (error) {
        message("analysisForgotMessage", error.message, true);
      }
    });
  }

  if (!(await hasValidSession())) {
    houseForm.hidden = true;
    if (progressWrap) progressWrap.hidden = true;
    if (authRequired) authRequired.hidden = false;
    initAuthGate();
    return;
  }

  const currentUser = window.LaCurentAuth.currentUser();
  const currentRole = window.LaCurentSegments?.normalize(currentUser?.role || "residential") || "residential";
  if (currentRole !== "residential") {
    window.location.href = currentRole === "auditor" ? "auditor-portal.html" : "profil.html";
    return;
  }

  const homes = await window.LaCurentHomes?.load?.() || [];
  if (editHouseId) {
    window.LaCurentHomes?.setActiveHouseId(editHouseId);
  }

  if (homes.length && !forceNewHome && !editHouseId) {
    houseForm.hidden = true;
    if (progressWrap) progressWrap.hidden = true;
    if (existingHomesPanel) existingHomesPanel.hidden = false;
    if (houseToolsPanel) houseToolsPanel.hidden = false;
    initMonthlyBillForm(window.LaCurentHomes?.activeHouseId?.() || homes[0]?.id);
    if (existingHomesList) renderHomes(homes);
    return;
  }

  function renderHomes(homesList) {
    existingHomesList.innerHTML = "";
    homesList.forEach(home => {
      const article = document.createElement("article");
      article.className = "recommendation-detail-card";
      article.innerHTML = `
        <div class="recommendation-rank">${home.overall_score ? Math.round(home.overall_score) : "--"}</div>
        <div>
          <h3>${home.display_name || home.city || `Locuinta #${home.id}`}</h3>
          <p>${home.city || "Localitate necompletata"} · ${home.surface || "--"} m2</p>
          <div class="recommendation-metrics">
            <span>Clasa: <strong>${home.estimated_energy_class || "--"}</strong></span>
            <span>Decizii implementate: <strong>${home.implemented_actions || 0}</strong></span>
            <button class="secondary-btn" type="button" data-home-id="${home.id}">Selecteaza</button>
            <a class="secondary-btn" href="analiza-casa.html?edit=${home.id}">Editeaza datele</a>
            <button class="secondary-btn danger-soft" type="button" data-archive-home-id="${home.id}">Nu mai administrez</button>
          </div>
        </div>
      `;
      existingHomesList.append(article);
    });

    existingHomesList.querySelectorAll("[data-home-id]").forEach(button => {
      button.addEventListener("click", () => {
        window.LaCurentHomes?.setActiveHouseId(button.dataset.homeId);
        window.location.href = "raport-v1.html";
      });
    });

    existingHomesList.querySelectorAll("[data-archive-home-id]").forEach(button => {
      button.addEventListener("click", async () => {
        const ok = confirm("Locuinta ramane in baza de date, dar nu mai apare in contul tau. Continui?");
        if (!ok) return;
        await window.LaCurentAuth.api("/api/archive-home", { house_id: button.dataset.archiveHomeId });
        if (window.LaCurentHomes?.activeHouseId?.() === button.dataset.archiveHomeId) {
          window.LaCurentHomes.setActiveHouseId("");
        }
        location.reload();
      });
    });
  }

  houseForm.hidden = false;
  if (progressWrap) progressWrap.hidden = false;
  if (authRequired) authRequired.hidden = true;

  const allSteps = [...document.querySelectorAll(".step")];
  let steps = [...allSteps];
  let current = 0;
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const finishBtn = document.getElementById("finishBtn");
  const simulateBtn = document.getElementById("simulateBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const progressBar = document.getElementById("progressBar");
  const stepText = document.getElementById("stepText");
  if (!allSteps.length || !nextBtn || !prevBtn || !finishBtn || !progressBar || !stepText) return;

  function initMonthlyBillForm(houseId) {
    if (!monthlyBillForm || !houseId) return;
    monthlyBillForm.elements.house_id.value = houseId;
    monthlyBillForm.addEventListener("submit", async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(monthlyBillForm).entries());
      const message = document.getElementById("monthlyBillMessage");
      try {
        const result = await window.LaCurentAuth.api("/api/monthly-bill", data);
        const delta = result.bill_analysis?.score_delta || 0;
        const deltaText = delta ? ` Impact estimat asupra scorului: ${delta > 0 ? "+" : ""}${delta} puncte.` : "";
        if (message) message.textContent = `Factura a fost adaugata.${deltaText}`;
        monthlyBillForm.reset();
        monthlyBillForm.elements.house_id.value = houseId;
        window.LaCurentHomes?.refresh();
      } catch (error) {
        if (message) {
          message.textContent = error.message;
          message.classList.add("error");
        }
      }
    }, { once: true });
  }

  function applyAnswersToForm(answers = {}) {
    Object.entries(answers).forEach(([key, value]) => {
      const controls = houseForm.querySelectorAll(`[name="${CSS.escape(key)}"]`);
      controls.forEach(control => {
        if (control.type === "checkbox") {
          control.checked = value === control.value || value === "yes";
        } else if (control.type !== "file") {
          control.value = value ?? "";
        }
      });
    });
    updateConditionalFields();
  }

  function setElementValue(name, value) {
    const element = houseForm.elements[name];
    if (element && value !== undefined && value !== null && value !== "") {
      element.value = value;
    }
  }

  async function loadEditProfile() {
    if (!editHouseId) return;
    const result = await window.LaCurentAuth.api("/api/house-profile", { house_id: editHouseId });
    applyAnswersToForm(result.answers || {});
    if (result.house) {
      setElementValue("display_name", result.house.display_name);
      setElementValue("city", result.house.city);
      setElementValue("useful_area_m2", result.answers?.useful_area_m2 || result.house.surface);
      setElementValue("construction_year", result.answers?.construction_year || result.house.year);
      setElementValue("building_type", result.answers?.building_type || result.house.house_type);
      setElementValue("analysis_purpose", result.house.analysis_purpose);
    }
    finishBtn.textContent = "Salveaza modificarile";
    cancelEditBtn.hidden = false;
  }

  function formatMoney(value) {
    return value ? `${Math.round(value).toLocaleString("ro-RO")} lei/an` : "--";
  }

  function renderSimulation(result) {
    const box = document.getElementById("simulationResult");
    if (!box) return;
    const comparison = result.comparison;
    const profile = result.profile;
    box.hidden = false;
    if (comparison) {
      document.getElementById("oldScore").textContent = `${comparison.oldScore}/100`;
      document.getElementById("newScore").textContent = `${comparison.newScore}/100`;
      document.getElementById("oldSavings").textContent = `${formatMoney(comparison.oldSavingsMinRon)} - ${formatMoney(comparison.oldSavingsMaxRon)}`;
      document.getElementById("newSavings").textContent = `${formatMoney(comparison.newSavingsMinRon)} - ${formatMoney(comparison.newSavingsMaxRon)}`;
      const sign = comparison.scoreDelta > 0 ? "+" : "";
      document.getElementById("simulationConclusion").textContent =
        `Diferenta simulata: ${sign}${comparison.scoreDelta} puncte. Modificarile nu sunt salvate pana nu apesi Salveaza modificarile.`;
    } else {
      document.getElementById("oldScore").textContent = "--";
      document.getElementById("newScore").textContent = `${profile.assessment.score}/100`;
      document.getElementById("oldSavings").textContent = "--";
      document.getElementById("newSavings").textContent = `${formatMoney(profile.assessment.estimatedAnnualSavingsMinRon)} - ${formatMoney(profile.assessment.estimatedAnnualSavingsMaxRon)}`;
      document.getElementById("simulationConclusion").textContent = "Simulare noua. Nu exista inca o versiune salvata pentru comparatie.";
    }
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function selected(name) {
    return houseForm.elements[name]?.value;
  }

  function checked(name) {
    return Boolean(houseForm.querySelector(`[name="${name}"]:checked`));
  }

  function setDisabled(selector, disabled, fallbackValue = "0") {
    houseForm.querySelectorAll(selector).forEach(input => {
      input.disabled = disabled;
      if (disabled) input.value = fallbackValue;
    });
  }

  function updateConditionalFields() {
    const buildingType = selected("building_type");
    const heatingSource = selected("heating_source");
    const heatingSystem = selected("heating_system_type");
    const isMixed = heatingSource === "mixed";
    const isStoveOnly = heatingSystem === "stove" && !isMixed;
    const isBoiler = ["wood_boiler", "pellet_boiler", "individual_boiler", "condensing_boiler"].includes(heatingSystem);

    document.getElementById("mixedHeatingDetails").hidden = !isMixed;
    document.getElementById("stoveDetails").hidden = !isStoveOnly;
    document.getElementById("boilerDetails").hidden = !isBoiler;
    document.querySelectorAll(".heating-control-field").forEach(field => {
      field.hidden = isStoveOnly;
      field.querySelectorAll("select,input").forEach(input => {
        input.disabled = isStoveOnly;
        if (isStoveOnly) input.value = "unknown";
      });
    });

    const isApartment = buildingType === "apartment";
    document.querySelectorAll(".photovoltaic-field").forEach(field => {
      field.hidden = isApartment;
      field.querySelectorAll("select,input").forEach(input => {
        input.disabled = isApartment || (input.name === "pv_capacity_kw" && selected("pv_installed") !== "yes");
        if (isApartment) input.value = input.name === "pv_capacity_kw" ? "0" : "no";
      });
    });

    const pvInstalled = !isApartment && selected("pv_installed") === "yes";
    setDisabled('[name="pv_capacity_kw"]', !pvInstalled, "0");

    const usesGas = heatingSource === "gas" || (isMixed && checked("heating_gas_enabled")) ||
      checked("dhw_source_gas") || selected("cooking_fuel") === "gas";
    const usesWood = heatingSource === "wood" || heatingSystem === "stove" || heatingSystem === "wood_boiler" ||
      (isMixed && checked("heating_wood_enabled")) || selected("cooking_fuel") === "wood";
    const usesPellets = heatingSource === "pellets" || heatingSystem === "pellet_boiler" ||
      (isMixed && checked("heating_pellets_enabled"));

    setDisabled(".gas-consumption-field input", !usesGas, "0");
    setDisabled(".wood-consumption-field input", !usesWood, "0");
    setDisabled(".pellets-consumption-field input", !usesPellets, "0");
  }

  function validateCurrentStep() {
    const currentInputs = steps[current].querySelectorAll("input,select,textarea");
    for (const input of currentInputs) {
      if (input.disabled || input.hidden || input.closest("[hidden]")) continue;
      if (input.hasAttribute("required") && !input.value.trim()) {
        alert(`Completeaza: ${input.previousElementSibling?.innerText || input.name || "Camp obligatoriu"}`);
        input.focus();
        return false;
      }
      if (input.type === "number" && input.value !== "" && isNaN(input.value)) {
        alert(`${input.previousElementSibling?.innerText || input.name} trebuie sa fie numar`);
        input.focus();
        return false;
      }
    }
    return true;
  }

  function updateProgress() {
    progressBar.style.width = `${((current + 1) / steps.length) * 100}%`;
    stepText.innerText = `Pas ${current + 1} din ${steps.length}`;
  }

  function updateButtons() {
    prevBtn.style.display = current === 0 ? "none" : "inline-flex";
    nextBtn.style.display = current === steps.length - 1 ? "none" : "inline-flex";
    finishBtn.style.display = current === steps.length - 1 ? "inline-flex" : "none";
    if (simulateBtn) simulateBtn.style.display = current === steps.length - 1 ? "inline-flex" : "none";
  }

  function showStep() {
    steps = allSteps.filter(step => !step.hidden);
    current = Math.min(current, steps.length - 1);
    allSteps.forEach(step => step.classList.remove("active"));
    steps[current].classList.add("active");
    updateProgress();
    updateButtons();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  nextBtn.addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    if (current < steps.length - 1) {
      current++;
      showStep();
    }
  });

  prevBtn.addEventListener("click", () => {
    if (current > 0) {
      current--;
      showStep();
    }
  });

  houseForm.addEventListener("change", updateConditionalFields);
  houseForm.addEventListener("input", updateConditionalFields);

  simulateBtn?.addEventListener("click", async () => {
    const data = collectFormData();
    try {
      const result = await window.LaCurentAuth.api("/api/simulate-house", data);
      renderSimulation(result);
    } catch (error) {
      alert(error.message || "Simularea nu a reusit.");
    }
  });

  cancelEditBtn?.addEventListener("click", () => {
    window.location.href = editHouseId ? "raport-v1.html" : "analiza-casa.html";
  });

  function collectFormData() {
    const data = {};
    for (const [key, entry] of new FormData(houseForm).entries()) {
      data[key] = entry instanceof File ? (entry.name || null) : entry;
    }
    if (editHouseId) data.house_id = editHouseId;
    if (selected("building_type") === "apartment") {
      data.pv_installed = "no";
      data.pv_capacity_kw = "0";
    }
    if (selected("pv_installed") !== "yes") data.pv_capacity_kw = "0";
    if (houseForm.querySelector('[name="monthly_gas_cost"]')?.disabled) data.monthly_gas_cost = "0";
    if (houseForm.querySelector('[name="annual_wood_cost"]')?.disabled) data.annual_wood_cost = "0";
    if (houseForm.querySelector('[name="annual_pellets_cost"]')?.disabled) data.annual_pellets_cost = "0";
    return data;
  }

  houseForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!validateCurrentStep()) return;

    const data = collectFormData();
    const endpoint = editHouseId ? "/api/update-house" : "/api/save-house";

    try {
      const response = await fetch(`https://lacurent.lemnarukarol.workers.dev${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("lacurent_auth_token")
            ? { Authorization: `Bearer ${localStorage.getItem("lacurent_auth_token")}` }
            : {})
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok && result.success) {
        window.LaCurentHomes?.setActiveHouseId(result.house_id);
        window.location.href = "raport-v1.html";
      } else {
        alert(result.error || "Eroare la salvare");
      }
    } catch {
      alert("Conexiune esuata");
    }
  });

  window.LaCurentSegments?.apply("residential");
  updateConditionalFields();
  await loadEditProfile();
  showStep();
});
