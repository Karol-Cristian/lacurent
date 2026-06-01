document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const isDemo = params.get("demo") === "1";
  const endpoint = isDemo ? "/api/demo-energy-report" : "/api/energy-report";

  function text(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function money(value) {
    return value ? `${Math.round(value).toLocaleString("ro-RO")} lei` : "--";
  }

  function label(value) {
    return {
      low: "scazut",
      medium: "mediu",
      high: "ridicat",
      critical: "critic",
      urgent: "urgent",
      very_high: "foarte ridicat"
    }[value] || value || "--";
  }

  function payback(recommendation) {
    if (!recommendation.paybackYearsMin) return "Se estimeaza dupa costul real";
    return `${Math.round(recommendation.paybackYearsMin * 12)}-${Math.round(recommendation.paybackYearsMax * 12)} luni`;
  }

  function renderProblems(problems) {
    const list = document.getElementById("problemsList");
    list.innerHTML = "";
    (problems || []).slice(0, 3).forEach((problem, index) => {
      const article = document.createElement("article");
      article.className = "recommendation-detail-card";
      article.innerHTML = `
        <div class="recommendation-rank">#${index + 1}</div>
        <div>
          <h3>${problem.title}</h3>
          <p>${problem.explanation}</p>
          <div class="recommendation-metrics">
            <span>Severitate: <strong>${label(problem.severity)}</strong></span>
            <span>Impact: <strong>${label(problem.impact)}</strong></span>
          </div>
        </div>
      `;
      list.append(article);
    });
  }

  function renderRecommendations(recommendations, houseId, implementedIds = []) {
    const list = document.getElementById("recommendationsList");
    list.innerHTML = "";
    (recommendations || []).slice(0, 3).forEach((recommendation, index) => {
      const implemented = implementedIds.includes(recommendation.id);
      const article = document.createElement("article");
      article.className = "recommendation-detail-card";
      article.innerHTML = `
        <div class="recommendation-rank">#${index + 1}</div>
        <div>
          <h3>${recommendation.title}</h3>
          <p>${recommendation.userFacingExplanation}</p>
          <div class="recommendation-metrics">
            <span>Impact: <strong>${label(recommendation.impactLevel)}</strong></span>
            <span>Cost: <strong>${label(recommendation.costLevel)}</strong></span>
            <span>Economie: <strong>${money(recommendation.estimatedSavingsRonYearMin)} - ${money(recommendation.estimatedSavingsRonYearMax)}/an</strong></span>
            <span>Recuperare: <strong>${payback(recommendation)}</strong></span>
            ${isDemo ? "" : `<button class="${implemented ? "primary-btn" : "secondary-btn"}" type="button" data-recommendation-id="${recommendation.id}">${implemented ? "Implementata" : "Marcheaza implementata"}</button>`}
          </div>
        </div>
      `;
      list.append(article);
    });

    list.querySelectorAll("[data-recommendation-id]").forEach(button => {
      button.addEventListener("click", async () => {
        const isImplemented = button.textContent === "Implementata";
        await window.LaCurentAuth.api("/api/recommendation-action", {
          house_id: houseId || window.LaCurentHomes?.activeHouseId?.(),
          recommendation_id: button.dataset.recommendationId,
          status: isImplemented ? "planned" : "implemented"
        });
        window.location.reload();
      });
    });
  }

  function renderSavingsHistory(history = []) {
    const list = document.getElementById("savingsHistoryList");
    if (!list) return;
    list.innerHTML = "";
    if (!history.length) {
      list.innerHTML = `
        <article class="recommendation-detail-card">
          <div class="recommendation-rank">0</div>
          <div>
            <h3>Nu ai marcat inca decizii implementate.</h3>
            <p>Pe masura ce implementezi recomandari, aici vezi istoricul economiilor estimate si impactul asupra scorului.</p>
          </div>
        </article>
      `;
      return;
    }
    history.forEach((item, index) => {
      const article = document.createElement("article");
      article.className = "recommendation-detail-card";
      article.innerHTML = `
        <div class="recommendation-rank">#${index + 1}</div>
        <div>
          <h3>${item.title}</h3>
          <p>Implementata${item.implemented_at ? ` la ${new Date(item.implemented_at).toLocaleDateString("ro-RO")}` : ""}. Economie estimata: ${money(item.estimatedSavingsRonYearMin)} - ${money(item.estimatedSavingsRonYearMax)}/an.</p>
        </div>
      `;
      list.append(article);
    });
  }

  try {
    const result = await window.LaCurentAuth.api(endpoint, {
      house_id: window.LaCurentHomes?.activeHouseId?.()
    });

    if (!result.has_report) {
      document.getElementById("reportEmpty").hidden = false;
      return;
    }

    const profile = result.profile;
    const assessment = profile.assessment;
    const demand = profile.derived.demand;
    const emissions = profile.derived.emissions;

    document.getElementById("reportContent").hidden = false;
    text("reportScore", assessment.score);
    text("reportClass", `Clasa interna LaCurent: ${assessment.estimatedEnergyClass}`);
    text("mainConclusion", assessment.mainConclusion);
    text("shortExplanation", assessment.shortExplanation);
    text("annualCost", money(assessment.estimatedAnnualCostRon));
    text("monthlyCost", money((assessment.estimatedAnnualCostRon || 0) / 12));
    text(
      "savingsPotential",
      assessment.estimatedAnnualSavingsMinRon
        ? `${money(assessment.estimatedAnnualSavingsMinRon)} - ${money(assessment.estimatedAnnualSavingsMaxRon)}/an`
        : "--"
    );
    text(
      "liveScoreExplanation",
      `Scorul ${assessment.score}/100 combina datele locuintei tale cu benchmark-ul pentru locuinte similare. Este un indice live: poate creste cand implementezi recomandari si se poate recalibra pe masura ce apar mai multe locuinte comparabile.`
    );
    renderProblems(assessment.topProblems);
    renderRecommendations(profile.recommendations, result.house_id, result.implemented_recommendations || []);
    renderSavingsHistory(result.savings_history || []);
    text("confidenceTitle", `Incredere ${label(assessment.confidence.level)} (${assessment.confidence.score}/100)`);
    text("confidenceReasons", assessment.confidence.reasons.join(" "));
    text(
      "missingData",
      assessment.confidence.missingData.length
        ? `Pentru precizie mai buna, completeaza: ${assessment.confidence.missingData.join(", ")}.`
        : "Datele principale sunt complete pentru o estimare orientativa."
    );
    text("energyIntensity", `${demand.estimatedFinalEnergyKwhM2Year || "--"} kWh/m2/an`);
    text("heatingDemand", `${demand.heatingDemandKwhYear || "--"} kWh/an`);
    text("dhwDemand", `${demand.dhwDemandKwhYear || "--"} kWh/an`);
    text("co2Estimate", `${emissions.estimatedCo2KgYear || "--"} kg CO2/an`);
    text("technicalAssumptions", demand.assumptions.join(" "));
  } catch {
    document.getElementById("reportEmpty").hidden = false;
  }
});
