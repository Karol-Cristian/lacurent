import { SystemPlaceholderShell } from "./SystemPlaceholderShell";

export interface DecisionEnginePlaceholderProps {
  compact?: boolean;
}

const decisionStyles = `
.decision-placeholder {
  position: relative;
  display: grid;
  min-height: 320px;
  place-items: center;
  overflow: hidden;
}

.decision-placeholder__svg {
  width: min(100%, 720px);
  height: auto;
  overflow: visible;
}

.decision-placeholder__path {
  stroke-dasharray: 7 10;
  animation: decision-path-dash 10s linear infinite;
}

.decision-placeholder__selected-path {
  stroke-dasharray: 12 10;
  animation: decision-selected-flow 4.8s linear infinite;
  filter: drop-shadow(0 0 8px rgba(94, 234, 212, 0.78));
}

.decision-placeholder__pulse {
  filter: drop-shadow(0 0 10px rgba(125, 211, 252, 0.95));
}

.decision-placeholder__pulse--one {
  offset-path: path("M74 150 C130 98 168 88 222 104 C274 120 308 145 366 92");
  animation: decision-pulse-traverse 5.8s ease-in-out infinite;
}

.decision-placeholder__pulse--two {
  offset-path: path("M74 150 C132 166 172 188 222 174 C278 158 314 160 404 150");
  animation: decision-pulse-traverse 7.2s ease-in-out infinite;
  animation-delay: -2.4s;
}

.decision-placeholder__node {
  fill: #08111f;
  stroke: #7dd3fc;
  stroke-width: 1.6;
  filter: drop-shadow(0 0 8px rgba(125, 211, 252, 0.28));
}

.decision-placeholder__node--selected {
  stroke: #5eead4;
  fill: rgba(94, 234, 212, 0.16);
  animation: decision-node-selected 3.8s ease-in-out infinite;
}

.decision-placeholder__node--soft {
  stroke: rgba(196, 181, 253, 0.72);
}

.decision-placeholder__bar {
  transform-origin: left center;
  animation: decision-bar-meter 4.6s ease-in-out infinite;
}

.decision-placeholder__bar--two {
  animation-delay: -1.1s;
}

.decision-placeholder__bar--three {
  animation-delay: -2.2s;
}

.decision-placeholder__label {
  color: #dffcff;
  font: 700 11px/1.2 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  letter-spacing: 0.12em;
  text-shadow: 0 0 16px rgba(125, 211, 252, 0.72);
  animation: decision-label-float 6.4s ease-in-out infinite;
}

.decision-placeholder__label--two {
  animation-delay: -2s;
}

.decision-placeholder__label--three {
  animation-delay: -3.6s;
}

.decision-placeholder__connector {
  stroke-dasharray: 5 9;
  animation: decision-path-dash 8s linear infinite;
}

@keyframes decision-path-dash {
  to { stroke-dashoffset: -94; }
}

@keyframes decision-selected-flow {
  to { stroke-dashoffset: -108; }
}

@keyframes decision-pulse-traverse {
  0%, 8% { offset-distance: 0%; opacity: 0; }
  20% { opacity: 1; }
  82% { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}

@keyframes decision-node-selected {
  0%, 100% { transform: scale(1); opacity: 0.82; }
  50% { transform: scale(1.08); opacity: 1; }
}

@keyframes decision-bar-meter {
  0%, 100% { transform: scaleX(0.58); opacity: 0.62; }
  50% { transform: scaleX(1); opacity: 1; }
}

@keyframes decision-label-float {
  0%, 100% { transform: translateY(0); opacity: 0.76; }
  50% { transform: translateY(-6px); opacity: 1; }
}

@media (max-width: 720px) {
  .decision-placeholder {
    min-height: 260px;
  }

  .decision-placeholder__label {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .decision-placeholder *,
  .decision-placeholder *::before,
  .decision-placeholder *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;

export function DecisionEnginePlaceholder({ compact = false }: DecisionEnginePlaceholderProps) {
  return (
    <SystemPlaceholderShell
      title="Decision Engine"
      subtitle="Scenario evaluation initializing"
      description="Comparing pathways across impact, cost, and energy performance."
      compact={compact}
    >
      <style>{decisionStyles}</style>
      <div className="decision-placeholder" aria-hidden="true">
        <svg
          className="decision-placeholder__svg"
          viewBox="0 0 480 300"
          role="img"
          aria-label="Animated decision graph placeholder"
        >
          <defs>
            <linearGradient id="decision-selected-gradient" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.10" />
              <stop offset="54%" stopColor="#5eead4" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="decision-soft-gradient" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.36" />
            </linearGradient>
          </defs>

          <path className="decision-placeholder__connector" d="M54 62 H178 L214 98" fill="none" stroke="#7dd3fc" strokeOpacity="0.55" />
          <path className="decision-placeholder__connector" d="M312 64 H430" fill="none" stroke="#5eead4" strokeOpacity="0.45" />
          <path className="decision-placeholder__connector" d="M62 238 H176 L210 198" fill="none" stroke="#c4b5fd" strokeOpacity="0.45" />

          <foreignObject x="38" y="42" width="172" height="24">
            <div className="decision-placeholder__label">ORDONARE SCENARII</div>
          </foreignObject>
          <foreignObject x="302" y="44" width="160" height="24">
            <div className="decision-placeholder__label decision-placeholder__label--two">VERIFICARE CONSTRANGERI</div>
          </foreignObject>
          <foreignObject x="54" y="242" width="160" height="24">
            <div className="decision-placeholder__label decision-placeholder__label--three">CAUTARE TRASEU BUN</div>
          </foreignObject>

          <path className="decision-placeholder__path" d="M74 150 C132 64 180 58 222 104 C272 158 320 206 404 220" fill="none" stroke="url(#decision-soft-gradient)" strokeWidth="2" />
          <path className="decision-placeholder__path" d="M74 150 C132 166 172 188 222 174 C278 158 314 160 404 150" fill="none" stroke="url(#decision-soft-gradient)" strokeWidth="2" />
          <path className="decision-placeholder__path" d="M74 150 C134 226 188 232 238 210 C302 182 336 108 404 80" fill="none" stroke="url(#decision-soft-gradient)" strokeWidth="2" />
          <path className="decision-placeholder__selected-path" d="M74 150 C130 98 168 88 222 104 C274 120 308 145 366 92" fill="none" stroke="url(#decision-selected-gradient)" strokeWidth="4" strokeLinecap="round" />

          <g>
            <circle className="decision-placeholder__node decision-placeholder__node--selected" cx="74" cy="150" r="16" />
            <circle className="decision-placeholder__node decision-placeholder__node--selected" cx="222" cy="104" r="14" />
            <circle className="decision-placeholder__node decision-placeholder__node--selected" cx="366" cy="92" r="16" />
            <circle className="decision-placeholder__node decision-placeholder__node--soft" cx="222" cy="174" r="13" />
            <circle className="decision-placeholder__node decision-placeholder__node--soft" cx="404" cy="150" r="14" />
            <circle className="decision-placeholder__node decision-placeholder__node--soft" cx="404" cy="220" r="13" />
            <circle className="decision-placeholder__node decision-placeholder__node--soft" cx="238" cy="210" r="12" />
            <circle className="decision-placeholder__node decision-placeholder__node--soft" cx="404" cy="80" r="13" />
          </g>

          <circle className="decision-placeholder__pulse decision-placeholder__pulse--one" r="5" fill="#5eead4" />
          <circle className="decision-placeholder__pulse decision-placeholder__pulse--two" r="4" fill="#7dd3fc" />

          <g transform="translate(302 188)">
            <rect x="0" y="0" width="118" height="58" rx="8" fill="rgba(8, 17, 31, 0.78)" stroke="rgba(125, 211, 252, 0.24)" />
            <text x="14" y="18" fill="#7dd3fc" fontFamily="ui-monospace, Consolas, monospace" fontSize="9" fontWeight="700">VECTOR DECIZIE</text>
            <rect x="14" y="28" width="86" height="5" rx="2.5" fill="rgba(125, 211, 252, 0.16)" />
            <rect className="decision-placeholder__bar" x="14" y="28" width="86" height="5" rx="2.5" fill="#5eead4" />
            <rect x="14" y="39" width="70" height="5" rx="2.5" fill="rgba(125, 211, 252, 0.16)" />
            <rect className="decision-placeholder__bar decision-placeholder__bar--two" x="14" y="39" width="70" height="5" rx="2.5" fill="#7dd3fc" />
            <rect x="14" y="50" width="96" height="5" rx="2.5" fill="rgba(125, 211, 252, 0.16)" />
            <rect className="decision-placeholder__bar decision-placeholder__bar--three" x="14" y="50" width="96" height="5" rx="2.5" fill="#c4b5fd" />
          </g>
        </svg>
      </div>
    </SystemPlaceholderShell>
  );
}
