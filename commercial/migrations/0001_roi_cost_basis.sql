-- Commercial planning CAPEX used only for ROI ranking.
-- It does not change the scientific/energy calculation model.
CREATE TABLE IF NOT EXISTS roi_cost_basis (
  family TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  cost_lei REAL NOT NULL CHECK(cost_lei > 0),
  unit TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_url TEXT,
  observed_on TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  confidence TEXT NOT NULL,
  note TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS roi_cost_basis_active_idx ON roi_cost_basis(active, family);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('wall','Fațadă termoizolată',16,'lei_per_m2_per_cm','retail_reference_plus_installation_allowance','https://www.dedeman.ro/ro/polistiren-expandat-pentru-fatada-baudeman-eps-80-grafitat-10-cm/p/6017029','2026-09-22','ro-market-planning-2026-09-22','medium','Material de piață plus alocație pentru sistem și montaj; bază de planificare, nu ofertă.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('roof','Izolație pod / acoperiș',8,'lei_per_m2_per_cm','retail_reference_plus_installation_allowance','https://www.dedeman.ro/ro/vata-minerala-bazaltica-rockwool-acoustic-casa-100-1200-x-600-x-100-mm/p/6065841','2026-09-22','ro-market-planning-2026-09-22','medium','Reper material plus montaj simplificat; bază de planificare.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('floor','Izolație pardoseală',11,'lei_per_m2_per_cm','market_planning_allowance','https://www.dedeman.ro/ro/polistiren-extrudat/c/157','2026-09-22','ro-market-planning-2026-09-22','medium','Reper XPS plus montaj; stratificația reală poate schimba costul.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('windows','Ferestre tripan Low-E',1000,'lei_per_m2','retail_reference_plus_installation_allowance','https://www.dedeman.ro/ro/fereastra-pvc-tripan-gealan-6-camere-alb-116-x-114-cm-fixa-dubla-deschidere-dreapta/p/6046484','2026-09-22','ro-market-planning-2026-09-22','medium','Reper PVC tripan plus rezervă de montaj.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('door','Ușă exterioară termoizolată',2300,'lei_total','retail_reference_plus_installation_allowance','https://www.dedeman.ro/ro/usa-metalica-pentru-exterior-tracia-atlas-dreapta-maro-sidefat-88-x-205-cm-accesorii/p/6030107','2026-09-22','ro-market-planning-2026-09-22','medium','Reper ușă izolată standard plus rezervă de montaj.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('ventilation','Ventilație cu recuperare',8000,'lei_total','equipment_reference_plus_system_allowance','https://unitate-de-recuperare-caldura.compari.ro/reventon/recuperator-de-caldura-reventon-inspiro-basic-300-m-h-inspiro-basic300-2023-p1182105250/','2026-09-22','ro-market-planning-2026-09-22','low','Unitate HRV plus tubulatură, accesorii și montaj orientativ.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('heating_control','Control cu compensare climatică',1200,'lei_total','market_planning_allowance','https://www.vaillant.com.ro/','2026-09-22','ro-market-planning-2026-09-22','low','Alocație de planificare pentru regulator, senzor și montaj.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('heating','Pompă de căldură aer-apă',30000,'lei_total','equipment_reference_plus_installation_allowance','https://www.termix.ro/cumpara/pompa-de-caldura-daikin-altherma-3-m-8kw-monobloc-r32-termix-33866','2026-09-22','ro-market-planning-2026-09-22','medium','Reper echipament aer-apă plus montaj și accesorii uzuale.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('pv','Sistem fotovoltaic',4000,'lei_per_kwp','installed_market_reference','https://www.greenlead.ro/blog/sistem-fotovoltaic-5kw-pret-complet-productie-amortizare-2026','2026-09-22','ro-market-planning-2026-09-22','medium','Reper la cheie fără stocare, normalizat pe kWp.',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO roi_cost_basis
(family,label,cost_lei,unit,source_kind,source_url,observed_on,catalog_version,confidence,note,active,updated_at)
VALUES ('solar_thermal','Solar termic ACM',2650,'lei_per_m2','retail_system_reference','https://www.dedeman.ro/ro/kit-panou-solar-presurizat-apa-calda-ecotube-2-x-20-boiler-ecounit-f-300-2c-grup-pompare-pumpfix-dn20-vas-expansiune-vfn-pro-50/p/2028157-2022880-2010030-2037502-2007022-2037373-2029327','2026-09-22','ro-market-planning-2026-09-22','medium','Cost echivalent normalizat pe suprafața de colector dintr-un kit rezidențial complet.',1,CURRENT_TIMESTAMP);

