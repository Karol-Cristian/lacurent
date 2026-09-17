(() => {
  const heating = document.getElementById("simHeating");
  const costValue = document.getElementById("simCostValue");
  const costDelta = document.getElementById("simCostDelta");
  const savingValue = document.getElementById("simSavingValue");
  const savingNote = document.querySelector('[data-sim="saving-note"]');
  if (!heating || !costValue || !costDelta || !savingValue) return;

  const ro = () => document.documentElement.lang !== "en";
  const unavailableHeating = new Set(["pellet_boiler", "district_heat"]);

  function messageFor(value) {
    if (value === "pellet_boiler") {
      return ro()
        ? "Preț național oficial unic indisponibil · introduceți un preț local când această opțiune va fi disponibilă"
        : "No single official national price · enter a local price when this option becomes available";
    }
    if (value === "district_heat") {
      return ro()
        ? "Tariful este local și trebuie preluat de la operatorul de termoficare"
        : "The tariff is local and must come from the district-heating operator";
    }
    return ro() ? "Cost incomplet" : "Incomplete cost";
  }

  function applyAvailabilityState() {
    const selected = heating.value;
    const partial = /parțial|partial|calculabil|priceable/i.test(costDelta.textContent || "");
    if (!unavailableHeating.has(selected) && !partial) return;

    // An unknown tariff is not zero. Do not allow the simulator to present a
    // partial/unknown cost as a saving against a fully priced baseline.
    costValue.textContent = ro() ? "Preț indisponibil" : "Price unavailable";
    costDelta.textContent = messageFor(selected);
    costDelta.className = "";
    savingValue.textContent = "—";
    savingValue.className = "";
    if (savingNote) {
      savingNote.textContent = ro()
        ? "comparația în lei este indisponibilă fără un preț complet"
        : "cost comparison is unavailable without a complete price";
    }
  }

  const observer = new MutationObserver(() => queueMicrotask(applyAvailabilityState));
  observer.observe(costDelta, { childList: true, characterData: true, subtree: true });
  observer.observe(costValue, { childList: true, characterData: true, subtree: true });

  heating.addEventListener("change", () => setTimeout(applyAvailabilityState, 0));
  document.querySelectorAll("[data-site-language]").forEach((button) => {
    button.addEventListener("click", () => setTimeout(applyAvailabilityState, 0));
  });

  applyAvailabilityState();
})();
