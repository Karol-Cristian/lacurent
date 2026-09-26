# Home Lab user-flow release campaign

## 2026-09-24 — report-to-home navigation restores the top of Casa mea

- Base: `fdd933594e35fb5289d106d4f32b632977cfd4d9`, fetched from
  `codex/commercial-v2-cloudflare-python`.
- Work branch: `codex/homelab-release-user-flows`.
- Deploy workflow inspected: only pushes to the production branch above or a
  manual dispatch deploy. This branch does not match that trigger. PR checks
  are PR-only; no PR, dispatch or production request was made.
- No root/commercial AGENTS.md exists. `docs/AGENTS.md` was read; the explicit
  user-flow task authorization covers this limited behavior fix and evidence.
- Calculation and stability campaign branches were inspected for overlap and
  were not merged. Their engine/D1 work does not overlap this navigation fix.

### Defect and reproduction

The global `Casa mea` progress action had a one-off navigation implementation
instead of using `showScreen()`. From the bottom of the complete report it
changed the active screen but did not reset scroll. A real mobile Chromium flow
recorded `window.scrollY == 350` after returning to Casa mea. This could expose
the middle of the first page and make the return navigation look blank or broken.

Reproduction path:

1. Load Home Lab and wait for the baseline calculation.
2. Save Casa mea.
3. Add and calculate a wall-renovation scenario.
4. Open the complete report and scroll to its bottom.
5. Use global progress navigation to return to Casa mea.

### Remediation

Route the home progress action through the existing `showScreen("home")` path.
This reuses the same screen activation, rendering, analytics, visual-state
emission and immediate scroll reset used by other transitions. Bump the static
JS cache key from `next46` to `next47`.

### Verification and traceability

- Before fix, dedicated mobile Chromium flow failed at **350 px** residual
  scroll after returning home.
- After fix, the complete baseline → renovation → scenario → report → Casa mea
  flow passes at 390×844 and 1280×900, with final scroll <= 20 px.
- The dedicated browser flow also checks real calculation completion between
  transitions; it is not an HTTP-200-only smoke.
- The main browser smoke now contains the same report-return regression. Its
  full local execution was blocked before the flow by the external 3D model not
  becoming available in this runtime; that check was not claimed as passed.
- JavaScript syntax checks passed for the application and both browser smokes.
- Node suites: **11 passed**.
- Entire Python commercial suite: **244 passed**, 13 existing warnings.
- `git diff --check`: passed.

### Boundaries and next iteration

No production deployment, Cloudflare runtime test, visual screenshot review or
PR was performed. The 3D asset itself was not validated in this iteration.
Next: exercise rapid edits while a calculation is pending, including back/forward
navigation and recovery after a deliberately failed calculation. Re-read this
register and remote branch heads first.
