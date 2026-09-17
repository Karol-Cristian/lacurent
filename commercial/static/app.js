const form = document.getElementById("calculationForm");

function normalizeLocationText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function localityShortLabel(locality) {
  if (!locality) return "";
  const uat = locality.uatName && locality.uatName !== locality.name
    ? ` (${locality.uatName})`
    : "";
  return `${locality.name}${uat}, ${locality.county}`;
}

function localityTypeLabel(localityType) {
  const labels = {
    municipiu: "municipiu",
    oras: "oraș",
    oraș: "oraș",
    comuna: "comună",
    comună: "comună",
    sat: "sat",
    "localitate componenta municipiu": "localitate componentă a municipiului",
    "localitate componenta oras": "localitate componentă a orașului",
    "sat apartinator municipiu": "sat aparținător municipiului",
    "sat apartinator oras": "sat aparținător orașului",
    sector: "sector"
  };
  return labels[String(localityType || "").toLowerCase()] || String(localityType || "localitate");
}

function localityDisplayLabel(locality) {
  if (!locality) return "";
  const uat = locality.uatName && locality.uatName !== locality.name
    ? `, UAT ${locality.uatName}`
    : "";
  return `${locality.name}, ${localityTypeLabel(locality.localityType)} - ${locality.county}${uat}`;
}

function geometryRings(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates || [];
  if (geometry.type === "MultiPolygon") return (geometry.coordinates || []).flat();
  return [];
}

function walkCoordinates(value, visit) {
  if (Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    visit(value);
    return;
  }
  if (Array.isArray(value)) value.forEach((item) => walkCoordinates(item, visit));
}

function boundsForCollections(...collections) {
  const bounds = { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity };
  for (const collection of collections) {
    for (const feature of collection?.features || []) {
      walkCoordinates(feature.geometry?.coordinates, ([lon, lat]) => {
        bounds.minLon = Math.min(bounds.minLon, lon);
        bounds.maxLon = Math.max(bounds.maxLon, lon);
        bounds.minLat = Math.min(bounds.minLat, lat);
        bounds.maxLat = Math.max(bounds.maxLat, lat);
      });
    }
  }
  return bounds;
}

function createProjection(data) {
  const bounds = boundsForCollections(data.climateZones, data.romaniaBoundary);
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const lonScale = Math.cos((midLat * Math.PI) / 180);
  const scale = 84;
  const padding = 24;
  const width = ((bounds.maxLon - bounds.minLon) * lonScale * scale) + padding * 2;
  const height = ((bounds.maxLat - bounds.minLat) * scale) + padding * 2;
  return {
    width,
    height,
    project(lon, lat) {
      return [
        padding + ((lon - bounds.minLon) * lonScale * scale),
        padding + ((bounds.maxLat - lat) * scale)
      ];
    }
  };
}

function pathForRing(ring, projection) {
  return ring.map((point, index) => {
    const [x, y] = projection.project(point[0], point[1]);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function pathForGeometry(geometry, projection) {
  return geometryRings(geometry).map((ring) => pathForRing(ring, projection)).join(" ");
}

function svgPointFromEvent(svg, event) {
  const ctm = svg.getScreenCTM?.();
  if (!ctm) return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(ctm.inverse());
}

function locationSearchResults(data, query, limit = 12) {
  const normalized = normalizeLocationText(query);
  if (normalized.length < 2) return [];
  const terms = normalized.split(" ").filter(Boolean);
  return data.localities
    .map((locality) => {
      if (!terms.every((term) => locality.search.includes(term))) return null;
      const normalizedName = normalizeLocationText(locality.name);
      const exact = normalizedName === normalized;
      const starts = normalizedName.startsWith(normalized);
      const countyStarts = normalizeLocationText(locality.county).startsWith(normalized);
      return {
        locality,
        score:
          (exact ? 5_000_000 : 0)
          + (starts ? 1_000_000 : 0)
          + (countyStarts ? 240_000 : 0)
          + (locality.importance || 0)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.locality.name.localeCompare(b.locality.name, "ro"))
    .slice(0, limit)
    .map((item) => item.locality);
}

const LABEL_LIMITS = [
  { zoomBelow: 1.45, maxLabels: 24 },
  { zoomBelow: 2.4, maxLabels: 42 },
  { zoomBelow: 4.0, maxLabels: 70 },
  { zoomBelow: 6.0, maxLabels: 90 },
  { zoomBelow: Infinity, maxLabels: 120 }
];

const LOCALITY_LABEL_STYLES = {
  1: { fontSize: 13.0, radius: 4.0, weight: 850 },
  2: { fontSize: 11.8, radius: 3.4, weight: 800 },
  3: { fontSize: 10.8, radius: 2.8, weight: 760 },
  4: { fontSize: 10.0, radius: 2.2, weight: 720 },
  5: { fontSize: 9.4, radius: 1.8, weight: 680 }
};

function markerTier(locality) {
  const population = Number(locality.population2002) || 0;
  const rank = String(locality.rank ?? "");
  if (rank === "0" || rank === "I" || population >= 200000) return 1;
  if (rank === "II" || population >= 55000) return 2;
  if (rank === "III" || population >= 12000) return 3;
  if (String(locality.localityType || "").toLowerCase().includes("comuna") || population >= 1500) return 4;
  return 5;
}

function markerStyle(tier, selected = false) {
  const style = LOCALITY_LABEL_STYLES[tier] || LOCALITY_LABEL_STYLES[5];
  return selected
    ? { ...style, fontSize: Math.max(style.fontSize + 1.4, 12), radius: Math.max(style.radius + 1.3, 4.6), weight: 900 }
    : style;
}

function labelLimitForZoom(zoom) {
  return LABEL_LIMITS.find((limit) => zoom < limit.zoomBelow)?.maxLabels || 24;
}

function labelWidthPx(locality, fontSize) {
  const text = locality.name || "";
  return Math.min(230, Math.max(36, (text.length * fontSize * 0.61) + 18));
}

function labelBox(screen, locality, style, position) {
  const width = labelWidthPx(locality, style.fontSize);
  const height = style.fontSize + 9;
  const offset = style.radius + 9;
  const candidates = {
    right: {
      anchor: "start",
      box: { x1: screen.x + offset, x2: screen.x + offset + width, y1: screen.y - (height * 0.78), y2: screen.y + (height * 0.22) },
      x: offset,
      y: -3
    },
    left: {
      anchor: "end",
      box: { x1: screen.x - offset - width, x2: screen.x - offset, y1: screen.y - (height * 0.78), y2: screen.y + (height * 0.22) },
      x: -offset,
      y: -3
    },
    above: {
      anchor: "middle",
      box: { x1: screen.x - width / 2, x2: screen.x + width / 2, y1: screen.y - offset - height, y2: screen.y - offset },
      x: 0,
      y: -offset
    },
    below: {
      anchor: "middle",
      box: { x1: screen.x - width / 2, x2: screen.x + width / 2, y1: screen.y + offset, y2: screen.y + offset + height },
      x: 0,
      y: offset + style.fontSize * 0.35
    }
  };
  return { ...candidates[position], fontSize: style.fontSize, fontWeight: style.weight, position };
}

function boxesOverlap(a, b, padding = 6) {
  return !(a.x2 + padding < b.x1 || a.x1 - padding > b.x2 || a.y2 + padding < b.y1 || a.y1 - padding > b.y2);
}

function declutterLocalityLabels(markers, viewBox, renderedWidth, selectedId) {
  const renderedHeight = renderedWidth * (viewBox.height / viewBox.width);
  const zoom = markers.zoom || 1;
  const maxLabels = labelLimitForZoom(zoom);
  const acceptedBoxes = [];
  const accepted = new Map();
  const sorted = [...markers].sort((a, b) => {
    if (a.locality.id === selectedId) return -1;
    if (b.locality.id === selectedId) return 1;
    return a.tier - b.tier || (b.locality.importance || 0) - (a.locality.importance || 0) || a.locality.name.localeCompare(b.locality.name, "ro");
  });

  for (const marker of sorted) {
    const selected = marker.locality.id === selectedId;
    if (!selected && accepted.size >= maxLabels) continue;
    const screen = {
      x: ((marker.x - viewBox.x) / viewBox.width) * renderedWidth,
      y: ((marker.y - viewBox.y) / viewBox.height) * renderedHeight
    };
    const style = markerStyle(marker.tier, selected);
    const positions = selected ? ["right", "left", "above", "below"] : marker.tier <= 2 ? ["right", "left", "above", "below"] : ["right", "above", "left", "below"];
    let chosen = null;
    for (const position of positions) {
      const candidate = labelBox(screen, marker.locality, style, position);
      const inCanvas = candidate.box.x2 >= 6 && candidate.box.x1 <= renderedWidth - 6 && candidate.box.y2 >= 6 && candidate.box.y1 <= renderedHeight - 6;
      if (!inCanvas && !selected) continue;
      if (selected || !acceptedBoxes.some((box) => boxesOverlap(candidate.box, box))) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen && selected) chosen = labelBox(screen, marker.locality, style, "right");
    if (!chosen) continue;
    acceptedBoxes.push(chosen.box);
    accepted.set(marker.locality.id, chosen);
  }
  return accepted;
}

function initLocationSelector() {
  const root = document.querySelector("[data-location-selector]");
  if (!root) return;

  const input = document.getElementById("localitySearch");
  const hiddenId = document.getElementById("localityId");
  const results = document.getElementById("localityResults");
  const mapResults = document.getElementById("mapLocalityResults");
  const map = document.getElementById("romaniaLocationMap");
  const name = document.getElementById("selectedLocationName");
  const zone = document.getElementById("selectedClimateZone");
  const designTemp = document.getElementById("selectedDesignTemperature");
  const station = document.getElementById("selectedClimateStation");
  const resolution = document.getElementById("selectedClimateResolution");

  const state = {
    data: null,
    byId: new Map(),
    projection: null,
    baseViewBox: null,
    viewBox: null,
    renderedLocalities: [],
    selected: null,
    activeIndex: -1,
    searchResults: [],
    renderFrame: null
  };

  const pointers = new Map();
  let drag = null;
  let pinchDistance = null;
  let movedRecently = false;

  function mapZoomLevel() {
    if (!state.baseViewBox || !state.viewBox) return 1;
    return state.baseViewBox.width / state.viewBox.width;
  }

  function clampView(view) {
    if (!state.baseViewBox) return view;
    const base = state.baseViewBox;
    const width = Math.min(base.width, Math.max(base.width / 8, view.width));
    const height = width * (base.height / base.width);
    return {
      x: Math.min(base.x + base.width - width, Math.max(base.x, view.x)),
      y: Math.min(base.y + base.height - height, Math.max(base.y, view.y)),
      width,
      height
    };
  }

  function visibleLocalityMarkers() {
    const projection = state.projection;
    const view = state.viewBox;
    if (!projection || !view || !state.data) return [];
    const zoom = mapZoomLevel();
    const tierLimit = zoom < 1.45 ? 2 : zoom < 2.4 ? 3 : zoom < 4 ? 4 : 5;
    const maxCount = zoom < 1.45 ? 80 : zoom < 2.4 ? 180 : zoom < 4 ? 450 : zoom < 6 ? 700 : 1000;
    const margin = 12 / zoom;
    const selectedId = state.selected?.id;
    const visible = [];

    for (const locality of state.data.localities) {
      if (!Number.isFinite(locality.lon) || !Number.isFinite(locality.lat)) continue;
      const [x, y] = projection.project(locality.lon, locality.lat);
      if (x < view.x - margin || x > view.x + view.width + margin || y < view.y - margin || y > view.y + view.height + margin) continue;
      const tier = markerTier(locality);
      if (tier > tierLimit && locality.id !== selectedId) continue;
      visible.push({ locality, tier, x, y });
    }

    visible.sort((a, b) => {
      if (a.locality.id === selectedId) return -1;
      if (b.locality.id === selectedId) return 1;
      return a.tier - b.tier || (b.locality.importance || 0) - (a.locality.importance || 0);
    });
    visible.length = Math.min(visible.length, maxCount);
    visible.zoom = zoom;
    return visible;
  }

  function nearestLocalities(svg, event, limit = 6) {
    const point = svgPointFromEvent(svg, event);
    if (!point || !state.projection || !state.data) return [];
    return state.data.localities
      .filter((locality) => Number.isFinite(locality.lon) && Number.isFinite(locality.lat))
      .map((locality) => {
        const [x, y] = state.projection.project(locality.lon, locality.lat);
        return { locality, distance: Math.hypot(point.x - x, point.y - y) };
      })
      .sort((a, b) => a.distance - b.distance || (b.locality.importance || 0) - (a.locality.importance || 0))
      .slice(0, limit)
      .map((item) => item.locality);
  }

  function renderMapCandidates(localities) {
    if (!mapResults) return;
    if (!localities.length) {
      mapResults.hidden = true;
      mapResults.innerHTML = "";
      return;
    }
    mapResults.innerHTML = `
      <h4>Localități apropiate de punctul ales</h4>
      ${localities.map((locality) => `
        <button class="locality-option" type="button" data-map-locality-id="${escapeHtml(locality.id)}">
          <strong>${escapeHtml(locality.name)}</strong>
          <em>${escapeHtml(locality.countyMnemonic || locality.county)}</em>
          <span>${escapeHtml(localityTypeLabel(locality.localityType))}${locality.uatName && locality.uatName !== locality.name ? `, ${escapeHtml(locality.uatName)}` : ""} - ${escapeHtml(locality.county)}</span>
        </button>
      `).join("")}
    `;
    mapResults.hidden = false;
  }

  function setHiddenLocalityId(value) {
    hiddenId.value = value || "";
    hiddenId.setAttribute("value", hiddenId.value);
  }

  function updateSelected(locality) {
    if (!locality) return;
    state.selected = locality;
    input.value = localityShortLabel(locality);
    setHiddenLocalityId(locality.id);
    name.textContent = localityDisplayLabel(locality);
    zone.textContent = locality.climateZone ? `Zona ${locality.climateZone}` : "-";
    designTemp.textContent = Number.isFinite(locality.winterDesignTemperatureC)
      ? `${locality.winterDesignTemperatureC} °C`
      : "-";
    station.textContent = locality.stationName || "-";
    resolution.textContent = locality.stationResolution === "exact"
      ? "Datele climatice sunt preluate automat de la stația asociată localității."
      : `Date climatice reprezentative: stația ${locality.stationName || "-"}${Number.isFinite(locality.stationDistanceKm) ? `, la aproximativ ${locality.stationDistanceKm} km` : ""}.`;
    scheduleRenderMap();
  }

  function renderedWidth() {
    const width = Number(map?.clientWidth) || 1000;
    return Math.max(320, Math.min(1380, width - 36));
  }

  function renderMap() {
    if (!state.data || !map) return;
    const projection = state.projection || createProjection(state.data);
    state.projection = projection;
    if (!state.baseViewBox) {
      state.baseViewBox = { x: 0, y: 0, width: projection.width, height: projection.height };
      state.viewBox = { ...state.baseViewBox };
    }
    state.viewBox = clampView(state.viewBox || state.baseViewBox);
    const view = state.viewBox;
    const selectedZone = state.selected?.climateZone;

    const zonePaths = (state.data.climateZones.features || []).map((feature) => {
      const featureZone = feature.properties?.zone || "";
      return `<path class="map-zone zone-${escapeHtml(featureZone)}${featureZone === selectedZone ? " selected" : ""}" data-zone="${escapeHtml(featureZone)}" d="${pathForGeometry(feature.geometry, projection)}"></path>`;
    }).join("");

    const boundaryPaths = (state.data.romaniaBoundary.features || []).map((feature) => (
      `<path class="romania-boundary" d="${pathForGeometry(feature.geometry, projection)}"></path>`
    )).join("");

    const markers = visibleLocalityMarkers();
    state.renderedLocalities = markers;
    const collisionWidth = renderedWidth();
    const labels = declutterLocalityLabels(markers, view, collisionWidth, state.selected?.id);
    const screenScale = Math.max(0.08, Math.min(2.5, view.width / collisionWidth));

    const markerHtml = markers.map((item) => {
      const selected = item.locality.id === state.selected?.id;
      const label = labels.get(item.locality.id);
      const style = markerStyle(item.tier, selected);
      return `
        <g class="locality-marker tier-${item.tier}${selected ? " selected" : ""}" data-locality-id="${escapeHtml(item.locality.id)}" tabindex="0" role="button" aria-label="${escapeHtml(localityShortLabel(item.locality))}" transform="translate(${item.x.toFixed(2)} ${item.y.toFixed(2)}) scale(${screenScale.toFixed(5)})">
          <circle cx="0" cy="0" r="${style.radius.toFixed(2)}"></circle>
          ${label ? `<text class="locality-label" x="${label.x.toFixed(1)}" y="${label.y.toFixed(1)}" text-anchor="${label.anchor}" style="font-size:${label.fontSize.toFixed(1)}px;font-weight:${label.fontWeight}">${escapeHtml(item.locality.name)}</text>` : ""}
        </g>
      `;
    }).join("");

    const legend = ["I", "II", "III", "IV", "V"].map((item) => (
      `<span><i class="legend-${item}"></i>Zona ${item}</span>`
    )).join("");

    map.innerHTML = `
      <svg class="romania-map-svg" viewBox="${view.x.toFixed(2)} ${view.y.toFixed(2)} ${view.width.toFixed(2)} ${view.height.toFixed(2)}" preserveAspectRatio="xMidYMid meet" aria-label="Hartă climatică și localități din România" data-map-zoom="${mapZoomLevel().toFixed(2)}">
        <rect class="map-sea" x="0" y="0" width="${projection.width.toFixed(2)}" height="${projection.height.toFixed(2)}"></rect>
        <g class="map-zones">${zonePaths}</g>
        <g class="map-boundary">${boundaryPaths}</g>
        <g class="map-localities">${markerHtml}</g>
      </svg>
      <div class="map-controls" aria-label="Comenzi hartă">
        <button type="button" data-map-action="in" aria-label="Mărește harta">+</button>
        <button type="button" data-map-action="out" aria-label="Micșorează harta">−</button>
        <button type="button" data-map-action="reset" aria-label="Resetează harta">↺</button>
      </div>
      <p class="map-gesture-hint">Rotiță: zoom · trage: deplasare · telefon: două degete</p>
      <div class="map-legend" aria-label="Legendă zone climatice">${legend}</div>
    `;
  }

  function scheduleRenderMap() {
    if (state.renderFrame) return;
    state.renderFrame = requestAnimationFrame(() => {
      state.renderFrame = null;
      renderMap();
    });
  }

  function zoomAt(clientX, clientY, factor) {
    const svg = map?.querySelector("svg.romania-map-svg");
    if (!svg || !state.viewBox || !state.baseViewBox) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const current = state.viewBox;
    const pointX = current.x + ((clientX - rect.left) / rect.width) * current.width;
    const pointY = current.y + ((clientY - rect.top) / rect.height) * current.height;
    const nextWidth = Math.min(state.baseViewBox.width, Math.max(state.baseViewBox.width / 8, current.width * factor));
    const nextHeight = nextWidth * (state.baseViewBox.height / state.baseViewBox.width);
    const ratioX = (pointX - current.x) / current.width;
    const ratioY = (pointY - current.y) / current.height;
    state.viewBox = clampView({
      x: pointX - ratioX * nextWidth,
      y: pointY - ratioY * nextHeight,
      width: nextWidth,
      height: nextHeight
    });
    scheduleRenderMap();
  }

  function resetView() {
    if (!state.baseViewBox) return;
    state.viewBox = { ...state.baseViewBox };
    scheduleRenderMap();
  }

  function hideResults() {
    state.activeIndex = -1;
    state.searchResults = [];
    results.hidden = true;
    results.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function renderResults(query, activeIndex = 0) {
    state.searchResults = locationSearchResults(state.data, query);
    state.activeIndex = state.searchResults.length
      ? Math.max(0, Math.min(state.searchResults.length - 1, activeIndex))
      : -1;
    input.setAttribute("aria-expanded", state.searchResults.length ? "true" : "false");
    if (!state.searchResults.length) {
      results.innerHTML = `<div class="locality-no-results">Nu am găsit o localitate corespunzătoare în registrul disponibil.</div>`;
      results.hidden = false;
      return;
    }
    results.innerHTML = state.searchResults.map((locality, index) => `
      <button class="locality-option${index === state.activeIndex ? " active" : ""}" id="locality-option-${index}" type="button" role="option" aria-selected="${index === state.activeIndex ? "true" : "false"}" data-locality-id="${escapeHtml(locality.id)}">
        <strong>${escapeHtml(locality.name)}</strong>
        <em>${escapeHtml(locality.countyMnemonic || locality.county)}</em>
        <span>${escapeHtml(localityTypeLabel(locality.localityType))}${locality.uatName && locality.uatName !== locality.name ? `, UAT ${escapeHtml(locality.uatName)}` : ""} - ${escapeHtml(locality.county)}</span>
      </button>
    `).join("");
    input.setAttribute("aria-activedescendant", `locality-option-${state.activeIndex}`);
    results.hidden = false;
  }

  function selectFromResults(index) {
    const locality = state.searchResults[index];
    if (!locality) return;
    updateSelected(locality);
    hideResults();
  }

  fetch("/api/location-data")
    .then((response) => {
      if (!response.ok) throw new Error("Datele geografice nu sunt disponibile.");
      return response.json();
    })
    .then((data) => {
      state.data = data;
      state.byId = new Map(data.localities.map((item) => [item.id, item]));
      state.projection = createProjection(data);
      state.baseViewBox = { x: 0, y: 0, width: state.projection.width, height: state.projection.height };
      state.viewBox = { ...state.baseViewBox };
      const initial =
        state.byId.get(root.dataset.initialLocalityId)
        || locationSearchResults(data, root.dataset.initialLocality || "", 1)[0]
        || state.byId.get("siruta-54984")
        || data.localities[0];
      updateSelected(initial);
      window.__lacurentLocationState = state;
    })
    .catch(() => {
      map.innerHTML = "<p>Harta nu a putut fi încărcată. Căutarea text rămâne disponibilă.</p>";
      name.textContent = input.value || "Nicio localitate selectată";
      setHiddenLocalityId("");
    });

  input?.addEventListener("input", () => {
    if (!state.data) return;
    setHiddenLocalityId("");
    renderResults(input.value);
  });

  input?.addEventListener("keydown", (event) => {
    if (!state.searchResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      renderResults(input.value, state.activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      renderResults(input.value, state.activeIndex - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectFromResults(state.activeIndex);
    } else if (event.key === "Escape") {
      hideResults();
    }
  });

  results?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-locality-id]");
    if (option) updateSelected(state.byId.get(option.dataset.localityId));
    hideResults();
  });

  map?.addEventListener("wheel", (event) => {
    if (!state.data || !event.target.closest?.("svg.romania-map-svg")) return;
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 0.84 : 1.18);
  }, { passive: false });

  map?.addEventListener("pointerdown", (event) => {
    if (!event.target.closest?.("svg.romania-map-svg")) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    map.setPointerCapture?.(event.pointerId);
    movedRecently = false;
    if (pointers.size === 1 && state.viewBox) {
      drag = { x: event.clientX, y: event.clientY, view: { ...state.viewBox } };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      drag = null;
    }
  });

  map?.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId) || !state.viewBox || !state.baseViewBox) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const svg = map.querySelector("svg.romania-map-svg");
    if (!svg) return;

    if (pointers.size === 2 && pinchDistance) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 2) {
        const centerX = (a.x + b.x) / 2;
        const centerY = (a.y + b.y) / 2;
        zoomAt(centerX, centerY, pinchDistance / distance);
        pinchDistance = distance;
        movedRecently = true;
      }
      return;
    }

    if (drag && pointers.size === 1) {
      const rect = svg.getBoundingClientRect();
      const dxPixels = event.clientX - drag.x;
      const dyPixels = event.clientY - drag.y;
      if (Math.abs(dxPixels) + Math.abs(dyPixels) > 4) movedRecently = true;
      const dx = dxPixels * (drag.view.width / rect.width);
      const dy = dyPixels * (drag.view.height / rect.height);
      state.viewBox = clampView({ ...drag.view, x: drag.view.x - dx, y: drag.view.y - dy });
      map.classList.add("is-panning");
      scheduleRenderMap();
    }
  });

  const finishPointer = (event) => {
    pointers.delete(event.pointerId);
    map?.classList.remove("is-panning");
    if (pointers.size < 2) pinchDistance = null;
    if (!pointers.size) drag = null;
    if (movedRecently) setTimeout(() => { movedRecently = false; }, 80);
  };
  map?.addEventListener("pointerup", finishPointer);
  map?.addEventListener("pointercancel", finishPointer);

  map?.addEventListener("click", (event) => {
    const action = event.target.closest?.("[data-map-action]")?.dataset.mapAction;
    if (action) {
      const rect = map.getBoundingClientRect();
      if (action === "reset") resetView();
      if (action === "in") zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.76);
      if (action === "out") zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.32);
      return;
    }
    if (movedRecently || !state.data) return;
    const marker = event.target.closest?.(".locality-marker");
    if (marker) {
      updateSelected(state.byId.get(marker.dataset.localityId));
      renderMapCandidates([]);
      return;
    }
    const svg = event.target.closest?.("svg.romania-map-svg");
    if (svg) renderMapCandidates(nearestLocalities(svg, event));
  });

  mapResults?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-map-locality-id]");
    if (!option) return;
    updateSelected(state.byId.get(option.dataset.mapLocalityId));
    renderMapCandidates([]);
  });

  map?.addEventListener("keydown", (event) => {
    const marker = event.target.closest?.(".locality-marker");
    if (!marker || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    updateSelected(state.byId.get(marker.dataset.localityId));
  });

  window.addEventListener("resize", scheduleRenderMap);

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) hideResults();
  });

  form?.addEventListener("submit", () => {
    if (state.selected?.id) setHiddenLocalityId(state.selected.id);
  });
}

if (form) {
  form.addEventListener("submit", () => {
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Se calculează...";
      button.setAttribute("aria-busy", "true");
    }
  });
}

initLocationSelector();

document.getElementById("printButton")?.addEventListener("click", () => {
  window.print();
});
