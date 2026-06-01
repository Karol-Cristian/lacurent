# SEGMENTS.md

# Principiu fundamental

LaCurent este o singură platformă, dar experiența nu este aceeași pentru toți utilizatorii.

Segmentul contului controlează:

* mesajul principal din dashboard;
* eticheta din navigație pentru analiză;
* tipul de formular afișat;
* câmpurile cerute la onboarding;
* tipul de recomandări și metrici prioritare.

Nu construim o interfață universală pentru toți utilizatorii.

---

# Segmente principale

1. Locuințe
2. Afaceri
3. Industrie
4. Instituții
5. Auditori energetici

---

# Regula de segmentare în produs

Utilizatorul își alege segmentul când creează contul.

După autentificare, site-ul trebuie să se adapteze segmentului:

* `residential` vede experiență orientată pe locuință;
* `business` vede experiență orientată pe costuri operaționale;
* `industry` vede experiență orientată pe procese și pierderi energetice;
* `institution` vede experiență orientată pe clădiri, buget și raportare;
* `auditor` vede portal dedicat, nu formularul standard de analiză.

Segmentul este salvat în `users.role`.

Pentru segmente non-rezidențiale se creează și o organizație:

* `organizations`
* `sites`

---

# Locuințe

## Cine sunt

Proprietari de case și apartamente.

În general nu au pregătire tehnică în domeniul energetic.

## Ce îi interesează

* factura lunară;
* costurile de încălzire;
* confortul;
* economiile posibile.

## Întrebările principale

* Plătesc prea mult?
* Casa mea este eficientă?
* Ce pot îmbunătăți?
* Care investiție merită făcută?

## KPI relevanți

* scor energetic;
* cost anual estimat;
* potențial de economisire;
* comparație cu locuințe similare.

## CTA principal

Analizează locuința.

---

# Afaceri

## Cine sunt

IMM-uri și companii comerciale: birouri, magazine, hoteluri, restaurante, depozite.

## Ce îi interesează

* reducerea costurilor operaționale;
* monitorizarea consumului;
* identificarea anomaliilor;
* rentabilitatea investițiilor.

## Întrebările principale

* Unde pierdem bani?
* Ce consum este neobișnuit?
* Care este impactul financiar?
* Ce investiții au cel mai bun ROI?

## Onboarding necesar

* tip afacere;
* nume organizație;
* adresă;
* oraș;
* date de contact;
* program de lucru;
* suprafață;
* consumatori principali;
* număr locații.

## CTA principal

Analizează afacerea.

---

# Industrie

## Cine sunt

Fabrici și facilități industriale cu consum energetic ridicat.

## Ce îi interesează

* eficiența proceselor;
* pierderile energetice;
* utilizarea echipamentelor;
* performanța operațională.

## Onboarding necesar

* tip facilitate;
* nume organizație;
* adresă;
* oraș;
* linii de producție;
* program operațional;
* consumatori majori;
* sarcină de vârf;
* planuri de eficientizare.

## CTA principal

Analizează facilitatea.

---

# Instituții

## Cine sunt

Primării, școli, universități, spitale și instituții publice.

## Ce îi interesează

* monitorizare;
* raportare;
* transparență;
* justificarea consumului;
* prioritizarea investițiilor.

## Onboarding necesar

* tip instituție;
* nume organizație;
* adresă;
* oraș;
* număr clădiri;
* buget anual energie;
* sisteme de încălzire;
* planuri de renovare.

## CTA principal

Analizează instituția.

---

# Auditori energetici

Auditorii nu folosesc formularul standard de analiză.

Ei trebuie trimiși către un portal dedicat pentru:

* clienți;
* rapoarte;
* recomandări;
* note;
* validări.

---

# Prioritatea actuală

Segmentul principal al produsului rămâne:

LOCUINȚE

Dar platforma trebuie să adapteze experiența după autentificare pentru conturile `business`, `industry`, `institution` și `auditor`.

---

# Reguli pentru AI și dezvoltare

Înainte de a propune sau implementa o funcționalitate nouă, identifică segmentul țintă.

O funcționalitate optimă pentru industrie poate fi inutilă pentru locuințe.

O funcționalitate optimă pentru locuințe poate fi insuficientă pentru industrie.

Experiența trebuie adaptată segmentului, nu doar textul de suprafață.

---

# Implementare curentă

Frontend:

* `js/segment-context.js` aplică textele și navigația în funcție de `users.role`.
* `pages/profil.html` colectează date suplimentare pentru segmente non-rezidențiale.
* `pages/analiza-casa.html` afișează pași diferiți pentru locuințe, afaceri, industrie și instituții.

Backend:

* `users.role` definește segmentul.
* `organizations` și `sites` sunt create la înregistrarea conturilor non-rezidențiale.
* `analyses.analysis_type` diferențiază tipul analizei.
