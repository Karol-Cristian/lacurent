(() => {
  const payloadField = document.querySelector('.actions-footer form[action="/certificate"] input[name="payload"]');
  const metricGrid = document.querySelector('.metric-grid');
  if (!payloadField || !metricGrid) return;

  let baseline;
  try { baseline = JSON.parse(payloadField.value); } catch { return; }

  const PROFILE_KEYS = ["poor", "average", "good", "very_good"];
  const ENVELOPE_PROFILES = {
    poor:{exterior_wall:1.30,roof:1.00,floor:0.90,window:2.80,exterior_door:2.50,psi:0.15},
    average:{exterior_wall:0.55,roof:0.35,floor:0.45,window:1.60,exterior_door:1.80,psi:0.08},
    good:{exterior_wall:0.30,roof:0.20,floor:0.30,window:1.10,exterior_door:1.40,psi:0.05},
    very_good:{exterior_wall:0.18,roof:0.15,floor:0.20,window:0.85,exterior_door:1.10,psi:0.03}
  };
  const HEATING = {
    condensing_gas_boiler:{system_type:"condensing_gas_boiler",carrier:"natural_gas",efficiency:.94,scop:3.2,cost_profile:"natural_gas"},
    gas_boiler:{system_type:"gas_boiler",carrier:"natural_gas",efficiency:.85,scop:3.2,cost_profile:"natural_gas"},
    heat_pump:{system_type:"heat_pump",carrier:"electricity",efficiency:1,scop:3.2,cost_profile:"electricity"},
    electric_resistance:{system_type:"electric_resistance",carrier:"electricity",efficiency:1,scop:3.2,cost_profile:"electricity"},
    wood_stove:{system_type:"custom",carrier:"biomass",efficiency:.75,scop:3.2,cost_profile:"firewood"},
    wood_boiler:{system_type:"custom",carrier:"biomass",efficiency:.80,scop:3.2,cost_profile:"firewood"},
    pellet_boiler:{system_type:"custom",carrier:"biomass",efficiency:.88,scop:3.2,cost_profile:"pellets"},
    district_heat:{system_type:"district_heat",carrier:"district_heat",efficiency:.95,scop:3.2,cost_profile:"district_heat"}
  };
  const HEATING_NAMES = {
    condensing_gas_boiler:["Centrală gaz în condensare","Condensing gas boiler"],gas_boiler:["Centrală gaz convențională","Conventional gas boiler"],
    heat_pump:["Pompă de căldură","Heat pump"],electric_resistance:["Încălzire electrică directă","Direct electric heating"],
    wood_stove:["Sobă / șemineu pe lemne","Wood stove / fireplace"],wood_boiler:["Centrală pe lemne","Wood boiler"],
    pellet_boiler:["Centrală pe peleți","Pellet boiler"],district_heat:["Termoficare","District heating"]
  };
  const CLIMATE = {
    1:{zone:"I",station:"oradea",label:"Oradea",design:-12},2:{zone:"II",station:"arad",label:"Arad",design:-15},
    3:{zone:"III",station:"iasi",label:"Iași",design:-18},4:{zone:"IV",station:"sfantu_gheorghe",label:"Sfântu Gheorghe",design:-21},
    5:{zone:"V",station:"miercurea_ciuc",label:"Miercurea Ciuc",design:-24}
  };
  const COMPONENT_FIELDS = {
    exterior_wall:["wall_area_m2","wall_u_value"],roof:["roof_area_m2","roof_u_value"],floor:["floor_area_m2","floor_u_value"],
    window:["window_area_m2","window_u_value"],exterior_door:["door_area_m2","door_u_value"]
  };
  const MONTHS_RO = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"];
  const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const lang = () => document.documentElement.lang === "en" ? "en" : "ro";
  const t = (ro,en) => lang() === "en" ? en : ro;
  const n0 = value => Math.round(Number(value)||0).toLocaleString(lang()==="en"?"en-US":"ro-RO");
  const n1 = value => (Number(value)||0).toLocaleString(lang()==="en"?"en-US":"ro-RO",{minimumFractionDigits:1,maximumFractionDigits:1});
  const num = text => {
    const m = String(text||"").replace(/\s/g,"").replace(/[^0-9,.-]/g,"").replace(",",".");
    const v = Number.parseFloat(m); return Number.isFinite(v) ? v : 0;
  };
  const nullable = text => {
    const raw=String(text||"");
    if (/—|preț|price|required|indisponibil/i.test(raw) || !/[0-9]/.test(raw)) return null;
    return num(raw);
  };

  function inferInsulation() {
    const values=Object.fromEntries((baseline.envelope||[]).map(x=>[x.type,Number(x.u_value_w_m2k)]));
    let best="average",scoreBest=Infinity;
    for (const key of PROFILE_KEYS) {
      let score=0,count=0; const p=ENVELOPE_PROFILES[key];
      for (const [kind,v] of Object.entries(values)) if (p[kind]) { score += ((v-p[kind])/Math.max(p[kind],.01))**2; count++; }
      if (count && score<scoreBest) { scoreBest=score; best=key; }
    }
    return best;
  }
  function inferHeating() {
    const h=baseline.heating||{};
    if (h.system_type==="heat_pump") return "heat_pump";
    if (h.system_type==="electric_resistance") return "electric_resistance";
    if (h.system_type==="condensing_gas_boiler") return "condensing_gas_boiler";
    if (h.system_type==="gas_boiler") return "gas_boiler";
    if (h.system_type==="district_heat") return "district_heat";
    if (h.cost_profile==="pellets") return "pellet_boiler";
    if (h.cost_profile==="firewood") return Number(h.efficiency||.75)>=.78 ? "wood_boiler" : "wood_stove";
    return "condensing_gas_boiler";
  }
  function inferZone() {
    const m=String(baseline.locality||"").match(/^@lc\|[^|]+\|([^|]*)\|/);
    const z=m?.[1]; return ({I:1,II:2,III:3,IV:4,V:5})[z] || 3;
  }

  function readPage(doc) {
    const metricArticles=[...doc.querySelectorAll('.metric-grid article')];
    const finalEnergy=num(metricArticles[1]?.querySelector('strong')?.textContent);
    const primary=num(metricArticles[0]?.querySelector('strong')?.textContent);
    const co2=num(metricArticles[2]?.querySelector('strong')?.textContent);
    const heatLoss=num(metricArticles[3]?.querySelector('strong')?.textContent);
    const energyClass=doc.querySelector('.class-badge strong')?.textContent?.trim()||"—";
    const costStrong=doc.querySelector('.cost-headline-grid .cost-total strong');
    const costLabel=doc.querySelector('.cost-headline-grid .cost-total span')?.textContent||"";
    const annualCost=costStrong ? nullable(costStrong.textContent) : null;
    const costComplete=!/calculabil|priceable/i.test(costLabel) && annualCost!==null;
    const services=[...doc.querySelectorAll('.cost-service-grid article')].map(article=>{
      const kwh=num(article.querySelector('em')?.textContent);
      const cost=nullable(article.querySelector('strong')?.textContent);
      return {kwh,cost,unit:kwh>0&&cost!==null?cost/kwh:null};
    });
    while (services.length<3) services.push({kwh:0,cost:null,unit:null});
    const monthly=[...doc.querySelectorAll('.cost-monthly-table tbody tr')].slice(0,12).map((tr,i)=>{
      const td=[...tr.querySelectorAll('td')];
      const hc=nullable(td[1]?.textContent), cc=nullable(td[2]?.textContent);
      return {month:i,heat:services[0].unit&&hc!==null?hc/services[0].unit:0,cool:services[1].unit&&cc!==null?cc/services[1].unit:0};
    });
    while (monthly.length<12) monthly.push({month:monthly.length,heat:0,cool:0});
    if (services[0].kwh>0 && monthly.every(x=>x.heat===0)) {
      const heights=[...doc.querySelectorAll('.monthly-panel .monthly-chart > div')].slice(0,12).map((d,i)=>({i,h:parseFloat(d.querySelector('span')?.style.height)||0}));
      const cold=heights.filter(x=>[0,1,2,3,9,10,11].includes(x.i)); const sum=cold.reduce((a,b)=>a+b.h,0)||1;
      cold.forEach(x=>monthly[x.i].heat=services[0].kwh*x.h/sum);
    }
    return {finalEnergy,primary,co2,heatLoss,energyClass,annualCost,costComplete,heatingFinal:services[0].kwh||0,coolingFinal:services[1].kwh||0,monthly};
  }

  const baseMetrics=readPage(document);
  const baseProfile=inferInsulation();
  const baseProfileIndex=PROFILE_KEYS.indexOf(baseProfile);
  const baseHeating=inferHeating();
  const baseArea=Number(baseline.heated_floor_area_m2)||100;
  const baseTemp=Number(baseline.indoor_design_temperature_c)||20;
  const baseAch=Number(baseline.ventilation?.air_changes_per_hour ?? .5);
  const baseRecovery=Number(baseline.ventilation?.heat_recovery_efficiency ?? 0)*100;
  const baseCooling=Boolean(baseline.cooling?.enabled);
  const baseCoolSet=Number(baseline.cooling?.setpoint_c ?? 26);
  const baseSeer=Number(baseline.cooling?.seer ?? 3.5);
  const baseSolar=Number(baseline.solar_gains_kwh_m2_month ?? 0);
  const baseZone=inferZone();
  const baseHeatPerf=baseHeating==="heat_pump" ? Number(baseline.heating?.scop||3.2) : Number(baseline.heating?.efficiency||HEATING[baseHeating]?.efficiency||.9);

  const section=document.createElement('section');
  section.className='scenario-cockpit'; section.id='scenario-lab';
  section.innerHTML=`
    <div class="cockpit-topline"><div><span class="cockpit-kicker" data-cp="kicker"></span><h2 data-cp="title"></h2><p data-cp="intro"></p></div><button type="button" class="cockpit-reset" id="cpReset"></button></div>
    <div class="cockpit-layout">
      <div class="cockpit-console">
        <section class="control-cluster"><div class="cluster-title"><span>01</span><strong data-cp="envelope"></strong></div>
          <div class="cp-control"><div><label for="cpInsulation" data-cp="insulation"></label><output id="cpInsulationOut"></output></div><input id="cpInsulation" type="range" min="0" max="3" step="1"><div class="cp-ticks"><span>Slabă</span><span>Medie</span><span>Bună</span><span>Foarte bună</span></div></div>
          <div class="cp-control"><div><label for="cpArea" data-cp="area"></label><output id="cpAreaOut"></output></div><input id="cpArea" type="range" min="${Math.max(20,Math.round(baseArea*.5))}" max="${Math.max(40,Math.round(baseArea*1.5))}" step="1"></div>
        </section>
        <section class="control-cluster"><div class="cluster-title"><span>02</span><strong data-cp="climate"></strong></div>
          <div class="cp-control"><div><label for="cpZone" data-cp="zone"></label><output id="cpZoneOut"></output></div><input id="cpZone" type="range" min="1" max="5" step="1"><div class="cp-ticks five"><span>I</span><span>II</span><span>III</span><span>IV</span><span>V</span></div></div>
          <div class="cp-control"><div><label for="cpTemp" data-cp="winterTemp"></label><output id="cpTempOut"></output></div><input id="cpTemp" type="range" min="16" max="24" step="0.5"></div>
          <div class="cp-control"><div><label for="cpSolar" data-cp="solar"></label><output id="cpSolarOut"></output></div><input id="cpSolar" type="range" min="0" max="8" step="0.2"></div>
        </section>
        <section class="control-cluster"><div class="cluster-title"><span>03</span><strong data-cp="air"></strong></div>
          <div class="cp-control"><div><label for="cpAch" data-cp="ach"></label><output id="cpAchOut"></output></div><input id="cpAch" type="range" min="0.2" max="1.2" step="0.05"></div>
          <div class="cp-control"><div><label for="cpRecovery" data-cp="recovery"></label><output id="cpRecoveryOut"></output></div><input id="cpRecovery" type="range" min="0" max="90" step="5"></div>
        </section>
        <section class="control-cluster"><div class="cluster-title"><span>04</span><strong data-cp="systems"></strong></div>
          <div class="cp-control"><div><label for="cpHeating" data-cp="heating"></label></div><select id="cpHeating"></select></div>
          <div class="cp-control"><div><label for="cpHeatPerf" id="cpHeatPerfLabel"></label><output id="cpHeatPerfOut"></output></div><input id="cpHeatPerf" type="range"></div>
          <div class="cp-cooling-toggle"><label><input id="cpCooling" type="checkbox"><span data-cp="cooling"></span></label><output id="cpCoolingOut"></output></div>
          <div class="cp-control cp-cooling-dependent"><div><label for="cpCoolSet" data-cp="coolSet"></label><output id="cpCoolSetOut"></output></div><input id="cpCoolSet" type="range" min="20" max="30" step="0.5"></div>
          <div class="cp-control cp-cooling-dependent"><div><label for="cpSeer" data-cp="seer"></label><output id="cpSeerOut"></output></div><input id="cpSeer" type="range" min="2" max="8" step="0.1"></div>
        </section>
      </div>
      <div class="cockpit-display">
        <div class="cockpit-status" id="cpStatus" aria-live="polite"></div>
        <div class="cockpit-metrics">
          <article><span data-cp="finalEnergy"></span><strong id="cpEnergy"></strong><em id="cpEnergyDelta"></em></article>
          <article><span data-cp="annualCost"></span><strong id="cpCost"></strong><em id="cpCostDelta"></em></article>
          <article><span data-cp="saving"></span><strong id="cpSaving"></strong><em data-cp="vsHome"></em></article>
          <article><span data-cp="class"></span><strong id="cpClass"></strong><em data-cp="recalc"></em></article>
          <article><span data-cp="heatingEnergy"></span><strong id="cpHeatEnergy"></strong><em id="cpHeatDelta"></em></article>
          <article><span data-cp="coolingEnergy"></span><strong id="cpCoolEnergy"></strong><em id="cpCoolDelta"></em></article>
          <article><span>CO₂</span><strong id="cpCo2"></strong><em id="cpCo2Delta"></em></article>
          <article><span data-cp="heatLoss"></span><strong id="cpHeatLoss"></strong><em id="cpHeatLossDelta"></em></article>
        </div>
        <div class="cockpit-chart-card"><div class="cockpit-chart-head"><div><span data-cp="profileKicker"></span><h3 data-cp="profile"></h3></div><div class="cp-legend"><span class="legend-home" data-cp="home"></span><span class="legend-scenario" data-cp="scenario"></span><span class="legend-heat" data-cp="heat"></span><span class="legend-cool" data-cp="cool"></span></div></div><div id="cpChart" class="cp-chart"></div></div>
        <p class="cockpit-footnote" data-cp="foot"></p>
      </div>
    </div>`;
  metricGrid.after(section);

  const $=s=>section.querySelector(s);
  const ins=$('#cpInsulation'), area=$('#cpArea'), zone=$('#cpZone'), temp=$('#cpTemp'), solar=$('#cpSolar'), ach=$('#cpAch'), recovery=$('#cpRecovery');
  const heating=$('#cpHeating'), heatPerf=$('#cpHeatPerf'), cooling=$('#cpCooling'), coolSet=$('#cpCoolSet'), seer=$('#cpSeer');
  const status=$('#cpStatus'), chart=$('#cpChart');

  function populateHeating() {
    const keep=heating.value||baseHeating;
    heating.innerHTML='';
    Object.keys(HEATING).forEach(key=>{ const o=document.createElement('option'); o.value=key; o.textContent=HEATING_NAMES[key][lang()==='en'?1:0] + (key===baseHeating?` · ${t('casa mea','my home')}`:''); heating.appendChild(o); });
    heating.value=HEATING[keep]?keep:baseHeating;
  }
  function configureHeatPerf(reset=false) {
    const key=heating.value; const h=key===baseHeating?baseline.heating:HEATING[key];
    if (key==='heat_pump') { heatPerf.min='2'; heatPerf.max='5.5'; heatPerf.step='.1'; $('#cpHeatPerfLabel').textContent='SCOP'; if(reset) heatPerf.value=Number(h?.scop||3.2); }
    else { heatPerf.min='.6'; heatPerf.max='1'; heatPerf.step='.01'; $('#cpHeatPerfLabel').textContent=t('Randament sezonier','Seasonal efficiency'); if(reset) heatPerf.value=Number(h?.efficiency||HEATING[key]?.efficiency||.9); }
  }
  function isBase(id,value,tolerance=.0001) { return Math.abs(Number(value)-Number(id))<tolerance; }
  function profileLabel() { const names={poor:["Slabă","Poor"],average:["Medie","Average"],good:["Bună","Good"],very_good:["Foarte bună","Very good"]}; const key=PROFILE_KEYS[Number(ins.value)]; return names[key][lang()==='en'?1:0] + (key===baseProfile?` · ${t('casa mea','my home')}`:''); }
  function updateOutputs() {
    $('#cpInsulationOut').textContent=profileLabel();
    $('#cpAreaOut').textContent=`${n0(area.value)} m²${isBase(baseArea,area.value,.5)?` · ${t('casa mea','my home')}`:''}`;
    const zi=Number(zone.value), zl=CLIMATE[zi]?.zone||'III'; $('#cpZoneOut').textContent=`${t('Zona','Zone')} ${zl}${zi===baseZone?` · ${t('casa mea','my home')}`:''}`;
    $('#cpTempOut').textContent=`${n1(temp.value)} °C${isBase(baseTemp,temp.value,.01)?` · ${t('casa mea','my home')}`:''}`;
    $('#cpSolarOut').textContent=`${n1(solar.value)} kWh/m²${isBase(baseSolar,solar.value,.01)?` · ${t('casa mea','my home')}`:''}`;
    $('#cpAchOut').textContent=`${n1(ach.value)} ACH${isBase(baseAch,ach.value,.01)?` · ${t('casa mea','my home')}`:''}`;
    $('#cpRecoveryOut').textContent=`${n0(recovery.value)}%${isBase(baseRecovery,recovery.value,.1)?` · ${t('casa mea','my home')}`:''}`;
    $('#cpHeatPerfOut').textContent=heating.value==='heat_pump'?n1(heatPerf.value):`${Math.round(Number(heatPerf.value)*100)}%`;
    $('#cpCoolingOut').textContent=cooling.checked?t('Activă','Active'):t('Oprită','Off');
    $('#cpCoolSetOut').textContent=`${n1(coolSet.value)} °C`;
    $('#cpSeerOut').textContent=n1(seer.value);
    section.querySelectorAll('.cp-cooling-dependent').forEach(x=>x.classList.toggle('is-disabled',!cooling.checked));
  }
  function setCopy() {
    const copy={kicker:["DECISION COCKPIT","DECISION COCKPIT"],title:["Laboratorul casei tale","Your home scenario lab"],intro:["Schimbă anvelopa, clima, ventilația, încălzirea și răcirea. Fiecare modificare rulează din nou același motor energetic și este comparată cu locuința introdusă.","Change envelope, climate, ventilation, heating and cooling. Every change reruns the same energy engine and is compared with the home you entered."],envelope:["Anvelopă & geometrie","Envelope & geometry"],insulation:["Nivel termoizolație","Insulation level"],area:["Suprafață încălzită","Heated area"],climate:["Climă & confort","Climate & comfort"],zone:["Zona climatică","Climate zone"],winterTemp:["Temperatura interioară iarna","Winter indoor temperature"],solar:["Aport solar prin vitraje","Solar gains through glazing"],air:["Aer & ventilație","Air & ventilation"],ach:["Schimburi de aer","Air changes"],recovery:["Recuperare de căldură","Heat recovery"],systems:["Sisteme","Systems"],heating:["Sursa principală de încălzire","Main heating source"],cooling:["Răcire activă / aer condiționat","Active cooling / air conditioning"],coolSet:["Temperatura setată vara","Summer setpoint"],seer:["SEER răcire","Cooling SEER"],finalEnergy:["Energie finală anuală","Annual final energy"],annualCost:["Cost anual estimat","Estimated annual cost"],saving:["Economie față de casa mea","Saving versus my home"],vsHome:["diferență anuală","annual difference"],class:["Clasă energetică","Energy class"],recalc:["scenariu recalculat","recalculated scenario"],heatingEnergy:["Încălzire anuală","Annual heating"],coolingEnergy:["Răcire anuală","Annual cooling"],heatLoss:["Coeficient pierderi","Heat-loss coefficient"],profileKicker:["12 LUNI · LIVE","12 MONTHS · LIVE"],profile:["Profil lunar — casa mea vs scenariu","Monthly profile — my home vs scenario"],home:["Casa mea","My home"],scenario:["Scenariu","Scenario"],heat:["Încălzire","Heating"],cool:["Răcire","Cooling"],foot:["Poziția implicită a fiecărui control este valoarea reală a casei tale. Nu există o poziție separată «Actual». Pentru zonele climatice diferite folosim stații MC001 reprezentative; revenirea pe zona casei restaurează clima localității originale.","Every control defaults to your home's real value. There is no separate ‘Current’ position. Other climate zones use representative MC001 stations; returning to the home's zone restores the original location climate."]};
    Object.entries(copy).forEach(([k,v])=>section.querySelectorAll(`[data-cp="${k}"]`).forEach(el=>el.textContent=v[lang()==='en'?1:0]));
    $('#cpReset').textContent=t('Revino la casa mea','Reset to my home');
    populateHeating(); updateOutputs();
  }

  function selectedHeating() {
    const key=heating.value;
    const h=key===baseHeating?{...(baseline.heating||{})}:{...HEATING[key]};
    if(key==='heat_pump') h.scop=Number(heatPerf.value); else h.efficiency=Number(heatPerf.value);
    return h;
  }
  function localityForZone() {
    const i=Number(zone.value); if(i===baseZone) return baseline.locality;
    const c=CLIMATE[i]; return `@lc|${c.station}|${c.zone}|${c.design}|${c.label}`;
  }
  function add(fd,k,v) { if(v!==null&&v!==undefined&&v!=="") fd.append(k,String(v)); }
  function buildForm() {
    const fd=new FormData(), A=Number(area.value), ratio=A/baseArea, linear=Math.sqrt(ratio);
    const selectedProfile=PROFILE_KEYS[Number(ins.value)], profile=selectedProfile===baseProfile?null:ENVELOPE_PROFILES[selectedProfile];
    const h=selectedHeating();
    add(fd,'project_name',baseline.project_name||'Scenariu'); add(fd,'locality',localityForZone()); add(fd,'building_type',baseline.building_type);
    add(fd,'heated_floor_area_m2',A); add(fd,'heated_volume_m3',Number(baseline.heated_volume_m3)*ratio); add(fd,'indoor_design_temperature_c',Number(temp.value));
    add(fd,'construction_year',baseline.construction_year); add(fd,'solar_gains_kwh_m2_month',Number(solar.value));
    const bs=baseline.solar||{}; const manualSolarChanged=!isBase(baseSolar,solar.value,.01);
    add(fd,'solar_mode',manualSolarChanged?'explicit':(bs.mode||'explicit'));
    add(fd,'solar_orientation',bs.orientation||'south'); add(fd,'solar_glazing_type_id',bs.glazing_type_id||'double_low_e_face_3');
    add(fd,'solar_frame_fraction',bs.frame_fraction??.20); add(fd,'solar_obstacle_shading_factor',bs.obstacle_shading_factor??1);
    add(fd,'solar_sky_view_factor',bs.sky_view_factor??.5); add(fd,'solar_exterior_surface_resistance_m2k_w',bs.exterior_surface_resistance_m2k_w??.04);
    add(fd,'solar_longwave_radiation_coefficient_w_m2k',bs.longwave_radiation_coefficient_w_m2k??5); add(fd,'solar_sky_temperature_difference_k',bs.sky_temperature_difference_k??11);
    (baseline.envelope||[]).forEach(c=>{ const f=COMPONENT_FIELDS[c.type]; if(!f)return; const scale=['roof','floor'].includes(c.type)?ratio:linear; add(fd,f[0],Number(c.area_m2)*scale); add(fd,f[1],profile?profile[c.type]:c.u_value_w_m2k); });
    const b=baseline.thermal_bridges?.[0]; if(b){ add(fd,'thermal_bridge_length_m',Number(b.length_m)*linear); add(fd,'thermal_bridge_psi_w_mk',profile?profile.psi:b.psi_w_mk); }
    add(fd,'air_changes_per_hour',Number(ach.value)); add(fd,'heat_recovery_efficiency',Number(recovery.value)/100);
    add(fd,'heating_system_type',h.system_type); add(fd,'heating_carrier',h.carrier); add(fd,'heating_efficiency',h.efficiency); add(fd,'heating_scop',h.scop); add(fd,'heating_cost_profile',h.cost_profile);
    if(cooling.checked) fd.append('cooling_enabled','on'); add(fd,'cooling_setpoint_c',Number(coolSet.value)); add(fd,'cooling_seer',Number(seer.value));
    if(baseline.dhw?.enabled) fd.append('dhw_enabled','on'); add(fd,'dhw_occupants',baseline.dhw?.occupants||0); add(fd,'dhw_litres_per_person_day_at_60c',baseline.dhw?.litres_per_person_day_at_60c); add(fd,'dhw_efficiency',baseline.dhw?.efficiency||.86); add(fd,'dhw_carrier',baseline.dhw?.carrier||'natural_gas');
    return fd;
  }

  function delta(value,base,unit='',lowerBetter=true) {
    if(!Number.isFinite(value)||!Number.isFinite(base)||base===0) return {text:'—',cls:''};
    const d=value-base,p=100*d/base; const good=lowerBetter?d<0:d>0, bad=lowerBetter?d>0:d<0;
    return {text:`${d>0?'+':''}${n0(d)}${unit} · ${p>0?'+':''}${p.toFixed(1)}%`,cls:good?'better':bad?'worse':''};
  }
  function putDelta(sel,d) { const e=$(sel); e.textContent=d.text; e.className=d.cls; }
  function renderChart(metrics) {
    const months=lang()==='en'?MONTHS_EN:MONTHS_RO, all=[...baseMetrics.monthly.flatMap(x=>[x.heat,x.cool]),...metrics.monthly.flatMap(x=>[x.heat,x.cool])];
    const max=Math.max(1,...all.map(Number));
    chart.innerHTML=metrics.monthly.map((m,i)=>{
      const b=baseMetrics.monthly[i]||{heat:0,cool:0};
      const bh=100*b.heat/max,bc=100*b.cool/max,sh=100*m.heat/max,sc=100*m.cool/max;
      return `<div class="cp-month"><div class="cp-month-bars"><div class="cp-bar cp-bar-home" title="${t('Casa mea','My home')}: ${n0(b.heat+b.cool)} kWh"><i class="cp-heat" style="height:${bh}%"></i><i class="cp-cool" style="height:${bc}%"></i></div><div class="cp-bar cp-bar-scenario" title="${t('Scenariu','Scenario')}: ${n0(m.heat+m.cool)} kWh"><i class="cp-heat" style="height:${sh}%"></i><i class="cp-cool" style="height:${sc}%"></i></div></div><span>${months[i]}</span></div>`;
    }).join('');
  }
  function renderMetrics(m,partial=false) {
    $('#cpEnergy').textContent=`${n0(m.finalEnergy)} kWh/an`; putDelta('#cpEnergyDelta',delta(m.finalEnergy,baseMetrics.finalEnergy,' kWh'));
    if(m.annualCost===null){ $('#cpCost').textContent=t('Preț local necesar','Local tariff required'); $('#cpCostDelta').textContent=t('Costul nu poate fi comparat complet','Cost cannot be fully compared'); $('#cpCostDelta').className=''; $('#cpSaving').textContent='—'; }
    else { $('#cpCost').textContent=`${n0(m.annualCost)} lei/an${!m.costComplete?'*':''}`; putDelta('#cpCostDelta',delta(m.annualCost,baseMetrics.annualCost??m.annualCost,' lei')); const canSave=m.costComplete&&baseMetrics.costComplete&&baseMetrics.annualCost!==null; $('#cpSaving').textContent=canSave?`${n0(baseMetrics.annualCost-m.annualCost)} lei/an`:'—'; $('#cpSaving').className=canSave?(baseMetrics.annualCost-m.annualCost>0?'better':baseMetrics.annualCost-m.annualCost<0?'worse':''):''; }
    $('#cpClass').textContent=m.energyClass;
    $('#cpHeatEnergy').textContent=`${n0(m.heatingFinal)} kWh/an`; putDelta('#cpHeatDelta',delta(m.heatingFinal,baseMetrics.heatingFinal,' kWh'));
    $('#cpCoolEnergy').textContent=`${n0(m.coolingFinal)} kWh/an`; putDelta('#cpCoolDelta',delta(m.coolingFinal,baseMetrics.coolingFinal,' kWh'));
    $('#cpCo2').textContent=`${n0(m.co2)} kg/an`; putDelta('#cpCo2Delta',delta(m.co2,baseMetrics.co2,' kg'));
    $('#cpHeatLoss').textContent=`${n1(m.heatLoss)} W/K`; putDelta('#cpHeatLossDelta',delta(m.heatLoss,baseMetrics.heatLoss,' W/K'));
    renderChart(m);
  }

  function resetControls() {
    ins.value=String(baseProfileIndex); area.value=String(Math.round(baseArea)); zone.value=String(baseZone); temp.value=String(baseTemp); solar.value=String(baseSolar);
    ach.value=String(baseAch); recovery.value=String(baseRecovery); heating.value=baseHeating; configureHeatPerf(true); heatPerf.value=String(baseHeatPerf);
    cooling.checked=baseCooling; coolSet.value=String(baseCoolSet); seer.value=String(baseSeer); updateOutputs(); renderMetrics(baseMetrics); status.textContent=t('Casa ta este baseline-ul. Modifică un parametru pentru a testa o investiție.','Your home is the baseline. Change a parameter to test an investment.'); status.className='cockpit-status';
  }

  let timer=null,controller=null,requestId=0;
  async function calculateScenario() {
    controller?.abort(); controller=new AbortController(); const id=++requestId;
    status.className='cockpit-status is-loading'; status.textContent=t('Recalculez scenariul…','Recalculating scenario…');
    try {
      const r=await fetch('/calculate',{method:'POST',body:buildForm(),signal:controller.signal}); const html=await r.text();
      if(!r.ok) throw new Error(t('Scenariul nu a putut fi calculat.','The scenario could not be calculated.')); if(id!==requestId)return;
      const doc=new DOMParser().parseFromString(html,'text/html');
      if(doc.querySelector('#calculationForm')) throw new Error(doc.querySelector('.error-banner')?.textContent||t('Datele scenariului sunt invalide.','Scenario data is invalid.'));
      const m=readPage(doc); renderMetrics(m); status.className='cockpit-status'; status.textContent=t('Scenariu actualizat · același motor ca raportul.','Scenario updated · same engine as the report.');
    } catch(e) { if(e?.name==='AbortError')return; status.className='cockpit-status is-error'; status.textContent=e?.message||t('Eroare la recalculare.','Recalculation error.'); }
  }
  function schedule() { updateOutputs(); clearTimeout(timer); timer=setTimeout(calculateScenario,280); }

  [ins,area,zone,temp,solar,ach,recovery,coolSet,seer,heatPerf].forEach(x=>x.addEventListener('input',schedule));
  cooling.addEventListener('change',schedule);
  heating.addEventListener('change',()=>{configureHeatPerf(true); schedule();});
  $('#cpReset').addEventListener('click',()=>{controller?.abort(); clearTimeout(timer); resetControls();});
  window.addEventListener('lacurent:languagechange',()=>{setCopy(); renderMetrics(baseMetrics); schedule();});

  setCopy(); resetControls();
})();