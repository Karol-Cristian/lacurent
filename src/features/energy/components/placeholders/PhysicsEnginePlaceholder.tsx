import { SystemPlaceholderShell } from "./SystemPlaceholderShell";

export interface PhysicsEnginePlaceholderProps {
  compact?: boolean;
}

const physicsStyles = `
.physics-placeholder {
  position: relative;
  display: grid;
  min-height: 320px;
  place-items: center;
  overflow: hidden;
}

.physics-placeholder__svg {
  width: min(100%, 720px);
  height: auto;
  overflow: visible;
}

.physics-placeholder__core-halo {
  transform-origin: 240px 150px;
  animation: physics-core-breathe 4.8s ease-in-out infinite;
}

.physics-placeholder__core-ring {
  transform-origin: 240px 150px;
  animation: physics-core-spin 22s linear infinite;
}

.physics-placeholder__orbit {
  transform-origin: 240px 150px;
  animation: physics-orbit 14s linear infinite;
}

.physics-placeholder__orbit--slow {
  animation-duration: 21s;
  animation-direction: reverse;
}

.physics-placeholder__particle {
  filter: drop-shadow(0 0 9px rgba(125, 211, 252, 0.92));
}

.physics-placeholder__sine {
  stroke-dasharray: 10 12;
  animation: physics-wave 5s linear infinite;
}

.physics-placeholder__equation,
.physics-placeholder__hud-label {
  color: #c8f7ff;
  font: 700 12px/1.2 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  letter-spacing: 0.08em;
  text-shadow: 0 0 16px rgba(125, 211, 252, 0.65);
}

.physics-placeholder__equation {
  animation: physics-float 6.2s ease-in-out infinite;
}

.physics-placeholder__equation:nth-of-type(2n) {
  animation-delay: -2.2s;
}

.physics-placeholder__hud-label {
  color: #7dd3fc;
  opacity: 0.82;
}

.physics-placeholder__hud-line {
  stroke-dasharray: 4 8;
  animation: physics-dash 9s linear infinite;
}

@keyframes physics-core-breathe {
  0%, 100% { transform: scale(0.94); opacity: 0.74; }
  50% { transform: scale(1.08); opacity: 1; }
}

@keyframes physics-core-spin {
  to { transform: rotate(1turn); }
}

@keyframes physics-orbit {
  to { transform: rotate(1turn); }
}

@keyframes physics-wave {
  to { stroke-dashoffset: -88; }
}

@keyframes physics-float {
  0%, 100% { transform: translateY(0); opacity: 0.74; }
  50% { transform: translateY(-7px); opacity: 1; }
}

@keyframes physics-dash {
  to { stroke-dashoffset: -96; }
}

@media (max-width: 720px) {
  .physics-placeholder {
    min-height: 260px;
  }

  .physics-placeholder__equation {
    font-size: 10px;
  }

  .physics-placeholder__hud-label {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .physics-placeholder *,
  .physics-placeholder *::before,
  .physics-placeholder *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;

export function PhysicsEnginePlaceholder({ compact = false }: PhysicsEnginePlaceholderProps) {
  return (
    <SystemPlaceholderShell
      title="Physics Engine"
      subtitle="Under calibration"
      description="Balancing thermal, electrical, and energy-flow equations."
      compact={compact}
    >
      <style>{physicsStyles}</style>
      <div className="physics-placeholder" aria-hidden="true">
        <svg
          className="physics-placeholder__svg"
          viewBox="0 0 480 300"
          role="img"
          aria-label="Animated energy core calibration placeholder"
        >
          <defs>
            <radialGradient id="physics-core-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e0faff" stopOpacity="1" />
              <stop offset="42%" stopColor="#7dd3fc" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="physics-wave-gradient" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.12" />
              <stop offset="48%" stopColor="#7dd3fc" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.14" />
            </linearGradient>
          </defs>

          <g opacity="0.54">
            <path className="physics-placeholder__hud-line" d="M26 54 H148 L176 88" fill="none" stroke="#7dd3fc" strokeWidth="1" />
            <path className="physics-placeholder__hud-line" d="M454 66 H338 L304 101" fill="none" stroke="#7dd3fc" strokeWidth="1" />
            <path className="physics-placeholder__hud-line" d="M42 246 H158 L184 214" fill="none" stroke="#5eead4" strokeWidth="1" />
            <path className="physics-placeholder__hud-line" d="M438 236 H318 L294 204" fill="none" stroke="#c4b5fd" strokeWidth="1" />
          </g>

          <foreignObject x="22" y="34" width="170" height="24">
            <div className="physics-placeholder__hud-label">MODEL IN CALIBRARE</div>
          </foreignObject>
          <foreignObject x="314" y="46" width="178" height="24">
            <div className="physics-placeholder__hud-label">BILANT ENERGETIC</div>
          </foreignObject>
          <foreignObject x="34" y="250" width="180" height="24">
            <div className="physics-placeholder__hud-label">VERIFICARE FLUX TERMIC</div>
          </foreignObject>

          <path
            className="physics-placeholder__sine"
            d="M78 150 C104 106 132 106 158 150 S212 194 238 150 S292 106 318 150 S372 194 402 150"
            fill="none"
            stroke="url(#physics-wave-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <g className="physics-placeholder__core-halo">
            <circle cx="240" cy="150" r="76" fill="url(#physics-core-gradient)" opacity="0.82" />
            <circle cx="240" cy="150" r="38" fill="#08111f" stroke="#7dd3fc" strokeWidth="1.5" />
            <circle cx="240" cy="150" r="20" fill="#7dd3fc" opacity="0.85" />
          </g>

          <g className="physics-placeholder__core-ring" fill="none">
            <ellipse cx="240" cy="150" rx="94" ry="34" stroke="#7dd3fc" strokeOpacity="0.42" />
            <ellipse cx="240" cy="150" rx="34" ry="94" stroke="#5eead4" strokeOpacity="0.36" />
            <ellipse cx="240" cy="150" rx="104" ry="46" transform="rotate(-28 240 150)" stroke="#c4b5fd" strokeOpacity="0.30" />
          </g>

          <g className="physics-placeholder__orbit">
            <circle className="physics-placeholder__particle" cx="334" cy="150" r="4.5" fill="#7dd3fc" />
            <circle className="physics-placeholder__particle" cx="146" cy="150" r="3.5" fill="#5eead4" />
          </g>
          <g className="physics-placeholder__orbit physics-placeholder__orbit--slow">
            <circle className="physics-placeholder__particle" cx="240" cy="56" r="4" fill="#c4b5fd" />
            <circle className="physics-placeholder__particle" cx="240" cy="244" r="3.5" fill="#7dd3fc" />
          </g>

          <foreignObject x="78" y="88" width="104" height="28">
            <div className="physics-placeholder__equation">R = d / lambda</div>
          </foreignObject>
          <foreignObject x="318" y="108" width="106" height="28">
            <div className="physics-placeholder__equation">U = 1 / R</div>
          </foreignObject>
          <foreignObject x="62" y="188" width="132" height="28">
            <div className="physics-placeholder__equation">Htr = U x A</div>
          </foreignObject>
          <foreignObject x="314" y="198" width="128" height="28">
            <div className="physics-placeholder__equation">QH = H x HDD</div>
          </foreignObject>
        </svg>
      </div>
    </SystemPlaceholderShell>
  );
}
