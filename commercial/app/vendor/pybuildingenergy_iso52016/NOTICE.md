# pyBuildingEnergy ISO 52016 vendoring notice

This directory contains an auditable, pinned execution slice copied from
EURAC-EEBgroup/pyBuildingEnergy for LaCurent's isolated ISO 52016 comparison PoC.

Upstream: https://github.com/EURAC-EEBgroup/pyBuildingEnergy
Package version inspected: 2.0.3
License: BSD-3-Clause

Pinned upstream blobs:
- utils.py: 860d69105c5f371abc25db9f60dba17c66d056d4
- ventilation.py: 110fc06cb6f623376456478c3025faa052c23c88
- functions.py: f20c6d7bb15d7f034ebc0b18f3981648e7efff66
- table_iso_16798_1.py: 0849efcd85f634d8dd5ba2a837d0ae05b979ddbf

The files above are copied unmodified so numerical behaviour remains traceable
to upstream. They are not an implementation of Romanian MC001-2022. LaCurent
continues to own the Romanian climate mapping, reference-building/NZEB rules,
national factors, classifications, pricing and reporting.
