# MC001_BACKEND_MODEL.md

## Scop

Acest document defineste datele tehnice care trebuie sustinute in backend-ul LaCurent pentru estimarea performantei energetice a cladirilor.

LaCurent foloseste o metodologie estimativa inspirata din structura MC001 si din datele uzuale ale certificatelor de performanta energetica, pentru a genera:

* scor energetic estimativ;
* clasa energetica estimativa;
* consum specific estimativ;
* emisii CO2 estimate;
* recomandari;
* economii estimate;
* comparatii cu locuinte similare.

Evaluarea nu este certificat energetic oficial si nu inlocuieste auditorul energetic.

---

## Categorii principale de date tehnice

Backend-ul trebuie sa sustina:

1. Date de identificare cladire
2. Date geometrice
3. Date climatice
4. Caracteristici anvelopa
5. Coeficienti de transfer termic
6. Punti termice
7. Ventilare si infiltratii
8. Sisteme de incalzire
9. Sisteme de racire
10. Apa calda menajera
11. Iluminat
12. Surse regenerabile
13. Consumuri finale
14. Energie primara
15. Emisii CO2
16. Clase energetice
17. Clase emisii
18. Recomandari si scenarii de renovare
19. Certificate energetice importate
20. Factori configurabili pentru preturi si conversii combustibili

---

## Principiu de modelare

UI-ul ramane simplu. Backend-ul trebuie sa poata reprezenta intern un model tehnic bogat:

```text
User inputs simple
-> EnergyProfile
-> MC001TechnicalModel
-> Derived calculations
-> Assessment
-> Report / Benchmark / Admin analysis
```

Datele tehnice nu trebuie expuse in raportul principal decat gradual, in detalii tehnice sau in sectiunea Date si Benchmark.

---

## Structuri tehnice obligatorii

Implementarea trebuie sa sustina interfete pentru:

* `BuildingIdentification`
* `BuildingGeometry`
* `ClimateData`
* `EnvelopeElement`
* `MaterialLayer`
* `ThermalCalculationResult`
* `MaterialPreset`
* `WindowSystem`
* `ThermalBridge`
* `VentilationModel`
* `HeatingSystem`
* `CoolingSystem`
* `DomesticHotWaterSystem`
* `LightingSystem`
* `RenewableSystem`
* `EnergyUseBreakdown`
* `PrimaryEnergyFactor`
* `EmissionFactor`
* `EnergyClassThreshold`
* `EmissionClassThreshold`
* `EnergyPrice`
* `FuelConversionFactor`
* `TechnicalRecommendationRule`
* `ImportedEnergyCertificate`

Aceste structuri sunt definite initial in:

`src/features/energy/schema/mc001TechnicalModel.ts`

---

## Calcul transfer termic

Backend-ul trebuie sa sustina calculul:

```text
R_layer = thicknessM / lambdaWmK
R_total = Rsi + sum(R_layer) + Rse
U = 1 / R_total
```

Orice calcul trebuie sa includa:

* valoare;
* unitate;
* sursa;
* confidence;
* assumptions.

---

## Preseturi configurabile

Pragurile si factorii tehnici nu se hardcodeaza in componente UI.

Trebuie sa existe preseturi configurabile pentru:

* materiale;
* sisteme de incalzire/racire/ACM;
* factori energie primara;
* factori emisii CO2;
* conversii combustibili;
* praguri clase energetice;
* praguri clase emisii;
* reguli recomandari tehnice.

Valorile initiale pot fi placeholder, dar trebuie marcate cu `source: "estimated"` sau `source: "internal_estimate"`.

---

## Date demo din certificat analizat

Profil demo orientativ:

```ts
const demoCertificateProfile = {
  building: {
    buildingType: "single_family_house",
    usageCategory: "residential",
    address: {
      country: "Romania",
      county: "Cluj",
      locality: "Salicea"
    },
    constructionYear: 1964,
    occupancyPattern: "permanent"
  },
  geometry: {
    usefulAreaM2: 64.8,
    heatedAreaM2: 64.8
  },
  performance: {
    officialEnergyClass: "D",
    officialEmissionClass: "A",
    finalEnergyKwhM2Year: 338,
    estimatedSavingsPercentMin: 40,
    estimatedSavingsPercentMax: 60,
    estimatedPaybackYearsMin: 7,
    estimatedPaybackYearsMax: 10
  },
  envelopeApproximation: {
    externalWalls: {
      material: "brick",
      thicknessCm: 30,
      insulationThicknessCm: 5,
      quality: "average_to_poor"
    },
    floor: {
      type: "floor_on_ground",
      quality: "unknown_to_poor"
    },
    roofOrCeiling: {
      type: "ceiling_to_attic_or_roof",
      quality: "unknown_to_poor"
    },
    windows: {
      glazingType: "double_old_or_unknown",
      quality: "average"
    }
  },
  systemsApproximation: {
    heating: {
      fuel: "wood",
      generatorType: "local_stove",
      distributionType: "local",
      controlType: "manual_or_unknown",
      quality: "poor"
    },
    ventilation: {
      ventilationType: "natural"
    }
  }
};
```

---

## Reguli pentru Codex

Nu inventa valori normative exacte daca nu exista in tabele.

Valorile tehnice trebuie marcate:

```ts
{
  value: 0.42,
  unit: "W/m2K",
  source: "estimated",
  confidence: "medium"
}
```

Surse acceptate:

* `mc001`
* `standard`
* `estimated`
* `internal_estimate`
* `user_input`
* `custom`

Datele tehnice si formulele de calcul pot fi expuse in sectiunea Date si Benchmark.

---

## Criterii de acceptare

Implementarea este acceptata daca:

1. Exista schema backend pentru date tehnice complete.
2. Exista campuri pentru U-value, R-value, lambda, punti termice, ventilare, sisteme, energie primara si emisii.
3. Exista tabele/preseturi configurabile pentru materiale, sisteme, conversii, energie primara si emisii.
4. Exista tabele configurabile pentru clase energetice si clase CO2.
5. Pragurile de clasificare nu sunt hardcodate in componente.
6. UI-ul ramane simplu si nu expune utilizatorului toata complexitatea.
7. Raportul principal afiseaza concluzii, nu formule.
8. Detaliile tehnice sunt disponibile doar in accordion/advanced view.
9. Fiecare valoare tehnica are source si confidence.
10. Sistemul permite import viitor din certificat energetic PDF.
11. Sistemul permite calibrare cu consum real din facturi.
12. Sistemul mentioneaza clar ca evaluarea este estimativa si nu certificat oficial.
13. Datele tehnice si formulele de calcul pot fi expuse in Date si Benchmark.
