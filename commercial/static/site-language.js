(() => {
  const STORAGE_KEY = "lacurent-language";

  const RO_TO_EN = {
    "Instalații & Energie": "Installations & Energy",
    "Instalații & energie": "Installations & energy",
    "Clădire": "Building",
    "Anvelopă": "Envelope",
    "Ventilație": "Ventilation",
    "Sisteme": "Systems",
    "Exemplu calculat": "Calculated example",
    "Calculator energetic pentru locuințe": "Residential energy calculator",
    "Descrie locuința în termeni normali. Noi deducem valorile tehnice.": "Describe your home in normal terms. We derive the technical values.",
    "Alege localitatea, introdu dimensiunile de bază și selectează instalațiile pe care le ai. Coeficienții tehnici exacți rămân disponibili doar în setările avansate.": "Choose the location, enter the basic dimensions and select the systems you have. Exact technical coefficients remain available only in Advanced settings.",
    "Încarcă exemplul": "Load example",
    "Începe analiza": "Start analysis",
    "Corectează datele marcate.": "Correct the highlighted data.",
    "Clădirea": "Building",
    "Începem cu informațiile pe care le știi în mod normal despre locuință.": "Start with the information you normally know about your home.",
    "Modul simplu este implicit.": "Simple mode is the default.",
    "Dimensiunile și alegerile uzuale sunt transformate automat în valorile tehnice folosite de calcul.": "Common dimensions and choices are automatically converted into the technical values used by the calculation.",
    "Dacă ai măsurători exacte, deschide setările avansate din secțiunea corespunzătoare.": "If you have exact measurements, open Advanced settings in the relevant section.",
    "Numele proiectului": "Project name",
    "(opțional)": "(optional)",
    "Casa mea": "My home",
    "Localitatea clădirii": "Building location",
    "Caută localitatea sau alege direct pe hartă. Pe computer folosești rotița pentru zoom și tragi harta; pe telefon folosești două degete.": "Search for the location or choose it directly on the map. On desktop, use the mouse wheel to zoom and drag the map; on mobile, use two fingers.",
    "Caută localitatea": "Search location",
    "Ex. Cluj, Brașov, Florești": "E.g. Cluj, Brașov, Florești",
    "Se încarcă harta României...": "Loading Romania map...",
    "Localitatea selectată": "Selected location",
    "Zona climatică de iarnă": "Winter climate zone",
    "Temperatura exterioară de calcul": "Outdoor design temperature",
    "Stația climatică": "Climate station",
    "Datele climatice sunt selectate automat.": "Climate data is selected automatically.",
    "Ce calculezi?": "What are you calculating?",
    "Casă": "House",
    "Casă individuală sau alipită. Deducem anvelopa din lungime, lățime și numărul de niveluri încălzite.": "Detached or attached house. We derive the envelope from length, width and the number of heated levels.",
    "Apartament": "Apartment",
    "Apartament într-un bloc. Cerem doar suprafețele expuse spre exterior sau spre spații neîncălzite.": "Apartment in a residential block. We only ask for surfaces exposed outdoors or to unheated spaces.",
    "Lungimea clădirii": "Building length",
    "Lățimea clădirii": "Building width",
    "Niveluri încălzite": "Heated levels",
    "Înălțimea medie interioară": "Average indoor height",
    "Suprafața totală aproximativă a ferestrelor": "Approximate total window area",
    "Suprafața aproximativă a ușilor exterioare": "Approximate exterior door area",
    "Suprafața utilă încălzită": "Heated usable area",
    "Înălțimea interioară": "Indoor height",
    "Lungimea totală a pereților exteriori": "Total exterior-wall length",
    "Suprafața aproximativă a ferestrelor": "Approximate window area",
    "Deasupra este acoperiș / pod neîncălzit": "Roof / unheated attic above",
    "Dedesubt este sol / spațiu neîncălzit": "Ground / unheated space below",
    "Suprafață încălzită calculată": "Calculated heated area",
    "Volum încălzit calculat": "Calculated heated volume",
    "Pereți exteriori calculați": "Calculated exterior walls",
    "Acoperiș / tavan expus": "Exposed roof / ceiling",
    "Anul construcției": "Construction year",
    "Nivelul termoizolației": "Thermal insulation level",
    "Slabă / aproape fără izolație": "Poor / almost no insulation",
    "Medie": "Average",
    "Bună / renovată": "Good / renovated",
    "Foarte bună / locuință modernă": "Very good / modern home",
    "Anvelopa clădirii": "Building envelope",
    "În modul simplu, suprafețele rezultă din geometria de mai sus, iar coeficienții termici din nivelul de termoizolație selectat.": "In simple mode, areas are derived from the geometry above and thermal coefficients from the selected insulation level.",
    "Nu trebuie să calculezi singur suprafața pereților, acoperișului sau pardoselii. Deschide setările avansate doar dacă ai valori exacte.": "You do not need to calculate wall, roof or floor areas yourself. Open Advanced settings only if you have exact values.",
    "Setări avansate — suprafețe și coeficienți exacți": "Advanced settings — exact areas and coefficients",
    "Suprafață încălzită": "Heated area",
    "Volum încălzit": "Heated volume",
    "Temperatura interioară de calcul": "Indoor design temperature",
    "Pereți exteriori (m²)": "Exterior walls (m²)",
    "Coeficient U pereți": "Wall U-value",
    "Acoperiș / tavan (m²)": "Roof / ceiling (m²)",
    "Coeficient U acoperiș": "Roof U-value",
    "Pardoseală spre sol / spațiu rece (m²)": "Floor to ground / cold space (m²)",
    "Coeficient U pardoseală": "Floor U-value",
    "Ferestre (m²)": "Windows (m²)",
    "Coeficient U ferestre": "Window U-value",
    "Uși exterioare (m²)": "Exterior doors (m²)",
    "Coeficient U uși": "Door U-value",
    "Lungime punți termice (m)": "Thermal-bridge length (m)",
    "Transmitanță liniară ψ": "Linear transmittance ψ",
    "Aport solar explicit": "Explicit solar gains",
    "Ventilația": "Ventilation",
    "Alege tipul de ventilare. Debitul de aer și recuperarea se deduc intern.": "Choose the ventilation type. Airflow and heat recovery are derived internally.",
    "Ventilație naturală": "Natural ventilation",
    "Ferestre, grile sau fante de aerisire; fără sistem mecanic central.": "Windows, grilles or vents; no central mechanical system.",
    "Ventilație mecanică": "Mechanical ventilation",
    "Ventilatoare de extracție sau introducere fără recuperare de căldură.": "Extract or supply fans without heat recovery.",
    "Ventilație cu recuperare": "Heat-recovery ventilation",
    "Sistem mecanic echilibrat cu recuperare de căldură.": "Balanced mechanical system with heat recovery.",
    "Nu știu": "I don't know",
    "Folosim o ipoteză rezidențială explicită, care poate fi rafinată ulterior.": "We use an explicit residential assumption that can be refined later.",
    "Setări avansate — coeficienți de ventilare": "Advanced settings — ventilation coefficients",
    "Schimburi de aer pe oră": "Air changes per hour",
    "Eficiența recuperării de căldură": "Heat-recovery efficiency",
    "Instalațiile": "Systems",
    "Selectează sistemul de încălzire pe care îl recunoști. Combustibilul și performanța sezonieră sunt tratate intern.": "Select the heating system you recognize. Fuel and seasonal performance are handled internally.",
    "Sistemul principal de încălzire": "Main heating system",
    "Centrală în condensare pe gaz": "Condensing gas boiler",
    "Centrală convențională pe gaz": "Conventional gas boiler",
    "Pompă de căldură": "Heat pump",
    "Încălzire electrică directă": "Direct electric heating",
    "Sobă / șemineu pe lemne": "Wood stove / fireplace",
    "Centrală pe lemne": "Wood boiler",
    "Centrală pe peleți": "Pellet boiler",
    "Termoficare": "District heating",
    "Alt sistem": "Other system",
    "Răcire activă / aer condiționat": "Active cooling / air conditioning",
    "Apă caldă menajeră": "Domestic hot water",
    "Persoane care folosesc apa caldă": "People using domestic hot water",
    "Setări avansate — performanța exactă a sistemelor": "Advanced settings — exact system performance",
    "Randament sezonier încălzire": "Seasonal heating efficiency",
    "SCOP pompă de căldură": "Heat-pump SCOP",
    "SEER răcire": "Cooling SEER",
    "Temperatura setată la răcire": "Cooling setpoint temperature",
    "Randament apă caldă": "Domestic-hot-water efficiency",
    "Consum apă caldă (L/persoană/zi la 60 °C)": "Hot-water use (L/person/day at 60 °C)",
    "Sursa de energie pentru apa caldă": "Domestic-hot-water energy source",
    "Gaz natural": "Natural gas",
    "Electricitate": "Electricity",
    "Lemn / peleți": "Wood / pellets",
    "Datele sunt pregătite": "Data is ready",
    "Rezultatul păstrează ipotezele tehnice vizibile, dar fluxul normal nu te obligă să introduci coeficienți de inginerie.": "The result keeps technical assumptions visible, while the normal flow does not require you to enter engineering coefficients.",
    "Calculează performanța": "Calculate performance",
    "Se calculează...": "Calculating...",
    "Rezultatul calculului": "Calculation result",
    "Clasa": "Class",
    "Energie primară": "Primary energy",
    "Energie finală": "Final energy",
    "energia cumpărată de la toate sursele": "energy purchased from all sources",
    "Emisii CO₂": "CO₂ emissions",
    "Coeficient total de pierdere": "Total heat-loss coefficient",
    "Cost anual estimat al energiei": "Estimated annual energy cost",
    "Calculat din energia finală cumpărată, după randamentul sau SCOP-ul instalației.": "Calculated from purchased final energy after system efficiency or SCOP.",
    "Total anual estimat": "Estimated annual total",
    "Total anual calculabil": "Annual total that can be priced",
    "Medie lunară": "Monthly average",
    "Vezi detaliile costului": "View cost details",
    "Încălzire · răcire · apă caldă · fiecare lună": "Heating · cooling · hot water · every month",
    "Deschide": "Open",
    "Încălzire": "Heating",
    "Răcire": "Cooling",
    "Preț local necesar": "Local price required",
    "fără consum calculat": "no calculated consumption",
    "Cost lunar estimat": "Estimated monthly cost",
    "Încălzirea și răcirea urmează profilul lunar calculat; ACM se distribuie după numărul de zile din lună.": "Heating and cooling follow the calculated monthly profile; DHW is distributed by the number of days in each month.",
    "Luna": "Month",
    "ACM": "DHW",
    "Total": "Total",
    "Ianuarie": "January",
    "Februarie": "February",
    "Martie": "March",
    "Aprilie": "April",
    "Mai": "May",
    "Iunie": "June",
    "Iulie": "July",
    "August": "August",
    "Septembrie": "September",
    "Octombrie": "October",
    "Noiembrie": "November",
    "Decembrie": "December",
    "Prețurile folosite": "Prices used",
    "Energie finală pe utilizări": "Final energy by service",
    "Valori anuale calculate din necesarul util și performanța instalațiilor.": "Annual values calculated from useful demand and system performance.",
    "Comparație cu clădirea de referință": "Comparison with the reference building",
    "Aceeași geometrie, parametri de referință, același motor de calcul.": "Same geometry, reference parameters, same calculation engine.",
    "Clădire evaluată": "Evaluated building",
    "Clădire de referință": "Reference building",
    "Contribuțiile la pierderile prin transmisie, în W/K.": "Contributions to transmission heat loss, in W/K.",
    "Surse de energie": "Energy sources",
    "Energia finală agregată după sursa cumpărată.": "Final energy aggregated by purchased energy source.",
    "Profil lunar": "Monthly profile",
    "Necesar util lunar pentru încălzire și răcire.": "Monthly useful demand for heating and cooling.",
    "Detalii metodologice": "Methodology details",
    "Necesar util anual pentru încălzire": "Annual useful heating demand",
    "Necesar util anual pentru răcire": "Annual useful cooling demand",
    "Metodologie": "Methodology",
    "Cere o evaluare tehnică": "Request a technical evaluation",
    "Calculează altă locuință": "Calculate another home",
    "Generează raportul A4": "Generate A4 report",
    "Pereți exteriori": "Exterior walls",
    "Acoperiș / tavan": "Roof / ceiling",
    "Pardoseală spre sol": "Floor to ground",
    "Ferestre": "Windows",
    "Uși exterioare": "Exterior doors",
    "Punți termice liniare": "Linear thermal bridges"
  };

  const attributeNames = ["placeholder", "aria-label", "title"];

  function currentLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "ro" ? stored : "ro";
  }

  function translateString(value, language = currentLanguage()) {
    if (language !== "en") return value;
    const raw = String(value ?? "");
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    let translated = RO_TO_EN[trimmed];
    if (!translated) {
      translated = trimmed
        .replace(/\bstația climatică\b/gi, "climate station")
        .replace(/\bZona\s+([IV]+)\b/g, "Zone $1")
        .replace(/\bkWh\/an\b/g, "kWh/year")
        .replace(/\bkWh\/m²\/an\b/g, "kWh/m²/year")
        .replace(/\blei\/an\b/g, "RON/year")
        .replace(/\blei\/lună\b/g, "RON/month")
        .replace(/\blei\/kWh\b/g, "RON/kWh");
    }
    if (translated === trimmed) return raw;
    return raw.replace(trimmed, translated);
  }

  function shouldSkipText(node) {
    const parent = node.parentElement;
    return !parent || ["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA"].includes(parent.tagName);
  }

  function translateSubtree(root = document.body) {
    if (!root || currentLanguage() !== "en") return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      if (!shouldSkipText(node)) node.nodeValue = translateString(node.nodeValue, "en");
    });
    root.querySelectorAll?.("[placeholder], [aria-label], [title]").forEach((element) => {
      attributeNames.forEach((name) => {
        if (element.hasAttribute(name)) element.setAttribute(name, translateString(element.getAttribute(name), "en"));
      });
    });
    if (document.title) document.title = translateString(document.title, "en");
  }

  function injectSwitch() {
    if (document.querySelector(".site-language-switch")) return;
    const switcher = document.createElement("div");
    switcher.className = "site-language-switch";
    switcher.setAttribute("aria-label", "Language / Limbă");
    switcher.innerHTML = '<button type="button" data-site-language="ro">RO</button><button type="button" data-site-language="en">EN</button>';
    document.body.appendChild(switcher);
    const language = currentLanguage();
    switcher.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.siteLanguage === language);
      button.setAttribute("aria-pressed", button.dataset.siteLanguage === language ? "true" : "false");
      button.addEventListener("click", () => {
        localStorage.setItem(STORAGE_KEY, button.dataset.siteLanguage);
        window.location.reload();
      });
    });
  }

  function injectStyles() {
    if (document.getElementById("site-language-style")) return;
    const style = document.createElement("style");
    style.id = "site-language-style";
    style.textContent = `
      .site-language-switch{position:fixed;top:14px;right:14px;z-index:10000;display:flex;gap:3px;padding:4px;border:1px solid rgba(148,163,184,.5);border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 6px 22px rgba(15,23,42,.12);backdrop-filter:blur(8px)}
      .site-language-switch button{min-width:38px;height:32px;padding:0 9px;border:0;border-radius:999px;background:transparent;color:#475569;font:800 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
      .site-language-switch button.active{background:#172033;color:#fff}
      @media(max-width:640px){.site-language-switch{top:8px;right:8px}.site-language-switch button{min-width:34px;height:30px}}
      @media print{.site-language-switch{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function showSubmitError(message) {
    const form = document.getElementById("calculationForm");
    if (!form) return;
    let banner = document.getElementById("calculatorSubmitError");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "calculatorSubmitError";
      banner.className = "error-banner";
      banner.setAttribute("role", "alert");
      form.prepend(banner);
    }
    banner.textContent = message;
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function initCalculatorSubmitFix() {
    const form = document.getElementById("calculationForm");
    if (!form) return;
    form.noValidate = true;
    let submitted = false;
    const button = form.querySelector('button[type="submit"]');
    const locality = document.getElementById("localitySearch");
    const localityId = document.getElementById("localityId");

    locality?.addEventListener("input", () => {
      if (localityId) {
        localityId.value = "";
        localityId.setAttribute("value", "");
      }
    });

    form.addEventListener("submit", (event) => {
      if (submitted) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!locality?.value?.trim()) {
        showSubmitError(currentLanguage() === "en" ? "Choose a location before calculating." : "Alege localitatea înainte de calcul.");
        locality?.focus();
        return;
      }

      submitted = true;
      if (button) {
        button.disabled = true;
        button.textContent = currentLanguage() === "en" ? "Calculating..." : "Se calculează...";
        button.setAttribute("aria-busy", "true");
      }

      try {
        HTMLFormElement.prototype.submit.call(form);
      } catch (error) {
        submitted = false;
        if (button) {
          button.disabled = false;
          button.textContent = currentLanguage() === "en" ? "Calculate performance" : "Calculează performanța";
          button.removeAttribute("aria-busy");
        }
        showSubmitError(currentLanguage() === "en" ? "The calculation could not be started. Please try again." : "Calculul nu a putut fi pornit. Încearcă din nou.");
        console.error(error);
      }
    }, true);

    window.addEventListener("pageshow", () => {
      submitted = false;
      if (button) {
        button.disabled = false;
        button.textContent = currentLanguage() === "en" ? "Calculate performance" : "Calculează performanța";
        button.removeAttribute("aria-busy");
      }
    });
  }

  function init() {
    document.documentElement.lang = currentLanguage();
    injectStyles();
    injectSwitch();
    translateSubtree(document.body);
    initCalculatorSubmitFix();

    if (currentLanguage() === "en") {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            if (!shouldSkipText(node)) node.nodeValue = translateString(node.nodeValue, "en");
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            translateSubtree(node);
          }
        }));
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  window.lcT = translateString;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
