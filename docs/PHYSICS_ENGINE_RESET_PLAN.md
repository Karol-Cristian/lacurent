# Physics Engine Reset Plan

## Scop

Curatam motorul fizic LaCurent inainte sa continuam sinteza MC001.

Problema principala nu este lipsa unui test anume, ci faptul ca variabilele au crescut incremental:

* unele nume sunt orientate spre UI;
* unele nume sunt inspirate din MC001;
* unele nume sunt prescurtari ad-hoc;
* unele valori sunt demand, altele final energy, dar suna similar;
* unele constante sunt in registries, altele in calculatoare.

Noul principiu:

**Nicio formula stabila fara parametri definiti in baza de parametri.**

---

## Baza Noua

Sursele canonice sunt:

* `src/features/energy/physics/parameters/mc001-symbols.official.json`
* `src/features/energy/physics/parameters/mc001-indices.official.json`
* `src/features/energy/physics/parameters/physics-parameters.json`
* `src/features/energy/physics/parameters/physics-indices.json`
* `src/features/energy/physics/parameters/lacurent-mc001-parameter-links.json`
* `docs/PHYSICS_PARAMETER_DATABASE.md`

Acestea definesc:

* simbol MC001;
* nume intern recomandat;
* unitate;
* layer;
* status implementare;
* status sursa;
* explicatie;
* aliasuri vechi gasite in cod.

Regula de baza:

* simbolurile si indicii MC001 sunt vocabular oficial;
* parametrii LaCurent trebuie sa indice explicit spre simbolurile/indicii MC001 oficiali;
* valorile numerice pot ramane `internal_estimate` pana gasim/tabelam valorile normative;
* nu confundam niciodata “simbol oficial MC001” cu “valoare normativa oficiala”.

---

## Observatii Din Codul Actual

### 1. `H` este ambiguu

In MC001, `H` poate fi coeficient de transfer termic, dar `H` apare si ca index pentru incalzire.

Regula noua:

* pentru coeficient: `heatTransferCoefficient`;
* pentru incalzire: `heating`;
* evitam campuri persistente numite doar `h`, `H` sau `hTotal`.

### 2. Demand si final energy trebuie separate strict

Avem campuri precum:

* `heatingDemandKwhYear`;
* `finalEnergyKwhYear`;
* `primaryEnergyKwhYear`.

Regula noua:

* `Q_H_nd` = useful heating demand, inainte de sisteme;
* `E_H_fin` = energie finala incalzire, dupa sisteme;
* `E_P` = energie primara, dupa factori de energie primara.

Niciun raport sau calculator nu trebuie sa compare direct pierderi fizice cu energie finala fara explicatie.

### 3. Unitati neuniforme

In cod apar variante:

* `kWh/an`;
* `kWh/year`;
* `kWh/m2/an`;
* `kWh/m2/year`;
* `W/m2K`;
* `W/m2 K`.

Regula noua:

* unitatea canonica in engine ramane string, dar trebuie aleasa din catalog;
* pentru UI se poate traduce separat;
* calculatorul nu inventeaza unitati noi.

### 4. `lambdaWmK` vs `lambdaWPerMK`

Avem ambele forme.

Regula noua:

* nume canonic: `lambdaWPerMK`;
* `lambdaWmK` ramane alias legacy pana la migrare.

### 5. `UValue` vs `uValueWm2K` vs `uValueWPerM2K`

Regula noua:

* nume canonic in model fizic: `uValueWPerM2K`;
* in UI putem afisa `U`;
* in docs putem folosi simbolul MC001 `U`.

### 6. Constante in calculatoare

Exemple:

* `Rsi` / `Rse` fallback in `calculateTotalResistance`;
* `0.34` in ventilare;
* fallback ACM;
* fallback SEER;
* factori energie primara / CO2 interni.

Regula noua:

* constantele trebuie mutate in registries/config;
* calculatorul consuma parametri, nu detine metodologie ascunsa;
* orice fallback trebuie sa aiba `source` si `confidence`.

---

## Noua Structura Conceptuala

```text
Parameter Database
-> Formula Registry
-> Input Normalization
-> Physical Model
-> Layer Calculators
-> Result Objects
-> Report / Algorithms
```

### Parameter Database

Ce inseamna fiecare marime.

### Formula Registry

Ce formula foloseste ce parametri si ce produce.

### Input Normalization

Transforma inputuri de utilizator in parametri fizici.

### Physical Model

Cladire, zone, anvelopa, sisteme.

### Layer Calculators

Functii pure, fara constante ascunse.

### Result Objects

Output auditabil: value, unit, source, confidence, assumptions.

---

## Reguli Pentru Continuarea MC001

Cand adaugam un capitol MC001:

1. Adaugam simbolurile si indicii in baza de parametri.
2. Adaugam formulele in formula registry.
3. Marcam ce lipseste: date normative, date utilizator, layer engine.
4. Abia apoi implementam calculatorul.
5. Abia apoi conectam la raport.

---

## Ce Nu Facem Inca

Nu schimbam acum UI-ul.

Nu pretindem ca engine-ul acopera MC001 complet.

Nu mutam in D1 pana nu stabilizam modelul. Parametrii metodologici trebuie intai versionati in Git.

Nu stergem calculele existente pana cand nu avem mapare noua.

---

## Urmatorul Pas Recomandat

Dupa ce tu sintetizezi metodologia MC001 pe capitole, urmatorul pas tehnic ar trebui sa fie:

1. `formula-registry.json`;
2. mapare `formula -> inputParameterIds -> outputParameterIds`;
3. refactor gradual al calculatoarelor existente ca sa raporteze parameter IDs;
4. raport tehnic generat automat din parameter database + formula registry.
