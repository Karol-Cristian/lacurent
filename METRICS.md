# METRICS.md

# Scop

Acest document definește metricile principale LaCurent, formulele orientative și regulile de afișare în UI.

Metricile sunt estimative și orientate pe decizii.

---

# Principii

1. Fiecare metrică trebuie să răspundă la una dintre întrebări:
   * Cât de eficient sunt?
   * Unde pierd bani?
   * Ce trebuie să fac?
2. Fiecare metrică afișată trebuie să aibă context.
3. Evităm afișarea metricilor fără explicație sau recomandare.
4. Detaliile tehnice sunt ascunse implicit.

---

# Metrici principale pentru Locuințe

## 1. Energy Score

Scor estimativ între 0 și 100.

Formula curentă pornește de la 100 și aplică penalizări/bonusuri pentru:

* pereți;
* pod/acoperiș;
* podea;
* ferestre;
* sistem încălzire;
* control temperatură;
* iluminat;
* regenerabile;
* consum real comparat cu modelul.

Clase interne:

* 90-100: A+
* 80-89: A
* 70-79: B
* 60-69: C
* 50-59: D
* 40-49: E
* 30-39: F
* sub 30: G

Această clasificare este internă LaCurent, nu clasificare oficială.

---

## 2. Cost anual estimat

Costul anual estimat folosește:

* costuri reale introduse de utilizator, dacă există;
* altfel, consumul estimat și tarife implicite.

Regulă UX:

În raport se afișează simplu:

`Cost anual estimat: 4.800 lei`

---

## 3. Potențial de economisire

Calculat din primele recomandări prioritare.

Se afișează ca interval:

`900 - 2.300 lei/an`

---

## 4. Consum estimat pe metru pătrat

Metrică tehnică:

`kWh/m²/an`

Se afișează doar în detalii tehnice.

---

## 5. Încredere evaluare

Nivel:

* scăzut;
* mediu;
* ridicat.

Crește dacă utilizatorul completează:

* suprafață;
* an construcție;
* material pereți;
* izolație;
* ferestre;
* sistem încălzire;
* costuri reale;
* cantități reale.

Scade dacă lipsesc multe date sau utilizatorul a ales „Nu știu”.

---

# Disclaimer obligatoriu

„Această evaluare este estimativă și are rol informativ. Nu înlocuiește un certificat de performanță energetică emis de un auditor energetic atestat.”
