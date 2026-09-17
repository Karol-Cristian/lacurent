(() => {
  const form = document.getElementById("calculationForm");
  if (!form) return;

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

  function applyClimateToken() {
    const hidden = document.getElementById("localityId");
    const selected = window.__lacurentLocationState?.selected;
    if (!hidden || !selected) return;
    const token = tokenFor(selected);
    if (!token) return;
    hidden.value = token;
    hidden.setAttribute("value", token);
  }

  // energy-ui.js synchronizes the selected locality first. This listener is
  // registered afterwards and converts that selection into a compact climate
  // token before site-language.js performs the final native form submit.
  form.addEventListener("submit", applyClimateToken, true);
})();