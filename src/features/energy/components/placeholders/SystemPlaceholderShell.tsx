import type * as React from "react";

export interface SystemPlaceholderShellProps {
  title: string;
  subtitle: string;
  description: string;
  children: React.ReactNode;
  compact?: boolean;
}

const shellStyles = `
.system-placeholder-shell {
  --shell-bg: #050816;
  --shell-panel: rgba(9, 16, 35, 0.82);
  --shell-line: rgba(118, 197, 255, 0.24);
  --shell-line-strong: rgba(125, 211, 252, 0.55);
  --shell-cyan: #7dd3fc;
  --shell-green: #5eead4;
  --shell-violet: #c4b5fd;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  gap: 24px;
  min-height: 520px;
  padding: 32px;
  border: 1px solid var(--shell-line);
  border-radius: 8px;
  background:
    radial-gradient(circle at 18% 12%, rgba(94, 234, 212, 0.20), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(196, 181, 253, 0.16), transparent 26%),
    linear-gradient(135deg, #050816 0%, #08111f 52%, #060a16 100%);
  color: #eef7ff;
  box-shadow: 0 24px 80px rgba(3, 7, 18, 0.42);
}

.system-placeholder-shell[data-compact="true"] {
  min-height: 360px;
  padding: 22px;
  gap: 18px;
}

.system-placeholder-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(var(--shell-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--shell-line) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at 50% 36%, black, transparent 78%);
  opacity: 0.62;
}

.system-placeholder-shell::after {
  content: "";
  position: absolute;
  inset: -32%;
  z-index: -1;
  background: conic-gradient(from 0deg, transparent, rgba(125, 211, 252, 0.12), transparent, rgba(94, 234, 212, 0.10), transparent);
  animation: system-shell-drift 18s linear infinite;
}

.system-placeholder-shell__scanline {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, rgba(125, 211, 252, 0.10), transparent);
  transform: translateY(-100%);
  animation: system-shell-scan 7s ease-in-out infinite;
}

.system-placeholder-shell__header {
  display: grid;
  gap: 10px;
  max-width: 740px;
}

.system-placeholder-shell__status {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 9px;
  color: var(--shell-green);
  font: 700 11px/1.2 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.system-placeholder-shell__status::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 18px currentColor;
}

.system-placeholder-shell__title {
  margin: 0;
  color: #f8fbff;
  font-size: clamp(2rem, 5vw, 4.8rem);
  line-height: 0.94;
  letter-spacing: 0;
}

.system-placeholder-shell[data-compact="true"] .system-placeholder-shell__title {
  font-size: clamp(1.7rem, 4vw, 3.1rem);
}

.system-placeholder-shell__subtitle {
  margin: 0;
  color: var(--shell-cyan);
  font: 700 13px/1.35 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.system-placeholder-shell__description {
  max-width: 620px;
  margin: 0;
  color: #b9c7d8;
  font-size: 1rem;
  line-height: 1.65;
}

.system-placeholder-shell__body {
  position: relative;
  display: grid;
  min-height: 240px;
  padding: 18px;
  border: 1px solid rgba(125, 211, 252, 0.20);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(8, 13, 28, 0.82));
  box-shadow: inset 0 0 42px rgba(125, 211, 252, 0.06);
}

.system-placeholder-shell[data-compact="true"] .system-placeholder-shell__body {
  min-height: 180px;
}

.system-placeholder-shell__body::before,
.system-placeholder-shell__body::after {
  content: "";
  position: absolute;
  width: 32px;
  height: 32px;
  border-color: var(--shell-line-strong);
  pointer-events: none;
}

.system-placeholder-shell__body::before {
  top: 10px;
  left: 10px;
  border-top: 1px solid;
  border-left: 1px solid;
}

.system-placeholder-shell__body::after {
  right: 10px;
  bottom: 10px;
  border-right: 1px solid;
  border-bottom: 1px solid;
}

.system-placeholder-shell__glow {
  position: absolute;
  width: 260px;
  height: 260px;
  right: 10%;
  top: 22%;
  border-radius: 999px;
  background: rgba(125, 211, 252, 0.11);
  filter: blur(28px);
  animation: system-shell-pulse 4.8s ease-in-out infinite;
}

@keyframes system-shell-drift {
  to { transform: rotate(1turn); }
}

@keyframes system-shell-scan {
  0%, 18% { transform: translateY(-100%); opacity: 0; }
  34%, 70% { opacity: 0.78; }
  100% { transform: translateY(100%); opacity: 0; }
}

@keyframes system-shell-pulse {
  0%, 100% { transform: scale(0.92); opacity: 0.52; }
  50% { transform: scale(1.08); opacity: 0.9; }
}

@media (max-width: 720px) {
  .system-placeholder-shell {
    min-height: 460px;
    padding: 22px;
  }

  .system-placeholder-shell__body {
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .system-placeholder-shell,
  .system-placeholder-shell *,
  .system-placeholder-shell::after {
    animation: none !important;
    transition: none !important;
  }

  .system-placeholder-shell__scanline {
    display: none;
  }
}
`;

export function SystemPlaceholderShell({
  title,
  subtitle,
  description,
  children,
  compact = false
}: SystemPlaceholderShellProps) {
  return (
    <section
      className="system-placeholder-shell"
      data-compact={compact ? "true" : "false"}
      aria-label={`${title}: ${subtitle}`}
    >
      <style>{shellStyles}</style>
      <div className="system-placeholder-shell__scanline" aria-hidden="true" />
      <div className="system-placeholder-shell__glow" aria-hidden="true" />
      <header className="system-placeholder-shell__header">
        <span className="system-placeholder-shell__status">System placeholder</span>
        <h2 className="system-placeholder-shell__title">{title}</h2>
        <p className="system-placeholder-shell__subtitle">{subtitle}</p>
        <p className="system-placeholder-shell__description">{description}</p>
      </header>
      <div className="system-placeholder-shell__body">{children}</div>
    </section>
  );
}
