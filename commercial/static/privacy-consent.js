(() => {
  "use strict";

  const CONSENT_KEY = "lacurent-privacy-v1";
  const CONSENT_VERSION = 1;
  const LOCAL_DRAFT_PREFIXES = [
    "lacurent-home-lab-next-v1:",
    "lacurent-calculator-draft-v1",
  ];

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function parseConsent() {
    const raw = safeGet(CONSENT_KEY);
    if (!raw) {
      return {
        version: CONSENT_VERSION,
        decided: false,
        localAutosave: null,
        analytics: false,
        marketing: false,
      };
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.version !== CONSENT_VERSION) throw new Error("unsupported consent version");
      return {
        version: CONSENT_VERSION,
        decided: Boolean(parsed.decided),
        localAutosave: parsed.localAutosave === true ? true : parsed.localAutosave === false ? false : null,
        analytics: parsed.analytics === true,
        marketing: parsed.marketing === true,
        decidedAt: parsed.decidedAt || null,
      };
    } catch {
      return {
        version: CONSENT_VERSION,
        decided: false,
        localAutosave: null,
        analytics: false,
        marketing: false,
      };
    }
  }

  function writeConsent(next) {
    const payload = {
      version: CONSENT_VERSION,
      decided: true,
      localAutosave: next.localAutosave === true,
      analytics: next.analytics === true,
      marketing: next.marketing === true,
      decidedAt: new Date().toISOString(),
    };
    safeSet(CONSENT_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("lacurent:privacy-change", { detail: payload }));
    return payload;
  }

  function allowsLocalAutosave() {
    return parseConsent().localAutosave === true;
  }

  function allowsAnalytics() {
    return parseConsent().analytics === true;
  }

  function clearLocalDrafts() {
    try {
      const removals = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key) continue;
        if (LOCAL_DRAFT_PREFIXES.some(prefix => key === prefix || key.startsWith(prefix))) {
          removals.push(key);
        }
      }
      removals.forEach(key => window.localStorage.removeItem(key));
      window.dispatchEvent(new CustomEvent("lacurent:local-drafts-cleared"));
      return removals.length;
    } catch {
      return 0;
    }
  }

  function openPreferences() {
    const panel = document.querySelector("[data-lacurent-privacy-panel]");
    if (!panel) return;
    panel.hidden = false;
    panel.querySelector("[data-lacurent-allow-local]")?.focus();
  }

  function closePreferences() {
    const panel = document.querySelector("[data-lacurent-privacy-panel]");
    if (panel) panel.hidden = true;
  }

  function renderConsentState() {
    const state = parseConsent();
    document.querySelectorAll("[data-lacurent-storage-state]").forEach(node => {
      node.textContent = state.localAutosave === true
        ? "Salvarea locală este activă."
        : state.localAutosave === false
          ? "Salvarea locală este oprită."
          : "Nu ai ales încă dacă permiți salvarea locală.";
    });
    const firstUse = document.querySelector("[data-lacurent-first-use-consent]");
    if (firstUse) firstUse.hidden = state.decided;
  }

  function bindControls() {
    renderConsentState();

    document.querySelectorAll("[data-lacurent-privacy-open]").forEach(button => {
      button.addEventListener("click", openPreferences);
    });
    document.querySelectorAll("[data-lacurent-privacy-close]").forEach(button => {
      button.addEventListener("click", closePreferences);
    });

    document.querySelectorAll("[data-lacurent-allow-local]").forEach(button => {
      button.addEventListener("click", () => {
        writeConsent({ ...parseConsent(), localAutosave: true });
        renderConsentState();
        closePreferences();
        window.location.reload();
      });
    });

    document.querySelectorAll("[data-lacurent-deny-local]").forEach(button => {
      button.addEventListener("click", () => {
        writeConsent({ ...parseConsent(), localAutosave: false, analytics: false, marketing: false });
        renderConsentState();
        closePreferences();
      });
    });

    document.querySelectorAll("[data-lacurent-clear-local]").forEach(button => {
      button.addEventListener("click", () => {
        const count = clearLocalDrafts();
        const status = document.querySelector("[data-lacurent-clear-status]");
        if (status) {
          status.textContent = count
            ? "Datele locale LaCurent au fost șterse de pe acest dispozitiv."
            : "Nu există simulări locale LaCurent de șters pe acest dispozitiv.";
        }
      });
    });

    window.addEventListener("lacurent:privacy-change", renderConsentState);
  }

  window.LaCurentPrivacy = Object.freeze({
    consentKey: CONSENT_KEY,
    getConsent: parseConsent,
    allowsLocalAutosave,
    allowsAnalytics,
    setLocalAutosave(value) {
      return writeConsent({ ...parseConsent(), localAutosave: Boolean(value) });
    },
    clearLocalDrafts,
    openPreferences,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindControls, { once: true });
  } else {
    bindControls();
  }
})();
