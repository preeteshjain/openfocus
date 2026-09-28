import { h, icon, favicon, toggle, select, row, label, card, modal, toast, laptop, previewFlow } from "../ui.js";
import { state, save, rerender } from "../state.js";
import { playPreview, pauseKind } from "../components.js";
import { DURATIONS, INTERVAL_OPTIONS, SWITCHING_OPTIONS, INTERVENTION_TYPES, TYPING_LENGTHS, withDefaults } from "../../lib/defaults.js";
import { emptyStats } from "../../lib/stats.js";
import { saveStats } from "../../lib/storage.js";

let incognitoAllowed = true;
chrome.extension.isAllowedIncognitoAccess((allowed) => {
  if (incognitoAllowed !== allowed) {
    incognitoAllowed = allowed;
    rerender();
  }
});

let resetArmed = false;

function openTypeSettings(typeId) {
  const info = INTERVENTION_TYPES.find((t) => t.id === typeId);
  modal({
    title: info.name,
    body: (render, close) => {
      const cfg = state.config;
      const selected = cfg.interventions.types;
      const parts = [h("p", { class: "muted", style: { margin: "2px 0 0" } }, info.description)];
      if (typeId === "tide") {
        const area = h("textarea", { class: "input", value: cfg.interventions.tideText, "aria-label": "Opening line" });
        area.addEventListener("change", () =>
          save((c) => (c.interventions.tideText = area.value.trim() || "Let’s take one slow, deep breath."), { render: false })
        );
        parts.push(label("Opening line"), area, h("p", { class: "hint" }, "Shown in the middle of the screen while the wave rises."));
      }
      if (typeId === "breath") {
        const area = h("textarea", { class: "input", value: cfg.interventions.breathText, "aria-label": "Opening line" });
        area.addEventListener("change", () =>
          save((c) => (c.interventions.breathText = area.value.trim() || "Slow down. Breathe with the circle."), { render: false })
        );
        parts.push(label("Opening line"), area, h("p", { class: "hint" }, "Shown above the circle while you breathe."));
      }
      if (typeId === "typing") {
        parts.push(
          label("Code length"),
          select(TYPING_LENGTHS, cfg.interventions.typingLength, (v) => save((c) => (c.interventions.typingLength = Number(v)), { render: false }), {
            cls: "select full",
            label: "Code length"
          })
        );
      }
      if (typeId === "reflect") {
        const input = h("input", { class: "input full", value: cfg.interventions.reflectPrompt, "aria-label": "Question" });
        input.addEventListener("change", () =>
          save((c) => (c.interventions.reflectPrompt = input.value.trim() || "What brings you to {site} right now?"), { render: false })
        );
        parts.push(label("Question"), input, h("p", { class: "hint" }, "Write {site} where the site name should go. Answers appear on each site's Insights tab."));
      }
      parts.push(
        h("hr", { class: "divider" }),
        h(
          "div",
          { style: { display: "flex", gap: "10px", flexWrap: "wrap" } },
          h("button", { class: "btn", type: "button", onClick: () => playPreview(typeId) }, icon("play"), "Try it"),
          h(
            "button",
            {
              class: "btn danger",
              type: "button",
              disabled: selected.length <= 1,
              onClick: () => {
                save((c) => (c.interventions.types = c.interventions.types.filter((t) => t !== typeId)));
                close();
              }
            },
            "Stop using"
          )
        ),
        selected.length <= 1 ? h("p", { class: "hint" }, "Keep at least one pause style turned on.") : null
      );
      return parts;
    },
    footer: (close) => h("button", { class: "btn primary", type: "button", onClick: close }, "Done"),
    onClose: rerender
  });
}

function typeList() {
  const selected = state.config.interventions.types;
  return h(
    "div",
    { class: "card flush" },
    INTERVENTION_TYPES.map((t) => {
      const on = selected.includes(t.id);
      return h(
        "div",
        { class: "type-row" },
        laptop(t.id, 88),
        h("div", { class: "type-info" }, h("h3", null, t.name, on ? h("span", { class: "badge" }, "On") : null), h("p", null, t.description)),
        h(
          "div",
          { class: "type-actions" },
          h("button", { class: "btn small", type: "button", "aria-label": `Try ${t.name}`, onClick: () => playPreview(t.id) }, icon("play"), "Try"),
          on
            ? h("button", { class: "btn small", type: "button", onClick: () => openTypeSettings(t.id) }, "Edit")
            : h("button", { class: "btn small primary", type: "button", onClick: () => save((c) => c.interventions.types.push(t.id)) }, "Use")
        )
      );
    })
  );
}

function checkinSites() {
  const sites = state.config.sites;
  if (!sites.length) return h("span", { class: "muted", style: { fontSize: "13px" } }, "Add sites first");
  return h(
    "div",
    { class: "site-chips" },
    sites.map((s) =>
      h(
        "button",
        {
          class: "site-chip",
          type: "button",
          "aria-pressed": String(s.reintervention),
          onClick: (e) => {
            const next = !s.reintervention;
            e.currentTarget.setAttribute("aria-pressed", String(next));
            save(() => (s.reintervention = next), { render: false });
          }
        },
        favicon(s.domain),
        s.name
      )
    )
  );
}

function exportSettings() {
  const blob = new Blob([JSON.stringify({ app: "openfocus", version: 4, config: state.config }, null, 2)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: `openfocus-settings-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importSettings() {
  const input = h("input", { type: "file", accept: "application/json,.json" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const config = JSON.parse(await file.text())?.config;
      if (!config || !Array.isArray(config.sites)) throw new Error("bad file");
      const next = withDefaults(config);
      await save((c) => Object.assign(c, next));
      toast("Settings loaded");
    } catch {
      toast("That file is not an OpenFocus settings file");
    }
  });
  input.click();
}

export function renderSettings() {
  const cfg = state.config;
  return [
    h("div", { class: "page-head" }, h("h1", { class: "page-title" }, "Settings"), h("p", { class: "page-sub" }, "Shape the pause so it slows you down without getting in your way.")),
    incognitoAllowed
      ? null
      : h(
          "div",
          { class: "banner" },
          icon("incognito"),
          h(
            "div",
            null,
            h("h3", null, "Incognito windows are not covered"),
            h(
              "p",
              null,
              "Open ",
              h("a", { href: "#", onClick: (e) => { e.preventDefault(); chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` }); } }, "the extension details"),
              " in Chrome and turn on Allow in Incognito."
            )
          )
        ),

    label("Pause styles"),
    typeList(),
    h("p", { class: "hint" }, "Turn on more than one and OpenFocus mixes them up, so the pause never turns into a habit you skip past. The first one also shows in the previews."),

    label("Pause length"),
    card(
      row(
        "Default length",
        "How long one pause takes. Each site can set its own.",
        select(DURATIONS, cfg.duration, (v) => save((c) => (c.duration = Number(v)), { render: false }), { label: "Default length" })
      ),
      row(
        "Longer with each try",
        "Adds 2 seconds for every visit in the past 24 hours, up to 40 seconds more.",
        toggle(cfg.escalate, (v) => save((c) => (c.escalate = v), { render: false }), { label: "Longer with each try" })
      )
    ),

    label("After the pause"),
    card(
      row(
        "When you open a site",
        "How long it stays open before the next pause.",
        select(SWITCHING_OPTIONS, cfg.switching, (v) => save((c) => (c.switching = v), { render: false }), { label: "When you open a site" })
      ),
      row(
        "When you leave",
        "Close the tab instead of going to a new tab page.",
        toggle(cfg.closeTabOnExit, (v) => save((c) => (c.closeTabOnExit = v), { render: false }), { label: "Close the tab when you leave" })
      )
    ),

    label("Check-ins"),
    h(
      "div",
      { class: "card" },
      previewFlow([
        { kind: pauseKind(), label: "Pause" },
        { kind: "scroll", label: "Browse" },
        { kind: pauseKind(), label: "Check-in" }
      ]),
      h("p", { class: "card-text", style: { margin: "14px 0 0" } }, "Long sessions are where time slips away. A check-in pauses you again after a set time, so you can decide whether to keep going.")
    ),
    h(
      "div",
      { class: "card flush", style: { marginTop: "10px" } },
      row("Check in on", null, checkinSites()),
      row(
        "Check in every",
        "Time on the site before the next pause.",
        select(
          INTERVAL_OPTIONS.map((m) => ({ value: m, label: `${m} ${m === 1 ? "minute" : "minutes"}` })),
          cfg.reinterventionMinutes,
          (v) => save((c) => (c.reinterventionMinutes = Number(v)), { render: false }),
          { label: "Check in every" }
        )
      )
    ),

    label("Your data"),
    card(
      row("Save a backup", "Download your sites, schedule and settings as a file.", h("button", { class: "btn small", type: "button", onClick: exportSettings }, icon("download"), "Download")),
      row("Load a backup", "Replace your current settings with a saved file.", h("button", { class: "btn small", type: "button", onClick: importSettings }, icon("upload"), "Load")),
      row(
        "Clear history",
        "Deletes all counts and charts. Your settings stay.",
        h(
          "button",
          {
            class: "btn small danger",
            type: "button",
            onClick: async (e) => {
              if (!resetArmed) {
                resetArmed = true;
                e.currentTarget.textContent = "Click again to clear";
                setTimeout(() => (resetArmed = false), 4000);
                return;
              }
              resetArmed = false;
              await saveStats(emptyStats());
              toast("History cleared");
            }
          },
          "Clear"
        )
      )
    ),

    label("About"),
    h(
      "div",
      { class: "card" },
      h(
        "p",
        { class: "card-text", style: { margin: 0 } },
        `OpenFocus ${chrome.runtime.getManifest().version}. Free and open source under the MIT license. Your data never leaves this device, and there is no account or tracking.`
      )
    )
  ];
}
