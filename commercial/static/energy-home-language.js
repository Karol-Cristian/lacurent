(() => {
  const language = localStorage.getItem("lacurent-language") || "ro";
  if (language !== "en") return;

  const map = {
    "Servicii": "Services",
    "Evaluare": "Evaluation",
    "Calculator": "Calculator",
    "Calculator energetic pentru locuințe · România": "Residential energy calculator · Romania",
    "Înțelege consumul casei înainte să investești.": "Understand your home's energy use before you invest.",
    "Alege localitatea pe harta României, descrie casa în termeni simpli și obține o estimare structurată pentru încălzire, răcire, apă caldă, energie primară, emisii și cost anual estimat în lei.": "Choose the location on the Romania map, describe the home in simple terms and get a structured estimate for heating, cooling, hot water, primary energy, emissions and estimated annual cost.",
    "Începe calculul": "Start calculation",
    "Cere o evaluare tehnică": "Request a technical evaluation",
    "Ce primești": "What you get",
    "Rezultat calculat pe baza clădirii și a localității.": "A result calculated from the building and its location.",
    "Comparație cu o clădire de referință.": "Comparison with a reference building.",
    "Cost energetic estimat în lei, calculat din energia finală și referințe oficiale de preț.": "Estimated energy cost calculated from final energy and official price references.",
    "Servicii pentru locuințe": "Residential services",
    "Lucrurile concrete pe care le poți evalua sau proiecta.": "Concrete systems you can evaluate or design.",
    "Calculatorul este punctul de plecare. De aici putem discuta direct despre instalația sau îmbunătățirea care te interesează.": "The calculator is the starting point. From there we can discuss the system or improvement you are interested in.",
    "Instalații electrice": "Electrical installations",
    "Evaluare, dimensionare și modernizare pentru tablouri, circuite, consumatori și extinderi.": "Assessment, sizing and modernization for panels, circuits, loads and extensions.",
    "Încălzire": "Heating",
    "Centrală pe gaz, încălzire electrică, lemne, peleți și alegerea sistemului potrivit clădirii.": "Gas boiler, electric heating, wood, pellets and selecting the right system for the building.",
    "Pompe de căldură": "Heat pumps",
    "Estimarea necesarului și verificarea dacă pompa de căldură este potrivită pentru casă și temperaturile locale.": "Demand estimation and verification that a heat pump is suitable for the home and local temperatures.",
    "Fotovoltaice": "Photovoltaics",
    "Dimensionare orientativă în raport cu profilul de consum și electrificarea încălzirii.": "Indicative sizing against the consumption profile and heating electrification.",
    "Ventilație": "Ventilation",
    "Ventilație naturală, mecanică sau cu recuperare de căldură și impactul asupra pierderilor.": "Natural, mechanical or heat-recovery ventilation and its impact on losses.",
    "Calcul & Eficiență energetică": "Energy calculation & efficiency",
    "Anvelopă, pierderi, energie primară, emisii, costuri și scenarii de modernizare.": "Envelope, losses, primary energy, emissions, costs and modernization scenarios.",
    "Flux simplu": "Simple flow",
    "Calculează, verifică, apoi discută soluția.": "Calculate, review, then discuss the solution.",
    "Descrie casa": "Describe the home",
    "Localitate, geometrie simplă, nivel de izolație, ventilare și sistemele existente.": "Location, simple geometry, insulation level, ventilation and existing systems.",
    "Deschide calculatorul →": "Open calculator →",
    "Vezi rezultatul": "View the result",
    "Cerere de energie, pierderi, cost anual estimat, energie primară, emisii și comparație cu referința.": "Energy demand, losses, estimated annual cost, primary energy, emissions and reference comparison.",
    "Vezi un exemplu →": "View an example →",
    "Cere evaluarea": "Request evaluation",
    "Trimite localitatea, suprafața și serviciile care te interesează. Restul îl clarificăm tehnic.": "Send the location, area and services you are interested in. We clarify the rest technically.",
    "Cere evaluarea →": "Request evaluation →",
    "Evaluare tehnică": "Technical evaluation",
    "Ai un proiect real? Trimite-ne datele de bază.": "Have a real project? Send the basic data.",
    "Alege serviciile relevante și localitatea. Nu trebuie să cunoști coeficienți sau să formulezi un „scop de proiect”.": "Choose the relevant services and location. You do not need to know coefficients or formulate a formal project scope.",
    "Ce te interesează?": "What are you interested in?",
    "Calcul și analiză energetică": "Energy calculation and analysis",
    "Pompă de căldură": "Heat pump",
    "Modernizare / Eficiență energetică": "Modernization / Energy efficiency",
    "Localitate": "Location",
    "Începe să scrii localitatea": "Start typing the location",
    "Suprafață aproximativă": "Approximate area",
    "Detalii utile": "Useful details",
    "Opțional": "Optional",
    "Exemplu: casă din 1995, centrală pe gaz, vreau să compar cu o pompă de căldură.": "Example: 1995 house, gas boiler, I want to compare it with a heat pump.",
    "Pregătește cererea": "Prepare request",
    "Nu se trimite nimic automat. Vei putea verifica mesajul înainte de trimitere.": "Nothing is sent automatically. You can review the message before sending.",
    "Cererea ta": "Your request",
    "Copiază": "Copy",
    "Deschide emailul": "Open email",
    "Începem cu situația existentă, apoi alegem soluția.": "We start from the existing situation, then choose the solution.",
    "Calcul, proiectare și consultanță tehnică pentru locuințe și clădiri.": "Calculation, design and technical consulting for homes and buildings.",
    "Calculator energetic": "Energy calculator"
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) continue;
    const raw = node.nodeValue || "";
    const trimmed = raw.trim();
    if (map[trimmed]) node.nodeValue = raw.replace(trimmed, map[trimmed]);
  }
  document.querySelectorAll("[placeholder]").forEach((el) => {
    const value = el.getAttribute("placeholder");
    if (map[value]) el.setAttribute("placeholder", map[value]);
  });
})();
