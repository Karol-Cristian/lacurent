# PRODUCT.md

## Ce este LaCurent

LaCurent este un copilot energetic care ajuta utilizatorii sa inteleaga, compare si optimizeze consumul energetic al unei locuinte, afaceri, institutii sau facilitati industriale.

Scopul produsului nu este sa afiseze date energetice complexe.

Scopul produsului este sa transforme datele energetice in recomandari clare si actionabile care reduc costurile si cresc eficienta energetica.

---

# Viziune

Orice persoana sau organizatie ar trebui sa poata intelege performanta energetica a unei proprietati fara cunostinte tehnice.

LaCurent devine stratul de inteligenta dintre datele energetice si deciziile utilizatorului.

In viitor, utilizatorul nu va mai trebui sa interpreteze consumul energetic. Va primi direct concluzii, prioritati si actiuni recomandate.

---

# Misiune

Sa facem eficienta energetica simpla, accesibila si masurabila.

---

# Principii de produs

## Simplitate inainte de complexitate

Utilizatorul trebuie sa inteleaga rezultatul inainte sa inteleaga metodologia.

Concluziile sunt mai importante decat calculele.

---

## Recomandari inainte de metrici

Nu afisam valori doar pentru ca exista.

Fiecare metrica trebuie sa raspunda unei intrebari reale.

Utilizatorul trebuie sa afle:

* Este bine sau rau?
* Comparativ cu cine?
* Ce trebuie sa fac?

---

## Actiuni inainte de analiza

Fiecare analiza trebuie sa produca cel putin o recomandare.

Nu construim rapoarte care doar descriu situatia.

Construim rapoarte care genereaza actiuni.

---

## Incredere inainte de automatizare

Orice scor, clasificare sau recomandare trebuie sa poata fi explicata.

Utilizatorul trebuie sa inteleaga de ce a primit un rezultat.

---

# Segmente de utilizatori

Segmentul nu este doar o etichetă de cont.

Segmentul schimbă experiența produsului:

* mesajul principal;
* formularul de analiză;
* metricile prioritare;
* recomandările;
* datele salvate la onboarding.

Pentru conturile non-rezidențiale, LaCurent trebuie să salveze și contextul organizației: tip, nume, adresă, oraș și locație principală.

## Locuinte

Proprietari de case si apartamente care vor sa reduca facturile si sa inteleaga eficienta energetica a locuintei.

Obiectiv principal:

Reducerea costurilor si imbunatatirea confortului.

---

## Afaceri

Companii care urmaresc costurile operationale si performanta energetica.

Obiectiv principal:

Reducerea costurilor si identificarea pierderilor.

---

## Institutii

Scoli, primarii, spitale si alte organizatii publice.

Obiectiv principal:

Monitorizare, raportare si justificarea consumului.

---

## Industrie

Facilitati cu consum energetic ridicat.

Obiectiv principal:

Optimizarea proceselor si reducerea pierderilor energetice.

---

# Reguli UX

Utilizatorul trebuie sa inteleaga valoarea produsului in mai putin de 10 secunde.

Orice ecran trebuie sa raspunda la una dintre intrebarile:

* Cat de eficient sunt?
* Unde pierd bani?
* Ce trebuie sa fac?

Daca un element nu ajuta la raspunsul acestor intrebari, trebuie reconsiderat.

---

# Reguli de comunicare

Evitam jargonul energetic atunci cand exista o alternativa simpla.

Preferam:

* cost lunar
* economie estimata
* recomandare
* comparatie
* prioritate

in locul:

* coeficienti
* indicatori tehnici
* formule
* terminologie specifica domeniului

---

# Obiectivul principal al produsului

Utilizatorul trebuie sa plece cu o concluzie clara si cu o lista de actiuni care ii pot imbunatati performanta energetica.

Nu construim un dashboard.

Construim un sistem de suport pentru decizii energetice.

---

# Reguli pentru locuinte multiple

Un proprietar poate administra mai multe locuinte.

Fiecare locuinta trebuie sa poata avea:

* nume propriu;
* scop de analiza;
* raport propriu;
* recomandari proprii;
* istoric de decizii implementate.

Daca utilizatorul nu mai administreaza o locuinta, aceasta nu se sterge fizic din baza de date. Se marcheaza ca inactiva, pentru pastrarea istoricului si a consistentei datelor.

---

# Scor live si decizii implementate

Scorul energetic LaCurent este un indice estimativ si comparativ.

El poate evolua pe baza:

* datelor introduse de utilizator;
* comparatiei cu locuinte similare;
* recomandarilor implementate;
* recalibrarii benchmark-ului pe masura ce apar mai multe locuinte.

Raportul trebuie sa explice clar ca scorul nu este o valoare fixa de certificat, ci un indice decizional live.

---

# Dispozitiv LaCurent

In viitor, LaCurent poate include un dispozitiv propriu pentru monitorizarea inteligenta a consumului.

Acesta trebuie prezentat ca optiune pentru recomandari mai precise bazate pe date reale, nu ca cerinta pentru folosirea produsului.

---

# Profil viu al locuintei

O locuinta nu este un formular completat o singura data.

Datele trebuie sa poata fi revizuite oricand:

* utilizatorul poate edita caracteristicile locuintei;
* fiecare editare creeaza o noua versiune de analiza;
* raportul foloseste ultima versiune relevanta;
* facturile lunare se pot adauga continuu;
* simularile trebuie sa permita scenarii fara salvarea modificarilor.

Acest model pastreaza istoricul si permite comparatii in timp intre situatia initiala, deciziile implementate si scenariile simulate.

---

# Model energetic rezidențial

Pentru segmentul Locuințe, LaCurent folosește un model energetic estimativ.

Acesta pornește de la întrebări simple și derivează intern un profil energetic mai bogat.

Flux:

UI simplu
→ UserEnergyInputs
→ EnergyProfile
→ DerivedEnergyModel
→ EnergyAssessment
→ Recommendations
→ Raport pentru utilizator

Evaluarea este orientată pe decizii:

* cât de eficientă pare locuința;
* unde sunt pierderile principale;
* ce recomandări merită prioritizate;
* ce nivel de încredere are estimarea.

LaCurent nu emite certificat energetic oficial și nu înlocuiește un auditor energetic.

---

# Locuințe multiple

Un proprietar poate avea mai multe locuințe în același cont.

Fiecare locuință trebuie să poată fi denumită și selectată.

După prima analiză pentru o locuință, utilizatorul nu este încurajat să refacă formularul pentru aceeași proprietate.

Fluxul devine:

1. Selectează locuința activă.
2. Vezi raportul.
3. Marchează deciziile implementate.
4. Scorul activ se actualizează pe baza deciziilor și a benchmark-ului.
5. Adaugă o locuință nouă doar dacă este o proprietate diferită.
