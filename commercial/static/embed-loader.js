(() => {
  "use strict";

  const script = document.currentScript;
  if (!script) return;
  const sourceUrl = new URL(script.src, window.location.href);
  const embedOrigin = sourceUrl.origin;

  function mount(host) {
    if (host.dataset.lacurentMounted === "true") return;
    const partner = (host.dataset.partner || "").trim();
    if (!partner) {
      host.textContent = "LaCurent embed: missing data-partner.";
      return;
    }

    host.style.display = "block";
    host.style.width = "100%";
    host.style.maxWidth = "none";
    host.style.minWidth = "0";
    host.style.boxSizing = "border-box";

    const iframe = document.createElement("iframe");
    iframe.src = `${embedOrigin}/embed/${encodeURIComponent(partner)}`;
    iframe.title = host.dataset.title || "Calculator energetic";
    iframe.loading = host.dataset.loading || "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.width = "100%";
    iframe.style.maxWidth = "none";
    iframe.style.minWidth = "0";
    iframe.style.boxSizing = "border-box";
    iframe.style.height = host.dataset.initialHeight || "900px";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.background = "#fff";
    iframe.setAttribute("data-lacurent-partner", partner);
    host.replaceChildren(iframe);
    host.dataset.lacurentMounted = "true";

    const widthContainer = host.parentElement || host;
    const syncFrameWidth = () => {
      const parentRect = widthContainer.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const width = Math.max(
        1,
        Math.floor(
          parentRect.width ||
          widthContainer.clientWidth ||
          hostRect.width ||
          host.clientWidth ||
          0
        )
      );
      if (!width) return;
      iframe.setAttribute("width", String(width));
      iframe.style.width = `${width}px`;
      host.dataset.lacurentFrameWidth = String(width);
    };
    syncFrameWidth();
    requestAnimationFrame(() => {
      syncFrameWidth();
      requestAnimationFrame(syncFrameWidth);
    });
    window.setTimeout(syncFrameWidth, 120);

    let widthObserver = null;
    if (typeof ResizeObserver === "function") {
      widthObserver = new ResizeObserver(syncFrameWidth);
      widthObserver.observe(widthContainer);
    } else {
      window.addEventListener("resize", syncFrameWidth);
    }

    iframe.addEventListener("load", syncFrameWidth);

    const onMessage = event => {
      if (event.origin !== embedOrigin || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== "lacurent:embed-height") return;
      const height = Math.max(560, Math.min(8000, Number(data.height) || 0));
      if (height) iframe.style.height = `${height}px`;
    };
    window.addEventListener("message", onMessage);

    iframe.addEventListener("load", () => {
      if (widthObserver) syncFrameWidth();
    });
  }

  document.querySelectorAll("[data-lacurent-embed]").forEach(mount);
})();
