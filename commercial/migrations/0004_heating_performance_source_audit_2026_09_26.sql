-- Source-backed performance additions audited on 2026-09-26.
-- These rows enrich existing persistent D1 products without replacing the catalog.

INSERT OR REPLACE INTO heat_pump_performance_points (
    product_id, outdoor_temperature_c, flow_temperature_c,
    return_temperature_c, delta_t_k, heating_capacity_kw, cop,
    test_standard, source_kind, source_url, note, catalog_version, updated_at
) VALUES
(
    'hp-daikin-altherma3m-ebla08e3v3', 7, 35,
    NULL, 5, 7.5, 4.60,
    'EN 14511 / manufacturer declared operating point',
    'manufacturer_technical_data',
    'https://www.daikin.eu/en_us/products/product.table.html/EBLA04-08E3V3.html',
    'Daikin EBLA08E3V3 official condition 1: A7/W35.',
    'source-audit-2026-09-26', CURRENT_TIMESTAMP
),
(
    'hp-daikin-altherma3m-ebla08e3v3', 7, 45,
    NULL, 5, 7.8, 3.50,
    'EN 14511 / manufacturer declared operating point',
    'manufacturer_technical_data',
    'https://www.daikin.eu/en_us/products/product.table.html/EBLA04-08E3V3.html',
    'Daikin EBLA08E3V3 official condition 2: A7/W45.',
    'source-audit-2026-09-26', CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO heat_pump_seasonal_performance (
    product_id, climate, application_temperature_c, scop, design_load_kw,
    source_kind, source_url, test_standard, catalog_version, updated_at
) VALUES
(
    'hp-daikin-altherma3m-ebla08e3v3', 'average', 35, 4.61, 8,
    'manufacturer_technical_data',
    'https://www.daikin.eu/en_us/products/product.table.html/EBLA04-08E3V3.html',
    'EN 14825', 'source-audit-2026-09-26', CURRENT_TIMESTAMP
),
(
    'hp-daikin-altherma3m-ebla08e3v3', 'average', 55, 3.35, 8,
    'manufacturer_technical_data',
    'https://www.daikin.eu/en_us/products/product.table.html/EBLA04-08E3V3.html',
    'EN 14825', 'source-audit-2026-09-26', CURRENT_TIMESTAMP
),
(
    'hp-lg-therma-v-hm071mr-u44', 'average', 35, 4.48, NULL,
    'manufacturer_technical_data',
    'https://www.lg.com/uk/business/hvac/residential-solutions/air-to-water-heat-pump/r32-monobloc/hm071mr-u44/',
    'manufacturer seasonal efficiency / ErP',
    'source-audit-2026-09-26', CURRENT_TIMESTAMP
),
(
    'hp-lg-therma-v-hm071mr-u44', 'average', 55, 3.20, NULL,
    'manufacturer_technical_data',
    'https://www.lg.com/uk/business/hvac/residential-solutions/air-to-water-heat-pump/r32-monobloc/hm071mr-u44/',
    'manufacturer seasonal efficiency / ErP',
    'source-audit-2026-09-26', CURRENT_TIMESTAMP
);
