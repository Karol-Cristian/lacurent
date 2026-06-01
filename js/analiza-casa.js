document.addEventListener("DOMContentLoaded", async () => {
  const houseForm = document.getElementById("houseForm");
  const authRequired = document.getElementById("authRequired");
  const progressWrap = document.querySelector(".progress-wrap");
  const existingHomesPanel = document.getElementById("existingHomesPanel");
  const existingHomesList = document.getElementById("existingHomesList");
  const forceNewHome = new URLSearchParams(window.location.search).get("new") === "1";

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
  if (homes.length && !forceNewHome) {
    houseForm.hidden = true;
    if (progressWrap) progressWrap.hidden = true;
    if (existingHomesPanel) existingHomesPanel.hidden = false;
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
            <button class="secondary-btn danger-soft" type="button" data-archive-home-id="${home.id}">Nu mai administrez</button>
          </div>
        </div>
      `;
      existingHomesList.append(article);
    });

    existingHomesList.querySelectorAll("[data-home-id]").forEach(button => {
      button.addEventListener("click", () => {
        window.LaCurentHomes?.setActiveHouseId(button.dataset.homeId);
        window.location.href = "raport-energie.html";
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
  const progressBar = document.getElementById("progressBar");
  const stepText = document.getElementById("stepText");
  if (!allSteps.length || !nextBtn || !prevBtn || !finishBtn || !progressBar || !stepText) return;

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

    const pvInstalled = selected("pv_installed") === "yes";
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

  houseForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!validateCurrentStep()) return;

    const data = {};
    for (const [key, entry] of new FormData(houseForm).entries()) {
      data[key] = entry instanceof File ? (entry.name || null) : entry;
    }
    if (selected("pv_installed") !== "yes") data.pv_capacity_kw = "0";
    if (houseForm.querySelector('[name="monthly_gas_cost"]')?.disabled) data.monthly_gas_cost = "0";
    if (houseForm.querySelector('[name="annual_wood_cost"]')?.disabled) data.annual_wood_cost = "0";
    if (houseForm.querySelector('[name="annual_pellets_cost"]')?.disabled) data.annual_pellets_cost = "0";

    try {
      const response = await fetch("https://lacurent.lemnarukarol.workers.dev/api/save-house", {
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
        window.location.href = "raport-energie.html";
      } else {
        alert(result.error || "Eroare la salvare");
      }
    } catch {
      alert("Conexiune esuata");
    }
  });

  window.LaCurentSegments?.apply("residential");
  updateConditionalFields();
  showStep();
});
