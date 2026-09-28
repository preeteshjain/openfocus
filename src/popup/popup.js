import { loadAll, saveConfig } from "../lib/storage.js";
import { newSite } from "../lib/defaults.js";
import { findSite, normalizeEntry, isValidHost } from "../lib/match.js";
import { catalogName, prettyName } from "../lib/catalog.js";
import { totals, minutesSaved, last24 } from "../lib/stats.js";
import { formatSaved } from "../lib/format.js";
import { scheduleStatus, anyActiveBlock, formatWhen, activeBlockFor } from "../lib/schedule.js";
import { startBreak, endBreak, breaksLeft } from "../lib/breaks.js";

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter(Boolean));
  return node;
}

function faviconUrl(domain) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", `https://${domain}`);
  url.searchParams.set("size", "32");
  return url.toString();
}

async function render() {
  const { config, stats, runtime } = await loadAll();
  const now = new Date();

  const all = totals(stats);
  const saved = formatSaved(minutesSaved(all.p));
  $("saved").textContent = saved === "–" ? "Your time back shows here" : `${saved} back so far`;
  $("saved-sub").textContent = all.p ? `You walked away ${all.p.toLocaleString()} ${all.p === 1 ? "time" : "times"}` : "Walk away from a site to start the count";

  let kind;
  let title;
  let text;
  const blocks = anyActiveBlock(config.blocks, now);
  if (runtime.breakUntil > now.getTime()) {
    kind = "break";
    title = "On a break";
    text = `until ${formatWhen(new Date(runtime.breakUntil), now)}`;
  } else if (blocks.length) {
    kind = "block";
    title = "Focus block on";
    text = blocks.length === 1 ? blocks[0].name : `${blocks.length} blocks`;
  } else {
    const s = scheduleStatus(config.schedule, now);
    kind = s.active ? "on" : "off";
    title = s.active ? "OpenFocus is on" : "OpenFocus is off";
    text = s.label.replace(/^(Active|Off) /, "");
  }
  $("status").replaceChildren(el("span", { className: `dot ${kind}` }), el("span", { textContent: title }), el("span", { className: "sub", textContent: text }));

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const siteBox = $("site");
  siteBox.hidden = true;
  if (tab?.url && /^https?:/.test(tab.url)) {
    const site = findSite(config.sites, tab.url);
    const host = normalizeEntry(new URL(tab.url).hostname);
    if (site) {
      const recent = last24(stats, site.id);
      const blocked = activeBlockFor(config.blocks, site.id, now);
      siteBox.replaceChildren(
        el("img", { src: faviconUrl(site.domain), alt: "" }),
        el(
          "div",
          { className: "grow" },
          el("div", { className: "name", textContent: site.name }),
          el("div", { className: "meta", textContent: blocked ? "Resting until the block ends" : `${recent.a} ${recent.a === 1 ? "try" : "tries"} in the past 24 hours` })
        ),
        el("button", {
          className: "small",
          textContent: "Rules",
          onclick: () => chrome.tabs.create({ url: chrome.runtime.getURL(`src/dashboard/index.html#/site/${site.id}/rules`) })
        })
      );
      siteBox.hidden = false;
    } else if (isValidHost(host)) {
      siteBox.replaceChildren(
        el("img", { src: faviconUrl(host), alt: "" }),
        el("div", { className: "grow" }, el("div", { className: "name", textContent: host }), el("div", { className: "meta", textContent: "Not paused yet" })),
        el("button", {
          className: "small primary",
          textContent: "Pause this site",
          onclick: async () => {
            config.sites.push(newSite(host, catalogName(host) || prettyName(host)));
            await saveConfig(config);
            render();
          }
        })
      );
      siteBox.hidden = false;
    }
  }

  const breaks = $("breaks");
  if (runtime.breakUntil > now.getTime()) {
    breaks.replaceChildren(el("div", { className: "breaks-row" }, el("button", { className: "small", textContent: "End break now", onclick: () => endBreak().then(render) })));
  } else {
    const left = breaksLeft(config, runtime);
    breaks.replaceChildren(
      el("p", { className: "breaks-label", textContent: left === Infinity ? "Need a breather?" : `Need a breather? ${left} ${left === 1 ? "break" : "breaks"} left today` }),
      el(
        "div",
        { className: "breaks-row" },
        ...[
          ["15", "15 min"],
          ["60", "1 hour"],
          ["today", "Today"]
        ].map(([k, label]) => el("button", { className: "small", textContent: label, disabled: left <= 0, onclick: () => startBreak(k).then(render) }))
      )
    );
  }
}

$("open-dashboard").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

render();
