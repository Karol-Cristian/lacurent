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
    glazing: document.getElementById("labGlazing"),
    orientation: document.getElementById("labOrientation"),
    heating: document.getElementById("labHeating"),
    ventilation: document.getElementById("labVentilation"),
    cooling: document.getElementById("labCooling")
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
    glazing: "triple_low_e_faces_2_and_5",
    orientation: "south",
    heating: "condensing_gas_boiler",
    ventilation: "natural",
    cooling: "none",
    localityId: root.querySelector(".lab-locality")?.dataset.initialLocalityId || "siruta-54984",
    locality: root.querySelector(".lab-locality")?.dataset.initialLocality || "Cluj-Napoca"
  };

  const COPY = {
    ro: {
      kicker:"Laboratorul casei", title:"Configurează casa. Vezi imediat ce se schimbă.",
      configureTitle:"Configurează casa ta", configureSubtitle:"Modifică doar ce contează. Rezultatele se actualizează în timp real.",
      houseUseTitle:"1. Casă și utilizare", houseUseSubtitle:"Dimensiuni, niveluri și ocupare",
      envelopeTitle:"2. Anvelopă și ferestre", envelopeSubtitle:"Izolație, geamuri și orientare solară",
      systemsTitle:"3. Sisteme de încălzire și apă caldă", systemsSubtitle:"Alege sursa principală",
      ventilationTitle:"4. Ventilație și răcire", ventilationSubtitle:"Schimbul de aer și confortul de vară",
      ventilation:"Sistem ventilație", cooling:"Răcire", otherHeating:"Alte sisteme",
      compareScenarios:"Compară scenarii", tabOverview:"Prezentare", tabCosts:"Costuri", tabEnergy:"Energie", tabLosses:"Pierderi", tabComparison:"Comparație",
      heroMessage:"O casă bine configurată înseamnă costuri mai mici și mai mult confort.",
      energyClass:"Clasă energetică", lossSubtitle:"% din pierderile totale", yourHouse:"Casa ta", referenceHouse:"Casă de referință",
      saveConfig:"Salvează configurația", exportReport:"Exportă raport", summaryPromise:"Case eficiente pentru oameni, comunități și un mediu mai curat.", summaryLearn:"Rezultatele folosesc motorul energetic LaCurent.",
      intro:"Pornești de la o casă presetată și modifici doar ce contează. Costul, consumul și necesarul termic se actualizează pe loc.",
      proofClimate:"Profil climatic automat", proofLive:"Recalculare live", proofCost:"Cost anual estimat",
      reset:"Revino la preset", locationTitle:"Unde este casa?", locationSubtitle:"Scrie localitatea și alege rezultatul corect.",
      locationLabel:"Localitatea", locationInfo:"Localitatea este importantă pentru selectarea automată a profilului climatic. Nu trebuie să alegi manual o zonă climatică.",
      climateAuto:"Profil climatic selectat automat", geometryTitle:"Casa", geometrySubtitle:"Dimensiuni și suprafețe ușor de verificat.",
      area:"Suprafață încălzită", levels:"Niveluri încălzite", levelsUnit:"niv.", height:"Înălțime interioară", windows:"Suprafață totală ferestre",
      houseVisualTitle:"Casa ta, simplificată pentru calcul", houseVisualText:"Dimensiunile, anvelopa și instalațiile se combină într-un singur model energetic.",
      windowType:"Tip ferestre", orientation:"Orientare principală",
      insulationTitle:"Izolația", insulationSubtitle:"Grosimea este introdusă direct în centimetri.", wallIns:"Izolație pereți", roofIns:"Izolație pod / acoperiș", floorIns:"Izolație pardoseală",
      insulationAssumption:"Pentru simulare, grosimea este convertită automat în coeficienți U folosind o conductivitate termică de referință de 0,040 W/mK peste anvelopa de bază.",
      comfortTitle:"Confort și utilizare", comfortSubtitle:"Parametri care modifică direct consumul calculat.", temperature:"Temperatură interioară iarna", occupants:"Persoane în locuință", personsUnit:"pers.",
      heating:"Sursa principală de încălzire",
      heatingVisualDefaultTitle:"Sursa de încălzire contează direct în cost", heatingVisualDefaultText:"Schimbarea sursei recalculează energia finală, energia primară, CO₂ și costul anual.",
      resultsKicker:"Rezultat live", resultsTitle:"Rezultatele tale", class:"Clasă",
      annualCost:"Cost anual estimat", finalEnergy:"Energie finală", allSources:"toate sursele", primarySpecific:"Energie primară specifică", designPower:"Putere termică estimată", designPowerNote:"din H × ΔT la temperatura de calcul",
      selectedPlace:"Localitate", climateStation:"Stație climatică", heatLoss:"Coeficient pierderi",
      monthlyChartTitle:"Costul pe luni", monthlyChartNote:"cum variază pe parcursul anului",
      serviceChartTitle:"Pentru ce consumi energia", lossChartTitle:"Pe unde pierde casa căldură", referenceTitle:"Față de o casă de referință",
      priceCurrent:"referințe de preț actualizate", priceCheck:"verifică referințele de preț",
      serviceHeating:"Încălzire", serviceCooling:"Răcire", serviceDhw:"Apă caldă",
      referenceBetter:"sub referință", referenceWorse:"peste referință",
      methodNote:"Rezultatele se recalculează cu motorul energetic LaCurent. Valorile sunt estimări tehnice și nu reprezintă un certificat de performanță energetică.",
      calculating:"Se recalculează…", ready:"Actualizat", monthly:"medie lunară", error:"Calculul live a fost întrerupt. Rezultatul afișat rămâne ultima valoare validă."
    },
    en: {
      kicker:"Home Lab", title:"Configure the house. See what changes immediately.",
      configureTitle:"Configure your home", configureSubtitle:"Change only what matters. Results update in real time.",
      houseUseTitle:"1. House and use", houseUseSubtitle:"Size, levels and occupants",
      envelopeTitle:"2. Envelope and windows", envelopeSubtitle:"Insulation, glazing and solar orientation",
      systemsTitle:"3. Heating and hot water", systemsSubtitle:"Choose the main heat source",
      ventilationTitle:"4. Ventilation and cooling", ventilationSubtitle:"Air change and summer comfort",
      ventilation:"Ventilation system", cooling:"Cooling", otherHeating:"Other systems",
      compareScenarios:"Compare scenarios", tabOverview:"Overview", tabCosts:"Costs", tabEnergy:"Energy", tabLosses:"Losses", tabComparison:"Comparison",
      heroMessage:"A well-configured home means lower costs and better comfort.",
      energyClass:"Energy class", lossSubtitle:"% of total losses", yourHouse:"Your home", referenceHouse:"Reference home",
      saveConfig:"Save configuration", exportReport:"Export report", summaryPromise:"Efficient homes for people, communities and a cleaner environment.", summaryLearn:"Results use the LaCurent energy engine.",
      intro:"Start from a preset home and change only what matters. Cost, energy use and heat load update instantly.",
      proofClimate:"Automatic climate profile", proofLive:"Live recalculation", proofCost:"Estimated annual cost",
      reset:"Reset preset", locationTitle:"Where is the house?", locationSubtitle:"Type the locality and choose the correct result.",
      locationLabel:"Locality", locationInfo:"The locality is used to select the climate profile automatically. You do not need to choose a climate zone manually.",
      climateAuto:"Climate profile selected automatically", geometryTitle:"House", geometrySubtitle:"Dimensions and areas that are easy to verify.",
      area:"Heated area", levels:"Heated levels", levelsUnit:"levels", height:"Indoor height", windows:"Total window area",
      houseVisualTitle:"Your house, simplified for calculation", houseVisualText:"Geometry, envelope and systems are combined into one energy model.",
      windowType:"Window type", orientation:"Main orientation",
      insulationTitle:"Insulation", insulationSubtitle:"Thickness is entered directly in centimetres.", wallIns:"Wall insulation", roofIns:"Roof / attic insulation", floorIns:"Floor insulation",
      insulationAssumption:"For simulation, thickness is converted automatically to U-values using a reference thermal conductivity of 0.040 W/mK added to the base envelope.",
      comfortTitle:"Comfort and use", comfortSubtitle:"Parameters that directly change calculated consumption.", temperature:"Winter indoor temperature", occupants:"Occupants", personsUnit:"people",
      heating:"Main heating source",
      heatingVisualDefaultTitle:"Heating source directly changes cost", heatingVisualDefaultText:"Changing the source recalculates final energy, primary energy, CO₂ and annual cost.",
      resultsKicker:"Live result", resultsTitle:"Your results", class:"Class",
      annualCost:"Estimated annual cost", finalEnergy:"Final energy", allSources:"all sources", primarySpecific:"Specific primary energy", designPower:"Estimated heat load", designPowerNote:"from H × ΔT at design temperature",
      selectedPlace:"Locality", climateStation:"Climate station", heatLoss:"Heat-loss coefficient",
      monthlyChartTitle:"Monthly cost", monthlyChartNote:"how it changes through the year",
      serviceChartTitle:"What uses the energy", lossChartTitle:"Where the house loses heat", referenceTitle:"Compared with a reference home",
      priceCurrent:"price references current", priceCheck:"check price references",
      serviceHeating:"Heating", serviceCooling:"Cooling", serviceDhw:"Hot water",
      referenceBetter:"below reference", referenceWorse:"above reference",
      methodNote:"Results are recalculated with the LaCurent energy engine. Values are technical estimates and are not an energy performance certificate.",
      calculating:"Recalculating…", ready:"Updated", monthly:"monthly average", error:"Live calculation was interrupted. The displayed result remains the last valid value."
    }
  };

  const lang = () => document.documentElement.lang === "en" ? "en" : "ro";
  const tr = key => COPY[lang()][key] || COPY.ro[key] || key;
  const formField = name => form.elements.namedItem(name);
  const setField = (name, value) => { const field = formField(name); if (field) field.value = String(value); };
  const number = value => Number.parseFloat(String(value).replace(",", "."));
  const GLAZING_U = {
    single_clear_glazing: 5.0,
    double_clear_glazing: 2.8,
    double_low_e_face_3: 1.6,
    triple_low_e_faces_2_and_5: 0.9
  };

  const HEATING_VISUALS = {
    district_heat: {
      src:"/static/home-lab/district-heating.svg",
      ro:["Termoficare","Costul și energia primară se recalculează pentru energia termică din rețea."],
      en:["District heating","Cost and primary energy are recalculated for heat supplied by the network."]
    },
    wood_stove: {
      src:"/static/home-lab/wood-fireplace.svg",
      ro:["Șemineu / sobă pe lemne","Motorul folosește profilul de biomasă și randamentul presetului pentru sobă."],
      en:["Wood fireplace / stove","The engine uses the biomass profile and the stove preset efficiency."]
    },
    wood_boiler: {
      src:"/static/home-lab/wood-fireplace.svg",
      ro:["Centrală pe lemne","Consumul final și costul se recalculează cu profilul pentru lemn de foc."],
      en:["Wood boiler","Final energy and cost are recalculated using the firewood profile."]
    },
    pellet_boiler: {
      src:"/static/home-lab/wood-fireplace.svg",
      ro:["Centrală pe peleți","Consumul final și costul se recalculează cu profilul pentru peleți."],
      en:["Pellet boiler","Final energy and cost are recalculated using the pellet profile."]
    }
  };

  function updateHeatingVisual() {
    const image=document.getElementById("labHeatingVisual");
    const title=document.getElementById("labHeatingVisualTitle");
    const text=document.getElementById("labHeatingVisualText");
    if (!image || !title || !text) return;
    const item=HEATING_VISUALS[controls.heating.value];
    if (!item) {
      image.src="/static/home-lab/home-envelope.svg";
      title.textContent=tr("heatingVisualDefaultTitle");
      text.textContent=tr("heatingVisualDefaultText");
      return;
    }
    image.src=item.src;
    const copy=lang()==="en" ? item.en : item.ro;
    title.textContent=copy[0];
    text.textContent=copy[1];
  }


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
  let lastResult = null;
  let activeController = null;

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
    setField("window_u_value", (GLAZING_U[controls.glazing.value] || 1.6).toFixed(2));
    setField("solar_glazing_type_id", controls.glazing.value);
    setField("solar_orientation", controls.orientation.value);
    setField("indoor_design_temperature_c", controls.temperature.value);
    setField("dhw_occupants", controls.occupants.value);
    setField("heating_choice", controls.heating.value);

    const ventilation = controls.ventilation?.value || "natural";
    if (ventilation === "hrv") {
      setField("air_changes_per_hour", "0.5");
      setField("heat_recovery_efficiency", "0.75");
    } else if (ventilation === "mechanical") {
      setField("air_changes_per_hour", "0.65");
      setField("heat_recovery_efficiency", "0");
    } else {
      setField("air_changes_per_hour", "0.5");
      setField("heat_recovery_efficiency", "0");
    }

    const cooling = controls.cooling?.value || "none";
    setField("cooling_enabled", cooling === "none" ? "" : "on");
    setField("cooling_seer", cooling === "split" ? "4.2" : "4.0");
    setField("cooling_setpoint_c", "26");
  }

  function setStatus(message, state="live") {
    status.textContent = message;
    status.classList.toggle("is-error", state === "error");
    status.classList.toggle("is-calculating", state === "calculating");
    status.classList.toggle("is-live", state === "live");
    status.setAttribute("data-live-state", state);
  }

  function fmt(value, digits=0) {
    return Number(value || 0).toLocaleString(lang()==="en"?"en-US":"ro-RO", {minimumFractionDigits:digits, maximumFractionDigits:digits});
  }

  const MONTHS = {
    ro:{ian:"Ian",feb:"Feb",mar:"Mar",apr:"Apr",mai:"Mai",iun:"Iun",iul:"Iul",aug:"Aug",sep:"Sep",oct:"Oct",nov:"Nov",dec:"Dec"},
    en:{ian:"Jan",feb:"Feb",mar:"Mar",apr:"Apr",mai:"May",iun:"Jun",iul:"Jul",aug:"Aug",sep:"Sep",oct:"Oct",nov:"Nov",dec:"Dec"}
  };

  function renderMonthlyChart(data) {
    const node = document.getElementById("labMonthlyChart");
    const note = document.getElementById("labMonthlyChartNote");
    const priceStatus = document.getElementById("labPriceStatus");
    if (!node) return;

    const completeCosts = (data.monthly_costs || []).length === 12 && (data.monthly_costs || []).every(row => row.complete);
    const rows = completeCosts
      ? data.monthly_costs.map(row => ({month:row.month,value:Number(row.cost_lei)||0,unit:"lei"}))
      : (data.monthly || []).map(row => ({month:row.month,value:(Number(row.useful_heating_kwh)||0)+(Number(row.useful_cooling_kwh)||0),unit:"kWh"}));
    const max = Math.max(...rows.map(row => row.value), 1);

    node.innerHTML = rows.map(row => {
      const height = Math.max(3, Math.round(100 * row.value / max));
      const month = MONTHS[lang()][row.month] || row.month;
      return `<div class="lab-month-bar" title="${month}: ${fmt(row.value)} ${row.unit}">
        <i style="height:${height}%"></i>
        <span>${month}</span>
      </div>`;
    }).join("");

    note.textContent = completeCosts
      ? tr("monthlyChartNote")
      : (lang()==="en" ? "useful heating + cooling energy" : "energie utilă încălzire + răcire");
    priceStatus.textContent = data.price_retrieved_on
      ? `${data.price_references_current ? tr("priceCurrent") : tr("priceCheck")} · ${data.price_retrieved_on}`
      : "";
  }

  function renderHorizontalChart(nodeId, rows, maxRows=4) {
    const node = document.getElementById(nodeId);
    if (!node) return;
    const filtered = rows.filter(row => Number(row.value) > 0).sort((a,b) => b.value-a.value).slice(0,maxRows);
    const max = Math.max(...filtered.map(row => Number(row.value)||0),1);
    node.innerHTML = filtered.map(row => {
      const width = Math.max(2, Math.round(100 * Number(row.value) / max));
      return `<div class="lab-chart-row" title="${row.label}: ${fmt(row.value, row.digits ?? 0)} ${row.unit || ""}">
        <div class="lab-chart-row-label"><span>${row.label}</span><strong>${fmt(row.value, row.digits ?? 0)}</strong></div>
        <div class="lab-chart-track"><i style="width:${width}%"></i></div>
      </div>`;
    }).join("");
  }

  function renderReference(data) {
    const card=document.getElementById("labReferenceCard");
    if (!card) return;
    if (!data.reference) {
      card.hidden=true;
      return;
    }
    card.hidden=false;
    const actual=Number(data.reference.actual_specific_primary_kwh_m2)||0;
    const reference=Number(data.reference.reference_specific_primary_kwh_m2)||0;
    const difference=Number(data.reference.difference_percent)||0;
    const deltaText=`${difference>0?"+":""}${fmt(difference,1)}%`;
    const detail=`${fmt(actual,1)} vs ${fmt(reference,1)} kWh/m²/an · ${Math.abs(difference).toLocaleString(lang()==="en"?"en-US":"ro-RO",{maximumFractionDigits:1})}% ${difference<=0?tr("referenceBetter"):tr("referenceWorse")}`;
    document.getElementById("labReferenceDelta").textContent = deltaText;
    document.getElementById("labReferenceActual").textContent = fmt(actual,0);
    document.getElementById("labReferenceTarget").textContent = fmt(reference,0);
    document.getElementById("labReferenceText").textContent = detail;
    document.getElementById("labComparisonDelta").textContent = deltaText;
    document.getElementById("labComparisonText").textContent = detail;
    const ratio = reference > 0 ? Math.min(100, 100*actual/reference) : 0;
    document.getElementById("labReferenceBar").style.width = `${Math.max(2,ratio)}%`;
  }

  function renderServiceDonut(data) {
    const services=data.final_energy_by_service || {};
    const rows=[
      {label:tr("serviceHeating"),value:Number(services.heating)||0,color:"#f97316"},
      {label:tr("serviceDhw"),value:Number(services.dhw)||0,color:"#fb7185"},
      {label:tr("serviceCooling"),value:Number(services.cooling)||0,color:"#3b82f6"}
    ].filter(row => row.value > 0);
    const total=rows.reduce((sum,row)=>sum+row.value,0) || 1;
    let cursor=0;
    const stops=rows.map(row => {
      const start=cursor;
      cursor += 100*row.value/total;
      return `${row.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });
    if (cursor < 100) stops.push(`#e8ebe7 ${cursor.toFixed(2)}% 100%`);
    const donut=document.getElementById("labServiceDonut");
    donut.style.background=`conic-gradient(${stops.join(",")})`;
    donut.querySelector("strong").textContent=fmt(total);
    const legendHtml=rows.map(row => {
      const pct=100*row.value/total;
      return `<div class="lab-service-legend-row"><i style="background:${row.color}"></i><span>${row.label}</span><strong>${fmt(pct,0)}%</strong></div>`;
    }).join("");
    document.getElementById("labServiceChart").innerHTML=legendHtml;
    document.getElementById("labServiceChartMirror").innerHTML=legendHtml;
  }

  function renderDashboard(data) {
    renderMonthlyChart(data);
    const monthly=document.getElementById("labMonthlyChart");
    document.getElementById("labMonthlyChartMirror").innerHTML=monthly.innerHTML;
    renderServiceDonut(data);

    const lossRows=(data.heat_loss_breakdown || []).map(row => ({
      label:row.name,
      value:Number(row.percent)||0,
      unit:"%",
      digits:0
    }));
    renderHorizontalChart("labLossChart",lossRows,6);
    renderHorizontalChart("labLossChartMirror",lossRows,6);
    renderReference(data);
  }

  function renderResult(data) {
    lastResult = data;
    document.getElementById("labClass").textContent = data.energy_class || "—";
    document.querySelector(".lab-class")?.setAttribute("data-grade", data.energy_class || "");
    document.getElementById("labAnnualCost").textContent = data.annual_cost_lei == null ? "—" : `${fmt(data.annual_cost_lei)} lei/an`;
    document.getElementById("labMonthlyCost").textContent = data.average_monthly_cost_lei == null ? "—" : `${fmt(data.average_monthly_cost_lei)} lei · ${tr("monthly")}`;
    document.getElementById("labFinalEnergy").textContent = `${fmt(data.final_energy_kwh)} kWh/an`;
    document.getElementById("labPrimarySpecific").textContent = fmt(data.primary_specific_kwh_m2,1);
    document.getElementById("labDesignPower").textContent = `${fmt(data.design_heat_load_kw,1)} kW`;
    document.getElementById("labResultLocation").textContent = data.locality || localityInput.value || "—";
    document.getElementById("labResultStation").textContent = data.climate_station || "—";
    document.getElementById("labCo2").textContent = fmt(data.co2_kg);
    document.getElementById("labHeatLoss").textContent = fmt(data.heat_loss_w_k,1);
    document.getElementById("labAnnualCostMirror").textContent = data.annual_cost_lei == null ? "—" : `${fmt(data.annual_cost_lei)} lei/an`;
    document.getElementById("labMonthlyCostMirror").textContent = data.average_monthly_cost_lei == null ? "—" : `${fmt(data.average_monthly_cost_lei)} lei · ${tr("monthly")}`;
    document.getElementById("labFinalEnergyMirror").textContent = `${fmt(data.final_energy_kwh)} kWh/an`;
    root.querySelectorAll("[data-class-grade]").forEach(el => el.classList.toggle("is-active", el.dataset.classGrade === data.energy_class));
    renderDashboard(data);
    setStatus(tr("ready"), "live");
  }

  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  async function fetchCalculation(signal) {
    const response = await fetch(calculateUrl, {
      method:"POST",
      body:new FormData(form),
      headers:{"X-LaCurent-Embed-Lab":"1","Accept":"application/json"},
      signal
    });

    const contentType=(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      const transient = response.status >= 500 || response.status === 429 || response.status === 404;
      const error = new Error("non-json-response");
      error.transient = transient;
      throw error;
    }

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || "Calculation failed");
      error.transient = response.status >= 500 || response.status === 429;
      throw error;
    }
    return data;
  }

  async function calculateNow() {
    syncGeometry();
    const token = ++requestToken;

    if (activeController) activeController.abort();
    activeController = new AbortController();
    const {signal} = activeController;

    setStatus(tr("calculating"), "calculating");

    try {
      let data;
      try {
        data = await fetchCalculation(signal);
      } catch (error) {
        if (signal.aborted) return;
        if (!error?.transient) throw error;
        await wait(450);
        if (signal.aborted || token !== requestToken) return;
        data = await fetchCalculation(signal);
      }

      if (signal.aborted || token !== requestToken) return;
      renderResult(data);
    } catch (error) {
      if (signal.aborted || token !== requestToken) return;
      setStatus(tr("error"), "error");
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
    updateHeatingVisual();
    if (lastResult) renderDashboard(lastResult);
  }

  Object.values(controls).forEach(control => {
    if (!control || control.tagName === "SELECT") return;
    control.addEventListener("input", () => {
      syncNumber(control);
      scheduleCalculate();
    });
  });
  controls.heating.addEventListener("change", () => {
    updateHeatingVisual();
    scheduleCalculate(80);
  });
  controls.glazing.addEventListener("change", () => scheduleCalculate(80));
  controls.orientation.addEventListener("change", () => scheduleCalculate(80));
  controls.ventilation.addEventListener("change", () => scheduleCalculate(80));
  controls.cooling.addEventListener("change", () => scheduleCalculate(80));

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

  function syncLevelSegments() {
    root.querySelectorAll("[data-segmented-for='labLevels'] [data-segment-value]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.segmentValue === controls.levels.value);
    });
  }

  root.querySelectorAll("[data-segmented-for='labLevels'] [data-segment-value]").forEach(button => {
    button.addEventListener("click", () => {
      controls.levels.value=button.dataset.segmentValue;
      syncNumber(controls.levels);
      syncLevelSegments();
      scheduleCalculate(80);
    });
  });

  function syncHeatingPills() {
    root.querySelectorAll("[data-heating-choice]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.heatingChoice === controls.heating.value);
    });
  }

  root.querySelectorAll("[data-heating-choice]").forEach(button => {
    button.addEventListener("click", () => {
      controls.heating.value=button.dataset.heatingChoice;
      syncHeatingPills();
      scheduleCalculate(80);
    });
  });

  controls.heating.addEventListener("change", syncHeatingPills);

  function openResultTab(name) {
    root.querySelectorAll("[data-lab-tab]").forEach(button => button.classList.toggle("is-active", button.dataset.labTab === name));
    root.querySelectorAll("[data-lab-panel]").forEach(panel => panel.classList.toggle("is-active", panel.dataset.labPanel === name));
  }

  root.querySelectorAll("[data-lab-tab]").forEach(button => button.addEventListener("click", () => openResultTab(button.dataset.labTab)));
  root.querySelectorAll("[data-open-tab]").forEach(button => button.addEventListener("click", () => openResultTab(button.dataset.openTab)));

  const saveButton=root.querySelector("[data-lab-key='saveConfig']");
  if (saveButton) {
    saveButton.addEventListener("click", () => {
      const values={};
      new FormData(form).forEach((value,key) => { values[key]=value; });
      window.localStorage?.setItem(`lacurent-home-lab:${root.dataset.partnerId}`, JSON.stringify(values));
      const original=tr("saveConfig");
      saveButton.textContent=lang()==="en"?"Saved":"Salvat";
      window.setTimeout(()=>{ saveButton.textContent=original; },1200);
    });
  }

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
      if (!controls[key]) return;
      controls[key].value=String(value);
      if (controls[key].tagName !== "SELECT") syncNumber(controls[key]);
    });
    updateHeatingVisual();
    syncLevelSegments();
    syncHeatingPills();
    const locality=byId.get(PRESET.localityId) || matches(localities,PRESET.locality,1)[0];
    if (locality) selectLocality(locality); else scheduleCalculate(20);
  });

  const languageObserver = new MutationObserver(() => applyLanguage());
  languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});

  function documentTop(element) {
    let top=0;
    let node=element;
    while (node) {
      top += node.offsetTop || 0;
      node = node.offsetParent;
    }
    return top;
  }

  function followParentViewport(offset) {
    const panel=document.querySelector(".lab-summary-rail");
    const layout=document.querySelector(".house-lab-layout");
    if (!panel || !layout) return;
    if (root.getBoundingClientRect().width <= 900) {
      panel.style.transform="";
      return;
    }
    const layoutTop=documentTop(layout);
    const max=Math.max(0,layout.offsetHeight-panel.offsetHeight);
    const target=Math.max(0,Math.min(max,(Number(offset)||0)-layoutTop+8));
    panel.style.transform=`translateY(${Math.round(target)}px)`;
  }

  window.addEventListener("message", event => {
    if (event.source !== window.parent) return;
    const data=event.data;
    if (!data || data.type !== "lacurent:embed-viewport") return;
    followParentViewport(data.offset);
  });

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

  updateHeatingVisual();
  syncLevelSegments();
  syncHeatingPills();
  openResultTab("overview");
  applyLanguage();
})();