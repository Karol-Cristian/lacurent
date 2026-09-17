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

  const control = climateInput.closest(".scenario-control");
  const output = control?.querySelector("#simClimateOutput");
  const scale = control?.querySelector(".scenario-scale");
  const note = control?.querySelector('[data-sim="climate-note"]');
  const zoneToIndex = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  const indexToZone = ["", "I", "II", "III", "IV", "V"];
  const originalFetch = window.fetch.bind(window);

  let currentZone = "";
  let zoneIndex = 0;
  let exactBaselineToken = "";

  function isRomanian() {
    return document.documentElement.lang !== "en";
  }

  function sanitize(value) {
    return String(value ?? "").replaceAll("|", "/").trim();
  }

  function tokenFor(locality) {
    if (!locality?.stationId) return "";
    const station = sanitize(locality.stationId).replace(/^mc001_6_2013_/, "");
    const zone = sanitize(locality.climateZone || "");
    const temperature = Number.isFinite(locality.winterDesignTemperatureC)
      ? String(locality.winterDesignTemperatureC)
      : "";
    const prefix = `@lc|${station}|${zone}|${temperature}|`;
    const maxNameLength = Math.max(1, 78 - prefix.length);
    const name = sanitize(locality.name || "Localitate").slice(0, maxNameLength);
    return `${prefix}${name}`;
  }

  function updateClimateCopy() {
    if (!zoneIndex) return;
    const selected = Number(climateInput.value);
    const selectedZone = indexToZone[selected] || currentZone;
    if (output) {
      output.textContent = selected === zoneIndex
        ? `${isRomanian() ? "Zona" : "Zone"} ${currentZone} · ${isRomanian() ? "casa mea" : "my home"}`
        : `${isRomanian() ? "Zona" : "Zone"} ${selectedZone}`;
    }
    if (note) {
      note.textContent = isRomanian()
        ? `Zona ${currentZone} folosește clima exactă a localității introduse. Celelalte zone sunt scenarii MC001 reprezentative pentru comparație.`
        : `Zone ${currentZone} uses the exact climate of the location you entered. The other zones are representative MC001 comparison scenarios.`;
    }
  }

  function installFetchNormalization() {
    window.fetch = (input, init = {}) => {
      try {
        const url = typeof input === "string" ? input : input?.url;
        const pathname = new URL(url || "", window.location.href).pathname;
        if (pathname === "/calculate" && init.body instanceof FormData) {
          const locality = String(init.body.get("locality") || "");
          const scenarioMatch = locality.match(/^@lc\|[^|]+\|([^|]*)\|/);
          if (scenarioMatch?.[1] === currentZone && exactBaselineToken) {
            init.body.set("locality", exactBaselineToken);
          }
        }
      } catch (_) {
        // Keep the original request if normalization is not possible.
      }
      return originalFetch(input, init);
    };
  }

  function initialize(zone, token) {
    const index = zoneToIndex[zone];
    if (!index) return;
    currentZone = zone;
    zoneIndex = index;
    exactBaselineToken = token || exactBaselineToken;

    climateInput.min = "1";
    climateInput.max = "5";
    climateInput.value = String(zoneIndex);
    climateInput.disabled = false;
    if (scale) scale.innerHTML = "<span>I</span><span>V</span>";

    installFetchNormalization();
    updateClimateCopy();
  }

  async function resolveBaselineClimate() {
    const raw = String(baseline.locality || "");
    const tokenMatch = raw.match(/^@lc\|[^|]+\|([^|]*)\|/);
    if (tokenMatch?.[1] && zoneToIndex[tokenMatch[1]]) {
      initialize(tokenMatch[1], raw);
      return;
    }

    // Older/current result payloads can contain a SIRUTA/locality id instead
    // of the compact browser token. Resolve it from the same map payload the
    // calculator uses, then rebuild the compact token so scenario requests do
    // not force the Python Worker to index the 6.5 MB locality registry.
    climateInput.disabled = true;
    if (scale) scale.innerHTML = "<span>I</span><span>V</span>";
    if (output) output.textContent = isRomanian() ? "Identific zona…" : "Detecting zone…";
    try {
      const response = await originalFetch("/api/location-data");
      if (!response.ok) throw new Error("location-data");
      const data = await response.json();
      const localities = Array.isArray(data?.localities) ? data.localities : [];
      const match = localities.find((item) => String(item.id) === raw)
        || localities.find((item) => String(item.siruta || "") === raw)
        || localities.find((item) => String(item.name || "").toLocaleLowerCase("ro-RO") === raw.toLocaleLowerCase("ro-RO"));
      if (!match?.climateZone) throw new Error("zone");
      initialize(String(match.climateZone), tokenFor(match));
    } catch (_) {
      climateInput.disabled = false;
      if (output) output.textContent = isRomanian() ? "Zona casei" : "Home zone";
      if (note) {
        note.textContent = isRomanian()
          ? "Zona climatică nu a putut fi identificată automat pentru acest rezultat vechi. Recalculează casa pentru a reîncărca metadatele climatice."
          : "The climate zone could not be detected automatically for this older result. Recalculate the home to reload climate metadata.";
      }
    }
  }

  climateInput.addEventListener("input", updateClimateCopy);

  document.querySelector("[data-sim-reset]")?.addEventListener("click", () => {
    if (!zoneIndex) return;
    climateInput.value = String(zoneIndex);
    updateClimateCopy();
  });

  document.querySelectorAll("[data-site-language]").forEach((button) => {
    button.addEventListener("click", () => setTimeout(updateClimateCopy, 0));
  });

  resolveBaselineClimate();
})();
