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

function localityDisplayLabel(locality) {
  if (!locality) return "";
  const uat = locality.uatName && locality.uatName !== locality.name
    ? `, UAT ${locality.uatName}`
    : "";
  return `${locality.name}, ${locality.localityType} - ${locality.county}${uat}`;
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

function initLocationSelector() {
  const root = document.querySelector("[data-location-selector]");
  if (!root) return;

  const input = document.getElementById("localitySearch");
  const hiddenId = document.getElementById("localityId");
  const results = document.getElementById("localityResults");
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
    renderedLocalities: [],
    selected: null,
    activeIndex: -1,
    searchResults: []
  };

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
      ? "Date climatice selectate automat din stația localității."
      : `Date climatice selectate automat: stația reprezentativă ${locality.stationName || "-"}${Number.isFinite(locality.stationDistanceKm) ? `, la ${locality.stationDistanceKm} km` : ""}.`;
    renderMap();
  }

  function prominentLocalities() {
    const selectedId = state.selected?.id;
    const top = state.data.localities
      .filter((item) => Number.isFinite(item.lon) && Number.isFinite(item.lat))
      .sort((a, b) => (b.importance || 0) - (a.importance || 0))
      .slice(0, 56);
    if (selectedId && !top.some((item) => item.id === selectedId)) {
      top.push(state.selected);
    }
    return top;
  }

  function renderMap() {
    if (!state.data || !map) return;
    const projection = state.projection || createProjection(state.data);
    state.projection = projection;
    const selectedZone = state.selected?.climateZone;

    const zonePaths = (state.data.climateZones.features || []).map((feature) => {
      const featureZone = feature.properties?.zone || "";
      return `<path class="map-zone zone-${escapeHtml(featureZone)}${featureZone === selectedZone ? " selected" : ""}" data-zone="${escapeHtml(featureZone)}" d="${pathForGeometry(feature.geometry, projection)}"></path>`;
    }).join("");

    const boundaryPaths = (state.data.romaniaBoundary.features || []).map((feature) => (
      `<path class="romania-boundary" d="${pathForGeometry(feature.geometry, projection)}"></path>`
    )).join("");

    const localities = prominentLocalities();
    state.renderedLocalities = localities.map((locality, index) => {
      const [x, y] = projection.project(locality.lon, locality.lat);
      const selected = locality.id === state.selected?.id;
      const labeled = selected || index < 22;
      return { locality, x, y, selected, labeled };
    });

    const markerHtml = state.renderedLocalities.map((item) => `
      <g class="locality-marker${item.selected ? " selected" : ""}" data-locality-id="${escapeHtml(item.locality.id)}" tabindex="0" role="button" aria-label="${escapeHtml(localityShortLabel(item.locality))}">
        <circle cx="${item.x.toFixed(2)}" cy="${item.y.toFixed(2)}" r="${item.selected ? 4.8 : 2.4}"></circle>
        ${item.labeled ? `<text x="${(item.x + 6).toFixed(2)}" y="${(item.y - 4).toFixed(2)}">${escapeHtml(item.locality.name)}</text>` : ""}
      </g>
    `).join("");

    const legend = ["I", "II", "III", "IV", "V"].map((item) => (
      `<span><i class="legend-${item}"></i>Zona ${item}</span>`
    )).join("");

    map.innerHTML = `
      <svg class="romania-map-svg" viewBox="0 0 ${projection.width.toFixed(2)} ${projection.height.toFixed(2)}" preserveAspectRatio="xMidYMid meet" aria-hidden="false">
        <rect class="map-sea" x="0" y="0" width="${projection.width.toFixed(2)}" height="${projection.height.toFixed(2)}"></rect>
        <g class="map-zones">${zonePaths}</g>
        <g class="map-boundary">${boundaryPaths}</g>
        <g class="map-localities">${markerHtml}</g>
      </svg>
      <div class="map-legend" aria-label="Legenda zonelor climatice">${legend}</div>
    `;
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
      results.innerHTML = `<div class="locality-no-results">Nu am găsit localitatea în registrul disponibil.</div>`;
      results.hidden = false;
      return;
    }
    results.innerHTML = state.searchResults.map((locality, index) => `
      <button class="locality-option${index === state.activeIndex ? " active" : ""}" id="locality-option-${index}" type="button" role="option" aria-selected="${index === state.activeIndex ? "true" : "false"}" data-locality-id="${escapeHtml(locality.id)}">
        <strong>${escapeHtml(locality.name)}</strong>
        <em>${escapeHtml(locality.countyMnemonic || locality.county)}</em>
        <span>${escapeHtml(locality.localityType)}${locality.uatName && locality.uatName !== locality.name ? `, UAT ${escapeHtml(locality.uatName)}` : ""} - ${escapeHtml(locality.county)}</span>
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

  function selectNearestRenderedLocality(svg, event) {
    const point = svgPointFromEvent(svg, event);
    if (!point) return;
    const rect = svg.getBoundingClientRect();
    const threshold = (svg.viewBox.baseVal.width / rect.width) * 22;
    let best = null;
    for (const item of state.renderedLocalities) {
      const distance = Math.hypot(point.x - item.x, point.y - item.y);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { item, distance };
      }
    }
    if (best) updateSelected(best.item.locality);
  }

  fetch("/api/location-data")
    .then((response) => {
      if (!response.ok) throw new Error("Location payload unavailable.");
      return response.json();
    })
    .then((data) => {
      state.data = data;
      state.byId = new Map(data.localities.map((item) => [item.id, item]));
      const initial =
        state.byId.get(root.dataset.initialLocalityId)
        || locationSearchResults(data, root.dataset.initialLocality || "", 1)[0]
        || state.byId.get("siruta-54984")
        || data.localities[0];
      updateSelected(initial);
      window.__lacurentLocationState = state;
    })
    .catch(() => {
      map.innerHTML = "<p>Harta nu a putut fi încărcată. Căutarea textuală rămâne disponibilă.</p>";
      name.textContent = input.value || "Localitate nespecificată";
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

  map?.addEventListener("click", (event) => {
    if (!state.data) return;
    const marker = event.target.closest?.(".locality-marker");
    if (marker) {
      updateSelected(state.byId.get(marker.dataset.localityId));
      return;
    }
    const svg = event.target.closest?.("svg");
    if (svg) selectNearestRenderedLocality(svg, event);
  });

  map?.addEventListener("keydown", (event) => {
    const marker = event.target.closest?.(".locality-marker");
    if (!marker || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    updateSelected(state.byId.get(marker.dataset.localityId));
  });

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
