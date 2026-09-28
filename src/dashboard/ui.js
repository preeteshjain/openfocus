const PROPS = new Set(["value", "checked", "disabled", "selected", "hidden", "tabIndex", "indeterminate"]);

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(props || {})) {
    if (val === null || val === undefined || val === false) continue;
    if (key === "class") el.className = val;
    else if (key === "style" && typeof val === "object") Object.assign(el.style, val);
    else if (key.startsWith("on") && typeof val === "function") el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (key === "svg") el.innerHTML = val;
    else if (PROPS.has(key)) el[key] = val;
    else el.setAttribute(key, val === true ? "" : String(val));
  }
  append(el, children);
  return el;
}

export function nodes(...items) {
  const out = [];
  for (const item of items.flat(Infinity)) {
    if (item === null || item === undefined || item === false) continue;
    out.push(item instanceof Node ? item : document.createTextNode(String(item)));
  }
  return out;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else if (child instanceof Node) el.append(child);
    else el.append(document.createTextNode(String(child)));
  }
}

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  settings:
    '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4"/><path d="M12 17.5h.01"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  overview:
    '<path d="M21 12c.55 0 1-.45.95-1A10 10 0 0 0 13 2.05c-.55-.05-1 .4-1 .95v8a1 1 0 0 0 1 1z" fill="currentColor"/><path d="M21.2 15.9A10 10 0 1 1 8 2.8"/>',
  schedule:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  customize:
    '<rect x="2.5" y="4" width="19" height="7" rx="3.5"/><circle cx="7.5" cy="7.5" r="1.6" fill="currentColor"/><rect x="2.5" y="13" width="19" height="7" rx="3.5"/><circle cx="16.5" cy="16.5" r="1.6" fill="currentColor"/>',
  hand:
    '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6.5V12l3.5 2"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  bolt: '<path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12z" fill="currentColor" stroke="none"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor" stroke="none"/>',
  clockFill: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M12 6.5V12l3.5 2" stroke="var(--surface-2, #fff)"/>',
  play: '<path d="M7 4.8v14.4a1 1 0 0 0 1.5.87l12-7.2a1 1 0 0 0 0-1.74l-12-7.2A1 1 0 0 0 7 4.8z" fill="currentColor" stroke="none"/>',
  dots: '<circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"/>',
  clip: '<path d="m21.4 11.05-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.57A4 4 0 1 1 18 8.84l-8.6 8.57a2 2 0 0 1-2.83-2.83l8.5-8.48"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  coffee:
    '<path d="M10 2v2M14 2v2M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  incognito:
    '<path d="M2 12h20"/><path d="M5 12 7 5h10l2 7"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M10 17h4"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
};

export function icon(name, cls = "icon") {
  return h("span", {
    class: cls,
    "aria-hidden": "true",
    svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:block">${PATHS[name] || ""}</svg>`
  });
}

export function favicon(domain, cls = "fav") {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", `https://${domain}`);
  url.searchParams.set("size", "64");
  return h("img", { class: cls, src: url.toString(), alt: "", loading: "lazy" });
}

export function toggle(checked, onChange, { label, disabled } = {}) {
  const btn = h("button", {
    class: "toggle",
    type: "button",
    role: "switch",
    "aria-checked": String(!!checked),
    "aria-label": label || null,
    disabled: !!disabled
  });
  btn.addEventListener("click", () => {
    const next = btn.getAttribute("aria-checked") !== "true";
    btn.setAttribute("aria-checked", String(next));
    onChange(next);
  });
  return btn;
}

export function select(options, value, onChange, { cls = "select", disabled, label } = {}) {
  const el = h(
    "select",
    { class: cls, disabled: !!disabled, "aria-label": label || null },
    options.map((o) => h("option", { value: String(o.value), selected: String(o.value) === String(value) }, o.label))
  );
  el.addEventListener("change", () => onChange(el.value));
  return el;
}

export function segmented(options, value, onChange, { plain = false, label } = {}) {
  const wrap = h("div", { class: `segmented${plain ? " plain" : ""}`, role: "group", "aria-label": label || null });
  const thumb = h("span", { class: "thumb", "aria-hidden": "true" });
  wrap.append(thumb);
  const buttons = options.map((o, i) => {
    const b = h(
      "button",
      { type: "button", "aria-pressed": String(o.value === value) },
      o.icon ? icon(o.icon) : null,
      o.label
    );
    b.addEventListener("click", () => {
      buttons.forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      place(i);
      onChange(o.value);
    });
    return b;
  });
  wrap.append(...buttons);
  const place = (i) => {
    thumb.style.width = `calc((100% - 6px) / ${options.length})`;
    thumb.style.transform = `translateX(${i * 100}%)`;
  };
  place(Math.max(0, options.findIndex((o) => o.value === value)));
  return wrap;
}

export function stepper(value, { min = 1, max = 60, unit = "mins" } = {}, onChange) {
  let current = value;
  const val = h("span", { class: "val" }, `${current} ${unit}`);
  const set = (v) => {
    current = Math.min(max, Math.max(min, v));
    val.textContent = `${current} ${current === 1 ? unit.replace(/s$/, "") : unit}`;
    onChange(current);
  };
  return h(
    "span",
    { class: "stepper" },
    val,
    h("button", { type: "button", "aria-label": "Decrease", onClick: () => set(current - 1) }, icon("minus")),
    h("button", { type: "button", "aria-label": "Increase", onClick: () => set(current + 1) }, icon("plus"))
  );
}

export function row(title, desc, control) {
  return h(
    "div",
    { class: "row" },
    h("div", { class: "row-main" }, h("div", { class: "row-title" }, title), desc ? h("div", { class: "row-desc" }, desc) : null),
    control
  );
}

export function label(text) {
  return h("div", { class: "label" }, text);
}

export function card(...children) {
  return h("div", { class: "card flush" }, ...children);
}

export function toast(text) {
  document.querySelector(".toast")?.remove();
  const t = h("div", { class: "toast", role: "status" }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2400);
}

export function modal({ title, body, footer, onClose }) {
  const previous = document.activeElement;
  const backdrop = h("div", { class: "modal-backdrop" });
  const box = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": typeof title === "string" ? title : null });
  const bodyEl = h("div", { class: "modal-body" });
  const footEl = h("div", { class: "modal-foot" });
  const close = () => {
    if (box.classList.contains("closing")) return;
    box.classList.add("closing");
    backdrop.classList.add("closing");
    document.removeEventListener("keydown", onKey);
    setTimeout(() => {
      backdrop.remove();
      previous?.focus?.();
      onClose?.();
    }, 160);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  const head = h(
    "div",
    { class: "modal-head" },
    h("h2", null, title),
    h("button", { class: "icon-btn", type: "button", "aria-label": "Close", onClick: close }, icon("x"))
  );
  const render = () => {
    bodyEl.replaceChildren(...nodes(body(render, close)));
    if (footer) footEl.replaceChildren(...nodes(footer(close)));
  };
  box.append(head, bodyEl);
  if (footer) box.append(footEl);
  backdrop.append(box);
  backdrop.addEventListener("mousedown", (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.append(backdrop);
  render();
  box.tabIndex = -1;
  box.focus({ preventScroll: true });
  return { close, render };
}

export function popoverMenu(anchorWrap, items) {
  const existing = anchorWrap.querySelector(".menu");
  if (existing) {
    existing.remove();
    return;
  }
  const menu = h(
    "div",
    { class: "menu", role: "menu" },
    items.map((it) =>
      h(
        "button",
        {
          type: "button",
          role: "menuitem",
          class: it.danger ? "danger" : null,
          disabled: !!it.disabled,
          onClick: () => {
            menu.remove();
            it.onClick();
          }
        },
        it.icon ? icon(it.icon) : null,
        it.label
      )
    )
  );
  anchorWrap.append(menu);
  const off = (e) => {
    if (!anchorWrap.contains(e.target)) {
      menu.remove();
      document.removeEventListener("mousedown", off);
    }
  };
  setTimeout(() => document.addEventListener("mousedown", off));
}

let gradientId = 0;

// Laptop mockups that show what a setting does. "pause" kinds match the pause styles.
export function laptop(kind, width = 96) {
  const id = `lg${++gradientId}`;
  const tiles = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const x = 43 + (i % 3) * 12;
      const y = 22 + Math.floor(i / 3) * 12;
      return `<rect x="${x}" y="${y}" width="9" height="9" rx="2" fill="${i === 0 ? "var(--accent)" : "var(--tile)"}"/>`;
    })
    .join("");
  const inner = {
    open: tiles,
    tide: `<rect x="18" y="30" width="84" height="30" fill="url(#${id}t)"/><rect x="46" y="17" width="28" height="3" rx="1.5" fill="var(--laptop)"/>`,
    breath: `<circle cx="60" cy="35" r="17" fill="none" stroke="var(--series-1)" stroke-width="2.5" stroke-dasharray="70 107" stroke-linecap="round" transform="rotate(-90 60 35)"/><circle cx="60" cy="35" r="10" fill="url(#${id}o)"/>`,
    minimal: `<circle cx="60" cy="35" r="12" fill="url(#${id}o)"/>`,
    typing: `<rect x="36" y="25" width="48" height="19" rx="3" fill="none" stroke="var(--laptop)" stroke-width="1.5" stroke-dasharray="3 3"/><text x="60" y="39" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" fill="var(--ink)">a7k</text>`,
    reflect: `<rect x="34" y="18" width="52" height="4" rx="2" fill="var(--laptop)"/><rect x="30" y="28" width="60" height="22" rx="3" fill="none" stroke="var(--laptop)" stroke-width="1.8"/><rect x="35" y="34" width="26" height="2.5" rx="1.25" fill="var(--series-1)"/><rect x="35" y="40" width="18" height="2.5" rx="1.25" fill="var(--series-1)" opacity="0.6"/>`,
    clock: `<circle cx="60" cy="35" r="11" fill="var(--laptop)"/><path d="M60 29v6l4 2.5" stroke="var(--screen)" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    choose: `<text x="60" y="27" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="var(--ink)">1 min</text><rect x="34" y="35" width="52" height="4" rx="2" fill="var(--tile)"/><rect x="34" y="35" width="14" height="4" rx="2" fill="var(--accent)"/><circle cx="48" cy="37" r="5.5" fill="var(--screen)" stroke="var(--accent)" stroke-width="1.8"/><rect x="44" y="46" width="32" height="7" rx="2" fill="none" stroke="var(--laptop)" stroke-width="1.2"/>`,
    scroll: `<rect x="30" y="14" width="60" height="14" rx="2" fill="var(--tile)"/><rect x="30" y="31" width="60" height="14" rx="2" fill="var(--tile)"/><rect x="30" y="48" width="60" height="10" rx="2" fill="var(--tile)"/><path d="M97 22v24m-3-3 3 3 3-3" stroke="var(--amber)" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  }[kind] || tiles;
  const height = Math.round(width * 0.62);
  return h("span", {
    class: "laptop",
    "aria-hidden": "true",
    svg: `<svg width="${width}" height="${height}" viewBox="0 0 120 74"><defs><linearGradient id="${id}t" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1f3d2e"/><stop offset="0.55" stop-color="#2f6b4f"/><stop offset="1" stop-color="#8fb89b"/></linearGradient><radialGradient id="${id}o" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#fbe2b4"/><stop offset="0.35" stop-color="#f0b262"/><stop offset="0.7" stop-color="#d9812b"/><stop offset="1" stop-color="#b8621c"/></radialGradient><clipPath id="${id}c"><rect x="18" y="10" width="84" height="50" rx="2"/></clipPath></defs><rect x="15" y="7" width="90" height="56" rx="4" fill="var(--screen)" stroke="var(--laptop)" stroke-width="3"/><g clip-path="url(#${id}c)">${inner}</g><path d="M4 68h112" stroke="var(--laptop)" stroke-width="4.5" stroke-linecap="round"/></svg>`
  });
}

export function previewFlow(stepsList) {
  const out = [];
  stepsList.forEach((s, i) => {
    if (i) out.push(h("div", { class: "preview-arrow", "aria-hidden": "true" }, icon("arrowRight")));
    out.push(h("div", { class: "preview-step" }, laptop(s.kind), h("span", null, s.label)));
  });
  return h("div", { class: "preview", role: "img", "aria-label": stepsList.map((s) => s.label).join(", then ") }, out);
}

export function steps(list) {
  const out = [];
  list.forEach((s, i) => {
    if (i) out.push(h("span", { class: "step-line", "aria-hidden": "true" }));
    out.push(h("span", { class: `step${s.pause ? " pause" : ""}` }, h("b", null, String(i + 1)), s.label));
  });
  return h("div", { class: "steps" }, out);
}

export function radioCards(options, value, onChange, { label } = {}) {
  const wrap = h("div", { class: "radio-cards", role: "radiogroup", "aria-label": label || null });
  const cards = options.map((o) =>
    h(
      "button",
      {
        type: "button",
        class: "radio-card",
        role: "radio",
        "aria-checked": String(o.value === value),
        onClick: () => {
          cards.forEach((c) => c.setAttribute("aria-checked", "false"));
          cards[options.indexOf(o)].setAttribute("aria-checked", "true");
          onChange(o.value);
        }
      },
      h("span", { class: "mark", "aria-hidden": "true" }),
      h("span", { class: "rc-title" }, o.label),
      h("span", { class: "rc-desc" }, o.description)
    )
  );
  wrap.append(...cards);
  return wrap;
}

export function tabs(options, value, onChange) {
  const wrap = h("div", { class: "tabs", role: "tablist" });
  const buttons = options.map((o) =>
    h(
      "button",
      {
        type: "button",
        role: "tab",
        "aria-selected": String(o.value === value),
        onClick: () => {
          buttons.forEach((b) => b.setAttribute("aria-selected", "false"));
          buttons[options.indexOf(o)].setAttribute("aria-selected", "true");
          onChange(o.value);
        }
      },
      o.label
    )
  );
  wrap.append(...buttons);
  return wrap;
}
