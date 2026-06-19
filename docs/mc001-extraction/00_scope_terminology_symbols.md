# 00 Scope, Terminology, Symbols

Extraction status: `extracted` with some `needs_verification` references.

Source document:

- MC001-2022 - Metodologie de calcul al performantei energetice a cladirilor
- Local PDF: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Uploaded source identifier: `63d8dccfe6ae8244797864 (1).pdf`

MC001 references:

- Chapter 1 - scope, definitions, terminology, symbols and indices.
- Section 1.1.7 - symbols and indices, including Tables 1.1 and 1.2.
- Exact page references for individual definitions should be checked during final extraction review.

Implementation relevance:

This module defines the vocabulary boundary for LaCurent Physics Engine. It does not implement formulas. It clarifies which concepts are inputs, intermediate values, outputs, comparison concepts, or classification concepts.

LaCurent uses these terms to build an estimative MC001-like physics model. This extraction is not for issuing official energy performance certificates.

## Terms Needed By The Physics Engine

| Term | Concise Romanian definition | Why it matters for LaCurent Physics Engine | Role |
| --- | --- | --- | --- |
| cladire | Obiectul fizic analizat energetic: spatii, anvelopa, instalatii, utilizare si amplasament. | Este entitatea de baza pentru geometrie, clima, anvelopa, sisteme si indicatori energetici. | input concept |
| anvelopa termica | Limita termica dintre spatiile climatizate/interioare si exterior, sol, spatii neincalzite sau alte medii termice. | Stabileste ce elemente intra in calculul pierderilor prin transmisie. Fara anvelopa nu se poate calcula Htr. | input concept |
| arie de referinta a pardoselii | Aria utila/de referinta a spatiilor incalzite sau racite incluse in anvelopa termica. | Normalizeaza indicatorii specifici, de exemplu kWh/m2.an. Nu este suficienta singura pentru pierderi prin anvelopa. | input / normalization value |
| volum interior de referinta | Volumul interior al spatiilor climatizate, delimitat de suprafetele interioare ale anvelopei termice. | Este necesar pentru ventilare, infiltratii si indicatori de compactitate. | input / intermediate value |
| zona termica | Parte a cladirii tratata cu conditii termice comune sau comparabile in calcul. | Permite model one-zone la inceput si multi-zone ulterior, fara schimbarea conceptuala a motorului. | input concept |
| zona deservita de sistem tehnic | Zona sau aria acoperita de un sistem tehnic: incalzire, racire, ventilare, ACM sau iluminat. | Impiedica aplicarea gresita a unui sistem pe intreaga cladire daca el deserveste doar o parte. | input concept |
| energie finala | Energia livrata/consumata de sistemele tehnice dupa transformarea necesarului util prin randamente si pierderi de sistem. | Separa necesarul fizic al cladirii de energia consumata de instalatii. | output / intermediate value |
| energie primara | Energia obtinuta prin aplicarea factorilor de energie primara asupra energiei finale pe purtatori. | Este indicatorul folosit pentru clasificare energetica estimativa si comparatii MC001-like. | output / classification input |
| energie din surse regenerabile | Partea de energie atribuita surselor regenerabile, conform purtatorilor, factorilor si contributiilor sistemelor. | Va fi necesara pentru raportarea ponderii regenerabile si pentru comparatii cu cladirea de referinta. | output concept |
| necesar de energie pentru incalzire/racire | Energia utila ceruta de spatiu pentru mentinerea confortului termic, inainte de randamentele instalatiilor. | Este rezultatul central al stratului fizic al cladirii si nu trebuie confundat cu energia finala. | intermediate value |
| necesar de energie pentru apa calda de consum | Energia utila necesara prepararii apei calde de consum, inainte de pierderi de stocare, distributie sau generare. | Trebuie calculat separat de incalzire deoarece poate avea alt sistem si alt purtator energetic. | intermediate value |
| indicator PEC | Indicator de performanta energetica a cladirii, exprimat de regula specific anual. | Leaga calculele detaliate de indicatori de tip certificat/raport. | classification concept |
| cladire de referinta | Model comparativ cu aceeasi geometrie, clima si utilizare ca locuinta reala, dar cu performante standardizate. | Este baza pentru comparatie MC001-like. Nu copiaza U-urile reale sau sistemele reale. | comparison concept |
| performanta energetica calculata | Rezultatul numeric obtinut din modelul cladirii, anvelopa, clima, sisteme si purtatori energetici. | Defineste outputul LaCurent: valori trasabile, cu sursa, ipoteze, warning-uri si incredere. | output concept |
| certificat de performanta energetica | Document oficial emis conform cadrului legal de specialisti autorizati. | LaCurent nu trebuie sa pretinda ca emite certificat; poate oferi doar evaluare estimativa inspirata conceptual din structura certificatului. | not_for_implementation / legal boundary |

## Symbols And Indices Needed Early

The extraction uses the existing MC001 notation seed already present in the repository:

- `src/features/energy/physics/parameters/mc001-symbols.official.json`
- `src/features/energy/physics/parameters/mc001-indices.official.json`
- `src/features/energy/physics/parameters/mc001-notation.official.json`

Early implementation symbols:

| Symbol | Meaning | Unit | Notes |
| --- | --- | --- | --- |
| `A` | arie | m2 | Used for floor area and envelope element areas. |
| `Vu` | volum util/interior de referinta | m3 | Needed for ventilation and compactness calculations. |
| `A/V` | raport arie-volum | 1/m | Requires explicit envelope area and reference volume. |
| `Aj` | aria elementului/spatiului `j` | m2 | Used in area sums. |
| `Vj` | volumul spatiului/zonei `j` | m3 | Used in volume sums. |
| `zt` | zona termica | - | Used for zone-based calculations. |
| `env` | anvelopa | - | Used for envelope-related quantities. |
| `EP` | indicator de performanta energetica | kWh/(m2.an) | Used for certificate-like indicators and classes. |

## Implementation Boundaries

- LaCurent can model calculated energy performance, not official certification.
- Calculators should use descriptive internal names, but formula docs and technical output should map to MC001 symbols.
- Scope terms are allowed in data models only if they support calculation or validation.
- If a term is only legal/certificate context, it should remain documentation-only.

