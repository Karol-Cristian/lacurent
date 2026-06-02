document.addEventListener("DOMContentLoaded", async () => {
  const empty = document.getElementById("algorithmsEmpty");
  const content = document.getElementById("algorithmsContent");
  const list = document.getElementById("algorithmInsightsList");

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
      very_high: "foarte ridicat",
      urgent: "urgent"
    }[value] || value || "--";
  }

  function payback(item) {
    if (!item.estimatedPaybackYearsMin) return "Se estimeaza dupa costul real";
    return `${Math.round(item.estimatedPaybackYearsMin)}-${Math.round(item.estimatedPaybackYearsMax)} ani`;
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

  function relativeTime(value) {
    const date = value ? new Date(value) : new Date();
    const hours = Math.max(0, Math.round((Date.now() - date.getTime()) / 3600000));
    if (hours < 1) return "Actualizat acum cateva minute";
    if (hours === 1) return "Actualizat acum 1 ora";
    return `Actualizat acum ${hours} ore`;
  }

  function renderBillingAnalysis(analysis = {}) {
    const months = analysis.monthly || [];
    const maxCost = Math.max(...months.map(row => Number(row.normalized_cost_ron) || 0), 1);
    text("billMonthsCount", analysis.months_count ? `${analysis.months_count}/12` : "0/12");
    text("billNormalizedAverage", money(analysis.normalized_monthly_average_ron));
    text("billScoreImpact", analysis.score_delta ? `${analysis.score_delta > 0 ? "+" : ""}${analysis.score_delta} pct` : "0 pct");
    text("billDominantCarrier", carrierLabel(analysis.dominant_carrier));

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
      : `<p>Estimari partiale. Adauga facturi pentru rezultate mai precise.</p>`;
  }

  async function toggleRecommendation(houseId, recommendationId, implemented) {
    await window.LaCurentAuth.api("/api/recommendation-action", {
      house_id: houseId,
      recommendation_id: recommendationId,
      status: implemented ? "planned" : "implemented"
    });
    location.reload();
  }

  function renderInsights(insights = [], implementedIds = [], houseId = null) {
    list.innerHTML = "";
    if (!insights.length) {
      list.innerHTML = `
        <article class="algorithm-insight-card">
          <div>
            <span class="live-badge">partial</span>
            <h3>Avem nevoie de mai multe date pentru recomandari dinamice.</h3>
            <p>Adauga facturi sau revizuieste caracteristicile locuintei pentru estimari mai clare.</p>
          </div>
        </article>
      `;
      return;
    }

    insights.forEach((item, index) => {
      const implemented = implementedIds.includes(item.id);
      const basedOn = item.basedOn || {};
      const article = document.createElement("article");
      article.className = `algorithm-insight-card ${index === 0 ? "priority" : ""}`;
      article.innerHTML = `
        <div class="algorithm-card-header">
          <span class="live-badge">${label(item.priority)}</span>
          <strong>#${index + 1}</strong>
        </div>
        <h3>${item.title}</h3>
        <p>${item.explanation}</p>
        <div class="algorithm-metric-grid">
          <article><span>Impact scor</span><strong>${item.estimatedScoreImpact ? `+${item.estimatedScoreImpact} pct` : "--"}</strong></article>
          <article><span>Economie</span><strong>${money(item.estimatedSavingsRonYearMin)} - ${money(item.estimatedSavingsRonYearMax)}/an</strong></article>
          <article><span>Cost estimativ</span><strong>${money(item.estimatedCostRonMin)} - ${money(item.estimatedCostRonMax)}</strong></article>
          <article><span>Recuperare</span><strong>${payback(item)}</strong></article>
          <article><span>Incredere</span><strong>${item.confidencePercent}%</strong></article>
          <article><span>Oferte analizate</span><strong>${basedOn.offersCount || 0}</strong></article>
        </div>
        <div class="algorithm-source-line">
          Bazat pe ${basedOn.similarHomesCount || 0} locuinte similare, ${basedOn.comparableProjectsCount || 0} proiecte comparabile, ${basedOn.materialPriceSourcesCount || 0} surse materiale si ${basedOn.laborPriceSourcesCount || 0} surse manopera.
        </div>
        <div class="algorithm-why">
          <strong>Ce se schimba daca faci asta?</strong>
          <span>Scor estimat dupa implementare: ${item.estimatedScoreAfter || "--"}/100. Cost anual redus cu aproximativ ${money(item.estimatedSavingsRonYearMin)}/an.</span>
        </div>
        <button class="${implemented ? "secondary-btn danger-soft" : "secondary-btn"}" type="button" data-recommendation-id="${item.id}" data-implemented="${implemented ? "true" : "false"}">
          ${implemented ? "Anuleaza implementarea" : (item.nextActionLabel || "Marcheaza implementata")}
        </button>
      `;
      list.append(article);
    });

    list.querySelectorAll("[data-recommendation-id]").forEach(button => {
      button.addEventListener("click", () => {
        const implemented = button.dataset.implemented === "true";
        button.disabled = true;
        button.textContent = implemented ? "Se anuleaza..." : "Se salveaza...";
        toggleRecommendation(houseId, button.dataset.recommendationId, implemented);
      });
    });
  }

  try {
    const activeHouseId = window.LaCurentHomes?.activeHouseId?.();
    const result = await window.LaCurentAuth.api("/api/recommendations", { house_id: activeHouseId });
    if (!result.has_report) {
      empty.hidden = false;
      text("algorithmState", "Avem nevoie de mai multe date");
      return;
    }

    const insights = result.algorithm_insights || [];
    const first = insights[0] || {};
    const basedOn = first.basedOn || {};
    const benchmark = result.benchmark || {};
    const implementedIds = result.implemented_recommendations || [];

    content.hidden = false;
    text("algorithmState", "Recomandari actualizate pe baza datelor disponibile.");
    text("algorithmTimestamp", relativeTime(first.updatedAt || result.updated_at));
    text("algorithmFreshness", result.bill_analysis?.months_count
      ? "Estimarea foloseste si facturile introduse."
      : "Estimari partiale. Adauga facturi pentru rezultate mai precise.");
    text("similarHomesCount", basedOn.similarHomesCount || benchmark.similar_homes_count || 0);
    text("offersCount", basedOn.offersCount || 0);
    text("algorithmConfidence", first.confidencePercent ? `${first.confidencePercent}%` : "--");
    text("benchmarkPercentile", benchmark.percentile ? `${Math.round(benchmark.percentile)}%` : "--");
    text(
      "benchmarkLiveText",
      benchmark.percentile
        ? `Locuinta ta este mai eficienta decat ${Math.round(benchmark.percentile)}% dintre locuintele similare analizate.`
        : "Benchmark-ul se va calibra pe masura ce apar mai multe locuinte comparabile."
    );
    text("materialSources", basedOn.materialPriceSourcesCount || 0);
    text("laborSources", basedOn.laborPriceSourcesCount || 0);
    text("marketOffers", basedOn.offersCount || 0);

    renderInsights(insights, implementedIds, result.house_id);
    renderBillingAnalysis(result.bill_analysis || {});
  } catch {
    empty.hidden = false;
    text("algorithmState", "Nu am putut calcula oportunitatile");
  }
});
