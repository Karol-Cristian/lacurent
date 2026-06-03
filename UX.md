# UX.md

# Filosofia UX LaCurent

LaCurent nu este un dashboard energetic.

LaCurent este un sistem de suport pentru decizii energetice, construit pe un motor fizic de evaluare a locuintei.

In short-term, UX-ul trebuie sa ajute proprietarul sa inteleaga:

* care este starea energetica a locuintei;
* unde pierde bani;
* cat de credibila este estimarea;
* ce date lipsesc pentru o evaluare mai buna.

Nu optimizam inca experienta pentru marketplace, lead-uri sau vanzari B2B.

---

# Regula celor 10 secunde

In maximum 10 secunde utilizatorul trebuie sa inteleaga:

1. Ce este LaCurent.
2. De ce este relevant pentru locuinta lui.
3. Ce valoare primeste.
4. Care este urmatoarea actiune.

Pentru locuinte, urmatoarea actiune principala este completarea evaluarii energetice.

---

# Regula unei concluzii

Fiecare pagina trebuie sa aiba o concluzie principala.

Exemple:

* "Locuinta are pierderi importante prin pod si pereti."
* "Costurile estimate sunt peste nivelul unei locuinte similare eficiente."
* "Evaluarea are incredere medie, pentru ca lipsesc facturile reale."

Utilizatorul trebuie sa poata intelege pagina fara sa citeasca toate detaliile tehnice.

---

# Regula contextului

Nu afisam:

`Scor: 72`

Afisam:

`Scor energetic estimat: 72 / 100`

si explicam:

* ce inseamna;
* pe ce date se bazeaza;
* ce incredere avem;
* daca este comparabil cu alte locuinte.

---

# Regula pierderilor in bani

Utilizatorii inteleg mai usor costul decat energia.

Cand este posibil, pierderile trebuie traduse in lei/an:

* pierderi prin pereti;
* pierderi prin pod/acoperis;
* pierderi prin pardoseala;
* pierderi prin ferestre;
* pierderi prin ventilatie si infiltratii;
* pierderi prin randamentul sistemului;
* pierderi la apa calda;
* consum auxiliar.

kWh si coeficientii tehnici raman in detalii tehnice.

---

# Evitam dashboard syndrome

Nu construim ecrane pline cu:

* grafice inutile;
* KPI-uri fara explicatie;
* tabele complexe;
* filtre excesive;
* carduri comerciale premature.

Fiecare element trebuie sa raspunda la una dintre intrebarile:

* Cat de eficienta este locuinta?
* Unde se pierd bani?
* Ce date lipsesc?
* Ce se poate imbunatati?

---

# Progressive disclosure

Nivel 1: concluzia.

Nivel 2: explicatia simpla.

Nivel 3: impactul financiar.

Nivel 4: detaliile tehnice.

Majoritatea utilizatorilor nu trebuie sa ajunga la nivelul 4, dar acesta trebuie sa existe pentru transparenta.

---

# Onboarding Locuinte

Onboarding-ul trebuie sa fie mobile-first.

Reguli:

* intrebare scurta;
* explicatie scurta;
* optiuni predefinite;
* optiune "Nu stiu";
* progres vizibil;
* validare prietenoasa;
* completare partiala permisa.

Formularul trebuie sa colecteze date suficiente pentru modelul fizic, fara sa ceara utilizatorului coeficienti tehnici.

Exemple:

* daca nu exista fotovoltaice, puterea instalata ramane 0 si campul este blocat;
* daca incalzirea este mixta, cerem sursele si suprafata aproximativa acoperita de fiecare;
* daca exista doar soba simpla, nu intrebam despre termostat smart;
* daca nu exista sursa pe gaz, costul de gaz este 0 si campul este blocat, cu exceptia gatitului pe gaz;
* consumul real se cere in bani si pe baza facturilor reale, evitand regularizarile care nu descriu consumul real.

---

# Raport

Raportul este un instantaneu static al locuintei.

Trebuie sa se simta ca un document de audit energetic simplificat, nu ca dashboard live.

Raportul:

* are data de generare;
* este document-like;
* este static;
* nu include feed dinamic;
* nu include marketplace;
* nu include oferte;
* nu include preturi live comerciale;
* include detalii tehnice expandabile la final;
* include disclaimer ca nu este certificat oficial.

Ordinea recomandata:

1. Header raport.
2. Rezumat executiv.
3. Starea locuintei.
4. Performanta energetica.
5. Pierderi estimate in lei/an.
6. Probleme principale.
7. Recomandari generale incluse in raport.
8. Incredere estimare.
9. Detalii tehnice expandabile.
10. Disclaimer.

Disclaimer obligatoriu:

> Aceasta evaluare este estimativa si are rol informativ. Nu inlocuieste un certificat de performanta energetica emis de un auditor energetic atestat.

---

# Algoritmi

Algoritmi vine dupa ce motorul fizic este suficient de matur.

Algoritmi este partea dinamica a produsului:

* scenario-based;
* bazata pe Physics Engine;
* orientata spre decizii;
* capabila sa explice sursele de calcul;
* capabila ulterior sa includa preturi, oferte si disponibilitate parteneri.

Fiecare recomandare dinamica trebuie sa arate:

* ce date au fost folosite;
* ce ipoteze exista;
* impact estimat;
* economie estimata;
* cost estimativ;
* perioada de recuperare;
* nivel de incredere.

Algoritmi nu trebuie sa devina o lista de reclame.

---

# Separare comerciala in UX

Flux corect:

```text
Analysis
-> Technical recommendation
-> User decision
-> Optional marketplace / offers / partners
```

Flux gresit:

```text
Marketplace
-> Commercial recommendation
-> User decision
```

Paid partners pot aparea doar dupa ce recomandarea tehnica a fost generata.

---

# Mobile first

Majoritatea experientelor trebuie proiectate pentru telefon.

Pe mobil:

* fiecare sectiune trebuie sa aiba o concluzie clara;
* cardurile trebuie sa fie scurte;
* tabelele tehnice trebuie evitate sau ascunse;
* detaliile avansate trebuie sa fie expandabile;
* sumele in lei/an trebuie sa fie usor de scanat.

---

# Definitia succesului

Un utilizator are succes daca poate raspunde rapid la:

* Este locuinta mea eficienta?
* Unde pierd bani?
* Cat de sigura este estimarea?
* Ce date ar trebui sa mai adaug?
* Ce investitii merita analizate mai departe?
