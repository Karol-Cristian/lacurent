# LA CURENT Platform Architecture

## Product focus

LA CURENT is an energy copilot for homes and organizations. The primary product loop is:

1. Create account
2. Complete analysis
3. Unlock score, benchmark and recommendations
4. Improve energy cost and efficiency over time

## User roles

- `residential`: homeowner or apartment owner
- `business`: office, retail, hotel, restaurant, warehouse
- `institution`: municipality, school, hospital, university, public building
- `auditor`: energy auditor with client/report workspace
- `admin`: future internal operator role

## Dashboard access logic

The dashboard must not expose Energy Score by default.

Energy Score is visible only when:

- user is authenticated
- user has at least one completed analysis
- a score exists for the latest completed analysis

Otherwise the dashboard shows:

`Completează analiza pentru a debloca scorul energetic, benchmark-ul și recomandările personalizate.`

## Analysis model

The legacy `houses` and profile tables remain for compatibility.

The scalable model is:

- `organizations`: business/institution account container
- `sites`: physical locations
- `buildings`: individual buildings or units
- `analyses`: analysis event
- `analysis_answers`: flexible answer storage
- `scores`: modular scores and estimated energy class
- `benchmark_results`: comparison output for an analysis
- `reports`: generated downloadable report records

## Scoring engine

Scores are modular and can be recalculated as formulas improve.

Stored fields:

- `overall_score`
- `building_efficiency`
- `consumption_efficiency`
- `behavior`
- `equipment`
- `green_energy`
- `smart_optimization`
- `estimated_energy_class`
- `disclaimer`

Energy class disclaimer:

`Estimare energetică generată automat. Nu reprezintă certificat energetic oficial.`

## Benchmark engine

Benchmarking should compare users only to similar users/buildings.

Dimensions:

- user_type
- building_type
- area
- occupants
- climate_region
- heating_type
- construction_period

Output:

- percentile
- cluster_average
- score_comparison

Benchmark results are stored per analysis so future recalculation can create newer result rows.

## Report engine plan

Reports are represented by `reports` with `status = planned`.

Future PDF sections:

- Building Summary
- Energy Score
- Energy Class
- Benchmark
- Savings Potential
- Recommendations
- Solar Potential
- EV Readiness
- Improvement Roadmap

Implementation path:

1. Create `/api/reports/create` to enqueue report generation.
2. Render HTML report template from `analyses`, `scores`, `benchmark_results`, and `recommendations`.
3. Generate PDF with a Worker-compatible rendering service or external PDF API.
4. Store file in Cloudflare R2.
5. Save `reports.file_url`.
6. Expose download button in Dashboard and Recomandări.

## Auditor marketplace plan

Auditor connection is prepared through:

- `auditors`
- `auditor_clients`

Future matching dimensions:

- certification
- location
- specialties
- availability
- contact_email

Trigger:

After a low score or high savings potential, display:

`Discută cu un auditor energetic.`

Initial flow:

1. User requests auditor contact.
2. System creates `auditor_clients` lead.
3. Auditor sees lead in Auditor Portal.
4. Auditor validates recommendations and report notes.
