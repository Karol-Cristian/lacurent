# ENERGY_MODEL.md

# Scop

Modelul energetic LaCurent produce o evaluare energetica estimativa pentru locuinte.

Nu produce certificat de performanta energetica oficial.

Nu inlocuieste un auditor energetic.

Rolul lui este sa transforme date simple introduse de proprietar intr-un model fizic si intr-un raport decizional credibil.

---

# Pozitionare tehnica

LaCurent Physics Engine este fundatia produsului.

Pana la v0.6, prioritatea este metodologia de calcul si modelul fizic, nu marketplace-ul si nu monetizarea.

Flux conceptual:

```text
Building
-> Climate
-> Thermal Zones
-> Envelope
-> Materials
-> R / U / U'
-> Heat Transfer
-> Ventilation
-> Solar/Internal Gains
-> Heating/Cooling/DHW Demand
-> Systems
-> Final Energy
-> Primary Energy
-> CO2
-> Classification
-> Report / Algorithms
```

---

# Principii

1. Logica energetica nu sta in UI.
2. Calculele sunt functii pure.
3. Coeficientii si valorile default vin din registries/config.
4. UI-ul nu cere coeficienti tehnici proprietarului.
5. Fiecare rezultat calculat trebuie sa aiba unitate, sursa, confidence si assumptions.
6. Raportul principal arata concluzii si bani, nu formule.
7. Detaliile tehnice sunt expandabile.
8. Scorul si clasa sunt estimative.
9. Evaluarea nu este certificat oficial.
10. Monetizarea nu trebuie sa compromita increderea in motor.

---

# Versiuni Physics Engine

## v0.1 - Physical Skeleton

Scop:

* model cladire;
* clima;
* anvelopa de baza;
* materiale;
* primele calcule R, U, H;
* output fizic unitar.

## v0.2 - Envelope + Thermal Zones

Scop:

* zone termice;
* zone neincalzite;
* elemente de anvelopa;
* materiale stratificate;
* R_layer;
* R_total;
* U;
* U corrected;
* punti termice;
* transfer prin transmisie;
* transfer prin ventilatie.

## v0.3 - Energy Demand

Scop:

* clima lunara;
* aporturi interne;
* aporturi solare;
* balanta energetica lunara;
* necesar lunar/anual de incalzire;
* necesar estimativ de racire.

Separare importanta:

* Energy Demand = energia necesara cladirii pentru confort;
* Final Energy = energia consumata de sistem ca sa livreze acel necesar.

## v0.4 - Systems + Final Energy

Scop:

* sisteme de incalzire;
* sisteme de racire;
* apa calda menajera;
* iluminat;
* energie auxiliara;
* pierderi de sistem;
* energie finala pe utilizare si pe purtator.

## v0.5 - Primary Energy + CO2

Scop:

* energie primara regenerabila;
* energie primara neregenerabila;
* energie primara totala;
* emisii CO2;
* indicatori specifici pe m2.

## v0.6 - Classification + Reference Building

Scop:

* cladire de referinta;
* clase energetice estimative;
* clase de mediu estimative;
* comparatie cu referinta;
* praguri configurabile.

Pana aici, focusul ramane strict pe model fizic si credibilitatea raportului.

## v0.7 - Audit Scenarios

Scop:

* scenarii de renovare;
* aplicare masuri pe model;
* rerulare engine;
* comparatie baseline vs scenario;
* economie energetica;
* economie financiara;
* perioada de recuperare.

---

# Raport vs Algoritmi in model

## ReportSnapshot

Raportul este static.

Contine:

* data generarii;
* scor estimat;
* clasa estimata;
* concluzie principala;
* consum estimat;
* cost anual estimat;
* pierderi estimate in lei/an;
* probleme principale;
* recomandari generale;
* detalii tehnice.

Nu contine marketplace, oferte sau preturi live comerciale.

## AlgorithmInsights

Algoritmi este dinamic si vine dupa maturizarea motorului fizic.

Poate contine:

* scenarii;
* benchmark;
* cost estimativ;
* ROI;
* surse de calcul;
* oferte si parteneri in viitor.

---

# Date introduse de utilizator

Utilizatorul nu trebuie sa vada complexitatea tehnica completa.

Onboarding-ul colecteaza:

* tip locuinta;
* localitate;
* an constructie;
* suprafata;
* volum sau inaltime aproximativa;
* pereti;
* izolatie;
* pod/acoperis;
* pardoseala;
* ferestre;
* ventilatie;
* incalzire;
* apa calda;
* racire;
* iluminat;
* regenerabile;
* facturi si costuri reale.

Optiunea "Nu stiu" trebuie sa ramana disponibila.

---

# Pierderi in lei/an

Raportul trebuie sa traduca rezultatele fizice in cost anual estimativ.

Categorii:

* pereti exteriori;
* pod/acoperis;
* pardoseala/sol;
* ferestre;
* usi;
* punti termice;
* ventilatie si infiltratii;
* pierderi sistem incalzire;
* pierderi apa calda;
* pompe, ventilatoare si automatizari.

kWh ramane disponibil in detalii tehnice.

---

# Testare

Testele physics trebuie sa verifice lantul:

```text
U
-> Htr
-> Hve
-> QH,nd
-> final energy
-> primary energy
-> CO2
-> class
```

Comanda standard:

```powershell
npm.cmd run test:physics
```

Smoke complet:

```powershell
npm.cmd run smoke
```

---

# Future scope

Urmatoarele sunt directii viitoare, nu prioritati pana la maturizarea Physics Engine si Report:

* marketplace;
* instalatori;
* lead generation;
* preturi live;
* oferte;
* abonamente B2B;
* auditori ca workflow complet;
* SaaS pentru furnizori.

---

# Disclaimer obligatoriu

Aceasta evaluare este estimativa si are rol informativ. Nu inlocuieste un certificat de performanta energetica emis de un auditor energetic atestat.
