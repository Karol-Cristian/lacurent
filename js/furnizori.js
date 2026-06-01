document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("providerForm");
  const message = document.getElementById("providerMessage");
  const list = document.getElementById("providerOpportunities");
  const loadBtn = document.getElementById("loadOpportunitiesBtn");

  function money(value) {
    return value ? `${Math.round(value).toLocaleString("ro-RO")} lei` : "--";
  }

  async function submitOffer(opportunityId, recommendationId, amount, note) {
    await window.LaCurentAuth.api("/api/provider/offer", {
      opportunity_id: opportunityId,
      recommendation_id: recommendationId,
      offer_amount_ron: amount,
      message: note
    });
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await window.LaCurentAuth.api("/api/provider/register", data);
      message.textContent = "Profilul firmei a fost salvat.";
      message.classList.remove("error");
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("error");
    }
  });

  loadBtn?.addEventListener("click", async () => {
    list.innerHTML = "";
    try {
      const result = await window.LaCurentAuth.api("/api/provider/opportunities");
      result.opportunities.forEach(item => {
        const article = document.createElement("article");
        article.className = "recommendation-detail-card provider-card";
        article.innerHTML = `
          <div class="recommendation-rank">${item.estimated_class || "--"}</div>
          <div>
            <h3>${item.building_type === "apartment" ? "Apartament" : "Casa"} - ${item.area_bucket}</h3>
            <p>Zona: ${item.city_hint}. Scor anonim: ${item.score_bucket}. Proprietarul nu este expus pana cand cere contactul.</p>
            <div class="provider-recommendations">
              ${item.recommendations.map(rec => `
                <div class="provider-offer-row">
                  <div>
                    <strong>${rec.title}</strong>
                    <small>Nevoie specifica: economie estimata ${money(rec.estimatedSavingsRonYearMin)} - ${money(rec.estimatedSavingsRonYearMax)}/an. Investitie interna orientativa: ${money(rec.estimatedInvestmentRonMin)} - ${money(rec.estimatedInvestmentRonMax)}.</small>
                  </div>
                  <input type="number" placeholder="Preoferta lei, optional" data-offer-amount>
                  <input type="text" placeholder="Mesaj scurt pentru proprietar" data-offer-note>
                  <button class="secondary-btn" type="button" data-opportunity-id="${item.opportunity_id}" data-recommendation-id="${rec.id}">Arata disponibilitatea</button>
                </div>
              `).join("")}
            </div>
          </div>
        `;
        list.append(article);
      });

      list.querySelectorAll("[data-recommendation-id]").forEach(button => {
        button.addEventListener("click", async () => {
          const row = button.closest(".provider-offer-row");
          const amount = row.querySelector("[data-offer-amount]").value;
          const note = row.querySelector("[data-offer-note]").value;
          button.disabled = true;
          button.textContent = "Se trimite...";
          await submitOffer(button.dataset.opportunityId, button.dataset.recommendationId, amount, note);
          button.textContent = "Disponibilitate trimisa";
        });
      });
    } catch (error) {
      list.innerHTML = `<article class="dashboard-band"><strong>${error.message}</strong></article>`;
    }
  });
});
