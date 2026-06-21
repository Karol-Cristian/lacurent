# AGENTS.md

## Scope rules for LaCurent

Work only inside the UI placeholder components unless explicitly told otherwise.

Do not add product functionality.
Do not add marketplace functionality.
Do not add new backend endpoints.
Do not connect to real energy calculations.
Do not modify the Physics/Energy Engine.
Do not use AI experiments.
Do not alter existing user flows.

Allowed work:
- Presentational React components
- SVG animations
- CSS/Tailwind styling
- Framer Motion animation
- Accessibility improvements
- prefers-reduced-motion support
- Storybook examples if Storybook already exists

Default implementation:
- React + TypeScript
- Framer Motion
- SVG/CSS
- No Three.js unless explicitly requested
- No new heavy dependencies

Quality bar:
- Components must be reusable.
- Components must have minimal props.
- No real data.
- No business logic.
- No network calls.
- No random layout changes outside the requested files.