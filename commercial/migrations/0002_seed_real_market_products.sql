-- Seed catalog snapshot for widget-side commercial matching only.
-- Scientific requirements are calculated in Python and do not depend on these rows.

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('baudeman-eps80-graphite-100','facade_insulation','Baudeman','EPS 80 Grafitat 100 mm','{"material":"graphite_eps","lambda_w_mk":0.032,"thickness_mm":100,"package_area_m2":2.5}','["https://www.dedeman.ro/ro/polistiren-expandat-pentru-fatada-baudeman-eps-80-grafitat-10-cm/p/6017029"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('baudeman-eps80-graphite-100-1-2026-09-22','baudeman-eps80-graphite-100','Dedeman',43.9,'RON',1,'unknown','https://www.dedeman.ro/ro/polistiren-expandat-pentru-fatada-baudeman-eps-80-grafitat-10-cm/p/6017029','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('knauf-expert-cfb035-100','facade_insulation','Knauf Insulation','Expert CFB 035 100 mm','{"material":"mineral_wool","lambda_w_mk":0.035,"thickness_mm":100,"package_area_m2":1.8}','["https://www.dedeman.ro/ro/vata-minerala-bazaltica-pentru-fatada-knauf-expert-cfb-035-1000-x-600-x-100-mm/p/6031193"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('knauf-expert-cfb035-100-1-2026-09-22','knauf-expert-cfb035-100','Dedeman',135.01,'RON',1,'unknown','https://www.dedeman.ro/ro/vata-minerala-bazaltica-pentru-fatada-knauf-expert-cfb-035-1000-x-600-x-100-mm/p/6031193','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('knauf-expert-cfb035-150','facade_insulation','Knauf Insulation','Expert CFB 035 150 mm','{"material":"mineral_wool","lambda_w_mk":0.035,"thickness_mm":150,"package_area_m2":1.2}','["https://www.dedeman.ro/ro/vata-minerala-bazaltica-pentru-fatada-knauf-expert-cfb-035-1000-x-600-x-150-mm/p/6031194"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('knauf-expert-cfb035-150-1-2026-09-22','knauf-expert-cfb035-150','Dedeman',135.01,'RON',1,'out_of_stock','https://www.dedeman.ro/ro/vata-minerala-bazaltica-pentru-fatada-knauf-expert-cfb-035-1000-x-600-x-150-mm/p/6031194','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('rockwool-acoustic-casa-100','roof_insulation','Rockwool','Acoustic Casa 100 mm','{"material":"mineral_wool","lambda_w_mk":0.035,"thickness_mm":100,"package_area_m2":3.6}','["https://www.dedeman.ro/ro/vata-minerala-bazaltica-rockwool-acoustic-casa-100-1200-x-600-x-100-mm/p/6065841"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('rockwool-acoustic-casa-100-1-2026-09-22','rockwool-acoustic-casa-100','Dedeman',174.47,'RON',1,'unknown','https://www.dedeman.ro/ro/vata-minerala-bazaltica-rockwool-acoustic-casa-100-1200-x-600-x-100-mm/p/6065841','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('fibrostir-xps-gbt-100','floor_insulation','Fibrotermica','Fibrostir XPS G/BT 100 mm','{"material":"xps","lambda_w_mk":0.035,"thickness_mm":100,"package_area_m2":3}','["https://www.dedeman.ro/ro/polistiren-extrudat-xps-fibrostir-g/bt-interior/-exterior-cant-falt-10-x-60-x-125-cm/p/6051523"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('daikin-altherma3m-edla06ev3','heat_pump_air_water','Daikin','Altherma 3 M EDLA06EV3 6 kW','{"thermal_capacity_kw":6,"system_type":"monobloc","phase":"single"}','["https://www.artbuilding.ro/pompe-de-caldura-daikin-6-kw"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('daikin-altherma3m-edla06ev3-1-2026-09-22','daikin-altherma3m-edla06ev3','Art Building',20463,'RON',1,'unknown','https://www.artbuilding.ro/pompe-de-caldura-daikin-6-kw','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('daikin-altherma3m-edla08e3v3','heat_pump_air_water','Daikin','Altherma 3 M EDLA08E3V3 8 kW','{"thermal_capacity_kw":8,"system_type":"monobloc","phase":"single"}','["https://www.climatico.ro/pompa-de-caldura-monobloc-pentru-incalzire-daikin-altherma-3-m-edla08ev3-8kw.html"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('daikin-altherma3m-edla08e3v3-1-2026-09-22','daikin-altherma3m-edla08e3v3','Termix',23119.59,'RON',1,'limited','https://www.termix.ro/cumpara/pompa-de-caldura-daikin-altherma-3-m-8kw-monobloc-r32-termix-33866','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('vaillant-arotherm-vwl105-5as','heat_pump_air_water','Vaillant','aroTHERM VWL 105/5 AS 10 kW','{"thermal_capacity_kw":10,"system_type":"split","phase":"three"}','["https://valtherm.ro/pompa-de-caldura-unitate-exterioara-vaillant-arotherm-vwl-105-5-as-380v-10-kw-p642"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('vaillant-arotherm-vwl105-5as-1-2026-09-22','vaillant-arotherm-vwl105-5as','Valtherm',24470,'RON',1,'in_stock','https://valtherm.ro/pompa-de-caldura-unitate-exterioara-vaillant-arotherm-vwl-105-5-as-380v-10-kw-p642','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('termet-eco-compact-combi-25-30','condensing_gas_boiler','Termet','Eco Compact Combi 25/30','{"thermal_capacity_kw":24,"fuel":"natural_gas","system_type":"condensing"}','["https://www.dedeman.ro/ro/centrala-termica-pe-gaz-in-condensare-termet-eco-compact-combi-25/30-murala-afisaj-digital-ipx4-fara-kit-evacuare/p/2036449"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('termet-eco-compact-combi-25-30-1-2026-09-22','termet-eco-compact-combi-25-30','Dedeman',2819.41,'RON',1,'unknown','https://www.dedeman.ro/ro/centrala-termica-pe-gaz-in-condensare-termet-eco-compact-combi-25/30-murala-afisaj-digital-ipx4-fara-kit-evacuare/p/2036449','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('henco-pexal-16x2','hydronic_pipe','Henco','PEX-Al 16 x 2 mm','{"material":"pexal","outer_diameter_mm":16,"wall_thickness_mm":2,"inner_diameter_mm":12,"roll_length_m":200}','["https://www.dedeman.ro/ro/teava-pex-al-henco-16-x-2-0-2-mm/p/2002714"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('henco-pexal-16x2-1-2026-09-22','henco-pexal-16x2','Dedeman',7.07,'RON',1,'unknown','https://www.dedeman.ro/ro/teava-pex-al-henco-16-x-2-0-2-mm/p/2002714','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('henco-pexal-20x2','hydronic_pipe','Henco','PEX-Al 20 x 2 mm','{"material":"pexal","outer_diameter_mm":20,"wall_thickness_mm":2,"inner_diameter_mm":16,"roll_length_m":100}','["https://www.dedeman.ro/ro/teava-pex-al-henco-20-x-2-mm/p/2002718"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('henco-pexal-20x2-1-2026-09-22','henco-pexal-20x2','Dedeman',19.18,'RON',1,'unknown','https://www.dedeman.ro/ro/teava-pex-al-henco-20-x-2-mm/p/2002718','2026-09-22');

INSERT OR REPLACE INTO product_catalog_items
(product_id, category, manufacturer, model, technical_json, technical_source_urls_json, catalog_version, active, updated_at)
VALUES ('henco-pexal-26x3','hydronic_pipe','Henco','PEX-Al 26 x 3 mm','{"material":"pexal","outer_diameter_mm":26,"wall_thickness_mm":3,"inner_diameter_mm":20,"roll_length_m":50}','["https://www.dedeman.ro/ro/teava-pex-al-henco-26-x-3-mm/p/2002793"]','ro-market-seed-2026-09-22',1,CURRENT_TIMESTAMP);
INSERT OR REPLACE INTO product_catalog_offers
(offer_id, product_id, supplier_name, price_lei, currency, vat_included, stock_status, product_url, observed_on)
VALUES ('henco-pexal-26x3-1-2026-09-22','henco-pexal-26x3','Dedeman',31.59,'RON',1,'unknown','https://www.dedeman.ro/ro/teava-pex-al-henco-26-x-3-mm/p/2002793','2026-09-22');
