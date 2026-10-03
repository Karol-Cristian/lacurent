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
  const intro = document.querySelector(".lc-intro");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const topbar = document.querySelector(".lc-topbar");

  const sun = document.querySelector(".lc-renewable-sun");
  let sunReentryTimer = 0;
  let lastSunPulseAt = 0;

  const revealGroups = [
    [".lc-intro-grid > *", 0, 90],
    [".lc-budget-copy > *", 0, 85],
    [".lc-budget-metrics article", 0, 70],
    [".lc-catalog-promo-copy > *", 0, 85],
    [".lc-close > div", 0, 110],
    [".lc-close-action > *", 80, 80],
    [".lc-footer > *", 0, 90],
  ];

  const revealTargets = [];
  revealGroups.forEach(([selector, startDelay, step]) => {
    document.querySelectorAll(selector).forEach((node, index) => {
      node.dataset.lcReveal = "";
      node.style.setProperty("--lc-motion-delay", `${startDelay + index * step}ms`);
      revealTargets.push(node);
    });
  });

  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -7% 0px" });
    revealTargets.forEach(node => revealObserver.observe(node));
  } else {
    revealTargets.forEach(node => node.classList.add("is-revealed"));
  }

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

  window.addEventListener("pageshow", triggerSunReentry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") triggerSunReentry();
  });

  updatePinnedRenewables();
  triggerSunReentry();
})();
