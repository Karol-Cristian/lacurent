(() => {
  const STORAGE_KEY = "lacurent-language";
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  const attrs = ["placeholder", "aria-label", "title"];
  let originalTitle = document.title;

  const RO_EN = {
    "Limbă":"Language","Instalații & Energie":"Installations & Energy","Instalații & energie":"Installations & energy",
    "Clădire":"Building","Anvelopă":"Envelope","Ventilație":"Ventilation","Sisteme":"Systems","Exemplu calculat":"Calculated example",
    "Servicii":"Services","Evaluare":"Assessment","Calculator":"Calculator","Calculator energetic":"Energy calculator",
    "Calculator energetic pentru locuințe · România":"Residential energy calculator · Romania",
    "Calculator energetic pentru locuințe":"Residential energy calculator",
    "Înțelege consumul casei înainte să investești.":"Understand your home's energy use before you invest.",
    "Alege localitatea pe harta României, descrie casa în termeni simpli și obține o estimare structurată pentru încălzire, răcire, apă caldă, energie primară, emisii și cost anual estimat în lei.":"Choose the location on the Romania map, describe the home in simple terms and get a structured estimate for heating, cooling, hot water, primary energy, emissions and estimated annual cost.",
    "Începe calculul":"Start calculation","Cere o evaluare tehnică":"Request a technical assessment","Ce primești":"What you get",
    "Rezultat calculat pe baza clădirii și a localității.":"A result calculated from the building and its location.",
    "Comparație cu o clădire de referință.":"Comparison with a reference building.",
    "Cost energetic estimat în lei, calculat din energia finală și referințe oficiale de preț.":"Estimated energy cost in RON, calculated from final energy and documented price references.",
    "Servicii pentru locuințe":"Residential services","Lucrurile concrete pe care le poți evalua sau proiecta.":"Concrete systems you can evaluate or design.",
    "Calculatorul este punctul de plecare. De aici putem discuta direct despre instalația sau îmbunătățirea care te interesează.":"The calculator is the starting point. From here we can discuss the system or improvement you are interested in.",
    "Instalații electrice":"Electrical installations","Încălzire":"Heating","Pompe de căldură":"Heat pumps","Fotovoltaice":"Photovoltaics",
    "Calcul & Eficiență energetică":"Energy calculation & efficiency","Flux simplu":"Simple flow","Calculează, verifică, apoi discută soluția.":"Calculate, review, then discuss the solution.",
    "Descrie casa":"Describe the home","Deschide calculatorul →":"Open calculator →","Vezi rezultatul":"View the result","Vezi un exemplu →":"View an example →",
    "Cere evaluarea":"Request assessment","Cere evaluarea →":"Request assessment →","Evaluare tehnică":"Technical assessment",
    "Ai un proiect real? Trimite-ne datele de bază.":"Have a real project? Send the basic data.","Ce te interesează?":"What are you interested in?",
    "Calcul și analiză energetică":"Energy calculation and analysis","Pompă de căldură":"Heat pump","Modernizare / Eficiență energetică":"Modernization / Energy efficiency",
    "Localitate":"Location","Începe să scrii localitatea":"Start typing the location","Suprafață aproximativă":"Approximate area","Detalii utile":"Useful details","Opțional":"Optional",
    "Pregătește cererea":"Prepare request","Nu se trimite nimic automat. Vei putea verifica mesajul înainte de trimitere.":"Nothing is sent automatically. You can review the message before sending.",
    "Cererea ta":"Your request","Copiază":"Copy","Deschide emailul":"Open email",
    "Începem cu situația existentă, apoi alegem soluția.":"We start from the existing situation, then choose the solution.",
    "Calcul, proiectare și consultanță tehnică pentru locuințe și clădiri.":"Calculation, design and technical consulting for homes and buildings.",

    "Descrie locuința în termeni normali. Noi deducem valorile tehnice.":"Describe your home in normal terms. We derive the technical values.",
    "Alege localitatea, introdu dimensiunile de bază și selectează instalațiile pe care le ai. Coeficienții tehnici exacți rămân disponibili doar în setările avansate.":"Choose the location, enter the basic dimensions and select the systems you have. Exact technical coefficients remain available only in Advanced settings.",
    "Încarcă exemplul":"Load example","Începe analiza":"Start analysis","Corectează datele marcate.":"Correct the highlighted data.",
    "Clădirea":"Building","Începem cu informațiile pe care le știi în mod normal despre locuință.":"Start with the information you normally know about your home.",
    "Modul simplu este implicit.":"Simple mode is the default.","Dimensiunile și alegerile uzuale sunt transformate automat în valorile tehnice folosite de calcul.":"Common dimensions and choices are automatically converted into the technical values used by the calculation.",
    "Dacă ai măsurători exacte, deschide setările avansate din secțiunea corespunzătoare.":"If you have exact measurements, open Advanced settings in the relevant section.",
    "Numele proiectului":"Project name","(opțional)":"(optional)","Casa mea":"My home","Localitatea clădirii":"Building location",
    "Caută localitatea sau alege direct pe hartă. Pe computer folosești rotița pentru zoom și tragi harta; pe telefon folosești două degete.":"Search for the location or choose it directly on the map. On desktop, use the mouse wheel to zoom and drag the map; on mobile, use two fingers.",
    "Caută localitatea":"Search location","Ex. Cluj, Brașov, Florești":"E.g. Cluj, Brașov, Florești","Se încarcă harta României...":"Loading Romania map...",
    "Localitatea selectată":"Selected location","Zona climatică de iarnă":"Winter climate zone","Temperatura exterioară de calcul":"Outdoor design temperature","Stația climatică":"Climate station","Datele climatice sunt selectate automat.":"Climate data is selected automatically.",
    "Ce calculezi?":"What are you calculating?","Casă":"House","Apartament":"Apartment","Lungimea clădirii":"Building length","Lățimea clădirii":"Building width","Niveluri încălzite":"Heated levels","Înălțimea medie interioară":"Average indoor height",
    "Suprafața totală aproximativă a ferestrelor":"Approximate total window area","Suprafața aproximativă a ușilor exterioare":"Approximate exterior door area","Suprafața utilă încălzită":"Heated usable area","Înălțimea interioară":"Indoor height","Lungimea totală a pereților exteriori":"Total exterior-wall length","Suprafața aproximativă a ferestrelor":"Approximate window area",
    "Deasupra este acoperiș / pod neîncălzit":"Roof / unheated attic above","Dedesubt este sol / spațiu neîncălzit":"Ground / unheated space below",
    "Suprafață încălzită calculată":"Calculated heated area","Volum încălzit calculat":"Calculated heated volume","Pereți exteriori calculați":"Calculated exterior walls","Acoperiș / tavan expus":"Exposed roof / ceiling",
    "Anul construcției":"Construction year","Nivelul termoizolației":"Thermal insulation level","Slabă / aproape fără izolație":"Poor / almost no insulation","Medie":"Average","Bună / renovată":"Good / renovated","Foarte bună / locuință modernă":"Very good / modern home",
    "Anvelopa clădirii":"Building envelope","Setări avansate — suprafețe și coeficienți exacți":"Advanced settings — exact areas and coefficients","Suprafață încălzită":"Heated area","Volum încălzit":"Heated volume","Temperatura interioară de calcul":"Indoor design temperature",
    "Pereți exteriori (m²)":"Exterior walls (m²)","Coeficient U pereți":"Wall U-value","Acoperiș / tavan (m²)":"Roof / ceiling (m²)","Coeficient U acoperiș":"Roof U-value","Pardoseală spre sol / spațiu rece (m²)":"Floor to ground / cold space (m²)","Coeficient U pardoseală":"Floor U-value","Ferestre (m²)":"Windows (m²)","Coeficient U ferestre":"Window U-value","Uși exterioare (m²)":"Exterior doors (m²)","Coeficient U uși":"Door U-value","Lungime punți termice (m)":"Thermal-bridge length (m)","Transmitanță liniară ψ":"Linear transmittance ψ","Aport solar explicit":"Explicit solar gains","Orientarea dominantă a ferestrelor":"Dominant window orientation","Tipul principal de vitraj":"Main glazing type","Sud":"South","Sud-Vest":"South-West","Vest":"West","Nord-Vest":"North-West","Nord":"North","Nord-Est":"North-East","Est":"East","Sud-Est":"South-East","Vitraj simplu":"Single glazing","Vitraj dublu":"Double glazing","Fereastră dublă":"Double window","Vitraj triplu":"Triple glazing","Vitraj dublu low-e":"Double low-e glazing","Vitraj triplu low-e":"Triple low-e glazing","Metodă aport solar":"Solar-gain method","Automat MC001 / Hsol A.9.6":"Automatic MC001 / A.9.6 Hsol","Aport lunar explicit":"Explicit monthly gain","Fracție ramă fereastră":"Window frame fraction","Factor umbrire obstacole":"Obstacle shading factor","Factor vedere către cer":"Sky-view factor","Rezistență superficială exterioară Rse":"Exterior surface resistance Rse","Coeficient radiație lungă spre cer":"Long-wave sky-radiation coefficient","Diferență temperatură cer":"Sky temperature difference",
    "Ventilația":"Ventilation","În modul automat, aportul solar lunar folosește Hsol din Anexa A.9.6 și relațiile MC001 pentru vitraj. Dacă stația climatică nu are un rând solar normativ direct, nu interpolăm o stație vecină.":"In automatic mode, monthly solar gains use Hsol from Annex A.9.6 and the MC001 glazing relations. If the selected climate station has no direct normative solar row, no neighboring solar station is interpolated.","Alege tipul de ventilare. Debitul de aer și recuperarea se deduc intern.":"Choose the ventilation type. Airflow and heat recovery are derived internally.","Ventilație naturală":"Natural ventilation","Ventilație mecanică":"Mechanical ventilation","Ventilație cu recuperare":"Heat-recovery ventilation","Nu știu":"I don't know","Setări avansate — coeficienți de ventilare":"Advanced settings — ventilation coefficients","Schimburi de aer pe oră":"Air changes per hour","Eficiența recuperării de căldură":"Heat-recovery efficiency",
    "Instalațiile":"Systems","Sistemul principal de încălzire":"Main heating system","Centrală în condensare pe gaz":"Condensing gas boiler","Centrală convențională pe gaz":"Conventional gas boiler","Încălzire electrică directă":"Direct electric heating","Sobă / șemineu pe lemne":"Wood stove / fireplace","Centrală pe lemne":"Wood boiler","Centrală pe peleți":"Pellet boiler","Termoficare":"District heating","Alt sistem":"Other system",
    "Răcire activă / aer condiționat":"Active cooling / air conditioning","Apă caldă menajeră":"Domestic hot water","Persoane care folosesc apa caldă":"People using domestic hot water","Setări avansate — performanța exactă a sistemelor":"Advanced settings — exact system performance","Randament sezonier încălzire":"Seasonal heating efficiency","SCOP pompă de căldură":"Heat-pump SCOP","SEER răcire":"Cooling SEER","Temperatura setată la răcire":"Cooling setpoint temperature","Randament apă caldă":"Domestic-hot-water efficiency","Consum apă caldă (L/persoană/zi la 60 °C)":"Hot-water use (L/person/day at 60 °C)","Sursa de energie pentru apa caldă":"Domestic-hot-water energy source","Gaz natural":"Natural gas","Electricitate":"Electricity","Lemn / peleți":"Wood / pellets",
    "Datele sunt pregătite":"Data is ready","Calculează performanța":"Calculate performance","Se calculează...":"Calculating...",

    "Rezultatul calculului":"Calculation result","Clasa":"Class","Energie primară":"Primary energy","Energie finală":"Final energy","energia cumpărată de la toate sursele":"energy purchased from all sources","Emisii CO₂":"CO₂ emissions","Coeficient total de pierdere":"Total heat-loss coefficient",
    "Cost anual estimat al energiei":"Estimated annual energy cost","Calculat din energia finală cumpărată, după randamentul sau SCOP-ul instalației.":"Calculated from purchased final energy after system efficiency or SCOP.","Total anual estimat":"Estimated annual total","Total anual calculabil":"Annual priceable total","Medie lunară":"Monthly average","Vezi detaliile costului":"View cost details","Încălzire · răcire · apă caldă · fiecare lună":"Heating · cooling · hot water · every month","Deschide":"Open","Răcire":"Cooling","Preț local necesar":"Local price required","fără consum calculat":"no calculated consumption",
    "Cost lunar estimat":"Estimated monthly cost","Încălzirea și răcirea urmează profilul lunar calculat; ACM se distribuie după numărul de zile din lună.":"Heating and cooling follow the calculated monthly profile; DHW is distributed by the number of days in each month.","Luna":"Month","ACM":"DHW","Total":"Total","Ianuarie":"January","Februarie":"February","Martie":"March","Aprilie":"April","Mai":"May","Iunie":"June","Iulie":"July","August":"August","Septembrie":"September","Octombrie":"October","Noiembrie":"November","Decembrie":"December","Prețurile folosite":"Prices used",
    "Energie finală pe utilizări":"Final energy by service","Valori anuale calculate din necesarul util și performanța instalațiilor.":"Annual values calculated from useful demand and system performance.","Comparație cu clădirea de referință":"Comparison with the reference building","Aceeași geometrie, parametri de referință, același motor de calcul.":"Same geometry, reference parameters, same calculation engine.","Clădire evaluată":"Evaluated building","Clădire de referință":"Reference building","Anvelopa clădirii":"Building envelope","Contribuțiile la pierderile prin transmisie, în W/K.":"Contributions to transmission heat loss, in W/K.","Surse de energie":"Energy sources","Energia finală agregată după sursa cumpărată.":"Final energy aggregated by purchased energy source.","Profil lunar":"Monthly profile","Necesar util lunar pentru încălzire și răcire.":"Monthly useful demand for heating and cooling.","Detalii metodologice":"Methodology details","Necesar util anual pentru încălzire":"Annual useful heating demand","Necesar util anual pentru răcire":"Annual useful cooling demand","Model solar":"Solar model","Orientare solară":"Solar orientation","Vitraj solar":"Solar glazing","Fallback aport explicit · Hsol indisponibil":"Explicit-gain fallback · Hsol unavailable","Aport lunar explicit":"Explicit monthly gain","Metodologie":"Methodology","Calculează altă locuință":"Calculate another home","Generează raportul A4":"Generate A4 report","Pereți exteriori":"Exterior walls","Acoperiș / tavan":"Roof / ceiling","Pardoseală spre sol":"Floor to ground","Ferestre":"Windows","Uși exterioare":"Exterior doors","Punți termice liniare":"Linear thermal bridges",
    "Cererea este pregătită. Verific-o înainte de trimitere.":"The request is ready. Review it before sending.","Cererea a fost copiată.":"The request was copied.","Copiarea automată nu este disponibilă. Textul este selectat.":"Automatic copying is unavailable. The text is selected."
  };

  function currentLanguage() {
    try { return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ro"; } catch { return "ro"; }
  }
  function saveLanguage(lang) { try { localStorage.setItem(STORAGE_KEY, lang); } catch {} }
  function skip(node) {
    const p = node.parentElement;
    return !p || ["SCRIPT","STYLE","CODE","PRE","TEXTAREA"].includes(p.tagName);
  }
  function translate(raw, lang) {
    raw = String(raw ?? "");
    if (lang !== "en") return raw;
    const t = raw.trim();
    if (!t) return raw;
    let out = RO_EN[t];
    if (!out) {
      out = t
        .replace(/\bstația climatică\b/gi,"climate station")
        .replace(/\bZona\s+([IV]+)\b/g,"Zone $1")
        .replace(/\bkWh\/m²\/an\b/g,"kWh/m²/year")
        .replace(/\bkWh\/an\b/g,"kWh/year")
        .replace(/\blei\/lună\b/g,"RON/month")
        .replace(/\blei\/an\b/g,"RON/year")
        .replace(/\blei\/kWh\b/g,"RON/kWh");
    }
    return out === t ? raw : raw.replace(t, out);
  }
  function remember(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (!skip(root) && !originalText.has(root)) originalText.set(root, root.nodeValue || "");
      return;
    }
    if (![Node.ELEMENT_NODE, Node.DOCUMENT_NODE].includes(root.nodeType)) return;
    const elements = [];
    if (root.nodeType === Node.ELEMENT_NODE) elements.push(root);
    root.querySelectorAll?.("[placeholder],[aria-label],[title]").forEach(e => elements.push(e));
    elements.forEach(el => {
      if (!originalAttrs.has(el)) originalAttrs.set(el, {});
      const saved = originalAttrs.get(el);
      attrs.forEach(name => { if (el.hasAttribute?.(name) && !(name in saved)) saved[name] = el.getAttribute(name); });
    });
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (!skip(w.currentNode) && !originalText.has(w.currentNode)) originalText.set(w.currentNode, w.currentNode.nodeValue || "");
  }
  function apply(root, lang) {
    remember(root);
    if (root.nodeType === Node.TEXT_NODE) {
      const raw = originalText.get(root); if (raw !== undefined && !skip(root)) root.nodeValue = translate(raw, lang); return;
    }
    const applyEl = el => {
      const saved = originalAttrs.get(el); if (!saved) return;
      Object.entries(saved).forEach(([name,raw]) => el.setAttribute(name, translate(raw, lang)));
    };
    if (root.nodeType === Node.ELEMENT_NODE) applyEl(root);
    root.querySelectorAll?.("[placeholder],[aria-label],[title]").forEach(applyEl);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const node = w.currentNode, raw = originalText.get(node);
      if (raw !== undefined && !skip(node)) node.nodeValue = translate(raw, lang);
    }
  }
  function updateButtons(lang) {
    document.querySelectorAll("[data-site-language]").forEach(b => {
      const on = b.dataset.siteLanguage === lang;
      b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-language-label]").forEach(e => e.textContent = lang === "en" ? "Language" : "Limbă");
  }
  function setLanguage(lang) {
    lang = lang === "en" ? "en" : "ro";
    saveLanguage(lang);
    document.documentElement.lang = lang;
    apply(document.body, lang);
    document.title = translate(originalTitle, lang);
    updateButtons(lang);
    window.dispatchEvent(new CustomEvent("lacurent:languagechange", {detail:{language:lang}}));
  }
  function init() {
    if (!document.body) return;
    originalTitle = document.title;
    remember(document.body);
    document.addEventListener("click", e => {
      const b = e.target.closest?.("[data-site-language]"); if (!b) return;
      e.preventDefault(); e.stopImmediatePropagation(); setLanguage(b.dataset.siteLanguage);
    }, true);
    const observer = new MutationObserver(ms => {
      const lang = currentLanguage();
      ms.forEach(m => m.addedNodes.forEach(n => { remember(n); if (lang === "en") apply(n, lang); }));
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setLanguage(currentLanguage());
  }
  window.lcT = (value, lang = currentLanguage()) => translate(value, lang);
  window.lacurentSetLanguage = setLanguage;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
})();