(() => {
  const screens = [...document.querySelectorAll("[data-screen]")];
  const navButtons = [...document.querySelectorAll(".lc-nav [data-go]")];
  const storyModal = document.getElementById("storyModal");
  const toast = document.getElementById("conceptToast");

  function go(name) {
    const target = screens.find(screen => screen.dataset.screen === name);
    if (!target) return;
    screens.forEach(screen => screen.classList.toggle("is-active", screen === target));
    navButtons.forEach(button => button.classList.toggle("is-active", button.dataset.go === name));
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      go(button.dataset.go);
    });
  });

  document.querySelectorAll("[data-segment]").forEach(group => {
    group.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        group.querySelectorAll("button").forEach(item => item.classList.remove("is-selected"));
        button.classList.add("is-selected");
      });
    });
  });

  document.querySelectorAll(".lc-plan-toggle").forEach(button => {
    button.addEventListener("click", () => {
      button.classList.toggle("is-on");
      button.closest(".lc-plan-item")?.classList.toggle("is-off", !button.classList.contains("is-on"));
    });
  });

  document.querySelector("[data-open-story]")?.addEventListener("click", () => storyModal?.showModal());
  document.querySelector("[data-close-story]")?.addEventListener("click", () => storyModal?.close());
  storyModal?.addEventListener("click", event => {
    if (event.target === storyModal) storyModal.close();
  });

  document.querySelector("[data-demo-select='location']")?.addEventListener("click", () => {
    const button = document.querySelector("[data-demo-select='location']");
    if (!button) return;
    const current = button.querySelector("b")?.textContent || "";
    const next = current.includes("Cluj") ? "Brașov" : "Cluj-Napoca";
    button.querySelector("b").textContent = next;
  });

  document.querySelectorAll("[data-demo-toast]").forEach(button => {
    button.addEventListener("click", () => {
      if (!toast) return;
      toast.classList.add("is-visible");
      window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
    });
  });

  go("home");
})();
