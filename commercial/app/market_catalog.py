from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field


SCHEMA_VERSION = "1.0"
BASE_DIR = Path(__file__).resolve().parents[1]
CATALOG_PATH = BASE_DIR / "data" / "market-products.seed.json"


class MarketOfferV1(BaseModel):
    supplier_name: str
    price_lei: float | None = Field(default=None, ge=0)
    price_unit: Literal["piece", "package", "m2", "m"] | None = None
    product_url: str
    observed_on: str
    stock_status: Literal["in_stock", "limited", "out_of_stock", "unknown"] = "unknown"


class MarketProductV1(BaseModel):
    product_id: str
    category: Literal[
        "facade_insulation",
        "roof_insulation",
        "floor_insulation",
        "heat_pump_air_water",
        "condensing_gas_boiler",
        "hydronic_pipe",
    ]
    manufacturer: str
    model: str
    specs: dict[str, Any]
    technical_source_urls: list[str] = Field(default_factory=list)
    offers: list[MarketOfferV1] = Field(default_factory=list)


class MarketCatalogV1(BaseModel):
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    catalog_version: str
    observed_on: str
    products: list[MarketProductV1]


@lru_cache(maxsize=1)
def market_catalog() -> MarketCatalogV1:
    return MarketCatalogV1(**json.loads(CATALOG_PATH.read_text(encoding="utf-8")))
