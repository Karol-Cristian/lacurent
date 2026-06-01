document.addEventListener("DOMContentLoaded", async () => {
  const empty = document.getElementById("recommendationsEmpty");
  const content = document.getElementById("recommendationsContent");
  const list = document.getElementById("recommendationsList");

  function money(value) {
    return value ? `${Math.round(value).toLocaleString("ro-RO")} lei` : "--";
  }

  function label(value) {
    return {
      low: "scazut",
      medium: "mediu",
      high: "ridicat",
      very_high: "foarte ridicat",
      urgent: "urgent"
    }[value] || value || "--";
  }

  function payback(item) {
    if (!item.paybackYearsMin) return "Se estimeaza dupa costul real";
    const minMonths = Math.round(item.paybackYearsMin * 12);
    const maxMonths = Math.round(item.paybackYearsMax * 12);
    return `${minMonths}-${maxMonths} luni`;
  }

  function carrierLabel(value) {
    return {
      electricity: "curent",
      gas: "gaz",
      wood: "lemn",
      pellets: "peleti",
      other: "alte surse"
    }[value] || "--";
  }

  function readingLabel(value, isRegularization) {
    if (isRegularization || value === "regularization") return "regularizare";
    if (value === "estimated") return "estimata";
    return "reala";
  }

  function renderBillingAnalysis(analysis = {}) {
    const months = analysis.monthly || [];
    const maxCost = Math.max(...months.map(row => Number(row.normalized_cost_ron) || 0), 1);
    document.getElementById("billMonthsCount").textContent = analysis.months_count ? `${analysis.months_count}/12` : "0/12";
    document.getElementById("billNormalizedAverage").textContent = money(analysis.normalized_monthly_average_ron);
    document.getElementById("billScoreImpact").textContent =
      analysis.score_delta ? `${analysis.score_delta > 0 ? "+" : ""}${analysis.score_delta} pct` : "0 pct";
    document.getElementById("billDominantCarrier").textContent = carrierLabel(analysis.dominant_carrier);

    const chart = document.getElementById("billingCurveChart");
    chart.innerHTML = months.length
      ? months.map(row => {
        const height = Math.max(8, Math.round(((Number(row.normalized_cost_ron) || 0) / maxCost) * 100));
        return `
          <div class="billing-bar-wrap">
            <div class="billing-bar ${row.is_regularization || row.reading_type !== "actual" ? "soft" : ""}" style="height:${height}%"></div>
            <span>${String(row.billing_month || "").slice(5) || "--"}</span>
          </div>
        `;
      }).join("")
      : `<p class="muted-text">Adauga facturile lunare pentru a vedea curba de cost normalizata.</p>`;

    document.getElementById("billingConclusions").innerHTML = (analysis.conclusions || []).length
      ? analysis.conclusions.slice(0, 4).map(item => `<p>${item}</p>`).join("")
      : `<p>Inca nu exista suficiente facturi pentru concluzii specifice.</p>`;

    document.getElementById("billingHistoryList").innerHTML = months.length
      ? months.slice().reverse().map(row => `
        <article>
          <strong>${row.billing_month}</strong>
          <span>${money(row.total_cost_ron)} total</span>
          <span>${money(row.normalized_cost_ron)} normalizat</span>
          <span>${readingLabel(row.reading_type, row.is_regularization)}</span>
        </article>
      `).join("")
      : "";
  }

  async function toggleRecommendation(houseId, recommendationId, implemented) {
    await window.LaCurentAuth.api("/api/recommendation-action", {
      house_id: houseId,
      recommendation_id: recommendationId,
      status: implemented ? "planned" : "implemented"
    });
    location.reload();
  }

  try {
    const activeHouseId = window.LaCurentHomes?.activeHouseId?.();
    const result = await window.LaCurentAuth.api("/api/recommendations", { house_id: activeHouseId });
    if (!result.has_report) {
      empty.hidden = false;
      return;
    }

    const profile = result.profile;
    const implementedIds = result.implemented_recommendations || [];
    content.hidden = false;
    document.getElementById("potentialSavings").textContent =
      profile.assessment.estimatedAnnualSavingsMinRon
        ? `${money(profile.assessment.estimatedAnnualSavingsMinRon)} - ${money(profile.assessment.estimatedAnnualSavingsMaxRon)}/an`
        : "--";
    document.getElementById("priorityCount").textContent = Math.min(profile.recommendations.length, 3);
    document.getElementById("implementedCount").textContent = implementedIds.length;
    renderBillingAnalysis(result.bill_analysis || {});

    list.innerHTML = "";
    profile.recommendations.slice(0, 6).forEach((item, index) => {
      const implemented = implementedIds.includes(item.id);
      const article = document.createElement("article");
      article.className = `recommendation-detail-card ${index === 0 ? "high" : ""}`;
      article.innerHTML = `
        <div class="recommendation-rank">#${index + 1}</div>
        <div>
          <h3>${item.title}</h3>
          <p>${item.userFacingExplanation}</p>
          <div class="recommendation-metrics">
            <span>Economie: <strong>${money(item.estimatedSavingsRonYearMin)} - ${money(item.estimatedSavingsRonYearMax)}/an</strong></span>
            <span>Recuperare: <strong>${payback(item)}</strong></span>
            <span>Prioritate: <strong>${label(item.priority)}</strong></span>
            <button class="${implemented ? "secondary-btn danger-soft" : "secondary-btn"}" type="button" data-recommendation-id="${item.id}" data-implemented="${implemented ? "true" : "false"}">${implemented ? "Anuleaza implementarea" : "Marcheaza implementata"}</button>
          </div>
        </div>
      `;
      list.append(article);
    });

    list.querySelectorAll("[data-recommendation-id]").forEach(button => {
      button.addEventListener("click", () => {
        const implemented = button.dataset.implemented === "true";
        button.disabled = true;
        button.textContent = implemented ? "Se anuleaza..." : "Se salveaza...";
        toggleRecommendation(result.house_id, button.dataset.recommendationId, implemented);
      });
    });
  } catch {
    empty.hidden = false;
  }
});
