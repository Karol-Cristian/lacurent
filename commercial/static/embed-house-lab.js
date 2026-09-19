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

  const configPanel = root.querySelector(".lab-config-panel");
  const mobileEditorToolbar = root.querySelector(".lab-mobile-editor-toolbar");
  const mobileEditorTitle = document.getElementById("labMobileEditorTitle");
  const renovationChooser = document.getElementById("labRenovationChooser");
  const renovationValueStrip = document.getElementById("labRenovationValueStrip");
  const renovationBaseValue = document.getElementById("labRenovationBaseValue");
  const renovationScenarioValue = document.getElementById("labRenovationScenarioValue");
  const renovationBaseLabel = document.getElementById("labRenovationBaseLabel");
  const renovationScenarioLabel = document.getElementById("labRenovationScenarioLabel");
  const mobilePrimaryAction = document.getElementById("labMobilePrimaryAction");
  const mobileSecondaryAction = document.getElementById("labMobileSecondaryAction");
  const mobileHomeAction = document.getElementById("labMobileHomeAction");
  const mobileSecondaryActions = document.getElementById("labMobileSecondaryActions");
  const mobileModeKicker = document.getElementById("labMobileModeKicker");
  const mobileModeTitle = document.getElementById("labMobileModeTitle");
  const mobileLivebar = root.querySelector(".lab-mobile-livebar");
  let activeRenovationAction = null;
  const CHAPTER_TITLES = {
    "1":"Casa",
    "2":"Anvelopa",
    "3":"Instalațiile",
    "4":"Regenerabile",
    "5":"Performanța",
    "6":"Renovarea"
  };
  const CHAPTER_CONTEXT = {
    "1":{src:"/home-lab-assets/house-orientation.webp?v=2",ro:["Casa ta, dintr-o privire","Dimensiunile și confortul definesc punctul de plecare."],en:["Your home at a glance","Size and comfort define the starting point."]},
    "2":{src:"/home-lab-assets/house-orientation.webp?v=2",ro:["Anvelopa ține căldura în casă","Pereți, pod, pardoseală și ferestre — exact lucrurile pe care le poți îmbunătăți."],en:["The envelope keeps heat inside","Walls, roof, floor and windows are the parts you can improve."]},
    "3":{src:"/home-lab-assets/house-fireplace.webp?v=2",ro:["Instalațiile transformă energia în confort","Schimbă sursa de încălzire, ventilația sau răcirea și vezi efectul."],en:["Systems turn energy into comfort","Change heating, ventilation or cooling and see the effect."]},
    "4":{src:"/home-lab-assets/house-pv.webp?v=2",ro:["Regenerabilele reduc energia cumpărată","Pompa de căldură este calculată acum; PV și solar termic urmează."],en:["Renewables reduce purchased energy","Heat pumps are calculated now; PV and solar thermal are next."]},
    "5":{src:"/home-lab-assets/house-orientation.webp?v=2",ro:["Performanța este rezultatul casei","Clasa, costul și energia se recalculează din configurația ta."],en:["Performance is the result of the house","Class, cost and energy are recalculated from your configuration."]},
    "6":{src:"/home-lab-assets/house-pv.webp?v=2",ro:["Renovarea începe de la casa reală","Fixează baseline-ul, apoi testează intervenții fără să-l pierzi."],en:["Renovation starts from the real home","Lock the baseline, then test interventions without losing it."]}
  };
  const RENOVATION_ACTIONS = {
    wall:{chapter:"2",title:{ro:"Izolează fațada",en:"Insulate the facade"},target:"labWallInsNumber"},
    roof:{chapter:"2",title:{ro:"Izolează podul",en:"Insulate the roof / attic"},target:"labRoofInsNumber"},
    floor:{chapter:"2",title:{ro:"Izolează pardoseala",en:"Insulate the floor"},target:"labFloorInsNumber"},
    windows:{chapter:"2",title:{ro:"Schimbă ferestrele",en:"Replace the windows"},target:"labGlazing"},
    heating:{chapter:"3",title:{ro:"Schimbă încălzirea",en:"Change the heating system"},target:"labHeating"},
    ventilation:{chapter:"3",title:{ro:"Ventilație & răcire",en:"Ventilation & cooling"},target:"labVentilation"}
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
      configureTitle:"Casa mea", configureSubtitle:"Corectează doar ce nu seamănă cu locuința ta. Restul îl estimăm noi.",
      houseUseTitle:"Casa și utilizarea", houseUseSubtitle:"Dimensiuni, niveluri și ocupare",
      envelopeTitle:"Anvelopa și ferestrele", envelopeSubtitle:"Izolație, geamuri și orientare solară",
      systemsTitle:"Încălzire și apă caldă", systemsSubtitle:"Alege sursa principală",
      ventilationTitle:"Ventilație și răcire", ventilationSubtitle:"Schimbul de aer și confortul de vară",
      ventilation:"Sistem ventilație", cooling:"Răcire", otherHeating:"Alte sisteme",
      compareScenarios:"Compară cu casa actuală", tabOverview:"Prezentare", tabCosts:"Costuri", tabEnergy:"Energie", tabLosses:"Pierderi", tabComparison:"Comparație",
      overviewBaselineTitle:"Față de casa ta actuală", overviewBaselineSubtitle:"baseline real salvat de tine", overviewBaselineEmptyTitle:"Salvează casa actuală", overviewBaselineEmptyText:"După aceea, orice modificare devine un scenariu comparat cu situația reală de azi.", details:"Detalii",
      heroMessage:"O casă bine configurată înseamnă costuri mai mici și mai mult confort.",
      energyClass:"Clasă energetică", lossSubtitle:"% din pierderile totale", yourHouse:"Casa ta", referenceHouse:"Casă de referință",
      saveConfig:"Salvează configurația", exportReport:"Exportă raport", summaryPromise:"Case eficiente pentru oameni, comunități și un mediu mai curat.", summaryLearn:"Rezultatele folosesc motorul energetic LaCurent.",
      baselineStep:"Punct de plecare", baselineTitle:"Casa mea", baselinePrompt:"Configurează locuința așa cum este astăzi, apoi salveaz-o ca punct de plecare.",
      saveBaseline:"Salvează casa mea", updateBaseline:"Actualizează casa mea", restoreBaseline:"Revino la casa mea",
      comparisonNeedsBaseline:"Salvează mai întâi casa actuală", comparisonNeedsBaselineText:"Apoi modifică izolația, ferestrele sau sistemele și vei vedea exact diferența față de situația de azi.",
      baselineComparisonKicker:"Comparație reală", baselineComparisonTitle:"Casa mea vs scenariul curent", baselineCurrentHouse:"Casa mea", baselineScenario:"Scenariul curent", liveScenario:"recalculat live",
      saveScenario:"Salvează scenariul", savedScenarios:"Casa actuală și scenarii", clearScenarios:"Șterge scenariile", versusBaseline:"Față de casa actuală",
      metricAnnualCost:"Cost anual", metricFinalEnergy:"Energie finală", metricPrimary:"Energie primară specifică", metricCo2:"Emisii CO₂", metricPower:"Putere termică", metricClass:"Clasă energetică",
      noSavedScenarios:"Nu ai salvat încă variante.", savedNow:"salvată acum", scenarioSaved:"Scenariu salvat", savings:"economie", extraCost:"cost suplimentar", noChange:"fără diferență",
      classImproved:"clasă mai bună", classWorsened:"clasă mai slabă",
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
      configureTitle:"My home", configureSubtitle:"Correct only what does not match your home. We estimate the rest.",
      houseUseTitle:"House and use", houseUseSubtitle:"Size, levels and occupants",
      envelopeTitle:"Envelope and windows", envelopeSubtitle:"Insulation, glazing and solar orientation",
      systemsTitle:"Heating and hot water", systemsSubtitle:"Choose the main heat source",
      ventilationTitle:"Ventilation and cooling", ventilationSubtitle:"Air change and summer comfort",
      ventilation:"Ventilation system", cooling:"Cooling", otherHeating:"Other systems",
      compareScenarios:"Compare with current home", tabOverview:"Overview", tabCosts:"Costs", tabEnergy:"Energy", tabLosses:"Losses", tabComparison:"Comparison",
      overviewBaselineTitle:"Compared with your current home", overviewBaselineSubtitle:"your saved real-home baseline", overviewBaselineEmptyTitle:"Save the current home", overviewBaselineEmptyText:"After that, every change becomes a scenario compared with the real situation today.", details:"Details",
      heroMessage:"A well-configured home means lower costs and better comfort.",
      energyClass:"Energy class", lossSubtitle:"% of total losses", yourHouse:"Your home", referenceHouse:"Reference home",
      saveConfig:"Save configuration", exportReport:"Export report", summaryPromise:"Efficient homes for people, communities and a cleaner environment.", summaryLearn:"Results use the LaCurent energy engine.",
      baselineStep:"Starting point", baselineTitle:"My home", baselinePrompt:"Configure the home as it is today, then save it as the starting point.",
      saveBaseline:"Save my home", updateBaseline:"Update my home", restoreBaseline:"Return to my home",
      comparisonNeedsBaseline:"Save the current home first", comparisonNeedsBaselineText:"Then change insulation, windows or systems and see the exact difference versus today.",
      baselineComparisonKicker:"Real comparison", baselineComparisonTitle:"My home vs current scenario", baselineCurrentHouse:"My home", baselineScenario:"Current scenario", liveScenario:"recalculated live",
      saveScenario:"Save scenario", savedScenarios:"Current home and scenarios", clearScenarios:"Clear scenarios", versusBaseline:"Compared with current home",
      metricAnnualCost:"Annual cost", metricFinalEnergy:"Final energy", metricPrimary:"Specific primary energy", metricCo2:"CO₂ emissions", metricPower:"Heat load", metricClass:"Energy class",
      noSavedScenarios:"No saved variants yet.", savedNow:"saved now", scenarioSaved:"Scenario saved", savings:"saving", extraCost:"extra cost", noChange:"no difference",
      classImproved:"better class", classWorsened:"worse class",
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
  const isMobileCockpit = () => root.getBoundingClientRect().width <= 760;
  const optionLabel = control => control?.selectedOptions?.[0]?.textContent?.trim() || "";
  const setText = (id,value) => { const node=document.getElementById(id); if (node) node.textContent=value; };

  function setDeltaNode(id,text,tone="") {
    const node=document.getElementById(id);
    if (!node) return;
    node.textContent=text || "";
    node.classList.toggle("is-good",tone==="good");
    node.classList.toggle("is-bad",tone==="bad");
  }

  function compactDelta(current,baseline,unit="",digits=0,invertGood=false) {
    const now=Number(current), base=Number(baseline);
    if (!Number.isFinite(now) || !Number.isFinite(base)) return {text:"",tone:""};
    const delta=now-base;
    if (Math.abs(delta) < Math.pow(10,-digits)/2) return {text:"fără schimbare",tone:""};
    const good=invertGood ? delta>0 : delta<0;
    return {
      text:`${delta>0?"+":"−"}${fmt(Math.abs(delta),digits)}${unit ? " "+unit : ""} față de casă`,
      tone:good?"good":"bad"
    };
  }

  function benefitPercentDelta(current,baseline) {
    const now=Number(current), base=Number(baseline);
    if (!Number.isFinite(now) || !Number.isFinite(base) || Math.abs(base)<1e-9) return {text:"",tone:""};
    const benefitPct=100*(base-now)/Math.abs(base);
    if (Math.abs(benefitPct)<0.05) return {text:lang()==="en"?"same":"la fel",tone:""};
    return {
      text:`${benefitPct>0?"+":"−"}${fmt(Math.abs(benefitPct),0)}%`,
      tone:benefitPct>0?"good":"bad"
    };
  }

  function updateMobileFlow() {
    const currentMode=!baselineSnapshot || editingCurrentHome;
    mobileLivebar?.setAttribute("data-mobile-flow",currentMode?"current":"scenario");
    if (mobileModeKicker) {
      mobileModeKicker.textContent=currentMode
        ? (lang()==="en"?"MY HOME":"CASA MEA")
        : (lang()==="en"?"CURRENT SCENARIO":"SCENARIUL CURENT");
    }
    if (mobileModeTitle) {
      mobileModeTitle.textContent=currentMode
        ? (baselineSnapshot
          ? (lang()==="en"?"Edit the saved starting point":"Editează punctul de plecare salvat")
          : (lang()==="en"?"Configure the real home":"Configurează locuința reală"))
        : (lang()==="en"?"Compared with My home":"Comparat cu Casa mea");
    }
    if (mobilePrimaryAction) {
      mobilePrimaryAction.textContent=currentMode
        ? (baselineSnapshot
          ? (lang()==="en"?"Update my home → renovation site":"Actualizează casa mea → renovări")
          : (lang()==="en"?"Save my home → renovation site":"Salvează casa mea → renovări"))
        : (lang()==="en"?"Save scenario":"Salvează scenariul");
    }
    if (mobileSecondaryActions) mobileSecondaryActions.hidden=currentMode || !baselineSnapshot;
    if (mobileSecondaryAction) mobileSecondaryAction.textContent=lang()==="en"?"Renovation site":"Șantier renovări";
    if (mobileHomeAction) mobileHomeAction.textContent=lang()==="en"?"⌂ My home":"⌂ Casa mea";
  }

  function renovationDisplayValue(actionName, values) {
    if (!values) return "—";
    if (actionName==="wall") return `${values.wallIns ?? "—"} cm`;
    if (actionName==="roof") return `${values.roofIns ?? "—"} cm`;
    if (actionName==="floor") return `${values.floorIns ?? "—"} cm`;
    if (actionName==="windows") {
      const glazing=optionText(controls.glazing,values.glazing) || "—";
      return `${glazing} · ${values.windows ?? "—"} m²`;
    }
    if (actionName==="heating") return optionText(controls.heating,values.heating) || "—";
    if (actionName==="ventilation") {
      const ventilation=optionText(controls.ventilation,values.ventilation) || "—";
      const cooling=optionText(controls.cooling,values.cooling) || "—";
      return `${ventilation} · ${cooling}`;
    }
    return "—";
  }

  function updateRenovationComparison() {
    if (!renovationValueStrip || !activeRenovationAction || !baselineSnapshot || editingCurrentHome) {
      if (renovationValueStrip) renovationValueStrip.hidden=true;
      return;
    }
    const current=captureControlState();
    renovationValueStrip.hidden=false;
    renovationValueStrip.dataset.renovationAction=activeRenovationAction;
    if (renovationBaseValue) renovationBaseValue.textContent=renovationDisplayValue(activeRenovationAction,baselineSnapshot.controls || {});
    if (renovationScenarioValue) renovationScenarioValue.textContent=renovationDisplayValue(activeRenovationAction,current);
    if (renovationBaseLabel) renovationBaseLabel.textContent=lang()==="en"?"saved value":"valoare salvată";
    if (renovationScenarioLabel) renovationScenarioLabel.textContent=lang()==="en"?"value being tested":"valoare testată";
  }

  function updateChapterSummaries(data=lastResult) {
    setText("labChapter1Summary",`${controls.area.value} m² · ${controls.levels.value} niveluri · ${controls.temperature.value}°C`);
    setText("labChapter2Summary",`${controls.wallIns.value} cm pereți · ${controls.roofIns.value} cm pod · ${optionLabel(controls.glazing)}`);
    setText("labChapter3Summary",`${optionLabel(controls.heating)} · ${optionLabel(controls.ventilation)}`);
    setText("labChapter4Summary",controls.heating.value==="heat_pump" ? "Pompă de căldură activă · PV/solar în curând" : "Nimic instalat · PV/solar în curând");
    if (data) {
      const cost=data.annual_cost_lei == null ? "cost —" : `${fmt(data.annual_cost_lei)} lei/an`;
      setText("labChapter5Summary",`Clasă ${data.energy_class || "—"} · ${cost}`);
      setText("labMobileClass",data.energy_class || "—");
      setText("labMobileCost",data.annual_cost_lei == null ? "—" : `${fmt(data.annual_cost_lei)} lei`);
      setText("labMobileEnergy",`${fmt(data.final_energy_kwh)} kWh`);
      setText("labMobileCo2",`${fmt(data.co2_kg)} kg`);
      setText("labChapterClass",data.energy_class || "—");
      setText("labChapterCost",data.annual_cost_lei == null ? "—" : `${fmt(data.annual_cost_lei)} lei/an`);
      setText("labChapterPrimary",`${fmt(data.primary_specific_kwh_m2,1)} kWh/m²/an`);
      setText("labChapterCo2",`${fmt(data.co2_kg)} kg/an`);

      const base=baselineSnapshot?.result;
      if (base && !editingCurrentHome) {
        const costDelta=benefitPercentDelta(data.annual_cost_lei,base.annual_cost_lei);
        const energyDelta=benefitPercentDelta(data.final_energy_kwh,base.final_energy_kwh);
        const co2Delta=benefitPercentDelta(data.co2_kg,base.co2_kg);
        setDeltaNode("labMobileCostDelta",costDelta.text,costDelta.tone);
        setDeltaNode("labMobileEnergyDelta",energyDelta.text,energyDelta.tone);
        setDeltaNode("labMobileCo2Delta",co2Delta.text,co2Delta.tone);
        const baseClass=base.energy_class || "—";
        const classRank={A:1,B:2,C:3,D:4,E:5,F:6,G:7};
        const baseRank=classRank[String(baseClass).toUpperCase()];
        const nowRank=classRank[String(data.energy_class || "").toUpperCase()];
        const classTone=baseRank && nowRank && baseRank!==nowRank ? (nowRank<baseRank?"good":"bad") : "";
        setDeltaNode("labMobileClassDelta",baseClass===data.energy_class?(lang()==="en"?"same":"la fel"):`${baseClass} → ${data.energy_class || "—"}`,classTone);
        const saving=Number(base.annual_cost_lei)-Number(data.annual_cost_lei);
        setText("labChapter6Summary",Number.isFinite(saving) && Math.abs(saving)>.5
          ? `${saving>0?"Economisești":"Cost suplimentar"} ${fmt(Math.abs(saving))} lei/an`
          : "Casa actuală salvată · testează intervenții");
      } else {
        setDeltaNode("labMobileCostDelta","");
        setDeltaNode("labMobileEnergyDelta","");
        setDeltaNode("labMobileCo2Delta","");
        setDeltaNode("labMobileClassDelta","");
        setText("labChapter6Summary",baselineSnapshot ? "Editezi casa actuală" : "Fixează mai întâi casa actuală");
      }
    }
    updateRenovationComparison();
  }

  function setChapterContext(chapter) {
    const item=CHAPTER_CONTEXT[chapter] || CHAPTER_CONTEXT["1"];
    const image=document.getElementById("labContextImage");
    const title=document.getElementById("labContextTitle");
    const text=document.getElementById("labContextText");
    if (image) image.src=item.src;
    const copy=lang()==="en" ? item.en : item.ro;
    if (title) title.textContent=copy[0];
    if (text) text.textContent=copy[1];
  }

  function openChapter(chapter,editorTitle="",preserveRenovation=false) {
    const panels=Array.from(root.querySelectorAll("[data-lab-chapter-panel]"));
    if (!preserveRenovation) {
      activeRenovationAction=null;
      configPanel?.removeAttribute("data-active-renovation");
      if (renovationValueStrip) renovationValueStrip.hidden=true;
    }
    renovationChooser?.setAttribute("hidden","");
    configPanel?.classList.remove("is-renovation-choosing");
    panels.forEach(panel => panel.classList.toggle("is-mobile-open",panel.dataset.labChapterPanel===chapter));
    root.querySelectorAll("[data-lab-chapter-open]").forEach(button => button.classList.toggle("is-active",button.dataset.labChapterOpen===chapter));
    setChapterContext(chapter);
    if (isMobileCockpit()) {
      configPanel?.classList.add("is-chapter-editing");
      if (mobileEditorToolbar) mobileEditorToolbar.hidden=false;
      if (mobileEditorTitle) mobileEditorTitle.textContent=editorTitle || CHAPTER_TITLES[chapter] || "Capitol";
    } else {
      const first=panels.find(panel => panel.dataset.labChapterPanel===chapter);
      first?.scrollIntoView({behavior:"smooth",block:"start"});
    }
  }

  function openRenovationChooser() {
    if (!baselineSnapshot || editingCurrentHome) return;
    activeRenovationAction=null;
    configPanel?.removeAttribute("data-active-renovation");
    if (renovationValueStrip) renovationValueStrip.hidden=true;
    configPanel?.classList.remove("is-chapter-editing");
    configPanel?.classList.add("is-renovation-choosing");
    root.querySelectorAll("[data-lab-chapter-panel]").forEach(panel => panel.classList.remove("is-mobile-open"));
    root.querySelectorAll("[data-lab-chapter-open]").forEach(button => button.classList.remove("is-active"));
    if (mobileEditorToolbar) mobileEditorToolbar.hidden=true;
    if (renovationChooser) renovationChooser.hidden=false;
  }

  function closeChapter() {
    configPanel?.classList.remove("is-chapter-editing");
    root.querySelectorAll("[data-lab-chapter-panel]").forEach(panel => panel.classList.remove("is-mobile-open"));
    root.querySelectorAll("[data-lab-chapter-open]").forEach(button => button.classList.remove("is-active"));
    if (mobileEditorToolbar) mobileEditorToolbar.hidden=true;
    if (baselineSnapshot && !editingCurrentHome && isMobileCockpit()) {
      openRenovationChooser();
    }
  }

  function openRenovationAction(actionName) {
    const action=RENOVATION_ACTIONS[actionName];
    if (!action) return;
    activeRenovationAction=actionName;
    configPanel?.setAttribute("data-active-renovation",actionName);
    openChapter(action.chapter,action.title[lang()] || action.title.ro,true);
    updateRenovationComparison();
    const target=document.getElementById(action.target);
    const field=target?.closest(".lab-range-control,.lab-select-field");
    if (field) {
      field.classList.add("is-renovation-target");
      window.setTimeout(()=>field.classList.remove("is-renovation-target"),1600);
    }
  }


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
  let lastCalculatedFormSignature = "";
  let activeController = null;
  const scenarioStorageKey = `lacurent-home-lab-scenarios-v1:${root.dataset.partnerId || "default"}`;
  let baselineSnapshot = null;
  let savedScenarios = [];

  try {
    const stored = JSON.parse(window.localStorage?.getItem(scenarioStorageKey) || "null");
    if (stored && stored.baseline) baselineSnapshot = stored.baseline;
    if (stored && Array.isArray(stored.scenarios)) savedScenarios = stored.scenarios.slice(0,6);
  } catch (_) {
    baselineSnapshot = null;
    savedScenarios = [];
  }

  let editingCurrentHome = !baselineSnapshot;

  function updateHouseFlow(data=lastResult) {
    const modeBar=root.querySelector(".lab-house-mode-bar");
    const kicker=document.getElementById("labHouseModeKicker");
    const title=document.getElementById("labHouseModeTitle");
    const hint=document.getElementById("labHouseModeHint");
    const confirm=document.getElementById("labConfirmCurrentHome");
    const edit=document.getElementById("labEditCurrentHome");
    const english=lang()==="en";

    if (!baselineSnapshot || editingCurrentHome) {
      modeBar?.setAttribute("data-house-mode","current");
      if (kicker) kicker.textContent=baselineSnapshot
        ? (english?"MY HOME · EDITING":"CASA MEA · EDITARE")
        : (english?"MY HOME":"CASA MEA");
      if (title) title.textContent=baselineSnapshot
        ? (english?"You are editing the starting point":"Editezi punctul de plecare")
        : (english?"This is my home today":"Așa este locuința mea acum");
      if (hint) hint.textContent=baselineSnapshot
        ? (english?"Save again when the real-home description is correct.":"Salvează din nou când descrierea casei reale este corectă.")
        : (english?"Check the six areas, then lock the starting point.":"Verifică cele 6 zone, apoi fixează punctul de plecare.");
      if (confirm) {
        confirm.hidden=false;
        confirm.textContent=baselineSnapshot
          ? (english?"Update my home → renovation site":"Actualizează casa mea → renovări")
          : (english?"Save my home → renovation site":"Salvează casa mea → renovări");
      }
      if (edit) edit.hidden=true;
    } else {
      modeBar?.setAttribute("data-house-mode","scenario");
      if (kicker) kicker.textContent=english?"CURRENT SCENARIO":"SCENARIUL CURENT";
      if (title) title.textContent=english?"Test one improvement at a time":"Testează o îmbunătățire";
      if (hint) hint.textContent=english
        ? "Your current home is locked. Every change is compared with it."
        : "Casa actuală este salvată. Orice schimbare este comparată cu ea.";
      if (confirm) confirm.hidden=true;
      if (edit) {
        edit.hidden=false;
        edit.textContent=english?"Edit current home":"Editează casa actuală";
      }
    }
    updateChapterSummaries(data);
    updateMobileFlow();
    if (renovationChooser && baselineSnapshot && !editingCurrentHome && isMobileCockpit() && !configPanel?.classList.contains("is-chapter-editing")) {
      renovationChooser.hidden=false;
      configPanel?.classList.add("is-renovation-choosing");
    } else if (renovationChooser && (!baselineSnapshot || editingCurrentHome)) {
      renovationChooser.hidden=true;
      configPanel?.classList.remove("is-renovation-choosing");
    }
  }

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

  function nullableNumber(value) {
    if (value == null || value === "") return null;
    const parsed=Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function snapshotResult(data) {
    return {
      energy_class:data?.energy_class || "—",
      annual_cost_lei:nullableNumber(data?.annual_cost_lei),
      average_monthly_cost_lei:nullableNumber(data?.average_monthly_cost_lei),
      final_energy_kwh:nullableNumber(data?.final_energy_kwh),
      primary_specific_kwh_m2:nullableNumber(data?.primary_specific_kwh_m2),
      co2_kg:nullableNumber(data?.co2_kg),
      design_heat_load_kw:nullableNumber(data?.design_heat_load_kw),
      heat_loss_w_k:nullableNumber(data?.heat_loss_w_k),
      locality:data?.locality || localityInput.value || "",
      climate_station:data?.climate_station || ""
    };
  }

  function currentFormSignature() {
    const values=[];
    new FormData(form).forEach((value,key) => values.push([key,String(value)]));
    values.sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    return JSON.stringify(values);
  }

  function captureControlState() {
    return Object.fromEntries(Object.entries(controls).filter(([,control]) => control).map(([key,control]) => [key, control.value]));
  }

  function captureSnapshot(name) {
    syncGeometry();
    if (!lastResult || lastCalculatedFormSignature !== currentFormSignature()) return null;
    const values={};
    new FormData(form).forEach((value,key) => { values[key]=value; });
    return {
      id:`scenario-${Date.now().toString(36)}`,
      name,
      savedAt:new Date().toISOString(),
      localityId:selectedLocality?.id || formField("locality_id")?.value || "",
      localityLabel:localityInput.value || "",
      controls:captureControlState(),
      form:values,
      result:snapshotResult(lastResult)
    };
  }

  function persistScenarioState() {
    try {
      window.localStorage?.setItem(scenarioStorageKey, JSON.stringify({
        baseline:baselineSnapshot,
        scenarios:savedScenarios.slice(0,6)
      }));
    } catch (_) {}
  }

  function metricDelta(base,current,lowerIsBetter=true) {
    if (base == null || current == null) return {pct:null,good:null};
    const b=Number(base);
    const n=Number(current);
    if (!Number.isFinite(b) || !Number.isFinite(n) || Math.abs(b) < 1e-9) return {pct:null,good:null};
    const pct=100*(n-b)/Math.abs(b);
    return {pct,good:lowerIsBetter ? pct < -0.05 : pct > 0.05};
  }

  function deltaBadge(base,current,lowerIsBetter=true) {
    const {pct,good}=metricDelta(base,current,lowerIsBetter);
    if (pct == null || Math.abs(pct) < .05) return `<span class="is-neutral">${tr("noChange")}</span>`;
    const sign=pct>0?"+":"";
    return `<span class="${good?"is-good":"is-bad"}">${sign}${fmt(pct,1)}%</span>`;
  }

  const ENERGY_CLASS_RANK={A:1,B:2,C:3,D:4,E:5,F:6,G:7};

  function classDeltaBadge(base,current) {
    const b=ENERGY_CLASS_RANK[String(base || "").toUpperCase()];
    const n=ENERGY_CLASS_RANK[String(current || "").toUpperCase()];
    if (!b || !n || b === n) return `<span class="is-neutral">${tr("noChange")}</span>`;
    const improved=n < b;
    return `<span class="${improved?"is-good":"is-bad"}">${tr(improved?"classImproved":"classWorsened")}</span>`;
  }

  function optionText(control,value) {
    const option=Array.from(control?.options || []).find(item => item.value === String(value));
    return option?.textContent?.trim() || "";
  }

  function scenarioNameFromChanges(snapshot,index) {
    const base=baselineSnapshot?.controls || {};
    const current=snapshot?.controls || {};
    const changes=[];
    if (["wallIns","roofIns","floorIns"].some(key => String(base[key]) !== String(current[key]))) {
      changes.push(lang()==="en" ? "Insulation" : "Izolație");
    }
    if (String(base.glazing) !== String(current.glazing)) {
      changes.push(optionText(controls.glazing,current.glazing) || (lang()==="en" ? "Windows" : "Ferestre"));
    }
    if (String(base.heating) !== String(current.heating)) {
      changes.push(optionText(controls.heating,current.heating) || tr("heating"));
    }
    if (String(base.ventilation) !== String(current.ventilation)) {
      changes.push(optionText(controls.ventilation,current.ventilation) || tr("ventilation"));
    }
    if (String(base.cooling) !== String(current.cooling)) {
      changes.push(optionText(controls.cooling,current.cooling) || tr("cooling"));
    }
    if (String(base.windows) !== String(current.windows) && !changes.some(item => /fere|window/i.test(item))) {
      changes.push(lang()==="en" ? "Windows" : "Ferestre");
    }
    return changes.length
      ? changes.slice(0,3).join(" + ")
      : `${lang()==="en"?"Scenario":"Scenariul"} ${index}`;
  }

  function renderSavedScenarios() {
    const node=document.getElementById("labSavedScenarios");
    if (!node) return;
    const base=baselineSnapshot?.result || null;
    const baseCost=base?.annual_cost_lei;
    const baselineCard=base ? `<article class="lab-scenario-card is-baseline">
      <span>${tr("baselineCurrentHouse")}</span>
      <strong>${baseCost == null ? "—" : `${fmt(baseCost)} lei/an`}</strong>
      <small>${base.energy_class || "—"} · ${base.final_energy_kwh == null ? "—" : `${fmt(base.final_energy_kwh)} kWh/an`}</small>
    </article>` : "";

    if (!savedScenarios.length) {
      node.innerHTML=baselineCard + `<p class="lab-scenario-empty">${tr("noSavedScenarios")}</p>`;
      return;
    }

    node.innerHTML=baselineCard + savedScenarios.map((scenario,index) => {
      const result=scenario.result || {};
      const hasCost=baseCost != null && result.annual_cost_lei != null;
      const saving=hasCost ? Number(baseCost)-Number(result.annual_cost_lei) : null;
      const savingPct=hasCost && Math.abs(Number(baseCost)) > 1e-9 ? 100*saving/Number(baseCost) : null;
      const delta=savingPct == null
        ? tr("noChange")
        : `${saving>=0?"−":"+"}${fmt(Math.abs(savingPct),1)}% ${saving>=0?tr("savings"):tr("extraCost")}`;
      return `<button type="button" class="lab-scenario-card" data-load-scenario="${scenario.id}">
        <span>${scenario.name || `${lang()==="en"?"Scenario":"Scenariul"} ${index+1}`}</span>
        <strong>${result.annual_cost_lei == null ? "—" : `${fmt(result.annual_cost_lei)} lei/an`}</strong>
        <small>${result.energy_class || "—"} · ${result.final_energy_kwh == null ? "—" : `${fmt(result.final_energy_kwh)} kWh/an`}</small>
        <small class="${saving == null ? "is-neutral" : saving>=0?"is-good":"is-bad"}">${delta}</small>
      </button>`;
    }).join("");
  }

  function renderBaselineComparison() {
    const empty=document.getElementById("labBaselineEmpty");
    const comparison=document.getElementById("labBaselineComparison");
    const rail=document.getElementById("labBaselineRail");
    const restore=document.getElementById("labRestoreBaseline");
    const saveButton=document.getElementById("labSaveBaseline");
    const title=document.getElementById("labBaselineTitle");
    const summary=document.getElementById("labBaselineSummary");

    const overviewEmpty=document.getElementById("labOverviewBaselineEmpty");
    const overviewData=document.getElementById("labOverviewBaselineData");

    if (!baselineSnapshot) {
      if (overviewEmpty) overviewEmpty.hidden=false;
      if (overviewData) overviewData.hidden=true;
      if (empty) empty.hidden=false;
      if (comparison) comparison.hidden=true;
      if (rail) rail.hidden=true;
      if (restore) restore.hidden=true;
      if (saveButton) saveButton.textContent=tr("saveBaseline");
      if (title) title.textContent=tr("baselineTitle");
      if (summary) summary.textContent=tr("baselinePrompt");
      renderSavedScenarios();
      updateChapterSummaries();
      return;
    }

    const base=baselineSnapshot.result || {};
    const current=lastResult ? snapshotResult(lastResult) : base;
    if (overviewEmpty) overviewEmpty.hidden=true;
    if (overviewData) overviewData.hidden=false;
    if (empty) empty.hidden=true;
    if (comparison) comparison.hidden=false;
    if (rail) rail.hidden=false;
    if (restore) restore.hidden=false;
    if (saveButton) saveButton.textContent=tr("updateBaseline");
    if (title) title.textContent=tr("baselineTitle");
    if (summary) summary.textContent=`${base.energy_class || "—"} · ${base.annual_cost_lei == null ? "—" : `${fmt(base.annual_cost_lei)} lei/an`} · ${base.final_energy_kwh == null ? "—" : `${fmt(base.final_energy_kwh)} kWh/an`}`;

    const baselineClass=document.getElementById("labBaselineClass");
    const scenarioClass=document.getElementById("labScenarioClass");
    const stamp=document.getElementById("labBaselineStamp");
    if (baselineClass) baselineClass.textContent=base.energy_class || "—";
    if (scenarioClass) scenarioClass.textContent=current.energy_class || "—";
    if (stamp) stamp.textContent=baselineSnapshot.savedAt ? new Date(baselineSnapshot.savedAt).toLocaleString(lang()==="en"?"en-US":"ro-RO",{dateStyle:"short",timeStyle:"short"}) : tr("savedNow");

    const metrics=[
      {label:tr("metricAnnualCost"),base:base.annual_cost_lei,current:current.annual_cost_lei,unit:"lei/an",digits:0},
      {label:tr("metricFinalEnergy"),base:base.final_energy_kwh,current:current.final_energy_kwh,unit:"kWh/an",digits:0},
      {label:tr("metricPrimary"),base:base.primary_specific_kwh_m2,current:current.primary_specific_kwh_m2,unit:"kWh/m²/an",digits:1},
      {label:tr("metricCo2"),base:base.co2_kg,current:current.co2_kg,unit:"kg/an",digits:0},
      {label:tr("metricPower"),base:base.design_heat_load_kw,current:current.design_heat_load_kw,unit:"kW",digits:1}
    ];
    const list=document.getElementById("labBaselineMetricList");
    if (list) list.innerHTML=metrics.map(row => `<div class="lab-baseline-metric">
      <span>${row.label}</span>
      <strong>${row.base == null ? "—" : fmt(row.base,row.digits)} <small>${row.unit}</small></strong>
      <b>→</b>
      <strong>${row.current == null ? "—" : fmt(row.current,row.digits)} <small>${row.unit}</small></strong>
      ${deltaBadge(row.base,row.current,true)}
    </div>`).join("") + `<div class="lab-baseline-metric lab-baseline-class-metric">
      <span>${tr("metricClass")}</span>
      <strong>${base.energy_class || "—"}</strong><b>→</b><strong>${current.energy_class || "—"}</strong>${classDeltaBadge(base.energy_class,current.energy_class)}
    </div>`;

    const hasCost=base.annual_cost_lei != null && current.annual_cost_lei != null;
    const savings=hasCost ? Number(base.annual_cost_lei)-Number(current.annual_cost_lei) : null;
    const baseCost=hasCost ? Number(base.annual_cost_lei) : null;

    const overviewCost=document.getElementById("labOverviewBaselineCost");
    const overviewEnergy=document.getElementById("labOverviewBaselineEnergy");
    const overviewPower=document.getElementById("labOverviewBaselinePower");

    const costDelta=hasCost ? Number(current.annual_cost_lei)-Number(base.annual_cost_lei) : null;
    const energyDelta=current.final_energy_kwh != null && base.final_energy_kwh != null ? Number(current.final_energy_kwh)-Number(base.final_energy_kwh) : null;
    const powerDelta=current.design_heat_load_kw != null && base.design_heat_load_kw != null ? Number(current.design_heat_load_kw)-Number(base.design_heat_load_kw) : null;

    const deltaText=(value,unit,digits=0) => {
      if (value == null || !Number.isFinite(Number(value))) return "—";
      if (Math.abs(value) < (digits ? 0.05 : 0.5)) return tr("noChange");
      const sign=value>0?"+":"−";
      return `${sign}${fmt(Math.abs(value),digits)} ${unit}`;
    };

    if (overviewCost) {
      overviewCost.textContent=deltaText(costDelta,"lei/an",0);
      overviewCost.classList.toggle("is-good",costDelta != null && costDelta < -0.5);
      overviewCost.classList.toggle("is-bad",costDelta != null && costDelta > 0.5);
    }
    if (overviewEnergy) {
      overviewEnergy.textContent=deltaText(energyDelta,"kWh/an",0);
      overviewEnergy.classList.toggle("is-good",energyDelta != null && energyDelta < -0.5);
      overviewEnergy.classList.toggle("is-bad",energyDelta != null && energyDelta > 0.5);
    }
    if (overviewPower) {
      overviewPower.textContent=deltaText(powerDelta,"kW",1);
      overviewPower.classList.toggle("is-good",powerDelta != null && powerDelta < -0.05);
      overviewPower.classList.toggle("is-bad",powerDelta != null && powerDelta > 0.05);
    }
    const savingsPct=baseCost != null && Math.abs(baseCost) > 1e-9 ? 100*savings/baseCost : null;
    const savingsNode=document.getElementById("labBaselineSavings");
    const noteNode=document.getElementById("labBaselineSavingsNote");
    if (savingsNode) {
      savingsNode.classList.toggle("is-good", savings != null && savings>0.5);
      savingsNode.classList.toggle("is-bad", savings != null && savings<-.5);
      savingsNode.textContent=savings == null ? "—" : Math.abs(savings)<.5 ? tr("noChange") : `${savings>0?"−":"+"}${fmt(Math.abs(savings))} lei/an`;
    }
    if (noteNode) noteNode.textContent=savings == null ? "" : Math.abs(savings)<.5 ? tr("noChange") : `${savingsPct == null ? "—" : `${fmt(Math.abs(savingsPct),1)}%`} ${savings>0?tr("savings"):tr("extraCost")}`;

    renderSavedScenarios();
    updateChapterSummaries();
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot) return;
    Object.entries(snapshot.controls || {}).forEach(([key,value]) => {
      const control=controls[key];
      if (!control) return;
      control.value=String(value);
      if (control.tagName !== "SELECT") syncNumber(control);
    });
    syncLevelSegments();
    syncHeatingPills();
    updateHeatingVisual();
    const locality=byId.get(snapshot.localityId);
    if (locality) {
      selectLocality(locality);
    } else {
      localityInput.value=snapshot.localityLabel || "";
      if (snapshot.form?.locality_id) setField("locality_id",snapshot.form.locality_id);
      if (snapshot.form?.locality) setField("locality",snapshot.form.locality);
      scheduleCalculate(20);
    }
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
    renderBaselineComparison();
    updateHouseFlow(data);
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
    const calculationSignature=currentFormSignature();
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
        if (signal.aborted) return null;
        if (!error?.transient) throw error;
        await wait(450);
        if (signal.aborted || token !== requestToken) return null;
        data = await fetchCalculation(signal);
      }

      if (signal.aborted || token !== requestToken) return null;
      lastCalculatedFormSignature=calculationSignature;
      renderResult(data);
      return data;
    } catch (error) {
      if (signal.aborted || token !== requestToken) return null;
      setStatus(tr("error"), "error");
      return null;
    }
  }

  async function captureFreshSnapshot(name) {
    clearTimeout(timer);
    for (let attempt=0; attempt<2; attempt+=1) {
      syncGeometry();
      const wantedSignature=currentFormSignature();
      if (!lastResult || lastCalculatedFormSignature !== wantedSignature) {
        const data=await calculateNow();
        if (!data) return null;
      }
      syncGeometry();
      if (lastResult && lastCalculatedFormSignature === currentFormSignature()) {
        return captureSnapshot(name);
      }
    }
    return null;
  }

  function scheduleCalculate(delay=180) {
    clearTimeout(timer);
    setStatus(tr("calculating"), "calculating");
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
    renderBaselineComparison();
    updateHouseFlow(lastResult);
    setChapterContext("1");
    updateMobileFlow();
  }

  Object.values(controls).forEach(control => {
    if (!control || control.tagName === "SELECT") return;
    control.addEventListener("input", () => {
      syncNumber(control);
      updateChapterSummaries();
      scheduleCalculate();
    });
  });
  controls.heating.addEventListener("change", () => {
    updateHeatingVisual();
    updateChapterSummaries();
    scheduleCalculate(80);
  });
  controls.glazing.addEventListener("change", () => { updateChapterSummaries(); scheduleCalculate(80); });
  controls.orientation.addEventListener("change", () => { updateChapterSummaries(); scheduleCalculate(80); });
  controls.ventilation.addEventListener("change", () => { updateChapterSummaries(); scheduleCalculate(80); });
  controls.cooling.addEventListener("change", () => { updateChapterSummaries(); scheduleCalculate(80); });

  root.querySelectorAll(".lab-compact-value").forEach(box => {
    const numeric=box.querySelector('input[type="number"][data-lab-number-for]');
    if (!numeric || box.classList.contains("lab-number-control")) return;
    box.classList.add("lab-number-control");
    const minus=document.createElement("button");
    minus.type="button";
    minus.dataset.labStep="-1";
    minus.setAttribute("aria-label",lang()==="en"?"Decrease":"Scade");
    minus.textContent="−";
    const plus=document.createElement("button");
    plus.type="button";
    plus.dataset.labStep="1";
    plus.setAttribute("aria-label",lang()==="en"?"Increase":"Crește");
    plus.textContent="+";
    box.insertBefore(minus,numeric);
    box.appendChild(plus);
  });

  document.querySelectorAll("[data-lab-number-for]").forEach(numeric => {
    const range=document.getElementById(numeric.dataset.labNumberFor);
    numeric.addEventListener("change", () => {
      const min=number(numeric.min), max=number(numeric.max), value=Math.min(max,Math.max(min,number(numeric.value)));
      range.value=String(value);
      numeric.value=range.value;
      updateChapterSummaries();
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
      updateChapterSummaries();
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
      updateChapterSummaries();
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

  root.querySelectorAll("[data-lab-chapter-open]").forEach(button => {
    button.addEventListener("click", () => openChapter(button.dataset.labChapterOpen));
  });
  root.querySelector("[data-lab-chapter-close]")?.addEventListener("click", closeChapter);
  root.querySelectorAll("[data-renovation-action]").forEach(button => {
    button.addEventListener("click", () => openRenovationAction(button.dataset.renovationAction));
  });
  mobileSecondaryAction?.addEventListener("click", openRenovationChooser);

  root.querySelectorAll("[data-mobile-results]").forEach(button => {
    button.addEventListener("click", () => {
      if (!button.dataset.openTab) openResultTab("overview");
      root.classList.add("is-mobile-results-view");
    });
  });
  root.querySelector("[data-mobile-back-config]")?.addEventListener("click", () => {
    root.classList.remove("is-mobile-results-view");
  });

  root.querySelector("[data-lab-product-action='heat_pump']")?.addEventListener("click", () => {
    controls.heating.value="heat_pump";
    syncHeatingPills();
    updateHeatingVisual();
    updateChapterSummaries();
    scheduleCalculate(60);
  });

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

  const saveBaselineButton=document.getElementById("labSaveBaseline");
  const restoreBaselineButton=document.getElementById("labRestoreBaseline");
  const saveScenarioButton=document.getElementById("labSaveScenario");
  const clearScenariosButton=document.getElementById("labClearScenarios");
  const comparisonBaselineButton=root.querySelector("[data-baseline-from-comparison]");

  async function saveBaseline() {
    const snapshot=await captureFreshSnapshot(tr("baselineTitle"));
    if (!snapshot) return;
    baselineSnapshot=snapshot;
    savedScenarios=[];
    editingCurrentHome=false;
    persistScenarioState();
    renderBaselineComparison();
    updateHouseFlow(lastResult);
    if (isMobileCockpit()) openRenovationChooser();
  }

  saveBaselineButton?.addEventListener("click", saveBaseline);
  comparisonBaselineButton?.addEventListener("click", saveBaseline);
  root.querySelector("[data-audit-save-baseline]")?.addEventListener("click", saveBaseline);
  document.getElementById("labConfirmCurrentHome")?.addEventListener("click", saveBaseline);
  function openMyHome() {
    if (!baselineSnapshot) return;
    editingCurrentHome=true;
    activeRenovationAction=null;
    configPanel?.removeAttribute("data-active-renovation");
    if (renovationChooser) renovationChooser.hidden=true;
    if (renovationValueStrip) renovationValueStrip.hidden=true;
    configPanel?.classList.remove("is-renovation-choosing");
    restoreSnapshot(baselineSnapshot);
    updateHouseFlow();
    if (isMobileCockpit()) closeChapter();
  }

  document.getElementById("labEditCurrentHome")?.addEventListener("click", openMyHome);
  mobileHomeAction?.addEventListener("click", openMyHome);
  restoreBaselineButton?.addEventListener("click", () => restoreSnapshot(baselineSnapshot));

  async function saveCurrentScenario() {
    if (!baselineSnapshot) return;
    const index=savedScenarios.length+1;
    const scenario=await captureFreshSnapshot(`${lang()==="en"?"Scenario":"Scenariul"} ${index}`);
    if (!scenario) return;
    scenario.name=scenarioNameFromChanges(scenario,index);
    savedScenarios=[scenario,...savedScenarios].slice(0,6);
    persistScenarioState();
    renderSavedScenarios();
    if (saveScenarioButton) {
      saveScenarioButton.textContent=tr("scenarioSaved");
      window.setTimeout(()=>{ saveScenarioButton.textContent=tr("saveScenario"); },1200);
    }
    if (mobilePrimaryAction) {
      mobilePrimaryAction.textContent=lang()==="en"?"Saved ✓":"Salvat ✓";
      window.setTimeout(updateMobileFlow,1200);
    }
  }

  saveScenarioButton?.addEventListener("click", saveCurrentScenario);
  mobilePrimaryAction?.addEventListener("click", async () => {
    if (!baselineSnapshot || editingCurrentHome) {
      await saveBaseline();
      return;
    }
    await saveCurrentScenario();
  });

  clearScenariosButton?.addEventListener("click", () => {
    savedScenarios=[];
    persistScenarioState();
    renderSavedScenarios();
  });

  document.getElementById("labSavedScenarios")?.addEventListener("click", event => {
    const button=event.target.closest("[data-load-scenario]");
    if (!button) return;
    const scenario=savedScenarios.find(item => item.id === button.dataset.loadScenario);
    if (scenario) restoreSnapshot(scenario);
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

  root.querySelectorAll("[data-lab-reset]").forEach(resetButton => resetButton.addEventListener("click", () => {
    Object.entries(PRESET).forEach(([key,value]) => {
      if (!controls[key]) return;
      controls[key].value=String(value);
      if (controls[key].tagName !== "SELECT") syncNumber(controls[key]);
    });
    updateHeatingVisual();
    syncLevelSegments();
    syncHeatingPills();
    updateChapterSummaries();
    const locality=byId.get(PRESET.localityId) || matches(localities,PRESET.locality,1)[0];
    if (locality) selectLocality(locality); else scheduleCalculate(20);
  }));

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

  function initHouseVisualCarousel() {
    const slides=Array.from(root.querySelectorAll("[data-lab-house-slide]"));
    if (slides.length < 2) return;

    let active=isMobileCockpit() ? 1 : 0;
    const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    slides.forEach((slide,index) => slide.classList.toggle("is-active",index===active));
    if (reduceMotion || isMobileCockpit()) return;

    window.setInterval(() => {
      if (document.hidden) return;
      active=(active+1)%slides.length;
      slides.forEach((slide,index) => slide.classList.toggle("is-active",index===active));
    },4200);
  }

  initHouseVisualCarousel();
  updateHeatingVisual();
  updateHouseFlow();
  setChapterContext("1");
  syncLevelSegments();
  syncHeatingPills();
  openResultTab("overview");
  renderBaselineComparison();
  applyLanguage();
})();