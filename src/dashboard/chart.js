import { h } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";

function svg(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function niceMax(v) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

// Rect with a 4px rounded top and a square base.
function topRounded(x, y, w, hgt, r) {
  const rr = Math.min(r, hgt, w / 2);
  return `M${x},${y + hgt}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + hgt}Z`;
}

const SERIES = [
  { key: "p", name: "Walked away", color: "var(--series-1)" },
  { key: "c", name: "Opened", color: "var(--series-2)" }
];

export function attemptsChart(days) {
  const W = 560;
  const H = 190;
  const pad = { l: 30, r: 4, t: 10, b: 24 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const band = plotW / days.length;
  const barW = Math.min(24, band * 0.62);
  const max = niceMax(Math.max(...days.map((d) => d.p + d.c), 1));
  const y = (v) => pad.t + plotH - (v / max) * plotH;

  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Visits you skipped and visits you opened, per day, for the past 14 days" });

  for (const tick of [0, max / 2, max]) {
    root.append(svg("line", { class: "grid-line", x1: pad.l, x2: W - pad.r, y1: y(tick), y2: y(tick) }));
    const t = svg("text", { class: "axis-text", x: pad.l - 8, y: y(tick) + 4, "text-anchor": "end" });
    t.textContent = Number.isInteger(tick) ? tick.toLocaleString() : tick.toFixed(1);
    root.append(t);
  }

  const wrap = h("div", { class: "chart" });
  const tip = h("div", { class: "tooltip", hidden: true });

  days.forEach((d, i) => {
    const cx = pad.l + band * i + band / 2;
    const x = cx - barW / 2;
    const g = svg("g", { class: "col" });
    let base = y(0);
    const stack = SERIES.filter((s) => d[s.key] > 0);
    stack.forEach((s, j) => {
      const hgt = (d[s.key] / max) * plotH - (j > 0 ? 2 : 0);
      if (hgt <= 0) return;
      const top = base - hgt;
      const last = j === stack.length - 1;
      g.append(
        last
          ? svg("path", { class: "seg", d: topRounded(x, top, barW, hgt, 4), fill: s.color })
          : svg("rect", { class: "seg", x, y: top, width: barW, height: hgt, fill: s.color })
      );
      base = top - 2;
    });

    if (i % 2 === (days.length - 1) % 2) {
      const lbl = svg("text", { class: "axis-text", x: cx, y: H - 6, "text-anchor": "middle" });
      lbl.textContent = i === days.length - 1 ? "Today" : String(d.date.getDate());
      root.append(lbl);
    }

    const hit = svg("rect", { class: "bar-hit", x: pad.l + band * i, y: pad.t, width: band, height: plotH });
    const show = () => {
      const rect = root.getBoundingClientRect();
      const scale = rect.width / W;
      tip.hidden = false;
      tip.replaceChildren(
        h("b", null, d.date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })),
        h("br"),
        ...SERIES.flatMap((s) => [h("i", { style: { background: s.color } }), `${s.name}: ${d[s.key]}`, h("br")]).slice(0, -1)
      );
      tip.style.left = `${cx * scale}px`;
      tip.style.top = `${y(d.p + d.c) * scale}px`;
    };
    hit.addEventListener("mouseenter", show);
    hit.addEventListener("mouseleave", () => (tip.hidden = true));
    root.append(g, hit);
  });

  wrap.append(root, tip);
  return wrap;
}

export function attemptsTable(days) {
  return h(
    "table",
    { class: "chart-table" },
    h("thead", null, h("tr", null, h("th", null, "Day"), h("th", null, "Tried"), h("th", null, "Walked away"), h("th", null, "Opened"))),
    h(
      "tbody",
      null,
      [...days].reverse().map((d) =>
        h(
          "tr",
          null,
          h("td", null, d.date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })),
          h("td", null, d.a),
          h("td", null, d.p),
          h("td", null, d.c)
        )
      )
    )
  );
}

export function chartLegend() {
  return h(
    "div",
    { class: "legend" },
    SERIES.map((s) => h("span", null, h("i", { style: { background: s.color } }), s.name))
  );
}
