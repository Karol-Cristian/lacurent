(() => {
  "use strict";

  const launcher = document.querySelector("[data-hlp-launcher]");
  const shell = document.querySelector("[data-hlp-demo-shell]");
  const frame = document.querySelector("[data-hlp-demo-frame]");
  if (!launcher || !shell || !frame) return;

  const launch = () => {
    if (!frame.src) frame.src = "/home-lab-next";
    launcher.hidden = true;
    shell.hidden = false;
    shell.scrollIntoView({behavior:"smooth", block:"start"});
  };

  document.querySelectorAll("[data-hlp-launch]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      launch();
    });
  });

  document.querySelector("[data-hlp-close-demo]")?.addEventListener("click", () => {
    shell.hidden = true;
    launcher.hidden = false;
    launcher.scrollIntoView({behavior:"smooth", block:"center"});
  });
})();