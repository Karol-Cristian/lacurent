# UX.md

# Filosofia UX LaCurent

LaCurent nu este un dashboard energetic.

LaCurent este un sistem de suport pentru decizii energetice.

Utilizatorii intră în platformă pentru a afla:

* cât de eficienți sunt;
* unde pierd bani;
* ce trebuie să facă.

---

# Regula celor 10 secunde

În maximum 10 secunde utilizatorul trebuie să înțeleagă:

1. Ce este LaCurent.
2. De ce este relevant pentru el.
3. Ce valoare primește.
4. Care este următoarea acțiune.

---

# Regula unei concluzii

Fiecare pagină trebuie să aibă o concluzie principală.

Exemple:

* „Bună eficiență energetică”
* „Potențial mare de economisire”
* „Consum peste media locuințelor similare”

---

# Regula unei acțiuni

Fiecare analiză trebuie să genereze cel puțin o recomandare.

Nu afișăm doar probleme.

Afișăm probleme și soluții.

---

# Regula contextului

Nu afișăm:

`Scor: 72`

Afișăm:

`Scor energetic estimat: 72 / 100`

și explicăm dacă rezultatul este bun sau rău.

---

# Evităm dashboard syndrome

Nu construim ecrane pline cu:

* grafice inutile;
* KPI-uri fără explicație;
* tabele complexe;
* filtre excesive.

Fiecare element trebuie să răspundă unei întrebări reale.

---

# Principiul progressive disclosure

Nivel 1: concluzia.

Nivel 2: explicația.

Nivel 3: detaliile tehnice.

Majoritatea utilizatorilor nu trebuie să ajungă la nivelul 3.

---

# Limbaj

Preferăm:

* economie estimată;
* cost lunar;
* recomandare;
* eficiență;
* comparație;
* „Nu știu”.

Evităm:

* coeficienți;
* formule;
* terminologie inginerească;
* jargon energetic.

---

# Onboarding Locuințe

Onboarding-ul trebuie să fie mobile-first.

Reguli:

* întrebare scurtă;
* explicație scurtă;
* opțiuni predefinite;
* opțiune „Nu știu”;
* progres vizibil;
* validare prietenoasă;
* completare parțială permisă.

---

# Raport energetic estimativ

Ordinea raportului:

1. Scor energetic estimat.
2. Concluzie principală.
3. Clasă internă LaCurent.
4. Costuri estimate.
5. Top probleme.
6. Top recomandări.
7. Încredere estimare.
8. Detalii tehnice ascunse implicit.

Disclaimer obligatoriu:

„Această evaluare este estimativă și are rol informativ. Nu înlocuiește un certificat de performanță energetică emis de un auditor energetic atestat.”

---

# Definiția succesului

Un utilizator are succes dacă poate răspunde rapid la:

* Sunt eficient?
* Unde pierd bani?
* Ce fac mai departe?

---

# Formular locuinta

Formularul trebuie sa fie conditional.

Nu intrebam utilizatorul despre date care nu se aplica locuintei lui.

Exemple:

* daca nu exista fotovoltaice, puterea instalata ramane 0 si campul este blocat;
* daca incalzirea este mixta, cerem sursele si suprafata aproximativa acoperita de fiecare;
* daca exista doar soba simpla, nu intrebam despre termostat smart, ci despre putere si utilizare;
* daca nu exista sursa pe gaz, costul de gaz este 0 si campul este blocat, cu exceptia gatitului pe gaz;
* consumul real se cere in bani, pe baza ultimelor facturi, evitand regularizarile care nu descriu consumul real.

---

# Raport vs Algoritmi

Raportul si Algoritmi sunt experiente diferite.

Raport = fotografie.

Algoritmi = motor live.

## Raport

Raportul este un document static, generat dupa onboarding.

Reguli:

* include data generarii;
* raspunde la starea energetica actuala a locuintei;
* nu include oferte;
* nu include preturi live;
* nu include marketplace;
* recomandarile sunt generale si limitate la maximum 3;
* detaliile tehnice sunt ascunse implicit.

## Algoritmi

Algoritmi este pagina dinamica pentru decizii.

Reguli:

* include timestamp de actualizare;
* afiseaza surse de calcul;
* afiseaza numar de locuinte similare;
* poate include oferte, materiale si manopera;
* recomandarile sunt ordonate dupa impact, cost, economie si incredere;
* trebuie sa explice cand investitia poate deveni justificata financiar.

---

# Editare si simulare

Utilizatorul trebuie sa poata reveni asupra locuintei fara sa simta ca reia tot procesul de la zero.

Actiuni asteptate:

* editeaza datele locuintei;
* adauga factura lunara;
* marcheaza schimbari facute;
* simuleaza scenarii fara salvare.

Simularea trebuie separata clar de salvare, pentru ca utilizatorul sa poata intreba "ce-ar fi daca?" fara sa modifice raportul real.
