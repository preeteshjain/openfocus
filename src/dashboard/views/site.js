import { h, icon, favicon, toggle, select, row, label, card, popoverMenu, toast, nodes, tabs } from "../ui.js";
import { state, save, siteById } from "../state.js";
import { modeEditor, blockChecklist, statBlock, goto } from "../components.js";
import { attemptsChart, attemptsTable, chartLegend } from "../chart.js";
import { DURATIONS, DAILY_LIMIT_OPTIONS } from "../../lib/defaults.js";
import { totals, last24, minutesSaved, dailySeries, urgeTrend } from "../../lib/stats.js";
import { formatSaved, formatCount, formatSeconds, formatAgo } from "../../lib/format.js";
import { normalizeEntry, isValidHost, splitEntry } from "../../lib/match.js";
import { activeBlockFor, scheduleStatus } from "../../lib/schedule.js";

const view = { tab: "insights", table: false, scopeOpen: false };

function lockedByStrict(site) {
  return state.config.strict && !!activeBlockFor(state.config.blocks, site.id);
}

function removeSite(site) {
  if (lockedByStrict(site)) {
    toast("Strict mode is on and this site is in a running focus block.");
    return;
  }
  save((c) => {
    c.sites = c.sites.filter((s) => s.id !== site.id);
    for (const b of c.blocks) if (Array.isArray(b.sites)) b.sites = b.sites.filter((id) => id !== site.id);
  }).then(() => {
    toast(`${site.name} removed`);
    goto("#/home");
  });
}

function insightsTab(site) {
  const stats = state.stats;
  const all = totals(stats, site.id);
  const day = last24(stats, site.id);
  const series = dailySeries(stats, site.id, 14);
  const hasData = series.some((d) => d.a > 0);
  const trend = urgeTrend(stats, site);
  const week = dailySeries(stats, site.id, 7).reduce((sum, d) => sum + d.s, 0);
  const today = series[series.length - 1].s;
  const intentions = stats.intentions.filter((i) => i.s === site.id).slice(0, 5);

  const parts = [];
  if (!trend) parts.push(h("p", { class: "stats-hint" }, `Give it a week. After that you will see how your visits to ${site.name} change over time.`));

  parts.push(
    h(
      "div",
      { class: "grid-2", style: { marginTop: "14px" } },
      h(
        "div",
        { class: "tile" },
        h("h2", { class: "card-title t-green" }, icon("hand"), "Times you walked away"),
        h(
          "p",
          { class: "card-text" },
          trend
            ? `Your first week had ${trend.firstWeek} ${trend.firstWeek === 1 ? "visit" : "visits"}. Now you average ${trend.average} a week.`
            : `Each time you leave ${site.name} at the pause, it counts here.`
        ),
        h("div", { class: "stat-row" }, statBlock(formatCount(all.p), "Walked away"), statBlock(formatSaved(minutesSaved(all.p)), "Time back"))
      ),
      h(
        "div",
        { class: "tile" },
        h("h2", { class: "card-title t-amber" }, icon("clock"), "Past 24 hours"),
        h("p", { class: "card-text" }, `Visits to ${site.name} you started and then skipped.`),
        h("div", { class: "stat-row" }, statBlock(formatCount(day.p), "Walked away"), statBlock(formatSaved(minutesSaved(day.p)), "Time back"))
      ),
      h(
        "div",
        { class: "tile" },
        h("h2", { class: "card-title" }, icon("schedule"), `Time on ${site.name}`),
        h("p", { class: "card-text" }, "Counted only while the tab is in view."),
        h("div", { class: "stat-row" }, statBlock(formatSeconds(today), "Today"), statBlock(formatSeconds(week), "Past 7 days"))
      ),
      h(
        "div",
        { class: "tile" },
        h("h2", { class: "card-title" }, icon("arrowRight"), "Visits"),
        h("p", { class: "card-text" }, `Last time you went in: ${formatAgo(stats.lastUse[site.id])}.`),
        h("div", { class: "stat-row" }, statBlock(formatCount(all.c), "Opened"), statBlock(formatCount(all.a), "Tried"))
      )
    )
  );

  if (hasData) {
    parts.push(
      h(
        "div",
        { class: "card", style: { marginTop: "14px" } },
        h(
          "div",
          { class: "chart-head" },
          h("h2", { class: "card-title", style: { margin: 0 } }, "The past two weeks"),
          h("button", { class: "btn small", type: "button", onClick: () => { view.table = !view.table; rerenderSite(); } }, view.table ? "Show chart" : "Show table")
        ),
        view.table ? null : chartLegend(),
        view.table ? attemptsTable(series) : attemptsChart(series)
      )
    );
  }

  if (intentions.length) {
    parts.push(
      label("What you came to do"),
      h("div", { class: "card" }, h("ul", { class: "intentions" }, intentions.map((i) => h("li", null, `“${i.text}”`, h("time", null, formatAgo(i.t))))))
    );
  }
  return parts;
}

function scopeEditor(site) {
  const locked = lockedByStrict(site);
  const list = (key, title, hint) => {
    const entries = site.scope[key];
    const input = h("input", { class: "input", placeholder: key === "include" ? "e.g. youtube.com/shorts" : "e.g. music.youtube.com", disabled: locked });
    const add = () => {
      const entry = normalizeEntry(input.value);
      if (!isValidHost(splitEntry(entry).host)) {
        toast("Use a domain like example.com or example.com/path");
        return;
      }
      if (entries.includes(entry)) return;
      save(() => site.scope[key].push(entry));
    };
    input.addEventListener("keydown", (e) => e.key === "Enter" && add());
    return [
      h("div", { class: "row-title", style: { margin: "4px 0 8px" } }, title),
      h(
        "div",
        { class: "scope-list" },
        entries.length
          ? entries.map((e) =>
              h(
                "div",
                { class: "scope-item" },
                h("code", null, e),
                h(
                  "button",
                  {
                    class: "icon-btn",
                    type: "button",
                    "aria-label": `Remove ${e}`,
                    disabled: locked || (key === "include" && entries.length === 1),
                    onClick: () => save(() => (site.scope[key] = entries.filter((x) => x !== e)))
                  },
                  icon("x")
                )
              )
            )
          : h("p", { class: "muted", style: { margin: 0, fontSize: "13px" } }, "Nothing here yet.")
      ),
      h("div", { class: "scope-add" }, input, h("button", { class: "btn", type: "button", onClick: add, disabled: locked }, "Add")),
      h("p", { class: "hint" }, hint)
    ];
  };
  return h(
    "div",
    { class: "card", style: { marginTop: "10px" } },
    list("include", "Pause on", "Each entry covers the domain and its subdomains. Add a path to cover one part only, like youtube.com/shorts."),
    h("hr", { class: "divider", style: { margin: "18px 0" } }),
    list("exclude", "Never pause on", "Keep parts of the site open, like a work subdomain.")
  );
}

function rulesTab(site) {
  const { config } = state;
  const locked = lockedByStrict(site);
  const sched = scheduleStatus(config.schedule);
  const mins = config.reinterventionMinutes;

  return [
    label("Pause"),
    card(
      row(
        `Pause before ${site.name} opens`,
        site.interventionEnabled ? null : "Off. Focus blocks and daily limits still apply.",
        toggle(site.interventionEnabled, (v) => save(() => (site.interventionEnabled = v)), { label: "Pause before the site opens" })
      )
    ),
    modeEditor(site),
    label("Pause length"),
    select(
      [{ value: "default", label: `Same as default (${config.duration} seconds)` }, ...DURATIONS],
      site.duration,
      (v) => save(() => (site.duration = v === "default" ? "default" : Number(v)), { render: false }),
      { cls: "select full", label: "Pause length" }
    ),
    label("Check-ins"),
    card(
      row(
        "Check in while I browse",
        `Pause again after ${mins} ${mins === 1 ? "minute" : "minutes"} on ${site.name}. Change the time in Settings.`,
        toggle(site.reintervention, (v) => save(() => (site.reintervention = v), { render: false }), { label: "Check in while I browse" })
      )
    ),
    label("Timing and limits"),
    card(
      row(
        "Schedule",
        site.schedule === "always" ? "Always on, even outside your active hours." : `Follows your active hours. ${sched.label}.`,
        select(
          [
            { value: "global", label: "Follow active hours" },
            { value: "always", label: "Always on" }
          ],
          site.schedule,
          (v) => save(() => (site.schedule = v)),
          { label: "Schedule" }
        )
      ),
      row(
        "Daily limit",
        site.dailyLimit
          ? `After ${site.dailyLimit} ${site.dailyLimit === 1 ? "visit" : "visits"} in a day, ${site.name} rests until midnight.`
          : "Open it as often as you choose.",
        select(
          DAILY_LIMIT_OPTIONS.map((n) => ({ value: n, label: n ? `${n} ${n === 1 ? "visit" : "visits"} a day` : "No limit" })),
          site.dailyLimit,
          (v) => save(() => (site.dailyLimit = Number(v))),
          { label: "Daily limit" }
        )
      )
    ),
    label("Focus blocks"),
    h("div", { class: "card", style: { padding: "8px 10px" } }, blockChecklist(site, { onChange: rerenderSite })),
    label("Which pages"),
    h(
      "button",
      {
        type: "button",
        class: "field-box",
        style: { width: "100%", cursor: "pointer", textAlign: "left" },
        "aria-expanded": String(view.scopeOpen),
        onClick: () => {
          view.scopeOpen = !view.scopeOpen;
          rerenderSite();
        }
      },
      h("span", null, h("div", { class: "row-title" }, "Domains and paths"), h("div", { class: "row-desc" }, site.scope.include.join(", "))),
      icon(view.scopeOpen ? "x" : "chevronRight")
    ),
    view.scopeOpen ? scopeEditor(site) : null,
    locked ? h("div", { class: "lock-note" }, icon("lock"), "Strict mode is on and a focus block is running for this site. Pages and removal stay locked until it ends.") : null,
    h("hr", { class: "divider" }),
    h("button", { class: "btn danger", type: "button", disabled: locked, onClick: () => removeSite(site) }, icon("trash"), `Remove ${site.name}`)
  ];
}

let rerenderSite = () => {};

export function renderSite(siteId, tab) {
  const site = siteById(siteId);
  if (!site) return [h("div", { class: "empty" }, "This site is no longer on your list. ", h("a", { href: "#/home" }, "Back home"))];
  if (tab) view.tab = tab;

  const menuWrap = h("div", { class: "menu-wrap" });
  menuWrap.append(
    h(
      "button",
      {
        class: "icon-btn",
        type: "button",
        "aria-label": "More actions",
        onClick: () =>
          popoverMenu(menuWrap, [
            { label: `Visit ${site.name}`, icon: "external", onClick: () => chrome.tabs.create({ url: `https://${site.domain}` }) },
            {
              label: site.interventionEnabled ? "Turn off pauses" : "Turn on pauses",
              icon: "pause",
              onClick: () => save(() => (site.interventionEnabled = !site.interventionEnabled))
            },
            { label: `Remove ${site.name}`, icon: "trash", danger: true, disabled: lockedByStrict(site), onClick: () => removeSite(site) }
          ])
      },
      icon("dots")
    )
  );

  const body = h("div");
  rerenderSite = () => {
    const current = siteById(siteId);
    if (current) body.replaceChildren(...nodes(view.tab === "insights" ? insightsTab(current) : rulesTab(current)));
  };

  const container = h(
    "div",
    null,
    h("a", { class: "back", href: "#/home" }, icon("arrowLeft"), "All sites"),
    h("div", { class: "site-head" }, favicon(site.domain, "fav lg"), h("h1", null, site.name), menuWrap),
    tabs(
      [
        { value: "insights", label: "Insights" },
        { value: "rules", label: "Rules" }
      ],
      view.tab,
      (v) => {
        view.tab = v;
        history.replaceState(null, "", v === "rules" ? `#/site/${site.id}/rules` : `#/site/${site.id}`);
        rerenderSite();
      }
    ),
    body
  );
  rerenderSite();
  return [container];
}
