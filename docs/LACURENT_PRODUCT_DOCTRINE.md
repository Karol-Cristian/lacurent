# LACURENT Product Doctrine

Status: active product direction
Owner: Lemnaru Karol
Date: 2026-09-30

## 1. Product definition

LACURENT is a home-energy decision platform.

Its primary job is to help a homeowner answer:

1. Where is my home now?
2. What is worth changing?
3. What will it cost?
4. What will I save and how long will recovery take?
5. What is the next concrete step?

Primary promise:

> Spune-ne cum este casa ta. Îți calculăm ce merită să schimbi, cât te costă, cât economisești și în cât timp îți recuperezi investiția.

Brand principle:

> Nu promitem. Calculăm.

## 2. Product hierarchy

### LACURENT
The platform and brand.

### Home Lab
The homeowner product. It turns a house description into a saved energy plan.

Core journey:

`Casa mea → situația actuală → opțiuni → decizie → plan → implementare`

### RBPE
The building-physics engine. It is infrastructure and methodological evidence, not the primary user experience.

### TEO
The techno-economic optimizer. It compares interventions and constraints. It is infrastructure and explainability, not the primary user experience.

### Product catalog
An implementation layer. It maps a technical solution to commercial products only after the technical decision exists.

### Professional verification
A continuation layer for cases that require regulated documents, design, authorization or professional review. Home Lab does not impersonate those regulated outputs.

### Home Lab Impact
An aggregate evidence layer derived from saved modelled homes. It reports modelled potential, never measured impact unless measurement evidence exists.

### Program layer
A future B2B distribution and aggregate reporting layer for organizations such as banks, retailers, municipalities, energy companies or public programs. It must not fork the homeowner product.

## 3. Primary user

The primary user is a person making an energy investment decision for a home.

Secondary users may include professionals, distributors and program sponsors, but their needs must not distort the primary homeowner journey.

## 4. North-star metric

**Homes with a saved optimized energy plan.**

Supporting metrics:
- users who finish a baseline;
- users who finish TEO;
- saved plans;
- modelled annual energy-saving potential;
- modelled annual monetary-saving potential;
- estimated CAPEX represented by saved plans;
- progression from plan to professional review / implementation.

Page views, simulation count and catalog size are supporting metrics, not the product goal.

## 5. Product rule

A feature belongs in the primary Home Lab flow only if it helps the user:

- describe the home;
- understand the current state;
- compare investment options;
- make a decision;
- save or continue the plan toward implementation.

Everything else belongs in methodology, account, admin, catalog, impact, professional or B2B layers.

## 6. Language rule

User-facing language leads with the decision, not the engine.

Prefer:
- „Analizează casa”
- „Ce merită să schimbi”
- „Planul energetic al casei”
- „Investiție / economie / recuperare”
- „Metodă și surse”

Avoid as primary product language:
- „optimization pipeline”
- „engine”
- „parametric search”
- „D1”
- „worker flow”
- „experiment”

RBPE and TEO remain visible where they build trust, explain methodology, or support professional review.

## 7. Trust boundary

Home Lab produces technical decision support.

It must clearly distinguish:
- modelled results from measured outcomes;
- decision-support reports from regulated documents;
- technical recommendations from professional approval;
- reference prices from live commercial offers;
- product mapping from legal compliance.

## 8. B2B rule

Organizations distribute or sponsor the same core product.

Default architecture:

`Program → Home Lab → saved plan → aggregate impact`

Do not create a separate product identity or separate physics/optimization logic for each partner.

## 9. Design principle

The interface should answer one question per screen.

The user should see outcomes before methodology.

Technical depth remains available progressively through:
- advanced values;
- source/reference dialogs;
- methodology sections;
- report details.

Professional appearance means fewer competing concepts, not more decoration.
