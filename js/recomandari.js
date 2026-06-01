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
            <button class="${implemented ? "primary-btn" : "secondary-btn"}" type="button" data-recommendation-id="${item.id}">${implemented ? "Implementata" : "Marcheaza implementata"}</button>
          </div>
        </div>
      `;
      list.append(article);
    });

    list.querySelectorAll("[data-recommendation-id]").forEach(button => {
      button.addEventListener("click", () => {
        toggleRecommendation(result.house_id, button.dataset.recommendationId, button.textContent === "Implementata");
      });
    });
  } catch {
    empty.hidden = false;
  }
});
