# MARKETPLACE.md

## Status

Acest document descrie o directie viitoare, nu prioritatea short-term.

LaCurent nu este in prezent pozitionat ca marketplace sau platforma de lead generation.

Marketplace-ul poate fi construit doar dupa ce:

* Physics Engine este suficient de matur;
* raportul energetic este credibil;
* recomandarile tehnice sunt generate independent;
* utilizatorul intelege ca analiza nu este influentata comercial.

Regula:

Analysis -> Technical recommendation -> User decision -> Optional marketplace / offers / partners.

---

## Scop

LaCurent poate deveni o punte intre proprietari si firme care pot implementa recomandarile: instalatori, auditori, firme de izolatii, ferestre, HVAC, fotovoltaice si automatizari.

Principiul important:

Proprietarul vede decizii si bani.

Furnizorul vede profiluri anonime si oportunitati reale, suficient de specifice incat sa poata decide daca merita sa isi arate disponibilitatea.

Valoarea principala pentru furnizor nu este recalcularea ROI-ului LaCurent.

Valoarea principala este accesul la lead-uri calificate: proprietari care au o nevoie concreta si care pot cere contactul cand decid sa faca investitia.

---

## Date anonime expuse furnizorilor

Furnizorii nu trebuie sa vada identitatea proprietarului implicit.

Pot vedea:

* tip locuinta;
* zona aproximativa;
* suprafata;
* an constructie / perioada;
* clasa estimata LaCurent;
* recomandari relevante;
* interval estimat de economie;
* detalii tehnice necesare pentru disponibilitate sau preoferta.

Nu vad:

* nume proprietar;
* email;
* adresa exacta;
* telefon;
* date brute sensibile.

---

## Flux propus

1. Firma isi creeaza cont de furnizor.
2. Firma isi completeaza profilul: servicii, zona, certificari.
3. Firma vede oportunitati anonime compatibile.
4. Firma isi arata disponibilitatea sau trimite o preoferta pe o recomandare.
5. Proprietarul vede in raport ca exista furnizori interesati pentru acea masura.
6. Contactul se deschide doar cand proprietarul cere explicit sa fie contactat.
7. Daca exista pret ferm, LaCurent poate recalcula recuperarea investitiei pe baza ofertei reale.

---

## Impact asupra algoritmilor

Estimarea initiala foloseste `internal_estimate`.

Dupa oferta reala:

```ts
paybackYears = offer_amount_ron / estimated_savings_ron_year
```

Oferta reala trebuie sa aiba prioritate peste costul intern estimat doar dupa ce proprietarul este interesat de masura.

Datele agregate din oferte pot calibra in timp:

* cost mediu izolatie/m2;
* cost mediu ferestre/m2;
* cost pompe de caldura;
* cost sisteme de control;
* cost fotovoltaice/kWp;
* intervale regionale de pret.

---

## Reguli UX

Nu transformam raportul intr-un marketplace agresiv.

Ofertele apar doar acolo unde exista recomandari clare.

Textul trebuie sa fie:

* "3 furnizori sunt disponibili pentru aceasta masura."
* "Preoferta de la 8.400 lei."
* "Cere contactul cand esti pregatit sa faci investitia."
* "Recuperare recalculata: 42 luni."

Nu:

* reclame;
* bannere;
* presiune comerciala;
* promisiuni de economie garantata.
