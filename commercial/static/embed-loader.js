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

    const isMobileCockpit = () => (
      Math.min(
        window.innerWidth || document.documentElement.clientWidth || 9999,
        document.documentElement.clientWidth || window.innerWidth || 9999
      ) <= 760
    );
    const mobileViewportHeight = () => Math.max(
      560,
      Math.round(
        window.visualViewport?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight ||
        760
      )
    );
    const syncFrameHeight = () => {
      if (!isMobileCockpit()) return false;
      const height = mobileViewportHeight();
      const focusBarHeight = focusActive ? 44 : 0;
      iframe.style.height = `${Math.max(516, height - focusBarHeight)}px`;
      host.style.minHeight = focusActive ? `${height}px` : `${height}px`;
      if (focusActive) host.style.height = `${height}px`;
      host.dataset.lacurentMobileCockpit = "true";
      return true;
    };
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.background = "#fff";
    iframe.setAttribute("data-lacurent-partner", partner);

    const focusBar = document.createElement("div");
    focusBar.setAttribute("data-lacurent-focus-bar", "");
    focusBar.style.display = "none";
    focusBar.style.height = "44px";
    focusBar.style.minHeight = "44px";
    focusBar.style.alignItems = "center";
    focusBar.style.justifyContent = "space-between";
    focusBar.style.gap = "10px";
    focusBar.style.padding = "0 10px";
    focusBar.style.boxSizing = "border-box";
    focusBar.style.borderBottom = "1px solid #e5e7eb";
    focusBar.style.background = "#ffffff";
    focusBar.style.fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
    focusBar.style.color = "#182230";

    const focusBack = document.createElement("button");
    focusBack.type = "button";
    focusBack.setAttribute("aria-label", "Înapoi la magazin");
    focusBack.textContent = "← Înapoi la magazin";
    focusBack.style.minHeight = "36px";
    focusBack.style.padding = "0 10px";
    focusBack.style.border = "0";
    focusBack.style.borderRadius = "9px";
    focusBack.style.background = "#eef6f1";
    focusBack.style.color = "#176c4b";
    focusBack.style.font = "inherit";
    focusBack.style.fontSize = "13px";
    focusBack.style.fontWeight = "750";
    focusBack.style.cursor = "pointer";

    const focusTitle = document.createElement("strong");
    focusTitle.textContent = host.dataset.focusTitle || "Calculator energetic";
    focusTitle.style.marginLeft = "auto";
    focusTitle.style.paddingRight = "4px";
    focusTitle.style.fontSize = "12px";
    focusTitle.style.whiteSpace = "nowrap";
    focusTitle.style.overflow = "hidden";
    focusTitle.style.textOverflow = "ellipsis";

    focusBar.append(focusBack, focusTitle);
    host.replaceChildren(focusBar, iframe);
    host.dataset.lacurentMounted = "true";

    const widthContainer = host.parentElement || host;
    let focusActive = false;
    let focusScrollY = 0;
    let focusHostStyle = "";
    let focusIframeStyle = "";
    let focusHtmlOverflow = "";
    let focusHtmlOverscroll = "";
    let focusBodyOverflow = "";
    let focusBodyOverscroll = "";

    const syncFrameWidth = () => {
      const parentRect = widthContainer.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const width = Math.max(
        1,
        Math.floor(
          (focusActive ? hostRect.width : parentRect.width) ||
          (focusActive ? host.clientWidth : widthContainer.clientWidth) ||
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
    const publishFocusState = active => {
      if (!iframe.contentWindow) return;
      iframe.contentWindow.postMessage({
        type: "lacurent:embed-focus-state",
        active: Boolean(active),
        viewportHeight: mobileViewportHeight()
      }, embedOrigin);
    };

    const syncFocusViewport = () => {
      if (!focusActive) return;
      const height = mobileViewportHeight();
      const offsetTop = Math.max(0, Math.round(window.visualViewport?.offsetTop || 0));
      host.style.top = `${offsetTop}px`;
      host.style.height = `${height}px`;
      host.style.minHeight = `${height}px`;
      iframe.style.height = `${Math.max(516, height - 44)}px`;
      syncFrameWidth();
      publishFocusState(true);
    };

    const enterFocus = () => {
      if (focusActive || !isMobileCockpit()) return;
      focusActive = true;
      focusScrollY = window.scrollY || window.pageYOffset || 0;
      focusHostStyle = host.getAttribute("style") || "";
      focusIframeStyle = iframe.getAttribute("style") || "";
      focusHtmlOverflow = document.documentElement.style.overflow;
      focusHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      focusBodyOverflow = document.body.style.overflow;
      focusBodyOverscroll = document.body.style.overscrollBehavior;

      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";

      host.dataset.lacurentFocusActive = "true";
      host.style.position = "fixed";
      host.style.left = "0";
      host.style.right = "0";
      host.style.bottom = "auto";
      host.style.width = "100vw";
      host.style.maxWidth = "100vw";
      host.style.margin = "0";
      host.style.padding = "0";
      host.style.zIndex = "2147483000";
      host.style.background = "#fff";
      host.style.display = "grid";
      host.style.gridTemplateRows = "44px minmax(0,1fr)";
      host.style.boxShadow = "0 0 0 1px rgba(16,24,40,.06), 0 12px 40px rgba(16,24,40,.16)";

      focusBar.style.display = "flex";
      iframe.style.width = "100%";
      iframe.style.maxWidth = "100%";
      iframe.style.minWidth = "0";
      iframe.style.minHeight = "0";

      syncFocusViewport();
      publishViewport();
    };

    const exitFocus = () => {
      if (!focusActive) return;
      focusActive = false;
      delete host.dataset.lacurentFocusActive;
      host.setAttribute("style", focusHostStyle);
      iframe.setAttribute("style", focusIframeStyle);
      focusBar.style.display = "none";

      document.documentElement.style.overflow = focusHtmlOverflow;
      document.documentElement.style.overscrollBehavior = focusHtmlOverscroll;
      document.body.style.overflow = focusBodyOverflow;
      document.body.style.overscrollBehavior = focusBodyOverscroll;

      publishFocusState(false);
      syncFrameWidth();
      syncFrameHeight();
      window.requestAnimationFrame(() => window.scrollTo(0, focusScrollY));
    };

    focusBack.addEventListener("click", exitFocus);
    window.addEventListener("keydown", event => {
      if (event.key === "Escape") exitFocus();
    });

    syncFrameWidth();
    requestAnimationFrame(() => {
      syncFrameWidth();
      requestAnimationFrame(syncFrameWidth);
    });
    window.setTimeout(syncFrameWidth, 120);
    syncFrameHeight();

    let widthObserver = null;
    if (typeof ResizeObserver === "function") {
      widthObserver = new ResizeObserver(syncFrameWidth);
      widthObserver.observe(widthContainer);
    } else {
      window.addEventListener("resize", syncFrameWidth);
    }

    iframe.addEventListener("load", syncFrameWidth);
    window.addEventListener("resize", syncFrameHeight, {passive:true});
    window.visualViewport?.addEventListener("resize", syncFrameHeight, {passive:true});

    let viewportRaf = 0;
    const publishViewport = () => {
      viewportRaf = 0;
      if (!iframe.contentWindow) return;
      const rect = iframe.getBoundingClientRect();
      const offset = Math.max(0, -rect.top);
      iframe.contentWindow.postMessage({
        type: "lacurent:embed-viewport",
        offset,
        viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0
      }, embedOrigin);
    };
    const scheduleViewport = () => {
      if (viewportRaf) return;
      viewportRaf = requestAnimationFrame(publishViewport);
    };
    window.addEventListener("scroll", scheduleViewport, {passive:true});
    window.addEventListener("resize", scheduleViewport, {passive:true});
    window.addEventListener("resize", syncFocusViewport, {passive:true});
    window.visualViewport?.addEventListener("resize", syncFocusViewport, {passive:true});
    window.visualViewport?.addEventListener("scroll", syncFocusViewport, {passive:true});
    iframe.addEventListener("load", () => {
      scheduleViewport();
      window.setTimeout(scheduleViewport, 120);
    });
    scheduleViewport();

    const onMessage = event => {
      if (event.origin !== embedOrigin || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data) return;

      if (data.type === "lacurent:embed-focus-request") {
        if (host.dataset.focusMode !== "off") enterFocus();
        return;
      }

      if (data.type !== "lacurent:embed-height") return;
      if (syncFrameHeight()) return;
      host.style.minHeight = "";
      delete host.dataset.lacurentMobileCockpit;
      const height = Math.max(560, Math.min(8000, Number(data.height) || 0));
      if (height) iframe.style.height = `${height}px`;
    };
    window.addEventListener("message", onMessage);

    iframe.addEventListener("load", () => {
      if (widthObserver) syncFrameWidth();
      syncFrameHeight();
    });
  }

  document.querySelectorAll("[data-lacurent-embed]").forEach(mount);
})();
