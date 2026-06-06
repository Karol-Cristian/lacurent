import { SystemPlaceholderShell } from "./SystemPlaceholderShell";

export interface LumenPlaceholderProps {
  compact?: boolean;
}

const lumenStyles = `
.lumen-placeholder {
  position: relative;
  display: grid;
  min-height: 320px;
  place-items: center;
  overflow: hidden;
}

.lumen-placeholder__svg {
  width: min(100%, 720px);
  height: auto;
  overflow: visible;
}

.lumen-placeholder__beam {
  stroke-dasharray: 24 18;
  animation: lumen-beam-flow 6.8s linear infinite;
}

.lumen-placeholder__beam-glow {
  animation: lumen-beam-glow 4.8s ease-in-out infinite;
}

.lumen-placeholder__prism {
  transform-origin: 238px 150px;
  animation: lumen-prism-breathe 5.8s ease-in-out infinite;
  filter: drop-shadow(0 0 18px rgba(125, 211, 252, 0.48));
}

.lumen-placeholder__ring {
  transform-origin: center;
  opacity: 0;
  animation: lumen-ring-expand 4.8s ease-out infinite;
}

.lumen-placeholder__ring--two {
  animation-delay: 1.2s;
}

.lumen-placeholder__ring--three {
  animation-delay: 2.4s;
}

.lumen-placeholder__dot {
  opacity: 0.32;
  animation: lumen-dot-cascade 3.8s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(94, 234, 212, 0.72));
}

.lumen-placeholder__dot:nth-of-type(2) { animation-delay: 0.18s; }
.lumen-placeholder__dot:nth-of-type(3) { animation-delay: 0.36s; }
.lumen-placeholder__dot:nth-of-type(4) { animation-delay: 0.54s; }
.lumen-placeholder__dot:nth-of-type(5) { animation-delay: 0.72s; }
.lumen-placeholder__dot:nth-of-type(6) { animation-delay: 0.90s; }
.lumen-placeholder__dot:nth-of-type(7) { animation-delay: 1.08s; }

.lumen-placeholder__label {
  color: #dffcff;
  font: 700 11px/1.2 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  letter-spacing: 0.12em;
  text-shadow: 0 0 16px rgba(125, 211, 252, 0.72);
  animation: lumen-label-float 6s ease-in-out infinite;
}

.lumen-placeholder__label--two {
  animation-delay: -1.8s;
}

.lumen-placeholder__label--three {
  animation-delay: -3.2s;
}

.lumen-placeholder__connector {
  stroke-dasharray: 5 9;
  animation: lumen-connector-dash 8s linear infinite;
}

@keyframes lumen-beam-flow {
  to { stroke-dashoffset: -126; }
}

@keyframes lumen-beam-glow {
  0%, 100% { opacity: 0.34; }
  50% { opacity: 0.82; }
}

@keyframes lumen-prism-breathe {
  0%, 100% { transform: scale(0.98); opacity: 0.88; }
  50% { transform: scale(1.03); opacity: 1; }
}

@keyframes lumen-ring-expand {
  0% { transform: scale(0.36); opacity: 0; }
  20% { opacity: 0.72; }
  100% { transform: scale(1.35); opacity: 0; }
}

@keyframes lumen-dot-cascade {
  0%, 100% { opacity: 0.28; transform: scale(0.92); }
  42% { opacity: 1; transform: scale(1.18); }
}

@keyframes lumen-label-float {
  0%, 100% { transform: translateY(0); opacity: 0.78; }
  50% { transform: translateY(-6px); opacity: 1; }
}

@keyframes lumen-connector-dash {
  to { stroke-dashoffset: -84; }
}

@media (max-width: 720px) {
  .lumen-placeholder {
    min-height: 260px;
  }

  .lumen-placeholder__label {
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lumen-placeholder *,
  .lumen-placeholder *::before,
  .lumen-placeholder *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;

export function LumenPlaceholder({ compact = false }: LumenPlaceholderProps) {
  return (
    <SystemPlaceholderShell
      title="LUMEN"
      subtitle="Signal alignment in progress"
      description="Transforming raw energy context into illuminated insight."
      compact={compact}
    >
      <style>{lumenStyles}</style>
      <div className="lumen-placeholder" aria-hidden="true">
        <svg
          className="lumen-placeholder__svg"
          viewBox="0 0 480 300"
          role="img"
          aria-label="Animated LUMEN prism placeholder"
        >
          <defs>
            <linearGradient id="lumen-input-beam" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0" />
              <stop offset="45%" stopColor="#7dd3fc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f0f9ff" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="lumen-output-beam" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.95" />
              <stop offset="36%" stopColor="#5eead4" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#c4b5fd" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="lumen-lens-glow" cx="50%" cy="50%" r="58%">
              <stop offset="0%" stopColor="#f8fbff" stopOpacity="0.95" />
              <stop offset="48%" stopColor="#7dd3fc" stopOpacity="0.54" />
              <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            className="lumen-placeholder__beam lumen-placeholder__beam-glow"
            d="M32 150 H188"
            fill="none"
            stroke="url(#lumen-input-beam)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            className="lumen-placeholder__beam"
            d="M276 134 C334 86 392 64 452 52"
            fill="none"
            stroke="url(#lumen-output-beam)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            className="lumen-placeholder__beam"
            d="M276 150 C340 144 394 147 452 150"
            fill="none"
            stroke="url(#lumen-output-beam)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            className="lumen-placeholder__beam"
            d="M276 166 C334 214 392 236 452 248"
            fill="none"
            stroke="url(#lumen-output-beam)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          <g className="lumen-placeholder__prism">
            <circle cx="238" cy="150" r="70" fill="url(#lumen-lens-glow)" opacity="0.58" />
            <path d="M206 92 L294 150 L206 208 Z" fill="rgba(125, 211, 252, 0.12)" stroke="#7dd3fc" strokeWidth="1.6" />
            <path d="M206 92 L238 150 L206 208 Z" fill="rgba(94, 234, 212, 0.18)" />
            <path d="M238 150 L294 150 L206 208 Z" fill="rgba(196, 181, 253, 0.14)" />
            <circle cx="238" cy="150" r="15" fill="#e0faff" opacity="0.9" />
          </g>

          <g transform="translate(238 150)" fill="none" stroke="#7dd3fc" strokeWidth="1">
            <circle className="lumen-placeholder__ring" r="46" opacity="0.35" />
            <circle className="lumen-placeholder__ring lumen-placeholder__ring--two" r="62" opacity="0.28" />
            <circle className="lumen-placeholder__ring lumen-placeholder__ring--three" r="78" opacity="0.22" />
          </g>

          <g fill="#5eead4">
            <circle className="lumen-placeholder__dot" cx="324" cy="104" r="4" />
            <circle className="lumen-placeholder__dot" cx="354" cy="91" r="3.5" />
            <circle className="lumen-placeholder__dot" cx="386" cy="78" r="4" />
            <circle className="lumen-placeholder__dot" cx="328" cy="150" r="4" />
            <circle className="lumen-placeholder__dot" cx="366" cy="150" r="3.5" />
            <circle className="lumen-placeholder__dot" cx="324" cy="196" r="4" />
            <circle className="lumen-placeholder__dot" cx="356" cy="210" r="3.5" />
          </g>

          <path className="lumen-placeholder__connector" d="M76 76 H178 L205 102" fill="none" stroke="#7dd3fc" strokeOpacity="0.58" />
          <path className="lumen-placeholder__connector" d="M402 112 H316 L286 134" fill="none" stroke="#5eead4" strokeOpacity="0.50" />
          <path className="lumen-placeholder__connector" d="M82 232 H184 L211 196" fill="none" stroke="#c4b5fd" strokeOpacity="0.46" />

          <foreignObject x="52" y="56" width="174" height="24">
            <div className="lumen-placeholder__label">ALINIERE SEMNAL</div>
          </foreignObject>
          <foreignObject x="304" y="91" width="174" height="24">
            <div className="lumen-placeholder__label lumen-placeholder__label--two">TIPARE VIZIBILE</div>
          </foreignObject>
          <foreignObject x="62" y="236" width="150" height="24">
            <div className="lumen-placeholder__label lumen-placeholder__label--three">STRAT DE CLARITATE</div>
          </foreignObject>
        </svg>
      </div>
    </SystemPlaceholderShell>
  );
}
