# PRODUCT.md

## Ce este LaCurent

LaCurent este un motor de evaluare energetica pentru locuinte.

Pe termen scurt, LaCurent transforma date despre constructie, consum si sisteme intr-o evaluare energetica estimativa bazata pe model fizic.

Pe termen lung, LaCurent poate deveni stratul independent de decizie pentru investitii energetice rezidentiale.

LaCurent nu este:

* marketplace;
* platforma de lead generation;
* aplicatie generica de recomandari AI;
* furnizor de energie;
* instalator;
* producator de echipamente.

Pozitionarea corecta:

> LaCurent transforms home construction, consumption and system data into a physics-based energy assessment, then later into recommendations and market actions.

---

# Short-Term Goal

LaCurent short-term goal is to become a credible home energy assessment engine.

Prioritatea curenta este segmentul Locuinte.

Produsul trebuie sa genereze un raport energetic estimativ credibil, inspirat conceptual din metodologia MC001, fara sa pretinda ca emite certificat energetic oficial.

Fundația produsului este LaCurent Physics Engine.

---

# Misiune

Help homeowners make the best energy investment decisions based on physics, not sales incentives.

In romana:

Sa ajutam proprietarii sa inteleaga starea energetica a locuintei si sa ia decizii mai bune inainte de a investi bani.

---

# Long-Term Vision

LaCurent nu urmareste sa devina doar un calculator energetic, un marketplace sau o platforma de lead-uri.

Obiectivul pe termen lung este sa devina infrastructura de incredere pentru deciziile energetice ale locuintelor.

Long-Term Goal:

Route a significant share of residential energy upgrade decisions through LaCurent.

Target:

80% of major residential energy investments should be evaluated through LaCurent before a purchase decision is made.

Exemple de decizii:

* izolatie pereti;
* izolatie pod/acoperis;
* inlocuire ferestre;
* inlocuire sistem incalzire;
* pompe de caldura;
* panouri fotovoltaice;
* solar termic;
* ventilatie cu recuperare;
* modernizare apa calda menajera;
* renovare energetica completa.

Ambitia este ca proprietarii sa intrebe:

> What does LaCurent say is the best investment for my home?

inainte de:

> Should I buy this?

---

# Principii de produs

## Physics engine first

The physics engine is the core asset of LaCurent. Monetization must not compromise trust in the engine.

Pana la Physics Engine v0.6, prioritatea ramane metodologia de calcul si modelul fizic.

Nu optimizam inca pentru:

* marketplace;
* instalatori;
* lead-uri;
* abonamente B2B;
* recomandari comerciale;
* preturi live;
* oferte de la furnizori.

Acestea sunt directii viitoare.

## Incredere inainte de monetizare

Produsul trebuie sa castige increderea utilizatorului inainte sa il trimita catre parteneri comerciali.

Recomandarile trebuie sa fie generate din modelul fizic si analiza economica, nu din interese comerciale.

Ordinea recomandarilor nu trebuie sa fie paid placement.

## Guest first, account later

Utilizatorul trebuie sa poata vedea valoarea raportului inainte sa fie obligat sa creeze cont.

Contul este optional la primul contact si devine relevant dupa raport, cand utilizatorul vrea sa salveze permanent, sa adauge facturi, sa compare locuinte sau sa continue pe alt dispozitiv.

Detalii: `GUEST_MODE.md`.

## Simplitate inainte de complexitate

Utilizatorul trebuie sa inteleaga concluzia inainte sa vada metodologia.

Concluziile sunt mai importante decat formulele in UI-ul principal.

## Explicabilitate

Orice scor, clasa estimata, pierdere sau recomandare trebuie sa poata fi explicata.

Utilizatorul trebuie sa inteleaga:

* ce stim;
* ce estimam;
* ce lipseste;
* cat de mare este increderea.

## Banii trebuie sa fie vizibili

LaCurent trebuie sa arate pierderile si oportunitatile in lei/an, nu doar in kWh.

Utilizatorul trebuie sa inteleaga:

* unde pierde bani;
* ce investitie poate reduce costurile;
* ce perioada de recuperare este estimata;
* ce se schimba daca implementeaza o masura.

---

# Raport vs Algoritmi

## Raport

Raportul este fotografia statica a locuintei la momentul generarii.

Raportul raspunde la:

> Care este starea energetica actuala a locuintei mele?

Trebuie sa arate ca un document simplificat de audit:

* data de generare;
* status: evaluare estimativa;
* scor energetic estimat;
* clasa estimata LaCurent;
* stare locuinta;
* performanta energetica;
* pierderi estimate in lei/an;
* maximum 3 probleme principale;
* maximum 3 recomandari generale;
* detalii tehnice expandabile;
* disclaimer ca nu este certificat oficial.

Raportul nu include marketplace, oferte, preturi live sau feed dinamic.

## Algoritmi

Algoritmi este zona dinamica de decizie, dar vine dupa ce motorul fizic este suficient de matur.

Algoritmi raspunde la:

> Ce ar trebui sa fac acum pentru a imbunatati locuinta si cat m-ar costa?

Algoritmi poate include ulterior:

* scenarii de renovare;
* comparatii;
* simulari;
* recomandari dinamice;
* prioritizare investitii;
* benchmark;
* preturi si oferte, doar dupa separarea clara de analiza tehnica.

---

# Roadmap de produs

## Phase 1 - Physics Engine

* model cladire;
* anvelopa;
* zone termice;
* necesar energetic;
* sisteme;
* energie finala;
* energie primara;
* CO2;
* clase estimative.

## Phase 2 - Report

* raport static;
* document-like;
* explicatii clare;
* pierderi in lei/an;
* detalii tehnice expandabile;
* disclaimer ca nu este certificat oficial.

## Phase 3 - Algorithms

* scenarii de renovare;
* comparatii;
* simulari;
* recomandari dinamice;
* prioritizare investitii energetice.

## Phase 4 - Market Layer

* preturi materiale;
* manopera;
* oferte;
* instalatori;
* parteneri.

## Phase 5 - B2B/SaaS

* auditori;
* instalatori fotovoltaice;
* firme izolatii;
* firme HVAC;
* consultanti renovare.

---

# Segmente

Segmentul principal short-term este Locuinte.

Experientele pentru afaceri, institutii, industrie, auditori si furnizori pot fi pregatite arhitectural, dar nu sunt focusul imediat al produsului.

---

# Disclaimer obligatoriu

Aceasta evaluare este estimativa si are rol informativ. Nu inlocuieste un certificat de performanta energetica emis de un auditor energetic atestat.
