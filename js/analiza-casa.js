document.addEventListener("DOMContentLoaded", async () => {
  const houseForm = document.getElementById("houseForm");
  const authRequired = document.getElementById("authRequired");
  const progressWrap = document.querySelector(".progress-wrap");
  const existingHomesPanel = document.getElementById("existingHomesPanel");
  const params = new URLSearchParams(window.location.search);
  const editHouseId = params.get("edit");

  if (!houseForm) return;

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function showMessage(id, text, isError = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("error", isError);
  }

  function initAuthGate() {
    const loginForm = document.getElementById("analysisLoginForm");
    const registerForm = document.getElementById("analysisRegisterForm");
    const forgotForm = document.getElementById("analysisForgotForm");
    const forgotLink = document.getElementById("analysisForgotLink");

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
      showMessage("analysisLoginMessage", "Se autentifica...");
      try {
        const result = await window.LaCurentAuth.api("/api/login", formObject(loginForm));
        window.LaCurentAuth.saveAuth(result);
        location.reload();
      } catch (error) {
        showMessage("analysisLoginMessage", error.message, true);
      }
    });

    registerForm?.addEventListener("submit", async event => {
      event.preventDefault();
      showMessage("analysisRegisterMessage", "Se creeaza contul...");
      try {
        const result = await window.LaCurentAuth.api("/api/register", formObject(registerForm));
        window.LaCurentAuth.saveAuth(result);
        location.reload();
      } catch (error) {
        showMessage("analysisRegisterMessage", error.message, true);
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
      showMessage("analysisForgotMessage", "Se genereaza linkul...");
      document.getElementById("analysisResetLinkMessage").textContent = "";
      try {
        const result = await window.LaCurentAuth.api("/api/forgot-password", formObject(forgotForm));
        showMessage("analysisForgotMessage", result.message);
        if (result.reset_url) {
          document.getElementById("analysisResetLinkMessage").innerHTML =
            `Link temporar: <a href="${result.reset_url}">${result.reset_url}</a>`;
        }
      } catch (error) {
        showMessage("analysisForgotMessage", error.message, true);
      }
    });
  }

  async function hasValidSession() {
    if (!window.LaCurentAuth || !window.LaCurentAuth.token()) return false;
    try {
      const result = await window.LaCurentAuth.api("/api/me");
      if (result.user) {
        localStorage.setItem("lacurent_user", JSON.stringify(result.user));
      }
      return true;
    } catch {
      window.LaCurentAuth.clearAuth();
      return false;
    }
  }

  const authenticated = await hasValidSession();
  if (!authenticated) {
    if (authRequired) authRequired.hidden = false;
    initAuthGate();
  } else if (authRequired) {
    authRequired.hidden = true;
  }

  async function loadEditProfile() {
    if (!editHouseId || !window.LaCurentAuth?.token()) return;
    try {
      const result = await window.LaCurentAuth.api("/api/house-profile", { house_id: editHouseId });
      const answers = result.answers || {};
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
      if (result.house) {
        setElementValue("display_name", result.house.display_name);
        setElementValue("city", result.house.city);
        setElementValue("useful_area_m2", answers.useful_area_m2 || result.house.surface);
        setElementValue("construction_year", answers.construction_year || result.house.year);
        setElementValue("building_type", answers.building_type || result.house.house_type);
      }
    } catch {
      if (existingHomesPanel) {
        existingHomesPanel.hidden = false;
        existingHomesPanel.querySelector("p").textContent =
          "Modelul salvat nu poate fi incarcat automat in fluxul tehnic curent. Porneste un model nou sau demo.";
      }
    }
  }

  function setElementValue(name, value) {
    const element = houseForm.elements[name];
    if (element && value !== undefined && value !== null && value !== "") {
      element.value = value;
    }
  }

  houseForm.hidden = false;
  if (progressWrap) progressWrap.hidden = false;

  const allSteps = [...document.querySelectorAll(".step")];
  let steps = [...allSteps];
  let current = 0;
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const finishBtn = document.getElementById("finishBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const progressBar = document.getElementById("progressBar");
  const stepText = document.getElementById("stepText");

  if (!allSteps.length || !nextBtn || !prevBtn || !finishBtn || !progressBar || !stepText) return;

  function selected(name) {
    return houseForm.elements[name]?.value;
  }

  function updateDerivedUiState() {
    houseForm.dataset.roofBoundary = selected("roof_type") || "unknown";
    houseForm.dataset.floorBoundary = selected("floor_type") || "unknown";
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
      if (input.type === "number" && input.value !== "" && Number.isNaN(Number(input.value))) {
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
    document.querySelectorAll("[data-step-target]").forEach(button => {
      button.classList.toggle("active", Number(button.dataset.stepTarget) === current);
    });
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

  function openDemoTechnicalReportIfReady() {
    if (houseForm.dataset.demoMode !== "1" || current !== steps.length - 1) return;
    window.LaCurentBuildingPlatformWizard?.generateBuildingPlatformTechnicalReport?.(document, {
      openReport: true,
      scrollToReport: true
    });
  }

  nextBtn.addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    if (current < steps.length - 1) {
      current++;
      showStep();
      openDemoTechnicalReportIfReady();
    }
  });

  prevBtn.addEventListener("click", () => {
    if (current > 0) {
      current--;
      showStep();
    }
  });

  document.querySelectorAll("[data-step-target]").forEach(button => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.stepTarget);
      if (!Number.isInteger(target) || target < 0 || target >= steps.length) return;
      current = target;
      showStep();
      openDemoTechnicalReportIfReady();
    });
  });

  cancelEditBtn?.addEventListener("click", () => {
    window.location.href = "analiza-casa.html";
  });

  houseForm.addEventListener("change", updateDerivedUiState);
  houseForm.addEventListener("input", updateDerivedUiState);

  houseForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    const result = window.LaCurentBuildingPlatformWizard?.generateBuildingPlatformTechnicalReport?.(document, {
      openReport: true,
      scrollToReport: true
    });
    if (!result?.generated) {
      alert("Raportul tehnic nu a putut fi generat. Verifica datele Building DNA.");
    }
  });

  updateDerivedUiState();
  await loadEditProfile();
  showStep();
});
