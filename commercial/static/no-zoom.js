(() => {
  "use strict";

  const preventDefault = (event) => event.preventDefault();
  const VIEWPORT_CONTENT = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

  function normalizeViewportScale() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;
    viewport.setAttribute("content", VIEWPORT_CONTENT);
  }

  normalizeViewportScale();
  window.addEventListener("pageshow", normalizeViewportScale);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(normalizeViewportScale, 0);
  });

  document.addEventListener("gesturestart", preventDefault, { passive: false });
  document.addEventListener("gesturechange", preventDefault, { passive: false });
  document.addEventListener("gestureend", preventDefault, { passive: false });

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches && event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (["+", "-", "=", "0"].includes(event.key)) {
      event.preventDefault();
    }
  });
})();
