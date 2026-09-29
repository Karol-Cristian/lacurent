# Home Lab Classic 3D — retired

Status: **frozen / outside production / outside release gates**

The previous Home Lab surface based on `home_lab_next.html` plus the animated 3D house (`home-lab-3d.js`, `home-lab-next.js`) is retained only as historical/reference code.

Production policy:

- `/home-lab-classic` is not registered as a public route.
- `/embed/{partner_id}/next` and `/embed/{partner_id}/next/calculate` are not registered.
- The maintained public Home Lab is `/home-lab-next` (Technical Editorial flow).
- The maintained partner embed is `/embed/{partner_id}`.
- Classic 3D browser smoke and UI contract tests are excluded from release gates.
- Do not spend release effort fixing classic-only UI/3D regressions.
- Do not add new features to the classic surface.
- Re-activation requires an explicit product decision and a dedicated branch/PR.

The physics/optimizer APIs used by the maintained Home Lab remain supported independently of this retired UI.
