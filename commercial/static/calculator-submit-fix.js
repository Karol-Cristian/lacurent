(() => {
  function isEnglish() { return document.documentElement.lang === "en"; }
  function showError(message) {
    const form = document.getElementById("calculationForm");
    if (!form) return;
    let banner = document.getElementById("calculatorSubmitError");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "calculatorSubmitError";
      banner.className = "error-banner";
      banner.setAttribute("role", "alert");
      form.prepend(banner);
    }
    banner.textContent = message;
    banner.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function init() {
    const form = document.getElementById("calculationForm");
    if (!form) return;
    form.noValidate = true;
    let submitted = false;
    const button = form.querySelector('button[type="submit"]');
    const locality = document.getElementById("localitySearch");
    const localityId = document.getElementById("localityId");

    locality?.addEventListener("input", () => {
      if (localityId) { localityId.value = ""; localityId.setAttribute("value", ""); }
    });

    const reset = () => {
      submitted = false;
      if (!button) return;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = isEnglish() ? "Calculate performance" : "Calculează performanța";
    };

    form.addEventListener("submit", event => {
      if (submitted) { event.preventDefault(); return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!locality?.value?.trim()) {
        showError(isEnglish() ? "Choose a location before calculating." : "Alege localitatea înainte de calcul.");
        locality?.focus();
        return;
      }
      submitted = true;
      if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.textContent = isEnglish() ? "Calculating..." : "Se calculează...";
      }
      try {
        HTMLFormElement.prototype.submit.call(form);
      } catch (error) {
        reset();
        showError(isEnglish() ? "The calculation could not be started. Please try again." : "Calculul nu a putut fi pornit. Încearcă din nou.");
        console.error(error);
      }
    }, true);

    window.addEventListener("pageshow", reset);
    window.addEventListener("lacurent:languagechange", () => { if (!submitted) reset(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
})();