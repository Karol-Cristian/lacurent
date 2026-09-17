(() => {
  const STORAGE_KEY = "lacurent-language";
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const translatableAttributes = ["placeholder", "aria-label", "title"];

  function currentLanguage() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === "en" ? "en" : "ro";
    } catch {
      return "ro";
    }
  }

  function storeLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The visible switch must still work for the current page if storage is unavailable.
    }
  }

  function shouldSkipText(node) {
    const parent = node.parentElement;
    return !parent || ["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA"].includes(parent.tagName);
  }

  function rememberElementAttributes(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    let saved = originalAttributes.get(element);
    if (!saved) {
      saved = {};
      originalAttributes.set(element, saved);
    }
    for (const name of translatableAttributes) {
      if (element.hasAttribute(name) && !(name in saved)) saved[name] = element.getAttribute(name);
    }
  }

  function rememberSubtree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (!shouldSkipText(root) && !originalText.has(root)) originalText.set(root, root.nodeValue || "");
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

    if (root.nodeType === Node.ELEMENT_NODE) rememberElementAttributes(root);
    root.querySelectorAll?.("[placeholder], [aria-label], [title]").forEach(rememberElementAttributes);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!shouldSkipText(node) && !originalText.has(node)) originalText.set(node, node.nodeValue || "");
    }
  }

  function translateOriginal(value, language) {
    if (language !== "en") return value;
    const raw = String(value ?? "");
    const trimmed = raw.trim();
    if (trimmed === "Limbă") return raw.replace(trimmed, "Language");
    return typeof window.lcT === "function" ? window.lcT(raw) : raw;
  }

  function applyToSubtree(root, language) {
    rememberSubtree(root);

    const applyText = (node) => {
      if (shouldSkipText(node)) return;
      const original = originalText.get(node);
      if (original !== undefined) node.nodeValue = translateOriginal(original, language);
    };

    if (root.nodeType === Node.TEXT_NODE) {
      applyText(root);
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) {
      const saved = originalAttributes.get(root);
      if (saved) {
        for (const [name, original] of Object.entries(saved)) root.setAttribute(name, translateOriginal(original, language));
      }
    }

    root.querySelectorAll?.("[placeholder], [aria-label], [title]").forEach((element) => {
      const saved = originalAttributes.get(element);
      if (!saved) return;
      for (const [name, original] of Object.entries(saved)) element.setAttribute(name, translateOriginal(original, language));
    });

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) applyText(walker.currentNode);
  }

  function updateSwitchState(language) {
    document.querySelectorAll("[data-site-language]").forEach((button) => {
      const active = button.dataset.siteLanguage === language;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    document.querySelectorAll("[data-language-label]").forEach((label) => {
      label.textContent = language === "en" ? "Language" : "Limbă";
    });
  }

  function applyLanguage(language) {
    document.documentElement.lang = language;
    applyToSubtree(document.body, language);
    updateSwitchState(language);
    window.dispatchEvent(new CustomEvent("lacurent:languagechange", { detail: { language } }));
  }

  function handleLanguageClick(event) {
    const button = event.target.closest?.("[data-site-language]");
    if (!button) return;
    const language = button.dataset.siteLanguage === "en" ? "en" : "ro";

    event.preventDefault();
    event.stopImmediatePropagation();
    storeLanguage(language);

    // Language switching must never contact the Worker. This is intentionally
    // client-side on every route, including POST-generated result pages.
    applyLanguage(language);
  }

  function init() {
    if (!document.body) return;
    rememberSubtree(document.body);
    updateSwitchState(currentLanguage());
    document.addEventListener("click", handleLanguageClick, true);

    const observer = new MutationObserver((mutations) => {
      const language = currentLanguage();
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          rememberSubtree(node);
          if (language === "en" && typeof window.lcT === "function") applyToSubtree(node, language);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.lacurentSetLanguage = (language) => {
      const normalized = language === "en" ? "en" : "ro";
      storeLanguage(normalized);
      applyLanguage(normalized);
    };
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init, { once: true });
})();
