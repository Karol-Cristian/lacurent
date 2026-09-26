(() => {
  "use strict";

  const preventDefault = (event) => event.preventDefault();

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
