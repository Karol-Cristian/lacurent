# ROADMAP.md

# Roadmap LaCurent

Roadmap-ul este ordonat astfel incat LaCurent sa castige intai credibilitate tehnica, apoi sa construiasca recomandari dinamice si abia apoi straturi comerciale.

---

# Phase 1 - Physics Engine

Scop:

Construirea fundatiei fizice pentru evaluarea locuintelor.

Include:

* model cladire;
* anvelopa;
* zone termice;
* zone neincalzite;
* materiale;
* R / U / U corrected;
* transfer termic;
* ventilatie;
* aporturi solare si interne;
* necesar energetic;
* sisteme;
* energie finala;
* energie primara;
* CO2;
* clase estimative.

Milestones:

1. v0.1 Physical Skeleton
2. v0.2 Envelope + Thermal Zones
3. v0.3 Energy Demand
4. v0.4 Systems + Final Energy
5. v0.5 Primary Energy + CO2
6. v0.6 Classification + Reference Building
7. v0.7 Audit Scenarios

Pana la v0.6, focusul ramane metodologia de calcul si modelul fizic.

---

# Phase 2 - Report

Scop:

Transformarea modelului fizic intr-un raport estimativ credibil si usor de inteles.

Include:

* raport static;
* document-like;
* data de generare;
* concluzie executiva;
* scor estimat;
* clasa estimata;
* pierderi in lei/an;
* probleme principale;
* recomandari generale;
* detalii tehnice expandabile;
* disclaimer ca nu este certificat oficial.

Raportul nu include:

* marketplace;
* oferte;
* preturi live;
* feed dinamic;
* reclame.

---

# Phase 3 - Algorithms

Scop:

Transformarea raportului static in decizii dinamice si scenarii de imbunatatire.

Include:

* scenarii de renovare;
* comparatii;
* simulari;
* recomandari dinamice;
* prioritizare investitii energetice;
* economie estimata;
* impact asupra scorului;
* payback estimativ;
* surse de calcul si confidence.

Algoritmi trebuie sa ramana bazat pe Physics Engine.

---

# Phase 4 - Market Layer

Scop:

Adaugarea de informatie comerciala dupa ce recomandarea tehnica exista deja.

Include:

* preturi materiale;
* manopera;
* oferte;
* instalatori;
* parteneri;
* recalculare payback cu preturi reale.

Regula:

Market Layer nu influenteaza ranking-ul tehnic.

---

# Phase 5 - B2B/SaaS

Scop:

Extinderea catre utilizatori profesionali dupa validarea produsului rezidential.

Include:

* auditori;
* instalatori fotovoltaice;
* firme izolatii;
* firme HVAC;
* consultanti renovare;
* administratori portofolii;
* institutii.

---

# Priority Next Release

Prioritatea urmatorului release:

1. maturizare Physics Engine;
2. consolidare raport static;
3. afisare clara a pierderilor in lei/an;
4. detalii tehnice organizate;
5. teste pe case de referinta;
6. calibrare cu date reale si facturi.

Nu sunt prioritare in urmatorul release:

* marketplace;
* lead generation;
* abonamente B2B;
* ranking comercial;
* oferte live.
