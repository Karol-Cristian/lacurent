const form = document.getElementById("calculationForm");

if (form) {
  form.addEventListener("submit", () => {
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Se calculează...";
      button.setAttribute("aria-busy", "true");
    }
  });
}

document.getElementById("printButton")?.addEventListener("click", () => {
  window.print();
});
