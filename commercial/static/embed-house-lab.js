(() => {
  const root = document.querySelector("[data-embed-house-lab]");
  if (!root) return;

  const form = document.getElementById("embedLabForm");
  const calculateUrl = root.dataset.calculateUrl;
  const localityInput = document.getElementById("labLocalitySearch");
  const localityResults = document.getElementById("labLocalityResults");
  const climateDetails = document.getElementById("labClimateDetails");
  const status = document.getElementById("labStatus");

  const controls = {
    area: document.getElementById("labArea"),
    levels: document.getElementById("labLevels"),
    height: document.getElementById("labHeight"),
    windows: document.getElementById("labWindows"),
    wallIns: document.getElementById("labWallIns"),
    roofIns: document.getElementById("labRoofIns"),
    floorIns: document.getElementById("labFloorIns"),
    temperature: document.getElementById("labTemperature"),
    occupants: document.getElementById("labOccupants"),
    heating: document.getElementById("labHeating")
  };

  const PRESET = {
    area: 120,
    levels: 2,
    height: 2.7,
    windows: 18,
    wallIns: 5,
    roofIns: 10,
    floorIns: 5,
    temperature: 21,
    occupants: 4,
    heating: "condensing_gas_boiler",
    localityId: root.querySelector(".lab-locality")?.dataset.initialLocalityId || "siruta-54984",
    locality: root.querySelector(".lab-locality")?.dataset.initialLocality || "Cluj-Napoca"
  };

  const COPY = {
    ro: {
      kicker:"Laboratorul casei", title:"Configurează casa. Vezi imediat ce se schimbă.",
      intro:"Pornești de la o casă presetată și modifici parametrii direct. Fiecare schimbare recalculează același motor energetic LaCurent.",
      reset:"Revino la preset", locationTitle:"Unde este casa?", locationSubtitle:"Scrie localitatea și alege rezultatul corect.",
      locationLabel:"Localitatea", locationInfo:"Localitatea este importantă pentru selectarea automată a profilului climatic. Nu trebuie să alegi manual o zonă climatică.",
      climateAuto:"Profil climatic selectat automat", geometryTitle:"Casa", geometrySubtitle:"Dimensiuni și suprafețe ușor de verificat.",
      area:"Suprafață încălzită", levels:"Niveluri încălzite", levelsUnit:"niv.", height:"Înălțime interioară", windows:"Suprafață totală ferestre",
      insulationTitle:"Izolația", insulationSubtitle:"Grosimea este introdusă direct în centimetri.", wallIns:"Izolație pereți", roofIns:"Izolație pod / acoperiș", floorIns:"Izolație pardoseală",
      insulationAssumption:"Pentru simulare, grosimea este convertită automat în coeficienți U folosind o conductivitate termică de referință de 0,040 W/mK peste anvelopa de bază.",
      comfortTitle:"Confort și utilizare", comfortSubtitle:"Parametri care modifică direct consumul calculat.", temperature:"Temperatură interioară iarna", occupants:"Persoane în locuință", personsUnit:"pers.",
      heating:"Sursa principală de încălzire", resultsKicker:"Rezultat live", resultsTitle:"Casa configurată", class:"Clasă",
      annualCost:"Cost anual estimat", finalEnergy:"Energie finală", allSources:"toate sursele", primarySpecific:"Energie primară specifică", designPower:"Putere termică estimată", designPowerNote:"din H × ΔT la temperatura de calcul",
      selectedPlace:"Localitate", climateStation:"Stație climatică", heatLoss:"Coeficient pierderi",
      methodNote:"Rezultatele se recalculează cu motorul energetic LaCurent. Valorile sunt estimări tehnice și nu reprezintă un certificat de performanță energetică.",
      calculating:"Se recalculează…", ready:"Actualizat", monthly:"medie lunară", error:"Calculul nu a putut fi actualizat."
    },
    en: {
      kicker:"Home Lab", title:"Configure the house. See what changes immediately.",
      intro:"Start from a preset home and change parameters directly. Every adjustment reruns the same LaCurent energy engine.",
      reset:"Reset preset", locationTitle:"Where is the house?", locationSubtitle:"Type the locality and choose the correct result.",
      locationLabel:"Locality", locationInfo:"The locality is used to select the climate profile automatically. You do not need to choose a climate zone manually.",
      climateAuto:"Climate profile selected automatically", geometryTitle:"House", geometrySubtitle:"Dimensions and areas that are easy to verify.",
      area:"Heated area", levels:"Heated levels", levelsUnit:"levels", height:"Indoor height", windows:"Total window area",
      insulationTitle:"Insulation", insulationSubtitle:"Thickness is entered directly in centimetres.", wallIns:"Wall insulation", roofIns:"Roof / attic insulation", floorIns:"Floor insulation",
      insulationAssumption:"For simulation, thickness is converted automatically to U-values using a reference thermal conductivity of 0.040 W/mK added to the base envelope.",
      comfortTitle:"Comfort and use", comfortSubtitle:"Parameters that directly change calculated consumption.", temperature:"Winter indoor temperature", occupants:"Occupants", personsUnit:"people",
      heating:"Main heating source", resultsKicker:"Live result", resultsTitle:"Configured house", class:"Class",
      annualCost:"Estimated annual cost", finalEnergy:"Final energy", allSources:"all sources", primarySpecific:"Specific primary energy", designPower:"Estimated heat load", designPowerNote:"from H × ΔT at design temperature",
      selectedPlace:"Locality", climateStation:"Climate station", heatLoss:"Heat-loss coefficient",
      methodNote:"Results are recalculated with the LaCurent energy engine. Values are technical estimates and are not an energy performance certificate.",
      calculating:"Recalculating…", ready:"Updated", monthly:"monthly average", error:"The calculation could not be updated."
    }
  };

  const lang = () => document.documentElement.lang === "en" ? "en" : "ro";
  const tr = key => COPY[lang()][key] || COPY.ro[key] || key;
  const formField = name => form.elements.namedItem(name);
  const setField = (name, value) => { const field = formField(name); if (field) field.value = String(value); };
  const number = value => Number.parseFloat(String(value).replace(",", "."));

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function shortLocality(locality) {
    const uat = locality.uatName && locality.uatName !== locality.name ? ` (${locality.uatName})` : "";
    return `${locality.name}${uat}, ${locality.county}`;
  }
  function matches(data, query, limit=10) {
    const q = normalize(query);
    if (q.length < 2) return [];
    const terms=q.split(" ").filter(Boolean);
    return data.filter(locality => terms.every(term => locality.search.includes(term)))
      .sort((a,b) => {
        const an=normalize(a.name), bn=normalize(b.name);
        const as=(an===q?5000000:0)+(an.startsWith(q)?1000000:0)+(a.importance||0);
        const bs=(bn===q?5000000:0)+(bn.startsWith(q)?1000000:0)+(b.importance||0);
        return bs-as || a.name.localeCompare(b.name,"ro");
      }).slice(0,limit);
  }

  let localities = [];
  let byId = new Map();
  let selectedLocality = null;
  let requestToken = 0;
  let timer = null;

  function insulationU(baseU, centimetres) {
    const lambda = 0.040;
    const baseR = 1 / baseU;
    const addedR = Math.max(0, Number(centimetres)) / 100 / lambda;
    return 1 / (baseR + addedR);
  }

  function syncNumber(range) {
    const numeric = document.querySelector(`[data-lab-number-for="${range.id}"]`);
    if (numeric) numeric.value = range.value;
  }

  function syncGeometry() {
    const area = number(controls.area.value);
    const levels = Math.max(1, number(controls.levels.value));
    const height = number(controls.height.value);
    const windows = number(controls.windows.value);
    const doors = 2.2;
    const footprint = area / levels;
    const aspect = 1.25;
    const width = Math.sqrt(footprint / aspect);
    const length = width * aspect;
    const perimeter = 2 * (length + width);
    const grossWalls = perimeter * height * levels;
    const wallArea = Math.max(1, grossWalls - windows - doors);

    setField("building_length_m", length.toFixed(3));
    setField("building_width_m", width.toFixed(3));
    setField("heated_levels", levels);
    setField("average_height_m", height);
    setField("house_window_area_m2", windows);
    setField("heated_floor_area_m2", area);
    setField("heated_volume_m3", (area * height).toFixed(3));
    setField("wall_area_m2", wallArea.toFixed(3));
    setField("roof_area_m2", footprint.toFixed(3));
    setField("floor_area_m2", footprint.toFixed(3));
    setField("window_area_m2", windows);
    setField("thermal_bridge_length_m", (perimeter * levels).toFixed(3));

    setField("wall_u_value", insulationU(1.30, controls.wallIns.value).toFixed(4));
    setField("roof_u_value", insulationU(1.00, controls.roofIns.value).toFixed(4));
    setField("floor_u_value", insulationU(0.90, controls.floorIns.value).toFixed(4));
    setField("indoor_design_temperature_c", controls.temperature.value);
    setField("dhw_occupants", controls.occupants.value);
    setField("heating_choice", controls.heating.value);
  }

  function setStatus(message, error=false) {
    status.textContent = message;
    status.classList.toggle("is-error", error);
  }

  function fmt(value, digits=0) {
    return Number(value || 0).toLocaleString(lang()==="en"?"en-US":"ro-RO", {minimumFractionDigits:digits, maximumFractionDigits:digits});
  }

  function renderResult(data) {
    document.getElementById("labClass").textContent = data.energy_class || "—";
    document.getElementById("labAnnualCost").textContent = data.annual_cost_lei == null ? "—" : `${fmt(data.annual_cost_lei)} lei/an`;
    document.getElementById("labMonthlyCost").textContent = data.average_monthly_cost_lei == null ? "—" : `${fmt(data.average_monthly_cost_lei)} lei · ${tr("monthly")}`;
    document.getElementById("labFinalEnergy").textContent = `${fmt(data.final_energy_kwh)} kWh/an`;
    document.getElementById("labPrimarySpecific").textContent = fmt(data.primary_specific_kwh_m2,1);
    document.getElementById("labDesignPower").textContent = `${fmt(data.design_heat_load_kw,1)} kW`;
    document.getElementById("labResultLocation").textContent = data.locality || localityInput.value || "—";
    document.getElementById("labResultStation").textContent = data.climate_station || "—";
    document.getElementById("labCo2").textContent = `${fmt(data.co2_kg)} kg/an`;
    document.getElementById("labHeatLoss").textContent = `${fmt(data.heat_loss_w_k,1)} W/K`;
    setStatus(tr("ready"));
  }

  async function calculateNow() {
    syncGeometry();
    const token = ++requestToken;
    setStatus(tr("calculating"));
    try {
      const response = await fetch(calculateUrl, {method:"POST", body:new FormData(form), headers:{"X-LaCurent-Embed-Lab":"1"}});
      const data = await response.json();
      if (token !== requestToken) return;
      if (!response.ok) throw new Error(data.error || "Calculation failed");
      renderResult(data);
    } catch (error) {
      if (token !== requestToken) return;
      setStatus(`${tr("error")} ${error?.message || ""}`.trim(), true);
    }
  }

  function scheduleCalculate(delay=180) {
    clearTimeout(timer);
    timer = setTimeout(calculateNow, delay);
  }

  function selectLocality(locality) {
    if (!locality) return;
    selectedLocality = locality;
    localityInput.value = shortLocality(locality);
    localityInput.setAttribute("aria-expanded","false");
    localityResults.hidden = true;
    localityResults.innerHTML = "";
    setField("locality_id", locality.id);
    setField("locality", locality.name);
    const zone = locality.climateZone ? `${lang()==="en"?"Zone":"Zona"} ${locality.climateZone}` : "";
    const design = Number.isFinite(locality.winterDesignTemperatureC) ? `${locality.winterDesignTemperatureC} °C` : "";
    const station = locality.stationName ? `${lang()==="en"?"station":"stația"} ${locality.stationName}` : "";
    climateDetails.textContent = [zone,design,station].filter(Boolean).join(" · ") || "—";
    scheduleCalculate(80);
  }

  function renderLocalityResults(query) {
    const found = matches(localities, query);
    localityInput.setAttribute("aria-expanded", found.length ? "true" : "false");
    localityResults.innerHTML = found.length ? found.map(locality => `
      <button class="locality-option" type="button" data-lab-locality-id="${locality.id}">
        <strong>${locality.name}</strong>
        <em>${locality.countyMnemonic || locality.county}</em>
        <span>${locality.uatName && locality.uatName !== locality.name ? `UAT ${locality.uatName} · ` : ""}${locality.county}</span>
      </button>`).join("") : `<div class="locality-no-results">${lang()==="en"?"No matching locality found.":"Nu am găsit localitatea."}</div>`;
    localityResults.hidden = false;
  }

  function applyLanguage() {
    root.querySelectorAll("[data-lab-key]").forEach(el => {
      const key=el.dataset.labKey;
      if (COPY[lang()][key]) el.textContent=COPY[lang()][key];
    });
    if (selectedLocality) selectLocality(selectedLocality);
  }

  Object.values(controls).forEach(control => {
    if (!control || control.tagName === "SELECT") return;
    control.addEventListener("input", () => {
      syncNumber(control);
      scheduleCalculate();
    });
  });
  controls.heating.addEventListener("change", () => scheduleCalculate(80));

  document.querySelectorAll("[data-lab-number-for]").forEach(numeric => {
    const range=document.getElementById(numeric.dataset.labNumberFor);
    numeric.addEventListener("change", () => {
      const min=number(numeric.min), max=number(numeric.max), value=Math.min(max,Math.max(min,number(numeric.value)));
      range.value=String(value);
      numeric.value=range.value;
      scheduleCalculate(80);
    });
  });

  document.querySelectorAll(".lab-number-control [data-lab-step]").forEach(button => {
    button.addEventListener("click", () => {
      const box=button.closest(".lab-number-control");
      const numeric=box.querySelector("[data-lab-number-for]");
      const range=document.getElementById(numeric.dataset.labNumberFor);
      const direction=Number(button.dataset.labStep);
      const step=number(range.step)||1;
      const min=number(range.min), max=number(range.max);
      range.value=String(Math.min(max,Math.max(min,number(range.value)+(direction*step))));
      numeric.value=range.value;
      range.dispatchEvent(new Event("input",{bubbles:true}));
    });
  });

  localityInput.addEventListener("input", () => {
    setField("locality_id","");
    if (localities.length) renderLocalityResults(localityInput.value);
  });
  localityResults.addEventListener("click", event => {
    const button=event.target.closest("[data-lab-locality-id]");
    if (button) selectLocality(byId.get(button.dataset.labLocalityId));
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".lab-locality")) {
      localityResults.hidden=true;
      localityInput.setAttribute("aria-expanded","false");
    }
  });

  root.querySelector("[data-lab-reset]").addEventListener("click", () => {
    Object.entries(PRESET).forEach(([key,value]) => {
      if (controls[key] && controls[key].tagName !== "SELECT") {
        controls[key].value=String(value);
        syncNumber(controls[key]);
      }
    });
    controls.heating.value=PRESET.heating;
    const locality=byId.get(PRESET.localityId) || matches(localities,PRESET.locality,1)[0];
    if (locality) selectLocality(locality); else scheduleCalculate(20);
  });

  const languageObserver = new MutationObserver(() => applyLanguage());
  languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});

  fetch("/api/location-data")
    .then(response => {
      if (!response.ok) throw new Error("Location data unavailable");
      return response.json();
    })
    .then(data => {
      localities = data.localities || [];
      byId = new Map(localities.map(item => [item.id,item]));
      const initial=byId.get(PRESET.localityId) || matches(localities,PRESET.locality,1)[0] || localities[0];
      if (initial) selectLocality(initial); else calculateNow();
    })
    .catch(() => {
      climateDetails.textContent = lang()==="en" ? "Climate data will be resolved from the typed locality." : "Profilul climatic va fi rezolvat din localitatea introdusă.";
      calculateNow();
    });

  applyLanguage();
})();