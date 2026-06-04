const ACTIVE_HOME_KEY = "lacurent_active_house_id";

function activeHouseId() {
  return localStorage.getItem(ACTIVE_HOME_KEY);
}

function setActiveHouseId(id) {
  if (id) {
    localStorage.setItem(ACTIVE_HOME_KEY, String(id));
  } else {
    localStorage.removeItem(ACTIVE_HOME_KEY);
  }
}

async function loadHomes() {
  if (!window.LaCurentAuth?.token()) {
    return [];
  }
  const result = await window.LaCurentAuth.api("/api/homes");
  return result.homes || [];
}

function scoreLabel(home) {
  return home?.overall_score === null || home?.overall_score === undefined
    ? "--"
    : String(Math.round(home.overall_score));
}

async function refreshHomeContext() {
  const scoreEl = document.getElementById("sidebarActiveScore");
  const homeEl = document.getElementById("sidebarActiveHome");
  const metaEl = document.getElementById("sidebarActiveMeta");
  const switcher = document.getElementById("homeSwitcher");
  const select = document.getElementById("activeHomeSelect");

  if (!scoreEl || !homeEl || !metaEl) return [];

  try {
    const homes = await loadHomes();
    if (!homes.length) {
      scoreEl.textContent = "--";
      homeEl.textContent = "Nicio locuință";
      metaEl.textContent = "Adaugă prima analiză";
      if (switcher) switcher.hidden = true;
      return [];
    }

    let currentId = activeHouseId();
    if (!currentId || !homes.some(home => String(home.id) === String(currentId))) {
      currentId = homes[0].id;
      setActiveHouseId(currentId);
    }

    const activeHome = homes.find(home => String(home.id) === String(currentId)) || homes[0];
    scoreEl.textContent = scoreLabel(activeHome);
    homeEl.textContent = activeHome.display_name || activeHome.city || `Locuință #${activeHome.id}`;
    metaEl.textContent = activeHome.estimated_energy_class
      ? `Clasă ${activeHome.estimated_energy_class} · ${activeHome.implemented_actions || 0} decizii`
      : "Analiză în așteptare";

    if (switcher && select) {
      switcher.hidden = false;
      select.innerHTML = "";
      homes.forEach(home => {
        const option = document.createElement("option");
        option.value = home.id;
        option.textContent = home.display_name || home.city || `Locuință #${home.id}`;
        option.selected = String(home.id) === String(currentId);
        select.append(option);
      });
      select.onchange = () => {
        setActiveHouseId(select.value);
        window.location.reload();
      };
    }

    window.dispatchEvent(new CustomEvent("lacurent:homes-loaded", { detail: { homes, activeHome } }));
    return homes;
  } catch {
    return [];
  }
}

window.LaCurentHomes = {
  activeHouseId,
  load: loadHomes,
  refresh: refreshHomeContext,
  setActiveHouseId
};

window.addEventListener("DOMContentLoaded", refreshHomeContext);

function hideSidebar(sidebar) {
  sidebar?.classList.remove("open");
  sidebar?.classList.add("sidebar-hidden");
  document.body.classList.add("sidebar-collapsed");
}

function showSidebar(sidebar) {
  sidebar?.classList.remove("sidebar-hidden");
  sidebar?.classList.add("open");
  document.body.classList.remove("sidebar-collapsed");
}

document.addEventListener("click", event => {
  const sidebar = document.querySelector(".sidebar");
  const menuButton = document.getElementById("menuBtn");
  if (menuButton?.contains(event.target)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showSidebar(sidebar);
    return;
  }
  if (event.target.closest("[data-sidebar-close]")) {
    hideSidebar(sidebar);
    return;
  }
  if (!sidebar || sidebar.classList.contains("sidebar-hidden")) return;
  if (sidebar.contains(event.target) || menuButton?.contains(event.target)) return;
  hideSidebar(sidebar);
}, true);
