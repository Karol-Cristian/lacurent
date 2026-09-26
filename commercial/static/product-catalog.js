(() => {
  const root = document.querySelector("[data-product-catalog]");
  if (!root) return;

  const cards = [...root.querySelectorAll("[data-product-card]")];
  const buttons = [...root.querySelectorAll("[data-product-filter]")];
  const search = root.querySelector("#productSearch");
  const count = root.querySelector("[data-product-visible-count]");
  const empty = root.querySelector("[data-product-empty]");
  let active = "all";

  function apply() {
    const query = (search?.value || "").trim().toLocaleLowerCase("ro");
    let visible = 0;
    cards.forEach((card) => {
      const categoryMatch = active === "all" || card.dataset.category === active;
      const haystack = (card.dataset.search || "").toLocaleLowerCase("ro");
      const searchMatch = !query || haystack.includes(query);
      const show = categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (count) count.textContent = String(visible);
    if (empty) empty.hidden = visible !== 0;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      active = button.dataset.productFilter || "all";
      buttons.forEach((item) => item.classList.toggle("is-active", item === button));
      apply();
    });
  });
  search?.addEventListener("input", apply);
  apply();
})();
