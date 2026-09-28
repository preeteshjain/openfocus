import { h, icon, favicon } from "../ui.js";
import { state, save } from "../state.js";
import { openSiteModal, statBlock, modeSummary } from "../components.js";
import { newSite } from "../../lib/defaults.js";
import { normalizeEntry, isValidHost, splitEntry } from "../../lib/match.js";
import { searchCatalog, prettyName, catalogName, SUGGESTED } from "../../lib/catalog.js";
import { totals, last24, minutesSaved, annualized } from "../../lib/stats.js";
import { formatSaved, formatCount } from "../../lib/format.js";
import { activeBlockFor } from "../../lib/schedule.js";

export async function addSite(input) {
  const { host } = splitEntry(normalizeEntry(input));
  if (!isValidHost(host)) return null;
  const existing = state.config.sites.find((s) => s.domain === host);
  if (existing) return existing;
  const site = newSite(host, catalogName(host) || prettyName(host));
  await save((c) => c.sites.push(site));
  return site;
}

function focusAdd() {
  document.getElementById("site-add")?.focus();
}

async function addAndConfigure(domain) {
  const site = await addSite(domain);
  if (site) openSiteModal(site.id, { onAddMore: focusAdd });
}

function addBox() {
  const wrap = h("div", { class: "add-site" });
  const input = h("input", {
    type: "text",
    id: "site-add",
    placeholder: "Add a site, like instagram.com",
    "aria-label": "Add a site",
    autocomplete: "off",
    spellcheck: "false"
  });
  let results = null;
  let items = [];
  let active = 0;

  const close = () => {
    results?.remove();
    results = null;
  };
  const pick = (item) => {
    close();
    input.value = "";
    addAndConfigure(item.domain);
  };
  const draw = () => {
    close();
    const q = input.value;
    const taken = state.config.sites.map((s) => s.domain);
    items = searchCatalog(q, taken);
    const typed = splitEntry(normalizeEntry(q)).host;
    if (typed && isValidHost(typed) && !taken.includes(typed) && !items.some((i) => i.domain === typed)) {
      items = [...items, { name: prettyName(typed), domain: typed, custom: true }];
    }
    if (!items.length) return;
    active = Math.min(active, items.length - 1);
    results = h(
      "div",
      { class: "search-results", role: "listbox" },
      items.map((it, i) =>
        h(
          "button",
          {
            type: "button",
            class: "search-item",
            role: "option",
            "aria-selected": String(i === active),
            onMousedown: (e) => e.preventDefault(),
            onClick: () => pick(it)
          },
          favicon(it.domain),
          h("span", { class: "grow" }, h("div", null, it.custom ? `Add ${it.domain}` : it.name), it.custom ? null : h("div", { class: "sub" }, it.domain)),
          icon("plus")
        )
      )
    );
    wrap.append(results);
  };

  input.addEventListener("input", () => {
    active = 0;
    draw();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !results) {
      const typed = splitEntry(normalizeEntry(input.value)).host;
      if (isValidHost(typed)) pick({ domain: typed });
      return;
    }
    if (!results) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
      draw();
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      close();
    }
  });
  input.addEventListener("blur", () => setTimeout(close, 120));

  const addBtn = h(
    "button",
    {
      class: "btn primary small",
      type: "button",
      onClick: () => {
        if (items[active]) pick(items[active]);
        else input.focus();
      }
    },
    "Add"
  );
  wrap.append(h("label", { class: "add-box" }, icon("plus"), input, addBtn));
  return wrap;
}

function siteRow(site) {
  const saved = minutesSaved(totals(state.stats, site.id).p);
  const blocked = activeBlockFor(state.config.blocks, site.id);
  return h(
    "a",
    { class: "site-row", href: `#/site/${site.id}` },
    h("span", { class: "fav-wrap" }, favicon(site.domain)),
    h(
      "span",
      { class: "grow" },
      h("div", { class: "name" }, site.name, blocked ? h("span", { class: "chip-tag clay" }, icon("lock"), "Resting") : null),
      h("div", { class: "meta" }, modeSummary(site))
    ),
    h("span", { class: "saved" }, h("div", { class: "v" }, formatSaved(saved)), h("div", { class: "l" }, "back")),
    icon("chevronRight", "icon chev")
  );
}

function greeting(now = new Date()) {
  const hr = now.getHours();
  if (hr < 5) return "Still up?";
  if (hr < 12) return "Good morning";
  if (hr < 18) return "Good afternoon";
  return "Good evening";
}

export function renderHome() {
  const { stats, config } = state;
  const all = totals(stats);
  const day = last24(stats);
  const yearly = annualized(stats, stats.since);
  const sites = config.sites;
  const suggestions = SUGGESTED.filter((d) => !sites.some((s) => s.domain === d));
  const now = new Date();

  const heroLine = all.p
    ? `You walked away ${all.p.toLocaleString()} ${all.p === 1 ? "time" : "times"}. That is about ${formatSaved(minutesSaved(all.p))} back.`
    : "Every time you walk away, you win back a little time. It adds up here.";

  return [
    h(
      "div",
      { class: "page-head" },
      h("p", { class: "eyebrow" }, now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })),
      h("h1", { class: "page-title" }, greeting(now))
    ),
    h(
      "section",
      { class: "hero" },
      h(
        "div",
        null,
        h("h2", null, heroLine),
        h("div", { class: "stat-row" }, statBlock(formatCount(all.p), "Walked away"), statBlock(formatSaved(minutesSaved(all.p)), "Time back"))
      ),
      h("div", { class: "hero-orb", "aria-hidden": "true" })
    ),
    h(
      "div",
      { class: "grid-2", style: { marginTop: "14px" } },
      h(
        "div",
        { class: "tile" },
        h("h2", { class: "card-title t-green" }, icon("clock"), "Past 24 hours"),
        h("p", { class: "card-text" }, "Visits you started and then chose to skip."),
        h("div", { class: "stat-row" }, statBlock(formatCount(day.p), "Walked away"), statBlock(formatSaved(minutesSaved(day.p)), "Time back"))
      ),
      h(
        "div",
        { class: "tile" },
        h("h2", { class: "card-title t-amber" }, icon("calendar"), "Yearly pace"),
        h("p", { class: "card-text" }, "Where the next 12 months land if you keep this up."),
        h("div", { class: "stat-row" }, statBlock(formatCount(yearly), "Walked away"), statBlock(formatSaved(minutesSaved(yearly)), "Time back"))
      )
    ),
    h("h2", { class: "section-title" }, "Your sites"),
    addBox(),
    sites.length
      ? h("div", { class: "card flush site-list" }, sites.map(siteRow))
      : h("div", { class: "card empty", style: { marginTop: "12px" } }, "No sites yet. Add the ones that pull you in the most."),
    suggestions.length
      ? h(
          "div",
          { class: "suggest" },
          suggestions.slice(0, sites.length ? 4 : 6).map((d) =>
            h("button", { type: "button", onClick: () => addAndConfigure(d) }, icon("plus"), favicon(d), catalogName(d))
          )
        )
      : null
  ];
}
