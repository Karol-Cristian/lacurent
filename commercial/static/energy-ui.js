(() => {
  const number = (value, fallback = 0) => {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const byName = (form, name) => form?.elements?.namedItem(name);
  const setValue = (form, name, value) => {
    const field = byName(form, name);
    if (!field) return;
    field.value = Number.isFinite(value) ? String(Math.round(value * 1000) / 1000) : String(value ?? "");
  };

  const envelopeProfiles = {
    poor: { wall: 1.3, roof: 1.0, floor: 0.9, window: 2.8, door: 2.5, psi: 0.15 },
    average: { wall: 0.55, roof: 0.35, floor: 0.45, window: 1.6, door: 1.8, psi: 0.08 },
    good: { wall: 0.30, roof: 0.20, floor: 0.30, window: 1.1, door: 1.4, psi: 0.05 },
    very_good: { wall: 0.18, roof: 0.15, floor: 0.20, window: 0.85, door: 1.1, psi: 0.03 }
  };

  const ventilationProfiles = {
    natural: { ach: 0.50, recovery: 0 },
    mechanical: { ach: 0.60, recovery: 0 },
    heat_recovery: { ach: 0.45, recovery: 0.75 },
    unknown: { ach: 0.50, recovery: 0 }
  };

  const heatingProfiles = {
    condensing_gas_boiler: { type: "condensing_gas_boiler", carrier: "natural_gas", efficiency: 0.94, scop: 3.2, costProfile: "natural_gas" },
    gas_boiler: { type: "gas_boiler", carrier: "natural_gas", efficiency: 0.85, scop: 3.2, costProfile: "natural_gas" },
    electric_resistance: { type: "electric_resistance", carrier: "electricity", efficiency: 1, scop: 3.2, costProfile: "electricity" },
    heat_pump: { type: "heat_pump", carrier: "electricity", efficiency: 1, scop: 3.2, costProfile: "electricity" },
    wood_stove: { type: "custom", carrier: "biomass", efficiency: 0.75, scop: 3.2, costProfile: "firewood" },
    wood_boiler: { type: "custom", carrier: "biomass", efficiency: 0.80, scop: 3.2, costProfile: "firewood" },
    pellet_boiler: { type: "custom", carrier: "biomass", efficiency: 0.88, scop: 3.2, costProfile: "pellets" },
    district_heat: { type: "district_heat", carrier: "district_heat", efficiency: 0.95, scop: 3.2, costProfile: "district_heat" },
    custom: { type: "custom", carrier: "natural_gas", efficiency: 0.85, scop: 3.2, costProfile: "other" }
  };

  function normalize(text) {
    return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function updateDerivedLabels(values) {
    const mapping = {
      derivedArea: `${Math.round(values.area)} m²`,
      derivedVolume: `${Math.round(values.volume)} m³`,
      derivedWalls: `${Math.round(values.wall)} m²`,
      derivedRoof: `${Math.round(values.roof)} m²`
    };
    for (const [id, text] of Object.entries(mapping)) {
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    }
  }

  function deriveGeometry(form) {
    if (!form) return;
    const buildingType = form.querySelector('input[name="building_type"]:checked')?.value || "residential_individual";
    const housePanel = document.getElementById("houseGeometry");
    const apartmentPanel = document.getElementById("apartmentGeometry");
    if (housePanel) housePanel.hidden = buildingType !== "residential_individual";
    if (apartmentPanel) apartmentPanel.hidden = buildingType !== "residential_collective";

    let area;
    let volume;
    let wall;
    let roof;
    let floor;
    let windowArea;
    let doorArea;
    let bridgeLength;

    if (buildingType === "residential_collective") {
      area = Math.max(number(byName(form, "apartment_area_m2")?.value, 80), 1);
      const height = Math.max(number(byName(form, "apartment_height_m")?.value, 2.65), 1.8);
      const exposedWallLength = Math.max(number(byName(form, "apartment_exterior_wall_length_m")?.value, 12), 1);
      windowArea = Math.max(number(byName(form, "apartment_window_area_m2")?.value, 12), 0.1);
      doorArea = 0;
      volume = area * height;
      wall = Math.max(exposedWallLength * height - windowArea, 0.1);
      roof = byName(form, "apartment_top_exposed")?.checked ? area : 0;
      floor = byName(form, "apartment_bottom_exposed")?.checked ? area : 0;
      bridgeLength = exposedWallLength;
    } else {
      const length = Math.max(number(byName(form, "building_length_m")?.value, 10), 1);
      const width = Math.max(number(byName(form, "building_width_m")?.value, 8), 1);
      const levels = clamp(Math.round(number(byName(form, "heated_levels")?.value, 2)), 1, 5);
      const height = Math.max(number(byName(form, "average_height_m")?.value, 2.7), 1.8);
      windowArea = Math.max(number(byName(form, "house_window_area_m2")?.value, 20), 0.1);
      doorArea = Math.max(number(byName(form, "house_door_area_m2")?.value, 2.2), 0.1);
      const footprint = length * width;
      area = footprint * levels;
      volume = area * height;
      wall = Math.max(2 * (length + width) * height * levels - windowArea - doorArea, 0.1);
      roof = footprint;
      floor = footprint;
      bridgeLength = 2 * (length + width) * levels;
    }

    const geometry = { area, volume, wall, roof, floor, windowArea, doorArea, bridgeLength };
    updateDerivedLabels(geometry);

    if (byName(form, "expert_geometry_override")?.value !== "on") {
      setValue(form, "heated_floor_area_m2", area);
      setValue(form, "heated_volume_m3", volume);
      setValue(form, "wall_area_m2", wall);
      setValue(form, "roof_area_m2", roof);
      setValue(form, "floor_area_m2", floor);
      setValue(form, "window_area_m2", windowArea);
      setValue(form, "door_area_m2", doorArea);
      setValue(form, "thermal_bridge_length_m", bridgeLength);
    }
  }

  function applyEnvelopeProfile(form) {
    if (!form || byName(form, "expert_envelope_override")?.value === "on") return;
    const key = byName(form, "insulation_profile")?.value || "average";
    const profile = envelopeProfiles[key] || envelopeProfiles.average;
    setValue(form, "wall_u_value", profile.wall);
    setValue(form, "roof_u_value", profile.roof);
    setValue(form, "floor_u_value", profile.floor);
    setValue(form, "window_u_value", profile.window);
    setValue(form, "door_u_value", profile.door);
    setValue(form, "thermal_bridge_psi_w_mk", profile.psi);
  }

  function applyVentilationProfile(form) {
    if (!form || byName(form, "expert_ventilation_override")?.value === "on") return;
    const profile = ventilationProfiles[byName(form, "ventilation_type")?.value] || ventilationProfiles.unknown;
    setValue(form, "air_changes_per_hour", profile.ach);
    setValue(form, "heat_recovery_efficiency", profile.recovery);
  }

  function applyHeatingProfile(form) {
    if (!form || byName(form, "expert_heating_override")?.value === "on") return;
    const choice = byName(form, "heating_choice")?.value || "condensing_gas_boiler";
    const profile = heatingProfiles[choice] || heatingProfiles.custom;
    setValue(form, "heating_system_type", profile.type);
    setValue(form, "heating_carrier", profile.carrier);
    setValue(form, "heating_efficiency", profile.efficiency);
    setValue(form, "heating_scop", profile.scop);
    setValue(form, "heating_cost_profile", profile.costProfile);

    if (byName(form, "expert_dhw_override")?.value !== "on") {
      setValue(form, "dhw_carrier", profile.carrier);
    }
  }

  function syncCalculatorLocality() {
    const state = window.__lacurentLocationState;
    const input = document.getElementById("localitySearch");
    const hidden = document.getElementById("localityId");
    if (!input || !hidden || !state?.data?.localities) return;

    const query = normalize(input.value);
    if (!query) {
      hidden.value = "";
      state.selected = null;
      return;
    }

    const selected = state.selected;
    if (selected) {
      const selectedName = normalize(selected.name);
      const selectedShort = normalize(`${selected.name} ${selected.uatName && selected.uatName !== selected.name ? selected.uatName : ""} ${selected.county}`);
      if (query === selectedName || query === selectedShort || query.startsWith(`${selectedName} `)) {
        hidden.value = selected.id;
        hidden.setAttribute("value", selected.id);
        return;
      }
    }

    const terms = query.split(" ").filter(Boolean);
    const matches = state.data.localities
      .filter((item) => terms.every((term) => item.search?.includes(term)))
      .sort((a, b) => {
        const an = normalize(a.name);
        const bn = normalize(b.name);
        const as = (an === query ? 10_000_000 : an.startsWith(query) ? 1_000_000 : 0) + (a.importance || 0);
        const bs = (bn === query ? 10_000_000 : bn.startsWith(query) ? 1_000_000 : 0) + (b.importance || 0);
        return bs - as || a.name.localeCompare(b.name, "ro");
      });

    const match = matches[0];
    if (match) {
      state.selected = match;
      hidden.value = match.id;
      hidden.setAttribute("value", match.id);
    } else {
      state.selected = null;
      hidden.value = "";
      hidden.setAttribute("value", "");
    }
  }

  function resetSubmitButton(form) {
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = false;
    button.textContent = "Calculează performanța";
    button.removeAttribute("aria-busy");
  }

  function initFriendlyCalculator() {
    const form = document.getElementById("calculationForm");
    if (!form) return;

    const recalculate = () => {
      deriveGeometry(form);
      applyEnvelopeProfile(form);
      applyVentilationProfile(form);
      applyHeatingProfile(form);
    };

    form.addEventListener("input", (event) => {
      const target = event.target;
      if (target?.matches?.("[data-expert-geometry]")) setValue(form, "expert_geometry_override", "on");
      if (target?.matches?.("[data-expert-envelope]")) setValue(form, "expert_envelope_override", "on");
      if (target?.matches?.("[data-expert-ventilation]")) setValue(form, "expert_ventilation_override", "on");
      if (target?.matches?.("[data-expert-heating]")) setValue(form, "expert_heating_override", "on");
      if (target?.matches?.("[data-expert-dhw]")) setValue(form, "expert_dhw_override", "on");
      recalculate();
    });
    form.addEventListener("change", recalculate);
    form.addEventListener("submit", () => {
      recalculate();
      syncCalculatorLocality();
    }, { capture: true });
    recalculate();
    resetSubmitButton(form);
    window.addEventListener("pageshow", () => resetSubmitButton(form));

    const localityId = document.getElementById("localityId");
    const localitySearch = document.getElementById("localitySearch");
    const persistLocality = () => {
      if (!localitySearch?.value) return;
      localStorage.setItem("lacurent-energy-locality", JSON.stringify({
        id: localityId?.value || "",
        label: localitySearch.value
      }));
    };
    localitySearch?.addEventListener("change", persistLocality);
    localitySearch?.addEventListener("blur", persistLocality);
    if (localityId) {
      new MutationObserver(persistLocality).observe(localityId, { attributes: true, attributeFilter: ["value"] });
    }
  }

  function initIntakeLocality() {
    const input = document.getElementById("energy-locality");
    const results = document.getElementById("energy-locality-results");
    if (!input || !results) return;

    try {
      const saved = JSON.parse(localStorage.getItem("lacurent-energy-locality") || "null");
      if (saved?.label && !input.value) input.value = saved.label;
    } catch (_) {}

    let localities = [];
    const render = () => {
      const q = normalize(input.value);
      if (q.length < 2) { results.hidden = true; results.innerHTML = ""; return; }
      const terms = q.split(" ").filter(Boolean);
      const matches = localities
        .filter((item) => terms.every((term) => item.search?.includes(term)))
        .sort((a, b) => {
          const an = normalize(a.name);
          const bn = normalize(b.name);
          const as = (an === q ? 10_000_000 : an.startsWith(q) ? 1_000_000 : 0) + (a.importance || 0);
          const bs = (bn === q ? 10_000_000 : bn.startsWith(q) ? 1_000_000 : 0) + (b.importance || 0);
          return bs - as || a.name.localeCompare(b.name, "ro");
        })
        .slice(0, 12);
      results.innerHTML = matches.map((item) => `<button type="button" class="locality-option" data-intake-locality="${item.id}"><strong>${item.name}</strong><em>${item.countyMnemonic || item.county}</em><span>${item.uatName && item.uatName !== item.name ? `${item.uatName} · ` : ""}${item.county}</span></button>`).join("");
      results.hidden = !matches.length;
    };

    fetch("/api/location-data")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { localities = data.localities || []; })
      .catch(() => { localities = []; });

    input.addEventListener("input", render);
    results.addEventListener("click", (event) => {
      const button = event.target.closest("[data-intake-locality]");
      if (!button) return;
      const item = localities.find((candidate) => candidate.id === button.dataset.intakeLocality);
      if (!item) return;
      input.value = `${item.name}${item.uatName && item.uatName !== item.name ? ` (${item.uatName})` : ""}, ${item.county}`;
      input.dataset.localityId = item.id;
      localStorage.setItem("lacurent-energy-locality", JSON.stringify({ id: item.id, label: input.value }));
      results.hidden = true;
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".energy-locality-picker")) results.hidden = true;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFriendlyCalculator();
    initIntakeLocality();
  });
})();
