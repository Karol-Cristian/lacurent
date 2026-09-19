(() => {
  "use strict";
  if (window.parent === window) return;

  let lastHeight = 0;
  let focusRequested = false;

  function requestMobileFocus() {
    if (focusRequested) return;
    if ((window.innerWidth || document.documentElement.clientWidth || 9999) > 760) return;
    focusRequested = true;
    window.parent.postMessage({
      type: "lacurent:embed-focus-request",
      partner: document.body?.dataset?.embedPartner || ""
    }, "*");
  }

  function applyFocusState(active) {
    document.body?.classList.toggle("embed-focus-active", Boolean(active));
    document.documentElement?.classList.toggle("embed-focus-active", Boolean(active));
    window.dispatchEvent(new CustomEvent("lacurent:embedfocuschange", {
      detail: {active: Boolean(active)}
    }));
    window.setTimeout(publishHeight, 0);
  }
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
  document.addEventListener("click", requestMobileFocus, {capture:true});

  window.addEventListener("message", event => {
    const data = event.data;
    if (!data || data.type !== "lacurent:embed-focus-state") return;
    applyFocusState(Boolean(data.active));
    if (!data.active) focusRequested = false;
  });

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
