(() => {
  const form = document.getElementById("calculationForm");
  if (!form) return;

  const STORAGE_KEY = "lacurent-calculator-draft-v1";
  const VERSION = 1;
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const SKIP_TYPES = new Set(["button", "submit", "reset", "file", "image"]);
  let saveTimer = null;

  function storageGet() {
    try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function storageSet(value) {
    try { window.localStorage.setItem(STORAGE_KEY, value); return true; } catch { return false; }
  }
  function storageRemove() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
  }
  function currentLanguage() {
    try { return window.localStorage.getItem("lacurent-language") === "en" ? "en" : "ro"; } catch { return "ro"; }
  }
  function controls() {
    return [...form.elements].filter((control) => control?.name && !control.disabled && !SKIP_TYPES.has(String(control.type || "").toLowerCase()));
  }
  function captureFields() {
    return controls().map((control) => {
      const type = String(control.type || control.tagName || "").toLowerCase();
      const field = { name: control.name, type, value: control.value ?? "" };
      if (type === "checkbox" || type === "radio") field.checked = Boolean(control.checked);
      return field;
    });
  }
  function snapshot() {
    return { version: VERSION, savedAt: Date.now(), fields: captureFields() };
  }
  function validDraft(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.version !== VERSION || !Array.isArray(parsed.fields)) return null;
      if (!Number.isFinite(parsed.savedAt) || Date.now() - parsed.savedAt > MAX_AGE_MS) {
        storageRemove();
        return null;
      }
      return parsed;
    } catch {
      storageRemove();
      return null;
    }
  }
  function matchingControl(saved) {
    const candidates = controls().filter((control) => control.name === saved.name);
    if (!candidates.length) return null;
    if (saved.type === "radio" || saved.type === "checkbox") {
      return candidates.find((control) => String(control.value) === String(saved.value)) || candidates[0];
    }
    return candidates[0];
  }
  function restoreDraft(draft) {
    for (const saved of draft.fields) {
      const control = matchingControl(saved);
      if (!control) continue;
      if (saved.type === "radio" || saved.type === "checkbox") control.checked = Boolean(saved.checked);
      else {
        control.value = saved.value ?? "";
        control.setAttribute?.("value", control.value);
      }
    }
    const root = document.querySelector("[data-location-selector]");
    const locality = document.getElementById("localitySearch");
    const localityId = document.getElementById("localityId");
    if (root && locality) root.dataset.initialLocality = locality.value || "";
    if (root && localityId) root.dataset.initialLocalityId = localityId.value || "";
    return true;
  }

  const bar = document.createElement("div");
  bar.className = "simple-intro calculator-autosave-note";
  bar.setAttribute("data-calculator-autosave", "");
  bar.innerHTML = `<div><strong data-autosave-title></strong><span data-autosave-copy></span><small data-autosave-status role="status" aria-live="polite"></small></div><button class="secondary-action" type="button" data-autosave-clear></button>`;
  form.prepend(bar);

  const title = bar.querySelector("[data-autosave-title]");
  const copy = bar.querySelector("[data-autosave-copy]");
  const status = bar.querySelector("[data-autosave-status]");
  const clearButton = bar.querySelector("[data-autosave-clear]");

  function updateCopy() {
    const english = currentLanguage() === "en";
    title.textContent = english ? "Automatic save is on. " : "Salvarea automată este activă. ";
    copy.textContent = english ? "Your calculator data stays in this browser for 30 days." : "Datele calculatorului rămân în acest browser timp de 30 de zile.";
    clearButton.textContent = english ? "Clear saved data" : "Șterge datele salvate";
  }
  function setStatus(ro, en = ro) {
    status.textContent = currentLanguage() === "en" ? en : ro;
  }
  function saveDraft() {
    if (storageSet(JSON.stringify(snapshot()))) {
      setStatus("Salvat automat.", "Saved automatically.");
      return true;
    }
    setStatus("Salvarea locală nu este disponibilă în acest browser.", "Local saving is not available in this browser.");
    return false;
  }
  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 180);
  }

  updateCopy();
  const draft = validDraft(storageGet());
  if (draft && restoreDraft(draft)) setStatus("Datele salvate au fost restaurate.", "Saved data was restored.");
  else setStatus("Modificările se salvează automat.", "Changes are saved automatically.");

  form.addEventListener("input", scheduleSave, true);
  form.addEventListener("change", scheduleSave, true);
  form.addEventListener("submit", saveDraft, true);
  window.addEventListener("pagehide", saveDraft);

  const localityId = document.getElementById("localityId");
  if (localityId) {
    new MutationObserver(scheduleSave).observe(localityId, { attributes: true, attributeFilter: ["value"] });
  }

  clearButton.addEventListener("click", () => {
    storageRemove();
    setStatus("Datele salvate au fost șterse. Valorile curente rămân pe pagină.", "Saved data was cleared. Current values remain on the page.");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest?.("[data-site-language]")) return;
    window.setTimeout(() => {
      updateCopy();
      setStatus("Modificările se salvează automat.", "Changes are saved automatically.");
    }, 0);
  });

  window.__lacurentCalculatorDraft = { save: saveDraft, clear: storageRemove, storageKey: STORAGE_KEY };
})();