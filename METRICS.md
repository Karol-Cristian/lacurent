# METRICS.md

# Scop

Acest document definește metricile principale LaCurent, formulele de calcul și regulile de afișare în UI.

Obiectiv: metrici consistente, explicabile și utile pentru decizie.

---

# Principii

1. Fiecare metrică trebuie să răspundă la una dintre întrebări:
   * Cât de eficient sunt?
   * Unde pierd bani?
   * Ce trebuie să fac?
2. Fiecare metrică afișată trebuie să aibă context (benchmark, interval, trend).
3. Evităm afișarea metricilor fără recomandare asociată.

---

# Metrici principale (MVP - Locuințe)

## 1) Energy Score

Definiție: scor compozit al performanței energetice, între 0 și 100.

Formula (versiune inițială):

`energy_score = round(0.35 * building_efficiency + 0.30 * consumption_efficiency + 0.20 * equipment_efficiency + 0.15 * behavior_efficiency)`

Subscoruri (0-100):
* `building_efficiency`
* `consumption_efficiency`
* `equipment_efficiency`
* `behavior_efficiency`

Reguli UI:
* Afișare: `Scor energetic: 72 / 100`
* Context obligatoriu: percentile sau comparație cu grup similar
* Fără scor dacă analiza nu este completă

---

## 2) Cost Lunar Estimat

Definiție: costul energetic lunar estimat pe baza datelor furnizate și/sau a facturilor.

Formula:

`estimated_monthly_cost = estimated_monthly_kwh * tariff_per_kwh + fixed_monthly_fees`

Reguli UI:
* Afișare în RON/lună
* Dacă lipsesc date de tarif, se folosește tarif implicit și se marchează „estimare”

---

## 3) Economie Anuală Potențială

Definiție: suma economiilor estimate dacă utilizatorul implementează recomandările prioritare.

Formula:

`annual_savings_potential = sum(top_recommendations[i].estimated_annual_savings)`

Reguli UI:
* Afișare în RON/an
* Se afișează și procent față de costul anual estimat

---

## 4) Benchmark Percentile

Definiție: poziția utilizatorului în distribuția unui grup similar.

Exemplu:
* „Consum mai mare decât 72% dintre locuințele similare.”

Reguli de grupare (MVP):
* `user_type` (residential)
* `building_type`
* `surface_bucket`
* `occupants_bucket`
* `climate_region`
* `heating_type`
* `construction_period`

---

## 5) Intensitate Consum

Definiție: consum raportat la suprafață.

Formula:

`kwh_per_m2_year = annual_kwh / usable_surface_m2`

Reguli UI:
* Afișare: `kWh/m²/an`
* Context: interval performant / mediu / ineficient

---

# Clase energetice estimate (neoficial)

Interval propus:
* A+: `>= 95`
* A: `90-94`
* B: `80-89`
* C: `70-79`
* D: `55-69`
* E: `40-54`
* F: `25-39`
* G: `< 25`

Disclaimer UI obligatoriu:

„Estimare energetică generată automat. Nu reprezintă certificat energetic oficial.”

---

# Structură date recomandată

Pentru fiecare analiză salvăm:
* `analysis_id`
* `energy_score`
* subscoruri
* `estimated_monthly_cost`
* `annual_savings_potential`
* `benchmark_percentile`
* `estimated_energy_class`
* `calculation_version`
* `generated_at`

---

# Versionare calcule

Reguli:
1. Orice schimbare de formulă crește `calculation_version`.
2. Scorurile istorice rămân auditable.
3. Recalculările în masă se rulează explicit, nu implicit.

---

# Ce urmează (Next)

1. Definire exactă ponderi subscoruri pe baza datelor reale.
2. Calibrare benchmark pe eșantioane locale.
3. Introducere model ROI pentru recomandări.
4. Extindere metrici pentru Afaceri, Industrie, Instituții.
