(() => {
  const root = document.querySelector("[data-lacurent-landing]");
  if (!root) return;

  const symbols = [...document.querySelectorAll("[data-scroll-symbol]")];
  if (!symbols.length) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    }, {threshold:0.08, rootMargin:"0px 0px -6% 0px"});
    symbols.forEach(symbol => observer.observe(symbol));
  } else {
    symbols.forEach(symbol => symbol.classList.add("is-visible"));
  }

  window.requestAnimationFrame(() => {
    if (symbols[0]) symbols[0].classList.add("is-visible");
  });

  const stage = document.querySelector(".lc-renewable-stage");
  const hero = document.querySelector(".lc-hero");
  const intro = document.querySelector(".lc-intro");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopScene = window.matchMedia("(min-width: 721px)");
  const topbar = document.querySelector(".lc-topbar");

  const sun = document.querySelector(".lc-renewable-sun");
  let sunReentryTimer = 0;
  let lastSunPulseAt = 0;

  function triggerSunReentry() {
    if (!sun || reducedMotion.matches) return;

    const now = Date.now();
    if (now - lastSunPulseAt < 500) return;
    lastSunPulseAt = now;

    sun.classList.remove("is-reentering");
    void sun.offsetWidth;
    sun.classList.add("is-reentering");

    window.clearTimeout(sunReentryTimer);
    sunReentryTimer = window.setTimeout(() => {
      sun.classList.remove("is-reentering");
    }, 1900);
  }

  function updatePinnedRenewables() {
    if (!stage || !intro || reducedMotion.matches) {
      stage?.classList.remove("is-scroll-pinned");
      if (stage) {
        stage.style.opacity = "";
        stage.style.removeProperty("--renewable-pin-y");
        stage.style.removeProperty("--renewable-release-y");
      }
      return;
    }

    const y = window.scrollY;
    const topOffset = Math.max(0, topbar?.offsetHeight || 0);
    const releaseStart = Math.max(0, intro.offsetTop - topOffset);
    const pinY = Math.max(0, Math.min(y, releaseStart));

    stage.classList.remove("is-scroll-pinned");
    stage.style.opacity = "1";
    stage.style.removeProperty("--renewable-release-y");
    stage.style.setProperty("--renewable-pin-y", `${pinY}px`);
  }

  let scrollFrame = 0;
  const schedulePinnedRenewables = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      updatePinnedRenewables();
    });
  };

  window.addEventListener("scroll", schedulePinnedRenewables, {passive:true});
  window.addEventListener("resize", schedulePinnedRenewables);
  reducedMotion.addEventListener?.("change", schedulePinnedRenewables);
  desktopScene.addEventListener?.("change", schedulePinnedRenewables);

  window.addEventListener("pageshow", triggerSunReentry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") triggerSunReentry();
  });

  updatePinnedRenewables();
  triggerSunReentry();
})();
