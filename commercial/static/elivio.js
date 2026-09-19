(() => {
  const root = document.querySelector("[data-elivio-chat]");
  const contactForm = document.querySelector("[data-contact-form]");
  const conversationMessages = [];
  let contextSummaryRequest = null;

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

  const fillContactFromConversation = async () => {
    if (!contactForm) return;

    const userMessages = conversationMessages.filter((item) => item.role === "user");
    if (!userMessages.length) return;

    const messageField = contactForm.querySelector('textarea[name="message"]');
    const note = contactForm.querySelector("[data-chat-context-note]");
    if (!messageField) return;

    if (messageField.value.trim() && messageField.dataset.chatGenerated !== "true") {
      return;
    }

    if (contextSummaryRequest) {
      await contextSummaryRequest;
      return;
    }

    const fallback = () => {
      const useful = userMessages
        .map((item) => item.content.trim())
        .filter((text) => text && !/^vreau (să mă programez|o programare)/i.test(text))
        .slice(-3);
      if (!useful.length) return "";
      const combined = useful.join(" ").slice(0, 850);
      return "Aș dori să discut despre următoarea situație: " + combined;
    };

    contextSummaryRequest = (async () => {
      try {
        const response = await fetch("/elivio-consilio/api/chat-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ messages: conversationMessages })
        });
        const data = await response.json();
        const summary = response.ok ? String(data.summary || "").trim() : "";
        const value = summary || fallback();
        if (value && (!messageField.value.trim() || messageField.dataset.chatGenerated === "true")) {
          messageField.value = value.slice(0, 1000);
          messageField.dataset.chatGenerated = "true";
          if (note) {
            note.hidden = false;
            note.textContent = "Am completat acest câmp pe baza conversației din chat. Îl poți modifica înainte de trimitere.";
          }
        }
      } catch (error) {
        const value = fallback();
        if (value && (!messageField.value.trim() || messageField.dataset.chatGenerated === "true")) {
          messageField.value = value;
          messageField.dataset.chatGenerated = "true";
          if (note) {
            note.hidden = false;
            note.textContent = "Am completat acest câmp pe baza conversației din chat. Îl poți modifica înainte de trimitere.";
          }
        }
      } finally {
        contextSummaryRequest = null;
      }
    })();

    await contextSummaryRequest;
  };

  if (root) {
    const form = root.querySelector("[data-chat-form]");
    const input = root.querySelector("[data-chat-input]");
    const log = root.querySelector("[data-chat-log]");
    const quick = root.querySelector("[data-chat-quick]");
    const actions = root.querySelector("[data-chat-actions]");
    const panel = root.querySelector("[data-chat-panel]");
    const launcher = root.querySelector("[data-chat-launcher]");
    const closeButton = root.querySelector("[data-chat-close]");
    const messages = conversationMessages;

    const setOpen = (open) => {
      panel.hidden = !open;
      launcher.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        setTimeout(() => input.focus(), 40);
      }
    };

    const addMessage = (role, text, pending = false) => {
      const el = document.createElement("div");
      el.className = "ec-message " + role + (pending ? " pending" : "");
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    };

    const showBookingAction = (action) => {
      if (!actions || !action || action.type !== "booking") return;
      actions.hidden = false;
      actions.innerHTML = "";
      const button = document.createElement("a");
      button.className = "ec-chat-action";
      button.href = action.target || "#contact";
      button.textContent = action.label || "Mergi la programări";
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        setOpen(false);
        await fillContactFromConversation();
        const target = document.querySelector(button.getAttribute("href"));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
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
          "Mesajul nu a fost trimis, deoarece pare să conțină " + blocked + ". Elimină această informație și păstrează doar contextul relevant."
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
            addMessage("assistant", data.error || "Mesajul conține date pe care nu este necesar să le trimiți aici.");
            input.value = clean;
            return;
          }
          throw new Error(data.error || "Nu am putut continua conversația.");
        }

        const reply = String(data.reply || "Nu am putut genera un răspuns acum.");
        pending.remove();
        addMessage("assistant", reply);
        messages.push({ role: "assistant", content: reply });
        showBookingAction(data.action);

        if (Number(data.stage) >= 4 && !data.crisis) {
          input.placeholder = "Poți întreba ceva sau poți merge la programare…";
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

    launcher.addEventListener("click", () => setOpen(panel.hidden));
    closeButton.addEventListener("click", () => setOpen(false));

    document.querySelectorAll("[data-chat-open]").forEach((button) => {
      button.addEventListener("click", () => setOpen(true));
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitText(input.value);
    });

    root.querySelectorAll("[data-quick-message]").forEach((button) => {
      button.addEventListener("click", () => submitText(button.dataset.quickMessage || ""));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
  }

  if (contactForm) {
    const method = contactForm.querySelector("[data-contact-method]");
    const phoneField = contactForm.querySelector("[data-phone-field]");
    const emailField = contactForm.querySelector("[data-email-field]");
    const status = contactForm.querySelector("[data-contact-status]");
    const destination = (contactForm.dataset.contactEmail || "").trim();
    const messageField = contactForm.querySelector('textarea[name="message"]');
    const contextNote = contactForm.querySelector("[data-chat-context-note]");

    if (messageField) {
      messageField.addEventListener("input", () => {
        if (messageField.dataset.chatGenerated === "true") {
          messageField.dataset.chatGenerated = "false";
          if (contextNote) {
            contextNote.textContent = "Textul a fost modificat de tine.";
          }
        }
      });
    }

    document.querySelectorAll('a[href="#contact"]').forEach((link) => {
      link.addEventListener("click", () => {
        fillContactFromConversation();
      });
    });

    const contactSection = document.querySelector("#contact");
    if (contactSection && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fillContactFromConversation();
        }
      }, { threshold: 0.18 });
      observer.observe(contactSection);
    }

    const syncMethod = () => {
      const wantsEmail = method.value === "email";
      phoneField.hidden = wantsEmail;
      emailField.hidden = !wantsEmail;
      phoneField.querySelector("input").required = !wantsEmail;
      emailField.querySelector("input").required = wantsEmail;
    };

    method.addEventListener("change", syncMethod);
    syncMethod();

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      status.textContent = "";

      const data = new FormData(contactForm);
      const name = String(data.get("name") || "").trim();
      const preferredMethod = String(data.get("method") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const email = String(data.get("email") || "").trim();
      const preferredTime = String(data.get("time") || "").trim();
      const message = String(data.get("message") || "").trim();

      const blocked = sensitiveKind(message);
      if (blocked) {
        status.textContent = "Mesajul pare să conțină " + blocked + ". Elimină acea informație și încearcă din nou.";
        return;
      }

      if (!destination) {
        status.textContent = "Formularul este pregătit, dar adresa de contact Elivio nu este încă configurată.";
        return;
      }

      const subject = "Cerere de contact Elivio Consilio";
      const body = [
        "Nume: " + name,
        "Metodă de contact preferată: " + (preferredMethod === "email" ? "e-mail" : "telefon"),
        phone ? "Telefon: " + phone : "",
        email ? "E-mail: " + email : "",
        "Interval preferat: " + preferredTime,
        "",
        "Mesaj:",
        message || "—"
      ].filter(Boolean).join("\n");

      status.textContent = "Se deschide aplicația ta de e-mail cu cererea completată.";
      window.location.href = "mailto:" + encodeURIComponent(destination) +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
    });
  }
})();
