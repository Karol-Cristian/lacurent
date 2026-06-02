# ENERGY_MODEL.md

# Scop

Modelul energetic LaCurent pentru locuințe produce o evaluare estimativă, orientată pe decizii.

Nu produce certificat de performanță energetică oficial.

Nu înlocuiește un auditor energetic.

Rolul lui este să transforme răspunsuri simple în:

* scor energetic estimat;
* clasă internă LaCurent;
* costuri estimate;
* probleme principale;
* recomandări prioritare;
* nivel de încredere.

---

# Reguli interactionale curente

Fluxul rezidential este conditional:

* incalzirea mixta capteaza fiecare sursa declarata si suprafata aproximativa incalzita de fiecare;
* incalzirea doar cu soba simpla nu cere termostat smart si cere puterea echipamentului;
* centralele pe lemne si pe peleti sunt tipuri distincte;
* apa calda poate avea mai multe surse;
* puterea fotovoltaica ramane 0 si blocata daca nu exista panouri;
* consumul real se cere in bani, pe baza ultimelor facturi, nu in cantitati tehnice;
* costurile de gaz, lemn si peleti se blocheaza cand combustibilul nu este folosit.

Scorul din raport este un instantaneu al ultimei analize finalizate.

Evolutia scorului, recalcularea pe baza facturilor, benchmark-ul live si impactul deciziilor implementate apar in sectiunea Algoritmi.

---

# Versiuni de analiza

Editarea unei locuinte nu sterge analiza veche.

La fiecare revizuire se creeaza o noua analiza pentru aceeasi locuinta, iar raportul foloseste ultima versiune finalizata.

Facturile lunare sunt salvate separat de formularul energetic, pentru ca pot fi adaugate constant fara recalcularea completa a profilului.

Simularile genereaza temporar un profil energetic si nu modifica locuinta salvata.

---

# Flux de date

UI simplu
→ UserEnergyInputs
→ EnergyProfile
→ DerivedEnergyModel
→ EnergyAssessment
→ Recommendations
→ User-facing report

Utilizatorul vede întrebări simple.

Backend-ul derivează intern câmpuri tehnice.

---

# Implementare curentă

Cod productiv:

* `workers/energy-model.js`
* `workers/save-house.js`
* `pages/analiza-casa.html`
* `pages/raport-energie.html`
* `pages/algoritmi.html`
* `js/energy-report.js`

Structură TypeScript de referință:

* `src/features/energy/schema`
* `src/features/energy/data`
* `src/features/energy/calculators`
* `src/features/energy/components`
* `src/features/energy/pages`

Aplicația curentă nu are încă build React/TypeScript. Fișierele din `src/features/energy` definesc arhitectura pentru migrarea viitoare, iar logica efectivă rulează în Cloudflare Worker.

---

# Principii

1. Logica energetică nu stă în UI.
2. Calculele sunt funcții pure.
3. UI-ul nu cere coeficienți tehnici utilizatorului.
4. Opțiunea „Nu știu” este permisă.
5. Raportul principal afișează concluzii, nu toate detaliile tehnice.
6. Detaliile tehnice sunt ascunse implicit.
7. Fiecare scor și recomandare trebuie să fie explicabilă.

---

# Disclaimer obligatoriu

„Această evaluare este estimativă și are rol informativ. Nu înlocuiește un certificat de performanță energetică emis de un auditor energetic atestat.”

---

# Onboarding Locuințe

Pași:

1. Date generale
2. Anvelopă
3. Încălzire și confort
4. Apă caldă, iluminat și regenerabile
5. Consum real
6. Review

Întrebările sunt simple și includ „Nu știu” unde are sens.

---

# Raport

Ordinea raportului:

---

# LaCurent Physics Engine

Motorul fizic v0.1 este separat de scoring-ul heuristic si locuieste in:

`src/features/energy/physics`

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
-> Gains
-> Heating / Cooling / DHW Demand
-> Systems
-> Final Energy
-> Primary Energy
-> CO2
-> Report / Algorithms
```

Scope v0.1:

* casa ca o singura zona termica incalzita;
* pod ca zona neincalzita simplificata;
* pereti, acoperis/planseu pod, pardoseala, ferestre, usi;
* materiale stratificate;
* R = d / lambda;
* U = 1 / R_total;
* H = U x A;
* pierderi prin transmisie si ventilatie;
* necesar incalzire estimativ;
* energie finala, energie primara si CO2.

Fiecare rezultat fizic trebuie sa pastreze:

* value;
* unit;
* source;
* confidence;
* assumptions.

Raportul foloseste rezultatul fizic ca snapshot static. Algoritmi foloseste acelasi rezultat ca baza pentru oportunitati dinamice, scenarii si benchmark.

## Physics Engine v0.2 - Envelope First

V0.2 apropie stratul fizic de structura unui audit energetic, fara sa implementeze certificat oficial.

Focus:

* Building cu arii, volum, zona climatica si conventie de masurare;
* ThermalZone pregatit pentru one-zone si multi-zone;
* UnconditionedZone pentru pod, subsol, garaj, casa scarii, veranda;
* EnvelopeElement intre zona incalzita si exterior/sol/zona neincalzita;
* MaterialLayer simplu: material + grosime;
* MaterialPreset cu lambda, sursa si confidence;
* R_layer, R_total, U, U_corrected;
* punti termice prin H_tb = suma(psi x length);
* corectie zona neincalzita prin b_ztu;
* H_tr pe element si categorie;
* H_ve din airflow sau ACH;
* Q_H anual simplificat.

Testele unitare ruleaza cu:

```powershell
npm.cmd run test:physics
```

Smoke-ul standard ruleaza si testele physics:

```powershell
npm.cmd run smoke
```

## Physics Engine v0.3 - Energy Demand

V0.3 transforma pierderile calculate in v0.2 in necesar energetic al cladirii.

Separare importanta:

* Energy Demand = energia necesara spatiului pentru confort termic;
* Final Energy = energia consumata de sistem ca sa livreze acel necesar.

V0.3 implementeaza doar Energy Demand.

Capitole:

* clima lunara;
* aporturi interne;
* aporturi solare prin ferestre;
* pierderi lunare prin transmisie si ventilatie;
* factor simplificat de utilizare a aporturilor;
* balanta termica lunara;
* necesar lunar/anual de incalzire;
* necesar estimativ de racire;
* diagnostice pentru breakdown si pattern lunar.

Formula principala pentru pierderi lunare:

```text
Qloss_month = H * (Tin - Tout_avg) * hoursInMonth / 1000
```

Formula de balanta:

```text
heatingDemand = max(0, grossHeatLoss - utilizationFactor * totalGains)
```

Testele v0.3 ruleaza impreuna cu testele physics:

```powershell
npm.cmd run test:physics
```

1. Scor energetic estimat
2. Concluzie principală
3. Clasă internă LaCurent
4. Costuri estimate
5. Top probleme
6. Top recomandări
7. Încredere estimare
8. Detalii tehnice

---

# Locuințe multiple

Un proprietar poate avea mai multe locuințe.

Fiecare locuință are:

* nume afișat;
* analiză proprie;
* scor propriu;
* raport propriu;
* recomandări proprii;
* decizii implementate proprii.

După ce o locuință are analiză, formularul nu mai este fluxul principal pentru acea locuință.

Utilizatorul trebuie să:

* selecteze locuința activă;
* consulte raportul;
* marcheze recomandările implementate;
* adauge o altă locuință doar când chiar are o altă proprietate.

Scorul activ poate crește incremental când utilizatorul marchează recomandări ca implementate.

---

# Date demo

Există un profil demo în `workers/energy-model.js`:

* casă veche;
* an construcție 1964;
* aproximativ 65 m²;
* pereți din cărămidă;
* izolație pereți 5 cm;
* pod/acoperiș necunoscut sau slab izolat;
* podea pe sol;
* termopan vechi;
* încălzire pe lemne/sobă;
* fără termostat;
* iluminat mixt;
* fără fotovoltaice;
* consum real parțial.

Raport demo:

`/pages/raport-energie.html?demo=1`
