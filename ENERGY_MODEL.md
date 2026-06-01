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

Scorul din raport este un indice LaCurent live. Poate evolua cand utilizatorul implementeaza recomandari si cand grupurile de benchmark cresc.

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
