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

  function renderDecisionEnginePlaceholder() {
    if (content) content.hidden = true;
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `
        <div class="calibration-placeholder">
          <span class="small-label">MOTOR IN PERFECTIONARE</span>
          <h2>LaCurent Decision Engine este in curs de perfectionare.</h2>
          <p>
            Decision Engine va transforma rezultatele Physics Engine, facturile, scenariile si comparatiile anonimizate
            in recomandari dinamice. Nu il afisam inca in productie pentru ca vrem ca ordinea recomandarilor sa fie
            justificata de calcule, nu de presupuneri rapide.
          </p>
          <div class="placeholder-stage" aria-label="Vizual LaCurent Decision Engine in perfectionare">
            <svg viewBox="0 0 480 300" aria-hidden="true">
              <defs>
                <linearGradient id="decisionSelectedGradient" x1="0%" x2="100%">
                  <stop offset="0%" stop-color="#5eead4" stop-opacity=".10" />
                  <stop offset="54%" stop-color="#5eead4" stop-opacity=".95" />
                  <stop offset="100%" stop-color="#7dd3fc" stop-opacity=".35" />
                </linearGradient>
                <linearGradient id="decisionSoftGradient" x1="0%" x2="100%">
                  <stop offset="0%" stop-color="#7dd3fc" stop-opacity=".16" />
                  <stop offset="100%" stop-color="#c4b5fd" stop-opacity=".36" />
                </linearGradient>
              </defs>
              <path class="placeholder-dash" d="M54 62 H178 L214 98" fill="none" stroke="#7dd3fc" stroke-opacity=".55" />
              <path class="placeholder-dash" d="M312 64 H430" fill="none" stroke="#5eead4" stroke-opacity=".45" />
              <path class="placeholder-dash" d="M62 238 H176 L210 198" fill="none" stroke="#c4b5fd" stroke-opacity=".45" />
              <foreignObject x="38" y="42" width="184" height="24"><div class="placeholder-hud-label">ORDONARE SCENARII</div></foreignObject>
              <foreignObject x="302" y="44" width="176" height="24"><div class="placeholder-hud-label">VERIFICARE CONSTRANGERI</div></foreignObject>
              <foreignObject x="54" y="242" width="170" height="24"><div class="placeholder-hud-label">CAUTARE TRASEU BUN</div></foreignObject>
              <path class="placeholder-path" d="M74 150 C132 64 180 58 222 104 C272 158 320 206 404 220" fill="none" stroke="url(#decisionSoftGradient)" stroke-width="2" />
              <path class="placeholder-path" d="M74 150 C132 166 172 188 222 174 C278 158 314 160 404 150" fill="none" stroke="url(#decisionSoftGradient)" stroke-width="2" />
              <path class="placeholder-path" d="M74 150 C134 226 188 232 238 210 C302 182 336 108 404 80" fill="none" stroke="url(#decisionSoftGradient)" stroke-width="2" />
              <path class="placeholder-selected-path" d="M74 150 C130 98 168 88 222 104 C274 120 308 145 366 92" fill="none" stroke="url(#decisionSelectedGradient)" stroke-width="4" stroke-linecap="round" />
              <circle class="placeholder-node selected" cx="74" cy="150" r="16" />
              <circle class="placeholder-node selected" cx="222" cy="104" r="14" />
              <circle class="placeholder-node selected" cx="366" cy="92" r="16" />
              <circle class="placeholder-node" cx="222" cy="174" r="13" />
              <circle class="placeholder-node" cx="404" cy="150" r="14" />
              <circle class="placeholder-node" cx="404" cy="220" r="13" />
              <circle class="placeholder-node" cx="238" cy="210" r="12" />
              <circle class="placeholder-node" cx="404" cy="80" r="13" />
              <g transform="translate(302 188)">
                <rect x="0" y="0" width="118" height="58" rx="8" fill="rgba(8,17,31,.78)" stroke="rgba(125,211,252,.24)" />
                <text x="14" y="18" fill="#7dd3fc" font-family="ui-monospace,Consolas,monospace" font-size="9" font-weight="700">VECTOR DECIZIE</text>
                <rect x="14" y="28" width="86" height="5" rx="2.5" fill="rgba(125,211,252,.16)" />
                <rect class="placeholder-bar" x="14" y="28" width="86" height="5" rx="2.5" fill="#5eead4" />
                <rect x="14" y="39" width="70" height="5" rx="2.5" fill="rgba(125,211,252,.16)" />
                <rect class="placeholder-bar two" x="14" y="39" width="70" height="5" rx="2.5" fill="#7dd3fc" />
                <rect x="14" y="50" width="96" height="5" rx="2.5" fill="rgba(125,211,252,.16)" />
                <rect class="placeholder-bar three" x="14" y="50" width="96" height="5" rx="2.5" fill="#c4b5fd" />
              </g>
            </svg>
          </div>
          <div class="placeholder-grid">
            <article>
              <span>Ce va decide</span>
              <strong>Prioritati energetice</strong>
              <p>Ce merita analizat primul, ce poate astepta si ce investitii au risc tehnic mare pentru locuinta ta.</p>
            </article>
            <article>
              <span>Pe ce se va baza</span>
              <strong>Fizica, facturi si scenarii</strong>
              <p>Modelul fizic al casei, consumuri reale, valori validate si comparatii cu locuinte similare.</p>
            </article>
            <article>
              <span>De ce nu e live</span>
              <strong>Calibrare inainte de recomandari</strong>
              <p>Nu vrem sa recomandam pompe de caldura, PV, ferestre sau izolatii pana cand baza numerica nu este stabila.</p>
            </article>
          </div>
          <div class="placeholder-note">
            Cand motorul este gata, aici vor aparea oportunitati prioritare, impact estimat, risc tehnic,
            economie anuala si explicatia datelor folosite.
          </div>
        </div>
      `;
    }
    text("algorithmState", "Decision Engine in perfectionare");
  }

  renderDecisionEnginePlaceholder();
  return;

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

  function renderInsights(insights = [], implementedIds = [], houseId = null, readOnly = false) {
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
        ${readOnly
          ? `<span class="live-badge">Vizualizare admin read-only</span>`
          : `<button class="${implemented ? "secondary-btn danger-soft" : "secondary-btn"}" type="button" data-recommendation-id="${item.id}" data-implemented="${implemented ? "true" : "false"}">
          ${implemented ? "Anuleaza implementarea" : (item.nextActionLabel || "Marcheaza implementata")}
        </button>`}
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

  function renderAiInsightCards(result = {}) {
    const container = document.getElementById("algorithmAiInsights");
    if (!container) return;
    const cards = window.LaCurentAiInsights?.generateValidatedInsightCards?.({
      reportSnapshot: result.report_snapshot || result.reportSnapshot || {},
      physicsResult: result.physical_result || result.physicalResult || {},
      scenarioResults: result.algorithm_insights || [],
      mode: "owner"
    }) || [];
    const algorithmCards = cards.filter(card => card.target === "algorithms").slice(0, 6);

    container.innerHTML = algorithmCards.length
      ? algorithmCards.map(card => `
        <article class="validated-insight-card ${card.category} ${card.validationStatus}">
          <div class="validated-insight-head">
            <span>${card.display.statusLabel}</span>
            <strong>${label(card.priority)}</strong>
          </div>
          <h3>${card.title}</h3>
          <p>${card.summary}</p>
          <small>${card.explanation}</small>
          ${card.missingData.length ? `<ul>${card.missingData.slice(0, 3).map(item => `<li>${item}</li>`).join("")}</ul>` : ""}
        </article>
      `).join("")
      : `<article class="validated-insight-card missing_data">
          <div class="validated-insight-head"><span>Ipoteza</span><strong>partial</strong></div>
          <h3>Nu exista inca propuneri suplimentare.</h3>
          <p>Adauga mai multe date despre locuinta si facturi pentru analize experimentale.</p>
        </article>`;
  }

  try {
    const activeHouseId = window.LaCurentHomes?.activeHouseId?.();
    const requestPayload = window.LaCurentHomes?.activeHouseRequest?.() || { house_id: activeHouseId };
    const result = await window.LaCurentAuth.api("/api/recommendations", requestPayload);
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

    renderInsights(insights, implementedIds, result.house_id, Boolean(result.admin_view));
    renderAiInsightCards(result);
    renderBillingAnalysis(result.bill_analysis || {});
  } catch {
    empty.hidden = false;
    text("algorithmState", "Nu am putut calcula oportunitatile");
  }
});
