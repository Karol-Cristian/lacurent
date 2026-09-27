(() => {
  const blocks = Array.from(document.querySelectorAll("[data-reference-comparison]"));
  if (!blocks.length) return;

  const fmt = (value, digits = 1) =>
    new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(value));

  blocks.forEach(async (block) => {
    const url = block.dataset.referenceUrl || "/api/reference-comparison";
    const actualSpecific = Number(block.dataset.actualSpecific || 0);
    const payloadInput = block.querySelector("[data-reference-payload]");
    const valueNode = block.querySelector("[data-reference-value]");
    const deltaNode = block.querySelector("[data-reference-delta]");
    const statusNode = block.querySelector("[data-reference-status]");

    if (!payloadInput?.value || !Number.isFinite(actualSpecific) || actualSpecific <= 0) {
      if (statusNode) statusNode.textContent = "Comparația de referință nu poate fi calculată.";
      return;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          payload: payloadInput.value,
          actualSpecificPrimaryKwhM2: actualSpecific,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      const reference = Number(data.referenceSpecificPrimaryKwhM2);
      const difference = Number(data.differencePercent);
      if (!Number.isFinite(reference) || !Number.isFinite(difference)) {
        throw new Error("Răspuns incomplet pentru clădirea de referință.");
      }

      if (valueNode) {
        valueNode.textContent = `${fmt(reference, 1)} kWh/m²/an`;
      }
      if (deltaNode) {
        deltaNode.textContent = `${difference > 0 ? "+" : ""}${fmt(difference, 1)}%`;
        deltaNode.classList.toggle("good", difference <= 0);
      }
      if (statusNode) {
        statusNode.textContent = "Comparație RBPE calculată separat, cu aceeași metodologie.";
      }
      block.dataset.referenceReady = "true";
      document.dispatchEvent(new CustomEvent("lacurent:reference-comparison-ready", {
        detail: data,
      }));
    } catch (error) {
      if (valueNode) valueNode.textContent = "Indisponibil";
      if (deltaNode) deltaNode.textContent = "—";
      if (statusNode) {
        statusNode.textContent = `Comparația de referință nu a putut fi calculată: ${error.message}`;
      }
      block.dataset.referenceReady = "false";
    }
  });
})();
