document.addEventListener("DOMContentLoaded", async () => {
  const segmentConfig = window.LaCurentSegments?.apply?.() || {};
  const addHomeMessage =
    segmentConfig.lockedMessage ||
    "Completeaza analiza pentru a debloca scorul energetic, benchmark-ul si recomandarile personalizate.";

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function metric(index) {
    return document.querySelectorAll(".dashboard-summary-grid .metric-card")[index];
  }

  function setMetric(index, strong, help) {
    const card = metric(index);
    if (!card) return;
    const strongEl = card.querySelector("strong");
    const helpEl = card.querySelector("p");
    if (strongEl) strongEl.textContent = strong;
    if (helpEl) helpEl.textContent = help;
  }

  function setPercentile(width) {
    document.querySelector(".percentile-bar span")?.style.setProperty("width", `${width}%`);
  }

  function setInactiveCards() {
    document.querySelectorAll(".metric-card").forEach(card => card.classList.add("inactive-metric"));
  }

  function clearInactiveCards() {
    document.querySelectorAll(".metric-card").forEach(card => card.classList.remove("inactive-metric"));
  }

  function renderRecommendations(rows) {
    const links = document.querySelectorAll(".recommendations-preview .recommendation-row");
    rows.forEach((row, index) => {
      const link = links[index];
      if (!link) return;
      link.querySelector("strong").textContent = row.title;
      link.querySelector("small").textContent = row.detail;
    });
  }

  function publicDemoDashboard() {
    clearInactiveCards();
    setText("heroScoreValue", "72");
    setText("summaryScoreValue", "72/100");
    setText("scoreStatusText", "Exemplu orientativ: un proprietar vede scorul, comparatia si recomandarile dupa analiza.");
    setMetric(0, "72/100", "Exemplu de scor pentru o locuinta analizata");
    setMetric(1, "420 lei", "Exemplu de cost lunar estimat");
    setMetric(2, "620 lei/an", "Exemplu de economii potentiale");
    setText("energyClassValue", "B");
    setText("benchmarkHeadline", "Exemplu: consum mai mare decat 58% dintre locuintele similare.");
    setPercentile(58);
    renderRecommendations([
      { title: "Izoleaza podul", detail: "Exemplu economie: 120 lei/an" },
      { title: "Adauga control pe incalzire", detail: "Exemplu economie: 240 lei/an" },
      { title: "Treci la iluminat LED", detail: "Exemplu economie: 60 lei/an" }
    ]);
  }

  function authenticatedEmptyDashboard() {
    setInactiveCards();
    setText("heroScoreValue", "--");
    setText("summaryScoreValue", "Inactiv");
    setText("scoreStatusText", "Esti autentificat. Adauga prima locuinta ca sa vezi scorul, benchmark-ul si recomandarile tale.");
    setMetric(0, "Inactiv", "Nu exista inca o locuinta analizata");
    setMetric(1, "--", "Costul apare dupa completarea analizei");
    setMetric(2, "--", "Economiile apar dupa raport");
    setText("energyClassValue", "--");
    setText("benchmarkHeadline", addHomeMessage);
    setPercentile(0);
    renderRecommendations([
      { title: "Adauga prima locuinta", detail: "Completeaza formularul pentru recomandari reale" },
      { title: "Consulta ultimele facturi", detail: "Costurile reale imbunatatesc estimarea" },
      { title: "Revizuieste datele cand schimbi ceva", detail: "Scorul se poate actualiza in timp" }
    ]);
  }

  function classRank(value) {
    return { "A+": 8, A: 7, B: 6, C: 5, D: 4, E: 3, F: 2, G: 1 }[value] || 0;
  }

  function portfolioDashboard(homes) {
    clearInactiveCards();
    const scoredHomes = homes.filter(home => Number.isFinite(Number(home.overall_score)));
    const averageScore = scoredHomes.length
      ? Math.round(scoredHomes.reduce((sum, home) => sum + Number(home.overall_score), 0) / scoredHomes.length)
      : null;
    const bestHome = [...scoredHomes].sort((a, b) => Number(b.overall_score) - Number(a.overall_score))[0];
    const weakestHome = [...scoredHomes].sort((a, b) => Number(a.overall_score) - Number(b.overall_score))[0];
    const implemented = homes.reduce((sum, home) => sum + Number(home.implemented_actions || 0), 0);
    const bestClass = homes
      .map(home => home.estimated_energy_class)
      .filter(Boolean)
      .sort((a, b) => classRank(b) - classRank(a))[0] || "--";

    setText("heroScoreValue", averageScore ? String(averageScore) : "--");
    setText("summaryScoreValue", averageScore ? `${averageScore}/100` : "--");
    setText(
      "scoreStatusText",
      `Ai ${homes.length} locuinta${homes.length === 1 ? "" : "e"} salvata${homes.length === 1 ? "" : "e"}. Dashboard-ul arata media portofoliului tau.`
    );
    setMetric(0, averageScore ? `${averageScore}/100` : "--", "Scor mediu pentru toate locuintele tale");
    setMetric(1, String(homes.length), "Locuinte active in cont");
    setMetric(2, String(implemented), "Decizii implementate in portofoliu");
    setText("energyClassValue", bestClass);
    setText("benchmarkHeadline", weakestHome
      ? `Cea mai mare oportunitate pare la ${weakestHome.display_name || weakestHome.city || `Locuinta #${weakestHome.id}`}.`
      : "Adauga mai multe date pentru benchmark de portofoliu.");
    setPercentile(averageScore || 0);

    renderRecommendations([
      {
        title: bestHome ? `Pastreaza ritmul la ${bestHome.display_name || bestHome.city || `Locuinta #${bestHome.id}`}` : "Completeaza scorurile",
        detail: bestHome ? `Cel mai bun scor: ${Math.round(bestHome.overall_score)}/100` : "Nu toate locuintele au scor"
      },
      {
        title: weakestHome ? `Prioritizeaza ${weakestHome.display_name || weakestHome.city || `Locuinta #${weakestHome.id}`}` : "Adauga facturi reale",
        detail: weakestHome ? `Scor curent: ${Math.round(weakestHome.overall_score)}/100` : "Facturile ajuta estimarile"
      },
      {
        title: "Revizuieste recomandarile implementate",
        detail: `${implemented} decizii marcate pana acum`
      }
    ]);

    renderPortfolioList(homes);
  }

  function renderPortfolioList(homes) {
    const section = document.getElementById("portfolioOverview");
    const list = document.getElementById("portfolioHomesList");
    if (!section || !list) return;
    section.hidden = false;
    list.innerHTML = "";
    homes.forEach(home => {
      const article = document.createElement("article");
      article.className = "recommendation-detail-card";
      article.innerHTML = `
        <div class="recommendation-rank">${home.overall_score ? Math.round(home.overall_score) : "--"}</div>
        <div>
          <h3>${home.display_name || home.city || `Locuinta #${home.id}`}</h3>
          <p>${home.city || "Localitate necompletata"} · ${home.surface || "--"} m2</p>
          <div class="recommendation-metrics">
            <span>Clasa: <strong>${home.estimated_energy_class || "--"}</strong></span>
            <span>Decizii: <strong>${home.implemented_actions || 0}</strong></span>
            <a class="secondary-btn" href="pages/raport-energie.html" data-portfolio-home-id="${home.id}">Raport</a>
            <a class="secondary-btn" href="pages/analiza-casa.html?edit=${home.id}">Editeaza</a>
          </div>
        </div>
      `;
      list.append(article);
    });
    list.querySelectorAll("[data-portfolio-home-id]").forEach(link => {
      link.addEventListener("click", () => {
        window.LaCurentHomes?.setActiveHouseId(link.dataset.portfolioHomeId);
      });
    });
  }

  const token = window.LaCurentAuth?.token();
  if (!token) {
    publicDemoDashboard();
    return;
  }

  try {
    const homes = await window.LaCurentHomes?.load?.() || [];
    if (!homes.length) {
      authenticatedEmptyDashboard();
      return;
    }
    portfolioDashboard(homes);
  } catch {
    authenticatedEmptyDashboard();
  }
});
