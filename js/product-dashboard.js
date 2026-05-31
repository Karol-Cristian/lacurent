document.addEventListener("DOMContentLoaded", async () => {
  const lockedMessage =
    "Completează analiza pentru a debloca scorul energetic, benchmark-ul și recomandările personalizate.";
  const token = window.LaCurentAuth?.token();

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  function lockDashboard(message = lockedMessage) {
    setText("heroScoreValue", "--");
    setText("summaryScoreValue", "Blocat");
    setText("scoreStatusText", message);
    setText("benchmarkHeadline", message);
    setText("energyClassValue", "--");
    document.querySelector(".percentile-bar span")?.style.setProperty("width", "0%");
  }

  if (!token) {
    lockDashboard();
    return;
  }

  try {
    const result = await window.LaCurentAuth.api("/api/dashboard-summary");

    if (!result.has_analysis || !result.summary) {
      lockDashboard(result.message);
      return;
    }

    const summary = result.summary;
    const score = Math.round(summary.overall_score);
    const percentile = Math.round(summary.percentile || 0);

    setText("heroScoreValue", String(score));
    setText("summaryScoreValue", `${score}/100`);
    setText("scoreStatusText", `Clasă estimată: ${summary.estimated_energy_class}. ${summary.disclaimer}`);
    setText("energyClassValue", summary.estimated_energy_class);
    setText("benchmarkHeadline", `Consumi mai mult decât ${percentile}% din locuințe similare.`);
    document.querySelector(".percentile-bar span")?.style.setProperty("width", `${percentile}%`);
  } catch (error) {
    lockDashboard();
  }
});
