(() => {
  const payloadField = document.querySelector('.actions-footer form[action="/certificate"] input[name="payload"]');
  const climateInput = document.getElementById("simClimate");
  if (!payloadField || !climateInput) return;

  let baseline;
  try {
    baseline = JSON.parse(payloadField.value);
  } catch (_) {
    return;
  }

  const match = String(baseline.locality || "").match(/^@lc\|[^|]+\|([^|]*)\|/);
  const currentZone = match?.[1] || "";
  const zoneIndex = { I: 1, II: 2, III: 3, IV: 4, V: 5 }[currentZone];
  if (!zoneIndex) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === "string" ? input : input?.url;
      const pathname = new URL(url || "", window.location.href).pathname;
      if (pathname === "/calculate" && init.body instanceof FormData) {
        const locality = String(init.body.get("locality") || "");
        const scenarioMatch = locality.match(/^@lc\|[^|]+\|([^|]*)\|/);
        if (scenarioMatch?.[1] === currentZone) {
          init.body.set("locality", baseline.locality);
        }
      }
    } catch (_) {
      // Preserve the original request if this defensive normalization cannot run.
    }
    return originalFetch(input, init);
  };

  const control = climateInput.closest(".scenario-control");
  const output = control?.querySelector("#simClimateOutput");
  const scale = control?.querySelector(".scenario-scale");
  const note = control?.querySelector('[data-sim="climate-note"]');

  climateInput.min = "1";
  climateInput.max = "5";
  climateInput.value = String(zoneIndex);

  if (scale) {
    scale.innerHTML = "<span>I</span><span>V</span>";
  }

  function isRomanian() {
    return document.documentElement.lang !== "en";
  }

  function updateClimateCopy() {
    const selected = Number(climateInput.value);
    if (output) {
      if (selected === zoneIndex) {
        output.textContent = isRomanian()
          ? `Zona ${currentZone} · actuală`
          : `Zone ${currentZone} · current`;
      } else {
        const labels = ["", "I", "II", "III", "IV", "V"];
        output.textContent = `${isRomanian() ? "Zona" : "Zone"} ${labels[selected] || currentZone}`;
      }
    }
    if (note) {
      note.textContent = isRomanian()
        ? `Zona ${currentZone} este clima exactă a localității introduse. Celelalte poziții sunt scenarii MC001 reprezentative pentru comparație.`
        : `Zone ${currentZone} uses the exact climate of the location you entered. The other positions are representative MC001 comparison scenarios.`;
    }
  }

  climateInput.addEventListener("input", () => {
    // The original simulator recalculates first; this only corrects the label.
    updateClimateCopy();
  });

  document.querySelector("[data-sim-reset]")?.addEventListener("click", () => {
    climateInput.value = String(zoneIndex);
    updateClimateCopy();
  });

  document.querySelectorAll("[data-site-language]").forEach((button) => {
    button.addEventListener("click", () => setTimeout(updateClimateCopy, 0));
  });

  updateClimateCopy();
})();
