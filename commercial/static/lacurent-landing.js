(() => {
  const root = document.querySelector("[data-lacurent-landing]");
  if (!root) return;

  const $ = selector => document.querySelector(selector);
  const homes = $("#lcImpactHomes");
  const energy = $("#lcImpactEnergy");
  const money = $("#lcImpactMoney");
  const capex = $("#lcImpactCapex");
  const payback = $("#lcImpactPayback");
  const status = $("#lcImpactStatus");
  if (!homes || !energy || !money || !capex || !payback || !status) return;

  function number(value, digits = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric)
      ? numeric.toLocaleString("ro-RO", {maximumFractionDigits:digits})
      : "—";
  }

  function unavailable(message) {
    homes.textContent = "—";
    energy.textContent = "—";
    money.textContent = "—";
    capex.textContent = "—";
    payback.textContent = "—";
    status.textContent = message;
  }

  function render(summary) {
    if (!summary?.available) {
      unavailable("Impactul agregat va apărea când baza de analize salvate este disponibilă.");
      return;
    }

    homes.textContent = number(summary.savedHouses, 0);

    if (summary.suppressed) {
      energy.textContent = "—";
      money.textContent = "—";
      capex.textContent = "—";
      payback.textContent = "—";
      status.textContent = `Primele ${number(summary.minimumCohortSize || 10, 0)} case construiesc baza. Totalurile apar după atingerea pragului minim de cohort.`;
      return;
    }

    energy.textContent = number(Number(summary.potentialSavingKwhYear || 0) / 1000, 1);
    money.textContent = number(summary.potentialSavingLeiYear, 0);
    capex.textContent = number(summary.estimatedCapexLei, 0);
    payback.textContent = summary.globalSimplePaybackYears == null
      ? "—"
      : number(summary.globalSimplePaybackYears, 1);
    status.textContent = "Potențial tehnico-economic agregat din ultima analiză salvată pentru fiecare casă.";
  }

  fetch("/api/home-lab/impact/summary", {
    headers:{"Accept":"application/json"},
    cache:"no-store",
  })
    .then(response => response.json())
    .then(render)
    .catch(() => unavailable("Impactul agregat nu este disponibil momentan."));
})();
