(() => {
  const heating = document.getElementById("simHeating");
  const status = document.getElementById("scenarioStatus");
  const costValue = document.getElementById("simCostValue");
  const costDelta = document.getElementById("simCostDelta");
  const savingValue = document.getElementById("simSavingValue");
  const savingNote = document.querySelector('[data-sim="saving-note"]');
  if (!heating || !status || !costValue || !costDelta || !savingValue) return;

  const ro = () => document.documentElement.lang !== "en";

  function applyDistrictHeatState() {
    if (heating.value !== "district_heat") return;
    costValue.textContent = ro() ? "Preț local necesar" : "Local tariff required";
    costDelta.textContent = ro()
      ? "Tariful de termoficare depinde de localitate și operator"
      : "District-heating tariff depends on the location and operator";
    costDelta.className = "";
    savingValue.textContent = "—";
    savingValue.className = "";
    if (savingNote) {
      savingNote.textContent = ro()
        ? "comparația în lei este indisponibilă fără tariful local"
        : "cost comparison is unavailable without the local tariff";
    }
  }

  // Observe only the simulator status. We never mutate this node, so this
  // cannot recurse. When the asynchronous calculation finishes, the status
  // changes and the local-tariff state is re-applied if needed.
  const observer = new MutationObserver(applyDistrictHeatState);
  observer.observe(status, { childList: true, characterData: true, subtree: true });

  heating.addEventListener("change", () => setTimeout(applyDistrictHeatState, 0));
  document.querySelectorAll("[data-site-language]").forEach((button) => {
    button.addEventListener("click", () => setTimeout(applyDistrictHeatState, 0));
  });
})();
