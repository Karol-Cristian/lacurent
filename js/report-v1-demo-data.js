window.LaCurentReportV1Demo = {
  home: {
    title: "Casa individuala in Salicea / Cluj",
    generatedAt: "3 iunie 2026",
    facts: [
      "An constructie 1964",
      "Suprafata utila 64.8 m2",
      "Pereti caramida 30 cm + 5 cm izolatie",
      "Pod slab izolat",
      "Pardoseala pe sol",
      "Ferestre termopan vechi",
      "Incalzire pe lemne / sobe",
      "Ventilatie naturala"
    ]
  },
  verdict: {
    title: "Casa pierde bani inainte sa ajunga la confort.",
    conclusion: "Casa pare sa piarda bani in principal prin pod/acoperis, sistemul de incalzire si ventilatie. Prima decizie buna nu este un echipament scump, ci reducerea pierderilor si reglajele de baza.",
    avoidableCostRange: "4.800-7.200 lei/an",
    confidence: "Incredere evaluare: medie",
    missingData: ["facturi reale pe 12 luni", "grosime izolatie pod", "tip exact ferestre"]
  },
  annualCosts: [
    { label: "Incalzire", valueRon: 9400, note: "lemne / sobe, pierderi mari", tone: "critical" },
    { label: "Apa calda menajera", valueRon: 1800, note: "estimare pe ocupanti", tone: "medium" },
    { label: "Electric casnic", valueRon: 2100, note: "consum uzual fara PV", tone: "low" },
    { label: "Cost evitabil estimat", valueRon: 6200, note: "parte din costurile de mai sus, nu se adauga la total", tone: "high" }
  ],
  heatingBreakdown: [
    { label: "Pod / acoperis", valueRon: 1850, percent: 31 },
    { label: "Sistem incalzire", valueRon: 1650, percent: 27 },
    { label: "Ventilatie / infiltratii", valueRon: 1150, percent: 19 },
    { label: "Pereti", valueRon: 950, percent: 16 },
    { label: "Ferestre", valueRon: 620, percent: 10 },
    { label: "Pardoseala", valueRon: 520, percent: 9 }
  ],
  diagnostics: [
    {
      group: "Critice",
      items: [
        { title: "Podul/acoperisul pare slab izolat", impact: "mare", certainty: "medie", cost: "mediu", priority: "foarte mare" },
        { title: "Sistemul pe sobe are randament scazut", impact: "mare", certainty: "mare", cost: "variabil", priority: "mare" }
      ]
    },
    {
      group: "Importante",
      items: [
        { title: "Ventilatia naturala produce pierderi si confort instabil", impact: "mediu", certainty: "medie", cost: "mic-mediu", priority: "mare" },
        { title: "Peretii au izolatie sub nivelul unei locuinte moderne", impact: "mediu", certainty: "medie", cost: "mare", priority: "medie" }
      ]
    },
    {
      group: "Secundare",
      items: [
        { title: "Ferestrele termopan vechi pot avea performanta limitata", impact: "mediu", certainty: "scazuta", cost: "mare", priority: "medie" },
        { title: "Reglajele manuale pot creste consumul in zile reci", impact: "mic-mediu", certainty: "medie", cost: "mic", priority: "medie" }
      ]
    },
    {
      group: "Analizate, dar fara prioritate acum",
      items: [
        { title: "PV fara schimbari termice nu reduce pierderile de incalzire", impact: "financiar limitat", certainty: "mare", cost: "mare", priority: "scazuta" },
        { title: "Ventilatie cu recuperare are sens dupa etansare si izolatie", impact: "bun", certainty: "medie", cost: "mediu-mare", priority: "ulterior" }
      ]
    }
  ],
  scenarios: [
    {
      title: "Izolare pod + reglaje",
      cost: "5.500-9.000 lei",
      savings: "1.500-2.300 lei/an",
      payback: "3-5 ani",
      comfort: "bun",
      risk: "scazut",
      complexity: "mica",
      verdict: "Merita analizat primul"
    },
    {
      title: "Pompa de caldura + calorifere existente + ACM",
      cost: "32.000-48.000 lei",
      savings: "variabil",
      payback: "incert",
      comfort: "bun daca temperatura agentului este joasa",
      risk: "ridicat",
      complexity: "medie",
      verdict: "Merita doar dupa izolare"
    },
    {
      title: "Pompa de caldura + pardoseala + ACM pe boiler",
      cost: "58.000-85.000 lei",
      savings: "2.500-4.000 lei/an",
      payback: "lung",
      comfort: "foarte bun",
      risk: "mediu",
      complexity: "mare",
      verdict: "Bun tehnic, payback lung"
    },
    {
      title: "Centrala gaz condensare + calorifere existente",
      cost: "18.000-28.000 lei",
      savings: "1.000-2.000 lei/an",
      payback: "9-14 ani",
      comfort: "bun",
      risk: "mediu",
      complexity: "medie",
      verdict: "Necesita date suplimentare"
    },
    {
      title: "PV fara schimbari la incalzire",
      cost: "24.000-38.000 lei",
      savings: "900-1.600 lei/an",
      payback: "lung",
      comfort: "neschimbat",
      risk: "scazut",
      complexity: "medie",
      verdict: "Nu recomandam ca prim pas"
    },
    {
      title: "PV + pompa de caldura",
      cost: "60.000-90.000 lei",
      savings: "mare, dar dependenta de casa",
      payback: "incert",
      comfort: "bun",
      risk: "ridicat fara izolare",
      complexity: "mare",
      verdict: "Merita doar dupa izolare"
    },
    {
      title: "Ferestre noi",
      cost: "18.000-32.000 lei",
      savings: "700-1.300 lei/an",
      payback: "lung",
      comfort: "bun",
      risk: "scazut",
      complexity: "medie",
      verdict: "ROI slab, dar confort bun"
    },
    {
      title: "Ventilatie cu recuperare de caldura",
      cost: "12.000-28.000 lei",
      savings: "500-1.200 lei/an",
      payback: "lung",
      comfort: "foarte bun",
      risk: "mediu",
      complexity: "medie",
      verdict: "Necesita date suplimentare"
    }
  ],
  notRecommended: [
    {
      title: "Pompa de caldura inainte de reducerea pierderilor",
      explanation: "Daca locuinta cere temperaturi mari pe calorifere, COP-ul real poate scadea puternic. In casa neizolata, echipamentul lucreaza mai greu si economiile devin incerte."
    },
    {
      title: "PV nu rezolva pierderile termice",
      explanation: "Panourile pot reduce factura electrica, dar nu reduc caldura pierduta prin pod, pereti, ventilatie sau sistemul actual."
    },
    {
      title: "Incalzirea in pardoseala are sens la renovare majora",
      explanation: "Este foarte buna tehnic pentru pompe de caldura, dar presupune santier, cost si decizii constructive. Nu este primul pas daca nu renovezi deja."
    },
    {
      title: "Automatizarile avansate vin dupa reglaje de baza",
      explanation: "Termostatarea si controlul simplu trebuie rezolvate intai. Automatizarile complexe au impact mai mic daca pierderile principale raman nerezolvate."
    }
  ],
  technical: {
    metrics: [
      { label: "U pereti", value: "0.62 W/m2K", source: "internal_estimate" },
      { label: "U pod", value: "0.75 W/m2K", source: "internal_estimate" },
      { label: "Htr", value: "142 W/K", source: "prototype" },
      { label: "Hve", value: "41 W/K", source: "prototype" },
      { label: "QH,nd", value: "160-210 kWh/m2/an", source: "prototype range" },
      { label: "Sistem", value: "sobe lemne, randament scazut", source: "demo input" }
    ],
    assumptions: "Ipoteze demo: casa este modelata ca o zona termica principala, podul este slab izolat, ventilatia este naturala, iar preturile sunt intervale estimative pentru prototip."
  }
};
