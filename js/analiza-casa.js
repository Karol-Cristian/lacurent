document.addEventListener("DOMContentLoaded", async () => {
  const houseForm = document.getElementById("houseForm");
  const authRequired = document.getElementById("authRequired");
  const progressWrap = document.querySelector(".progress-wrap");

  if (!houseForm) {
    return;
  }

  async function hasValidSession() {
    if (!window.LaCurentAuth || !window.LaCurentAuth.token()) {
      return false;
    }

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
      message("analysisLoginMessage", "Se autentifică...");
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
      message("analysisRegisterMessage", "Se creează contul...");
      try {
        const result = await window.LaCurentAuth.api("/api/register", formData(registerForm));
        window.LaCurentAuth.saveAuth(result);
        location.reload();
      } catch (error) {
        message("analysisRegisterMessage", error.message, true);
      }
    });

    if (forgotLink && forgotForm) {
      forgotLink.addEventListener("click", event => {
        event.preventDefault();
        loginForm?.classList.remove("active");
        registerForm?.classList.remove("active");
        forgotForm.classList.add("active");
        document.querySelectorAll("[data-auth-tab]").forEach(button => {
          button.classList.remove("active");
        });
      });

      forgotForm.addEventListener("submit", async event => {
        event.preventDefault();
        message("analysisForgotMessage", "Se generează linkul...");
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
  const userType = houseForm.elements.user_type;

  if (!allSteps.length || !nextBtn || !prevBtn || !finishBtn || !progressBar || !stepText) {
    return;
  }

  if (userType && currentRole !== "auditor") {
    userType.value = currentRole;
  }

  function selectedValue(name) {
    return houseForm.elements[name]?.value || "";
  }

  function updateConditionalFields() {
    const selectedType = selectedValue("user_type");
    const houseType = selectedValue("house_type");
    const isApartment = houseType === "Apartament";
    const isResidential = selectedType === "residential";

    document.querySelectorAll(".residential-flow").forEach(el => {
      el.hidden = !isResidential;
    });

    document.querySelectorAll(".business-flow").forEach(el => {
      el.hidden = selectedType !== "business";
    });

    document.querySelectorAll(".industry-flow").forEach(el => {
      el.hidden = selectedType !== "industry";
    });

    document.querySelectorAll(".institution-flow").forEach(el => {
      el.hidden = selectedType !== "institution";
    });

    document.querySelectorAll(".apartment-only").forEach(el => {
      el.hidden = !isResidential || !isApartment;
    });

    document.querySelectorAll(".house-only").forEach(el => {
      el.hidden = !isResidential || isApartment;
    });

    steps = allSteps.filter(step => !step.hidden);
    if (current >= steps.length) {
      current = steps.length - 1;
    }
  }

  function validateCurrentStep() {
    const currentInputs = steps[current].querySelectorAll("input,select,textarea");

    for (const input of currentInputs) {
      if (input.hidden || input.closest("[hidden]")) {
        continue;
      }

      if (input.hasAttribute("required") && !input.value.trim()) {
        alert(`Completează: ${input.previousElementSibling?.innerText || input.name || "Câmp obligatoriu"}`);
        input.focus();
        return false;
      }

      if (input.type === "number" && input.value !== "" && isNaN(input.value)) {
        alert(`${input.previousElementSibling?.innerText || input.name} trebuie să fie număr`);
        input.focus();
        return false;
      }
    }

    return true;
  }

  function updateProgress() {
    const progress = ((current + 1) / steps.length) * 100;
    progressBar.style.width = `${progress}%`;
    stepText.innerText = `Pas ${current + 1} din ${steps.length}`;
  }

  function updateButtons() {
    prevBtn.style.display = current === 0 ? "none" : "inline-flex";
    nextBtn.style.display = current === steps.length - 1 ? "none" : "inline-flex";
    finishBtn.style.display = current === steps.length - 1 ? "inline-flex" : "none";
  }

  function showStep() {
    updateConditionalFields();
    allSteps.forEach(step => step.classList.remove("active"));
    steps[current].classList.add("active");
    updateProgress();
    updateButtons();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  houseForm.addEventListener("change", event => {
    if (event.target.name === "user_type" || event.target.name === "house_type") {
      window.LaCurentSegments?.apply(event.target.name === "user_type" ? event.target.value : selectedValue("user_type"));
      showStep();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (!validateCurrentStep()) {
      return;
    }
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

  houseForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    const formData = new FormData(houseForm);
    const data = {};

    for (const [key, entry] of formData.entries()) {
      data[key] = entry instanceof File ? (entry.name || null) : entry;
    }

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
        alert("Analiză salvată cu succes.");
      } else {
        alert(result.error || "Eroare la salvare");
      }
    } catch {
      alert("Conexiune eșuată");
    }
  });

  window.LaCurentSegments?.apply(selectedValue("user_type"));
  showStep();
});
