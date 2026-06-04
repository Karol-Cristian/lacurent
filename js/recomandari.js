document.addEventListener("DOMContentLoaded", async () => {
  const empty = document.getElementById("recommendationsEmpty");
  const content = document.getElementById("recommendationsContent");

  function text(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function money(value) {
    return value ? `${Math.round(value).toLocaleString("ro-RO")} lei` : "--";
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

    text("billMonthsSummary", analysis.months_count ? `${analysis.months_count}/12` : "0/12");
    text("billNormalizedSummary", money(analysis.normalized_monthly_average_ron));
    text("billScoreSummary", analysis.score_delta ? `${analysis.score_delta > 0 ? "+" : ""}${analysis.score_delta} pct` : "0 pct");
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

  try {
    const activeHouseId = window.LaCurentHomes?.activeHouseId?.();
    const requestPayload = window.LaCurentHomes?.activeHouseRequest?.() || { house_id: activeHouseId };
    const result = await window.LaCurentAuth.api("/api/recommendations", requestPayload);
    if (!result.has_report) {
      empty.hidden = false;
      return;
    }

    content.hidden = false;
    renderBillingAnalysis(result.bill_analysis || {});
  } catch {
    empty.hidden = false;
  }
});
