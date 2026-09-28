import { h, icon, favicon, toggle, select, stepper, row, label, card, modal, radioCards, previewFlow } from "./ui.js";
import { state, save, siteById } from "./state.js";
import { INTERVAL_OPTIONS } from "../lib/defaults.js";

export function goto(hash) {
  location.hash = hash;
}

export function modeSummary(site) {
  if (!site.interventionEnabled) return "Paused. Only focus blocks and limits apply.";
  if (site.mode === "delayed") return `${site.delayMinutes} free ${site.delayMinutes === 1 ? "minute" : "minutes"} each hour, then a pause`;
  if (site.mode === "ask") return "Asks how long you want to stay";
  return "Pauses every time you open it";
}

export function pauseKind() {
  return state.config.interventions.types[0] || "tide";
}

function modeSteps(site) {
  const open = { kind: "open", label: `Open ${site.name}` };
  const pause = { kind: pauseKind(), label: "Pause" };
  if (site.mode === "delayed") return [open, { kind: "clock", label: `Browse ${site.delayMinutes} min` }, pause];
  if (site.mode === "ask") return [open, { kind: "choose", label: "Pick a time" }, { kind: "clock", label: "Browse x min" }, pause];
  return [open, pause];
}

export function modeEditor(site) {
  const wrap = h("div");
  const render = () => {
    const parts = [
      label(`When should OpenFocus step in on ${site.name}?`),
      radioCards(
        [
          { value: "immediate", label: "Right away", description: "Take a breath every time you open the site." },
          { value: "delayed", label: "After a few minutes", description: "Browse freely for a few minutes each hour, then pause." },
          { value: "ask", label: "Ask me each time", description: "Choose how long you want to stay before you go in." }
        ],
        site.mode,
        (v) => {
          save(() => (site.mode = v), { render: false });
          render();
        },
        { label: "When should OpenFocus step in?" }
      ),
      previewFlow(modeSteps(site))
    ];

    if (site.mode === "delayed") {
      const hint = h("p", { class: "hint" });
      const setHint = () => {
        hint.textContent = `Your ${site.delayMinutes} free ${site.delayMinutes === 1 ? "minute resets" : "minutes reset"} at the top of every hour. Only time with the tab in view counts.`;
      };
      setHint();
      parts.push(
        label("Free time each hour"),
        h(
          "div",
          { class: "field-box" },
          h("span", null, "Pause after"),
          stepper(site.delayMinutes, { min: 1, max: 59, unit: "mins" }, (v) => {
            save(() => (site.delayMinutes = v), { render: false });
            const s = wrap.querySelectorAll(".preview-step span:last-child");
            if (s[1]) s[1].textContent = `Browse ${v} min`;
            setHint();
          })
        ),
        hint
      );
    }

    if (site.mode === "ask") {
      parts.push(
        label("Longest time you can pick"),
        select(
          INTERVAL_OPTIONS.filter((m) => m >= 5).map((m) => ({ value: m, label: `${m} minutes` })),
          site.askMaxMinutes,
          (v) => save(() => (site.askMaxMinutes = Number(v)), { render: false }),
          { cls: "select full", label: "Longest time you can pick" }
        ),
        h("p", { class: "hint" }, "You slide to a time, then press Open. The slider always starts at 1 minute. When your time runs out, OpenFocus pauses you again.")
      );
    }
    wrap.replaceChildren(...parts);
  };
  render();
  return wrap;
}

export function siteInBlock(block, siteId) {
  return block.sites === "all" || (Array.isArray(block.sites) && block.sites.includes(siteId));
}

export function blockChecklist(site, { onChange } = {}) {
  const blocks = state.config.blocks;
  if (!blocks.length) {
    return h("p", { class: "hint", style: { margin: "0" } }, "No focus blocks yet. ", h("a", { href: "#/schedule" }, "Set one up"), ".");
  }
  return h(
    "div",
    { class: "check-list" },
    blocks.map((b) =>
      h(
        "label",
        null,
        h("input", {
          type: "checkbox",
          checked: siteInBlock(b, site.id),
          disabled: b.sites === "all",
          onChange: (e) =>
            save(
              () => {
                const list = Array.isArray(b.sites) ? b.sites : [];
                b.sites = e.target.checked ? [...new Set([...list, site.id])] : list.filter((id) => id !== site.id);
              },
              { render: false }
            ).then(() => onChange?.())
        }),
        h("span", null, b.name, b.sites === "all" ? h("span", { class: "muted" }, " (covers every site)") : null)
      )
    )
  );
}

export function openSiteModal(siteId, { onAddMore } = {}) {
  const first = siteById(siteId);
  if (!first) return;
  modal({
    title: [favicon(first.domain), `${first.name} added`],
    body: (render, close) => {
      const site = siteById(siteId);
      if (!site) return [];
      return [
        h("p", { class: "muted", style: { margin: "2px 0 0" } }, `From now on, OpenFocus gives you a moment to breathe before ${site.name} opens.`),
        modeEditor(site),
        label("Check-ins"),
        card(
          row(
            "Check in while I browse",
            `Pause again after ${state.config.reinterventionMinutes} minutes on ${site.name}.`,
            toggle(site.reintervention, (v) => save(() => (site.reintervention = v), { render: false }), { label: "Check in while I browse" })
          )
        ),
        label("Focus blocks"),
        h("div", { class: "card", style: { padding: "8px 10px" } }, blockChecklist(site)),
        h("p", { class: "hint" }, "Pause length, daily limits and more live on the ", h("a", { href: `#/site/${site.id}/rules`, onClick: close }, "site page"), ".")
      ];
    },
    footer: (close) => [
      h("button", { class: "btn", type: "button", onClick: () => { close(); onAddMore?.(); } }, icon("plus"), "Add another"),
      h("button", { class: "btn primary", type: "button", onClick: close }, "Done")
    ]
  });
}

function randomText(length) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => chars[b % chars.length]).join("");
}

export function playPreview(type, overrides = {}) {
  const cfg = state.config;
  const name = cfg.sites[0]?.name || "YouTube";
  const data = {
    action: "intervene",
    type,
    siteName: name,
    duration: cfg.duration,
    attempts: 6,
    lastUse: Date.now() - 3 * 3600000,
    tideText: cfg.interventions.tideText,
    breathText: cfg.interventions.breathText,
    typingText: randomText(cfg.interventions.typingLength),
    reflectPrompt: cfg.interventions.reflectPrompt.replaceAll("{site}", name),
    reason: "open",
    ...overrides
  };
  let ctl = null;
  const done = () => {
    document.removeEventListener("keydown", onKey, true);
    ctl?.leave();
  };
  const onKey = (e) => {
    if (e.key === "Escape") done();
  };
  document.addEventListener("keydown", onKey, true);
  ctl = globalThis.OpenFocusOverlay.mount({ data, preview: true, parent: document.body, onContinue: done, onExit: done });
}

export function openHelp() {
  const qa = [
    ["What does OpenFocus do?", "When you open a site on your list, OpenFocus covers the page and walks you through one slow breath. Then you decide: leave, or open the site on purpose."],
    ["What are the three timing options?", "Right away pauses you on every visit. After a few minutes gives you some free time each hour first. Ask me each time lets you slide to how long you want to stay, then open the site."],
    ["What is a check-in?", "After you open a site, OpenFocus can pause you again after a set time. It breaks up long scrolling sessions."],
    ["How do schedules work?", "Active hours decide when OpenFocus runs at all. Outside them, sites open normally. Focus blocks are stricter: sites stay closed until the block ends."],
    ["Why is the page blank for a moment?", "OpenFocus hides the page until it knows whether to pause you, so a feed never flashes on screen."],
    ["Does it work in Incognito?", "Only if you allow it. Open the extension details in Chrome and turn on Allow in Incognito."],
    ["Where is my data?", "On this device only, in Chrome storage. OpenFocus has no account and sends nothing anywhere."]
  ];
  modal({
    title: "Help",
    body: () => h("div", { class: "faq" }, qa.map(([q, a]) => [h("h3", null, q), h("p", null, a)])),
    footer: (close) => h("button", { class: "btn primary", type: "button", onClick: close }, "Close")
  });
}

export function statBlock(value, text) {
  return h("div", null, h("div", { class: "stat-value" }, value), h("div", { class: "stat-label" }, text));
}

export { icon };
