(() => {
  const root = document.querySelector("[data-elivio-chat]");
  if (!root) return;

  const form = root.querySelector("[data-chat-form]");
  const input = root.querySelector("[data-chat-input]");
  const log = root.querySelector("[data-chat-log]");
  const badge = root.querySelector("[data-stage-badge]");
  const stageSteps = [...root.querySelectorAll("[data-stage-step]")];
  const quick = root.querySelector("[data-chat-quick]");
  const actions = root.querySelector("[data-chat-actions]");
  const messages = [];

  const setStage = (stage) => {
    const value = Math.min(Math.max(Number(stage) || 1, 1), 4);
    if (badge) badge.textContent = value + " / 4";
    stageSteps.forEach((step) => {
      const stepNo = Number(step.dataset.stageStep);
      step.classList.toggle("active", stepNo === value);
      step.classList.toggle("done", stepNo < value);
    });
  };

  const addMessage = (role, text, pending = false) => {
    const el = document.createElement("div");
    el.className = "ec-message " + role + (pending ? " pending" : "");
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };

  const luhnValid = (raw) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    const parity = digits.length % 2;
    [...digits].forEach((char, index) => {
      let digit = Number(char);
      if (index % 2 === parity) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    });
    return sum % 10 === 0;
  };

  const sensitiveKind = (text) => {
    if (/(?:^|\D)[1-8]\d{12}(?:\D|$)/.test(text)) return "CNP";
    const numberCandidates = text.match(/(?:\d[ -]?){13,19}/g) || [];
    if (numberCandidates.some(luhnValid)) return "date de card";
    if (/\bRO\d{2}[A-Z0-9]{20}\b/i.test(text)) return "IBAN";
    if (/\b(parol[ăa]|password|pin)\b\s*(?:este|e|:|=)\s*\S{4,}/i.test(text)) return "parolă sau cod";
    if (/\b(adresa mea|locuiesc|stau)\b.{0,40}\b(strada|str\.|calea|bulevardul|bd\.)\b.{0,50}\b(?:nr\.?\s*)?\d+\b/i.test(text)) return "adresă completă";
    return "";
  };

  const showBookingAction = (action) => {
    if (!actions || !action || action.type !== "booking") return;
    actions.hidden = false;
    actions.innerHTML = "";
    const button = document.createElement("a");
    button.className = "ec-chat-action";
    button.href = action.target || "#contact";
    button.textContent = action.label || "Mergi la programări";
    button.addEventListener("click", () => {
      const target = document.querySelector(button.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    actions.appendChild(button);
  };

  const submitText = async (text) => {
    const clean = text.trim();
    if (!clean) return;

    const blocked = sensitiveKind(clean);
    if (blocked) {
      addMessage(
        "assistant",
        "Am oprit mesajul înainte să fie trimis: pare să conțină " + blocked + ". Șterge acea informație și spune-mi doar contextul de care ai nevoie."
      );
      input.value = clean;
      input.focus();
      return;
    }

    input.value = "";
    input.disabled = true;
    form.querySelector("button").disabled = true;
    if (quick) quick.hidden = true;

    messages.push({ role: "user", content: clean });
    addMessage("user", clean);
    const pending = addMessage("assistant", "Un moment…", true);

    try {
      const response = await fetch("/elivio-consilio/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ messages })
      });
      const data = await response.json();

      if (!response.ok) {
        pending.remove();
        if (data.code === "sensitive_data") {
          messages.pop();
          addMessage("assistant", data.error || "Mesajul conține date pe care nu este nevoie să le trimiți aici.");
          input.value = clean;
          return;
        }
        throw new Error(data.error || "Nu am putut continua conversația.");
      }

      const reply = String(data.reply || "Nu am putut genera un răspuns acum.");
      pending.remove();
      addMessage("assistant", reply);
      messages.push({ role: "assistant", content: reply });
      setStage(data.stage || 1);
      showBookingAction(data.action);

      if (Number(data.stage) >= 4 && !data.crisis) {
        input.placeholder = "Poți întreba ceva sau poți merge direct la programare…";
      }
    } catch (error) {
      if (pending.isConnected) pending.remove();
      addMessage("assistant", "Nu pot continua chatul chiar acum. Poți merge direct la secțiunea de programări.");
      showBookingAction({ type: "booking", label: "Mergi la programări", target: "#contact" });
    } finally {
      input.disabled = false;
      form.querySelector("button").disabled = false;
      input.focus();
    }
  };

  setStage(1);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitText(input.value);
  });

  root.querySelectorAll("[data-quick-message]").forEach((button) => {
    button.addEventListener("click", () => submitText(button.dataset.quickMessage || ""));
  });
})();
