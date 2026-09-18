(() => {
  "use strict";
  if (window.parent === window) return;

  let lastHeight = 0;
  function publishHeight() {
    const root = document.documentElement;
    const body = document.body;
    const height = Math.ceil(Math.max(
      root?.scrollHeight || 0,
      root?.offsetHeight || 0,
      body?.scrollHeight || 0,
      body?.offsetHeight || 0
    ));
    if (!height || Math.abs(height - lastHeight) < 2) return;
    lastHeight = height;
    window.parent.postMessage({
      type: "lacurent:embed-height",
      height,
      partner: document.body?.dataset?.embedPartner || ""
    }, "*");
  }

  window.addEventListener("load", publishHeight);
  window.addEventListener("resize", publishHeight);
  window.addEventListener("lacurent:languagechange", () => setTimeout(publishHeight, 0));

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => publishHeight());
    if (document.documentElement) observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  } else {
    const observer = new MutationObserver(() => publishHeight());
    observer.observe(document.documentElement, {childList: true, subtree: true, attributes: true});
  }

  requestAnimationFrame(publishHeight);
})();
