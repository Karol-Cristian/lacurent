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

    const iframe = document.createElement("iframe");
    iframe.src = `${embedOrigin}/embed/${encodeURIComponent(partner)}`;
    iframe.title = host.dataset.title || "Calculator energetic";
    iframe.loading = host.dataset.loading || "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.width = "100%";
    iframe.style.height = host.dataset.initialHeight || "900px";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.background = "#fff";
    iframe.setAttribute("data-lacurent-partner", partner);
    host.replaceChildren(iframe);
    host.dataset.lacurentMounted = "true";

    const onMessage = event => {
      if (event.origin !== embedOrigin || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== "lacurent:embed-height") return;
      const height = Math.max(560, Math.min(8000, Number(data.height) || 0));
      if (height) iframe.style.height = `${height}px`;
    };
    window.addEventListener("message", onMessage);
  }

  document.querySelectorAll("[data-lacurent-embed]").forEach(mount);
})();
