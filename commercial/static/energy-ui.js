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
    condensing_gas_boiler: { type: "condensing_gas_boiler", carrier: "natural_gas", efficiency: 0.94, scop: 3.2 },
    gas_boiler: { type: "gas_boiler", carrier: "natural_gas", efficiency: 0.85, scop: 3.2 },
    electric_resistance: { type: "electric_resistance", carrier: "electricity", efficiency: 1, scop: 3.2 },
    heat_pump: { type: "heat_pump", carrier: "electricity", efficiency: 1, scop: 3.2 },
    wood_stove: { type: "custom", carrier: "biomass", efficiency: 0.75, scop: 3.2 },
    wood_boiler: { type: "custom", carrier: "biomass", efficiency: 0.80, scop: 3.2 },
    pellet_boiler: { type: "custom", carrier: "biomass", efficiency: 0.88, scop: 3.2 },
    district_heat: { type: "district_heat", carrier: "district_heat", efficiency: 0.95, scop: 3.2 },
    custom: { type: "custom", carrier: "other", efficiency: 0.85, scop: 3.2 }
  };

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

    const dhwCarrier = profile.carrier === "other"
      ? "electricity"
      : profile.carrier === "biomass"
        ? "biomass"
        : profile.carrier;
    if (byName(form, "expert_dhw_override")?.value !== "on") {
      setValue(form, "dhw_carrier", dhwCarrier);
    }
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
    form.addEventListener("submit", recalculate, { capture: true });
    recalculate();

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

  function initMapGestures() {
    const map = document.getElementById("romaniaLocationMap");
    const card = map?.closest(".romania-map-card");
    if (!map || !card) return;

    const controls = document.createElement("div");
    controls.className = "map-controls";
    controls.innerHTML = '<button type="button" data-map-zoom="in" aria-label="Zoom in">+</button><button type="button" data-map-zoom="out" aria-label="Zoom out">−</button><button type="button" data-map-zoom="reset" aria-label="Reset map view">↺</button>';
    card.appendChild(controls);
    const hint = document.createElement("p");
    hint.className = "map-gesture-hint";
    hint.textContent = "Scroll to zoom · drag to move · pinch on phone";
    card.appendChild(hint);

    let base = null;
    let view = null;
    let drag = null;
    let draggedRecently = false;
    const pointers = new Map();
    let pinch = null;

    function svg() { return map.querySelector("svg.romania-map-svg"); }
    function parseBase(node) {
      const box = node?.viewBox?.baseVal;
      if (!box || !box.width || !box.height) return null;
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }
    function ensureView() {
      const node = svg();
      if (!node) return null;
      const freshBase = parseBase(node);
      if (!base && freshBase) {
        base = freshBase;
        view = { ...base };
      }
      if (view) node.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`);
      return node;
    }
    function applyView() {
      const node = svg();
      if (node && view) node.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`);
    }
    function zoomAt(clientX, clientY, factor) {
      const node = ensureView();
      if (!node || !base || !view) return;
      const rect = node.getBoundingClientRect();
      const px = view.x + ((clientX - rect.left) / rect.width) * view.width;
      const py = view.y + ((clientY - rect.top) / rect.height) * view.height;
      const nextWidth = clamp(view.width * factor, base.width / 5, base.width);
      const nextHeight = nextWidth * (base.height / base.width);
      const rx = (px - view.x) / view.width;
      const ry = (py - view.y) / view.height;
      view = {
        x: px - rx * nextWidth,
        y: py - ry * nextHeight,
        width: nextWidth,
        height: nextHeight
      };
      const minX = base.x;
      const minY = base.y;
      view.x = clamp(view.x, minX, base.x + base.width - view.width);
      view.y = clamp(view.y, minY, base.y + base.height - view.height);
      applyView();
    }
    function resetView() {
      if (!base) ensureView();
      if (base) { view = { ...base }; applyView(); }
    }

    map.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 0.84 : 1.18);
    }, { passive: false });

    map.addEventListener("pointerdown", (event) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      map.setPointerCapture?.(event.pointerId);
      if (pointers.size === 1 && view) {
        drag = { x: event.clientX, y: event.clientY, view: { ...view } };
        draggedRecently = false;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), width: view?.width || 0 };
        drag = null;
      }
    });

    map.addEventListener("pointermove", (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const node = ensureView();
      if (!node || !base || !view) return;
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance > 0) {
          const rect = node.getBoundingClientRect();
          const centerX = (a.x + b.x) / 2;
          const centerY = (a.y + b.y) / 2;
          const desiredWidth = clamp(pinch.width * (pinch.distance / distance), base.width / 5, base.width);
          zoomAt(centerX, centerY, desiredWidth / view.width);
          draggedRecently = true;
        }
      } else if (drag && pointers.size === 1) {
        const rect = node.getBoundingClientRect();
        const dx = (event.clientX - drag.x) * (drag.view.width / rect.width);
        const dy = (event.clientY - drag.y) * (drag.view.height / rect.height);
        if (Math.abs(dx) + Math.abs(dy) > 2) draggedRecently = true;
        view.x = clamp(drag.view.x - dx, base.x, base.x + base.width - view.width);
        view.y = clamp(drag.view.y - dy, base.y, base.y + base.height - view.height);
        applyView();
        map.classList.add("is-panning");
      }
    });

    const finishPointer = (event) => {
      pointers.delete(event.pointerId);
      map.classList.remove("is-panning");
      if (pointers.size < 2) pinch = null;
      if (!pointers.size) drag = null;
      if (draggedRecently) setTimeout(() => { draggedRecently = false; }, 50);
    };
    map.addEventListener("pointerup", finishPointer);
    map.addEventListener("pointercancel", finishPointer);
    map.addEventListener("click", (event) => {
      if (!draggedRecently) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    controls.addEventListener("click", (event) => {
      const action = event.target.closest("button")?.dataset.mapZoom;
      const rect = map.getBoundingClientRect();
      if (action === "reset") resetView();
      if (action === "in") zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.76);
      if (action === "out") zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.30);
    });

    function addMoreLabels() {
      const node = ensureView();
      const state = window.__lacurentLocationState;
      if (!node || !state?.renderedLocalities) return;
      state.renderedLocalities.slice(0, 38).forEach((item) => {
        const marker = node.querySelector(`.locality-marker[data-locality-id="${CSS.escape(item.locality.id)}"]`);
        if (!marker || marker.querySelector("text")) return;
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", String(item.x + 6));
        text.setAttribute("y", String(item.y - 4));
        text.textContent = item.locality.name;
        marker.appendChild(text);
      });
    }

    const observer = new MutationObserver(() => requestAnimationFrame(addMoreLabels));
    observer.observe(map, { childList: true, subtree: false });
    const timer = setInterval(() => {
      if (ensureView()) {
        addMoreLabels();
        if (window.__lacurentLocationState?.data) clearInterval(timer);
      }
    }, 120);
  }

  function normalize(text) {
    return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
    initMapGestures();
    initIntakeLocality();
  });
})();
