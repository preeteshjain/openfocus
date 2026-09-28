import { h, icon, nodes } from "./ui.js";
import { init, setRenderer } from "./state.js";
import { renderHome } from "./views/home.js";
import { renderSite } from "./views/site.js";
import { renderSchedule } from "./views/schedule.js";
import { renderSettings } from "./views/settings.js";
import { statusCard } from "./views/status.js";
import { openHelp } from "./components.js";

const NAV = [
  { id: "home", label: "Home", icon: "home" },
  { id: "schedule", label: "Schedule", icon: "schedule" },
  { id: "settings", label: "Settings", icon: "settings" }
];

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "site" && parts[1]) return { name: "site", id: parts[1], tab: parts[2] === "rules" ? "rules" : "insights" };
  if (parts[0] === "schedule" || parts[0] === "settings") return { name: parts[0] };
  return { name: "home" };
}

let lastRouteKey = "";

function render() {
  const route = parseRoute();
  document.getElementById("nav").replaceChildren(
    ...NAV.map((n) => {
      const active = route.name === n.id || (route.name === "site" && n.id === "home");
      return h("a", { href: `#/${n.id}`, class: active ? "active" : null, "aria-current": active ? "page" : null }, icon(n.icon), n.label);
    })
  );
  document.getElementById("status").replaceChildren(statusCard());

  const view = document.getElementById("view");
  const routeKey = JSON.stringify(route);
  const scroll = window.scrollY;
  const content =
    route.name === "site"
      ? renderSite(route.id, route.tab)
      : route.name === "schedule"
        ? renderSchedule()
        : route.name === "settings"
          ? renderSettings()
          : renderHome();
  view.replaceChildren(...nodes(content));
  window.scrollTo(0, routeKey === lastRouteKey ? scroll : 0);
  lastRouteKey = routeKey;

  const titles = { home: "Home", schedule: "Schedule", settings: "Settings", site: "Site" };
  document.title = `${titles[route.name]} · OpenFocus`;
}

async function main() {
  await init();
  setRenderer(render);
  window.addEventListener("hashchange", render);
  const help = document.getElementById("help");
  help.append(icon("help"), "Help and questions");
  help.setAttribute("aria-label", "Help and questions");
  help.addEventListener("click", openHelp);
  render();
  // Keeps status text like "Active until 18:00" current.
  setInterval(() => {
    if (!document.querySelector(".modal-backdrop") && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      document.getElementById("status").replaceChildren(statusCard());
    }
  }, 30000);
}

main();
