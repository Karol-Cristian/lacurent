(() => {
  const root = document.querySelector("[data-elivio-chat]");
  if (!root) return;

  const form = root.querySelector("[data-chat-form]");
  const input = root.querySelector("[data-chat-input]");
  const log = root.querySelector("[data-chat-log]");
  const badge = root.querySelector("[data-stage-badge]");
  const stageSteps = [...root.querySelectorAll("[data-stage-step]")];
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

  setStage(1);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    input.disabled = true;
    form.querySelector("button").disabled = true;

    messages.push({ role: "user", content: text });
    addMessage("user", text);
    const pending = addMessage("assistant", "Mă uit la ce ai spus…", true);

    try {
      const response = await fetch("/elivio-consilio/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ messages })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut continua conversația.");

      const reply = String(data.reply || "Nu am putut genera un răspuns acum.");
      pending.remove();
      addMessage("assistant", reply);
      messages.push({ role: "assistant", content: reply });
      setStage(data.stage || 1);

      if (Number(data.stage) >= 4 && !data.crisis) {
        input.placeholder = "Poți pune o ultimă întrebare sau merge la programare…";
      }
    } catch (error) {
      pending.remove();
      addMessage("assistant", "Conexiunea nu este disponibilă momentan. Poți continua direct din secțiunea de contact.");
    } finally {
      input.disabled = false;
      form.querySelector("button").disabled = false;
      input.focus();
    }
  });
})();
