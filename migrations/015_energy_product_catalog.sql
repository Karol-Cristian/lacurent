-- LACURENT Energy Product Catalog V2
-- Generic, evidence-backed catalog shared by envelope, ventilation, emitters,
-- distribution, renewables and future commercial product families.
-- Existing heating_products remains canonical for the current heating runtime
-- until an explicit migration/adaptor is reviewed.

CREATE TABLE IF NOT EXISTS energy_product_categories (
    category_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    parent_category_id TEXT,
    teo_family TEXT,
    teo_role TEXT NOT NULL CHECK(teo_role IN (
        'planning_curve',
        'finalist_match',
        'bill_of_materials',
        'informational'
    )),
    comparison_scope TEXT NOT NULL,
    primary_value_metric_key TEXT,
    primary_value_metric_unit TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS energy_products (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    category_id TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    model TEXT,
    label TEXT NOT NULL,
    manufacturer_sku TEXT,
    gtin TEXT,
    intended_use TEXT,
    description TEXT NOT NULL DEFAULT '',
    source_kind TEXT NOT NULL DEFAULT 'manufacturer',
    source_url TEXT,
    evidence_status TEXT NOT NULL DEFAULT 'unverified' CHECK(evidence_status IN (
        'unverified',
        'source_backed',
        'document_backed',
        'reviewed'
    )),
    catalog_version TEXT NOT NULL,
    observed_on TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS energy_products_category_active_idx
ON energy_products(category_id, active, manufacturer, model);

CREATE INDEX IF NOT EXISTS energy_products_external_id_idx
ON energy_products(external_id);

CREATE TABLE IF NOT EXISTS energy_product_documents (
    document_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    issuer TEXT,
    declaration_number TEXT,
    standard_reference TEXT,
    revision TEXT,
    language TEXT,
    source_url TEXT NOT NULL,
    observed_on TEXT NOT NULL,
    sha256 TEXT,
    parse_status TEXT NOT NULL DEFAULT 'not_parsed' CHECK(parse_status IN (
        'not_parsed',
        'parsed',
        'partial',
        'failed'
    )),
    rights_note TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS energy_product_documents_product_idx
ON energy_product_documents(product_id, document_type);

CREATE TABLE IF NOT EXISTS energy_product_properties (
    product_id TEXT NOT NULL,
    property_key TEXT NOT NULL,
    context_key TEXT NOT NULL DEFAULT 'nominal',
    numeric_value REAL,
    text_value TEXT,
    unit TEXT,
    normalized_numeric_value REAL,
    normalized_unit TEXT,
    source_document_id TEXT,
    source_locator TEXT,
    confidence TEXT NOT NULL DEFAULT 'source_backed',
    is_teo_input INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(product_id, property_key, context_key)
);

CREATE INDEX IF NOT EXISTS energy_product_properties_teo_idx
ON energy_product_properties(is_teo_input, property_key, product_id);

CREATE TABLE IF NOT EXISTS energy_product_images (
    image_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    source_url TEXT,
    alt_text TEXT NOT NULL DEFAULT '',
    image_kind TEXT NOT NULL DEFAULT 'product',
    rights_basis TEXT NOT NULL DEFAULT 'link_only',
    is_primary INTEGER NOT NULL DEFAULT 0,
    observed_on TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS energy_product_images_product_idx
ON energy_product_images(product_id, active, is_primary);

CREATE TABLE IF NOT EXISTS energy_product_offers (
    offer_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    supplier TEXT NOT NULL,
    supplier_sku TEXT,
    price_lei REAL NOT NULL CHECK(price_lei >= 0),
    price_basis TEXT NOT NULL,
    quantity REAL,
    quantity_unit TEXT,
    vat_included INTEGER NOT NULL DEFAULT 1,
    stock_status TEXT NOT NULL DEFAULT 'unknown',
    source_url TEXT,
    observed_on TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS energy_product_offers_product_active_idx
ON energy_product_offers(product_id, active, observed_on);

CREATE TABLE IF NOT EXISTS energy_product_value_metrics (
    product_id TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    comparison_scope TEXT NOT NULL,
    numerator_value REAL NOT NULL,
    numerator_unit TEXT NOT NULL,
    denominator_price_lei REAL NOT NULL CHECK(denominator_price_lei > 0),
    denominator_basis TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT NOT NULL,
    formula_version TEXT NOT NULL,
    source_signature TEXT NOT NULL,
    computed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(product_id, metric_key, comparison_scope)
);

CREATE INDEX IF NOT EXISTS energy_product_value_metrics_rank_idx
ON energy_product_value_metrics(comparison_scope, metric_key, metric_value DESC);

CREATE TABLE IF NOT EXISTS energy_product_import_batches (
    batch_id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_url TEXT,
    category_id TEXT,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    product_count INTEGER NOT NULL DEFAULT 0,
    document_count INTEGER NOT NULL DEFAULT 0,
    property_count INTEGER NOT NULL DEFAULT 0,
    image_count INTEGER NOT NULL DEFAULT 0,
    offer_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO energy_product_categories
(category_id, label, parent_category_id, teo_family, teo_role, comparison_scope, primary_value_metric_key, primary_value_metric_unit)
VALUES
('wall_insulation', 'Izolație pereți', 'envelope', 'wall', 'planning_curve', 'wall_insulation', 'thermal_resistance_per_price', 'R_added/(lei/m2)'),
('roof_insulation', 'Izolație pod/acoperiș', 'envelope', 'roof', 'planning_curve', 'roof_insulation', 'thermal_resistance_per_price', 'R_added/(lei/m2)'),
('floor_insulation', 'Izolație pardoseală', 'envelope', 'floor', 'planning_curve', 'floor_insulation', 'thermal_resistance_per_price', 'R_added/(lei/m2)'),
('window_system', 'Ferestre', 'envelope', 'windows', 'planning_curve', 'window_system', 'thermal_resistance_per_price', '(1/Uw)/(lei/m2)'),
('hrv_unit', 'Ventilație cu recuperare de căldură', 'ventilation', 'ventilation', 'finalist_match', 'hrv_unit', 'recovered_airflow_proxy_per_price', '(m3/h*eta)/lei'),
('radiator', 'Calorifere', 'heating_emission', 'heating_emitter', 'finalist_match', 'radiator_dt50', 'heat_output_per_price', 'W_dt50/lei'),
('fan_coil', 'Ventiloconvectoare', 'heating_emission', 'heating_emitter', 'finalist_match', 'fan_coil', 'heat_output_per_price', 'W/lei'),
('underfloor_pipe', 'Țeavă încălzire în pardoseală', 'heating_distribution', 'heating_distribution', 'bill_of_materials', 'underfloor_pipe', 'length_per_price', 'm/lei'),
('underfloor_manifold', 'Distribuitoare încălzire în pardoseală', 'heating_distribution', 'heating_distribution', 'bill_of_materials', 'underfloor_manifold', 'circuits_per_price', 'circuits/lei'),
('circulation_pump', 'Pompe de circulație', 'heating_distribution', 'heating_distribution', 'finalist_match', 'circulation_pump', 'hydraulic_capacity_per_price', 'proxy/lei'),
('heating_control', 'Termostate și control', 'heating_control', 'heating_control', 'bill_of_materials', 'heating_control', 'zones_per_price', 'zones/lei'),
('buffer_tank', 'Puffere și acumulatoare', 'heating_storage', 'heating_storage', 'finalist_match', 'buffer_tank', 'storage_volume_per_price', 'l/lei'),
('pv_module', 'Panouri fotovoltaice', 'renewables', 'pv', 'planning_curve', 'pv_module', 'power_per_price', 'Wp/lei'),
('solar_thermal_collector', 'Colectoare solare termice', 'renewables', 'solar_thermal', 'planning_curve', 'solar_thermal_collector', 'effective_area_per_price', '(m2*eta0)/lei'),
('heat_pump', 'Pompe de căldură', 'heating_generator', 'heating', 'finalist_match', 'heat_pump', 'capacity_per_price', 'kW/lei'),
('gas_boiler', 'Centrale pe gaz', 'heating_generator', 'heating', 'finalist_match', 'gas_boiler', 'capacity_per_price', 'kW/lei'),
('electric_boiler', 'Centrale electrice', 'heating_generator', 'heating', 'finalist_match', 'electric_boiler', 'capacity_per_price', 'kW/lei'),
('pellet_boiler', 'Centrale pe peleți', 'heating_generator', 'heating', 'finalist_match', 'pellet_boiler', 'capacity_per_price', 'kW/lei');
