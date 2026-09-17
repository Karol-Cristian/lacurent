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

  const LABEL_LIMITS = Object.freeze([
    { zoomBelow: 1.45, maxLabels: 14, maxMarkers: 90 },
    { zoomBelow: 2.4, maxLabels: 32, maxMarkers: 180 },
    { zoomBelow: 4.0, maxLabels: 60, maxMarkers: 360 },
    { zoomBelow: 6.0, maxLabels: 95, maxMarkers: 700 },
    { zoomBelow: Infinity, maxLabels: 140, maxMarkers: 1200 }
  ]);

  const LABEL_STYLES = Object.freeze({
    1: { fontSize: 12, radius: 4.3, weight: 900 },
    2: { fontSize: 11, radius: 3.6, weight: 850 },
    3: { fontSize: 10, radius: 3.0, weight: 800 },
    4: { fontSize: 9, radius: 2.4, weight: 760 },
    5: { fontSize: 8.3, radius: 2.0, weight: 720 }
  });

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

  function localityTier(locality) {
    const type = String(locality.localityType || "").toLowerCase();
    const importance = Number(locality.importance || 0);
    if (importance >= 900000) return 1;
    if (importance >= 350000 || type === "municipiu") return 2;
    if (importance >= 100000 || type === "oras" || type === "oraș" || type === "sector") return 3;
    if (type === "comuna" || type === "comună") return 4;
    return 5;
  }

  function labelSettings(zoom) {
    return LABEL_LIMITS.find((item) => zoom < item.zoomBelow) || LABEL_LIMITS[LABEL_LIMITS.length - 1];
  }

  function labelBox(screenX, screenY, name, style, position) {
    const width = Math.max(28, name.length * style.fontSize * 0.57 + 8);
    const height = style.fontSize + 6;
    const gap = style.radius + 4;
    const positions = {
      right: { x: screenX + gap, y: screenY - height / 2, tx: gap, ty: 4, anchor: "start" },
      left: { x: screenX - gap - width, y: screenY - height / 2, tx: -gap, ty: 4, anchor: "end" },
      above: { x: screenX - width / 2, y: screenY - gap - height, tx: 0, ty: -gap - 2, anchor: "middle" },
      below: { x: screenX - width / 2, y: screenY + gap, tx: 0, ty: gap + style.fontSize, anchor: "middle" }
    };
    return { ...positions[position], width, height };
  }

  function boxesOverlap(a, b, padding = 7) {
    return !(
      a.x + a.width + padding < b.x ||
      b.x + b.width + padding < a.x ||
      a.y + a.height + padding < b.y ||
      b.y + b.height + padding < a.y
    );
  }

  function boxInside(box, width, height) {
    return box.x >= 4 && box.y >= 4 && box.x + box.width <= width - 4 && box.y + box.height <= height - 4;
  }

  function escapeAttr(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function initMapGestures() {
    const map = document.getElementById("romaniaLocationMap");
    const card = map?.closest(".romania-map-card");
    if (!map || !card) return;

    const controls = document.createElement("div");
    controls.className = "map-controls";
    controls.innerHTML = '<button type="button" data-map-zoom="in" aria-label="Mărește harta">+</button><button type="button" data-map-zoom="out" aria-label="Micșorează harta">−</button><button type="button" data-map-zoom="reset" aria-label="Resetează harta">↺</button>';
    card.appendChild(controls);
    const hint = document.createElement("p");
    hint.className = "map-gesture-hint";
    hint.textContent = "Scroll pentru zoom · trage pentru deplasare · două degete pe telefon";
    card.appendChild(hint);

    let base = null;
    let view = null;
    let drag = null;
    let draggedRecently = false;
    const pointers = new Map();
    let pinch = null;
    let renderFrame = null;

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

    function scheduleLocalityRender() {
      if (renderFrame) cancelAnimationFrame(renderFrame);
      renderFrame = requestAnimationFrame(renderVisibleLocalities);
    }

    function renderVisibleLocalities() {
      renderFrame = null;
      const node = ensureView();
      const state = window.__lacurentLocationState;
      const layer = node?.querySelector(".map-localities");
      if (!node || !layer || !state?.data || !state?.projection || !view || !base) return;

      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const zoom = base.width / view.width;
      const settings = labelSettings(zoom);
      const mapUnitsPerPixel = view.width / rect.width;
      const marginX = view.width * 0.04;
      const marginY = view.height * 0.04;

      const candidates = state.data.localities
        .filter((locality) => Number.isFinite(locality.lon) && Number.isFinite(locality.lat))
        .map((locality) => {
          const [x, y] = state.projection.project(locality.lon, locality.lat);
          const selected = locality.id === state.selected?.id;
          return { locality, x, y, selected, tier: localityTier(locality) };
        })
        .filter((item) => item.selected || (
          item.x >= view.x - marginX && item.x <= view.x + view.width + marginX &&
          item.y >= view.y - marginY && item.y <= view.y + view.height + marginY
        ))
        .sort((a, b) => Number(b.selected) - Number(a.selected) || a.tier - b.tier || (b.locality.importance || 0) - (a.locality.importance || 0))
        .slice(0, settings.maxMarkers);

      const acceptedBoxes = [];
      let labelCount = 0;
      const markerHtml = candidates.map((item) => {
        const style = LABEL_STYLES[item.tier] || LABEL_STYLES[5];
        const screenX = ((item.x - view.x) / view.width) * rect.width;
        const screenY = ((item.y - view.y) / view.height) * rect.height;
        let placement = null;

        if (item.selected || labelCount < settings.maxLabels) {
          for (const position of ["right", "left", "above", "below"]) {
            const box = labelBox(screenX, screenY, item.locality.name, style, position);
            if ((item.selected || boxInside(box, rect.width, rect.height)) && (item.selected || !acceptedBoxes.some((used) => boxesOverlap(box, used)))) {
              placement = box;
              if (!item.selected) acceptedBoxes.push(box);
              labelCount += 1;
              break;
            }
          }
        }

        const radius = item.selected ? Math.max(style.radius + 2.2, 5.2) : style.radius;
        const innerScale = mapUnitsPerPixel;
        const label = placement
          ? `<text x="${placement.tx.toFixed(2)}" y="${placement.ty.toFixed(2)}" text-anchor="${placement.anchor}" style="font-size:${style.fontSize}px;font-weight:${style.weight}">${escapeAttr(item.locality.name)}</text>`
          : "";
        return `
          <g class="locality-marker${item.selected ? " selected" : ""}" data-locality-id="${escapeAttr(item.locality.id)}" tabindex="0" role="button" aria-label="${escapeAttr(item.locality.name)}, ${escapeAttr(item.locality.county)}" transform="translate(${item.x.toFixed(2)} ${item.y.toFixed(2)})">
            <g class="locality-marker-screen" transform="scale(${innerScale.toFixed(6)})">
              <circle cx="0" cy="0" r="${radius.toFixed(2)}"></circle>
              ${label}
            </g>
          </g>`;
      }).join("");

      layer.innerHTML = markerHtml;
      state.renderedLocalities = candidates;
    }

    function applyView() {
      const node = svg();
      if (node && view) {
        node.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`);
        scheduleLocalityRender();
      }
    }

    function zoomAt(clientX, clientY, factor) {
      const node = ensureView();
      if (!node || !base || !view) return;
      const rect = node.getBoundingClientRect();
      const px = view.x + ((clientX - rect.left) / rect.width) * view.width;
      const py = view.y + ((clientY - rect.top) / rect.height) * view.height;
      const nextWidth = clamp(view.width * factor, base.width / 8, base.width);
      const nextHeight = nextWidth * (base.height / base.width);
      const rx = (px - view.x) / view.width;
      const ry = (py - view.y) / view.height;
      view = {
        x: px - rx * nextWidth,
        y: py - ry * nextHeight,
        width: nextWidth,
        height: nextHeight
      };
      view.x = clamp(view.x, base.x, base.x + base.width - view.width);
      view.y = clamp(view.y, base.y, base.y + base.height - view.height);
      applyView();
    }

    function resetView() {
      if (!base) ensureView();
      if (base) {
        view = { ...base };
        applyView();
      }
    }

    map.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 0.84 : 1.18);
    }, { passive: false });

    map.addEventListener("pointerdown", (event) => {
      ensureView();
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
          const centerX = (a.x + b.x) / 2;
          const centerY = (a.y + b.y) / 2;
          const desiredWidth = clamp(pinch.width * (pinch.distance / distance), base.width / 8, base.width);
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

    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        const node = ensureView();
        if (node && view) node.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`);
        scheduleLocalityRender();
      });
    });
    observer.observe(map, { childList: true, subtree: false });

    const resizeObserver = new ResizeObserver(() => scheduleLocalityRender());
    resizeObserver.observe(map);

    const timer = setInterval(() => {
      if (ensureView() && window.__lacurentLocationState?.data) {
        scheduleLocalityRender();
        clearInterval(timer);
      }
    }, 100);
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
