import { h, icon, favicon, toggle, select, segmented, row, label, card, modal, toast } from "../ui.js";
import { state, save, rerender } from "../state.js";
import { DAY_NAMES, DAY_SHORT, newBlock } from "../../lib/defaults.js";
import { scheduleStatus, activeBlockAt, daysSummary, toMinutes, formatWhen } from "../../lib/schedule.js";
import { startBreak, endBreak, breaksLeft } from "../../lib/breaks.js";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

const PRESETS = [
  {
    label: "Work hours",
    apply: (d) => ({ on: d >= 1 && d <= 5, allDay: false, windows: [{ start: "09:00", end: "18:00" }] })
  },
  { label: "Weekdays", apply: (d) => ({ on: d >= 1 && d <= 5, allDay: true, windows: [{ start: "09:00", end: "18:00" }] }) },
  { label: "Every day", apply: () => ({ on: true, allDay: true, windows: [{ start: "09:00", end: "18:00" }] }) },
  { label: "Evenings", apply: () => ({ on: true, allDay: false, windows: [{ start: "18:00", end: "23:00" }] }) }
];

function timeline(day) {
  const bar = h("div", { class: "timeline", "aria-hidden": "true" });
  const segs = day.allDay ? [{ s: 0, e: 1440 }] : [];
  if (!day.allDay) {
    for (const w of day.windows) {
      const s = toMinutes(w.start);
      const e = toMinutes(w.end);
      if (s < e) segs.push({ s, e });
      else segs.push({ s, e: 1440 }, { s: 0, e });
    }
  }
  for (const seg of segs) {
    bar.append(h("span", { style: { left: `${(seg.s / 1440) * 100}%`, width: `${((seg.e - seg.s) / 1440) * 100}%` } }));
  }
  return bar;
}

function dayRow(dayIndex) {
  const day = state.config.schedule.days[dayIndex];
  const body = h("div", { class: "day-body" });
  const paint = () => {
    if (!day.on) {
      body.replaceChildren(h("div", { class: "day-off" }, "Off. Sites open normally."));
      return;
    }
    const barHolder = h("div", null, timeline(day));
    const windows = day.allDay
      ? null
      : h(
          "div",
          { class: "windows" },
          day.windows.map((w, i) => {
            const start = h("input", { class: "time", type: "time", value: w.start, "aria-label": `${DAY_NAMES[dayIndex]} start time` });
            const end = h("input", { class: "time", type: "time", value: w.end, "aria-label": `${DAY_NAMES[dayIndex]} end time` });
            const overnight = h("span", { class: "chip-tag" }, "Ends next day");
            const markOvernight = () => (overnight.hidden = toMinutes(w.end) > toMinutes(w.start));
            markOvernight();
            const onTime = () => {
              if (!start.value || !end.value) return;
              save(
                () => {
                  w.start = start.value;
                  w.end = end.value;
                },
                { render: false }
              );
              markOvernight();
              barHolder.replaceChildren(timeline(day));
            };
            start.addEventListener("change", onTime);
            end.addEventListener("change", onTime);
            return h(
              "div",
              { class: "window" },
              start,
              h("span", { class: "muted" }, "to"),
              end,
              overnight,
              day.windows.length > 1
                ? h(
                    "button",
                    {
                      class: "icon-btn",
                      type: "button",
                      "aria-label": "Remove time window",
                      onClick: () => save(() => day.windows.splice(i, 1))
                    },
                    icon("x")
                  )
                : null
            );
          })
        );
    body.replaceChildren(
      h(
        "div",
        { class: "day-actions" },
        segmented(
          [
            { value: true, label: "All day" },
            { value: false, label: "Set hours" }
          ],
          day.allDay,
          (v) => save(() => (day.allDay = v)),
          { plain: true, label: `${DAY_NAMES[dayIndex]} hours` }
        )
      ),
      windows,
      !day.allDay
        ? h(
            "div",
            { class: "day-actions" },
            h("button", { class: "btn small", type: "button", onClick: () => save(() => day.windows.push({ start: "19:00", end: "21:00" })) }, icon("plus"), "Add hours"),
            h(
              "button",
              {
                class: "btn small ghost",
                type: "button",
                onClick: () =>
                  save((c) => {
                    c.schedule.days = c.schedule.days.map((d, i) => (i === dayIndex ? d : structuredClone(day)));
                  }).then(() => toast(`Copied ${DAY_NAMES[dayIndex]} to every day`))
              },
              "Copy to all days"
            )
          )
        : null,
      h("div", null, barHolder, h("div", { class: "timeline-scale" }, h("span", null, "00"), h("span", null, "06"), h("span", null, "12"), h("span", null, "18"), h("span", null, "24")))
    );
  };
  paint();
  return h(
    "div",
    { class: "day-row" },
    toggle(day.on, (v) => save(() => (day.on = v)), { label: DAY_NAMES[dayIndex] }),
    h("div", { class: "day-name" }, DAY_NAMES[dayIndex]),
    body
  );
}

function activeHoursSection() {
  const { schedule } = state.config;
  const status = scheduleStatus(schedule);
  return [
    label("Active hours"),
    h("p", { class: "hint", style: { margin: "-4px 0 10px" } }, "Pick the days and hours when OpenFocus runs. Take weekends off, or only run it during work."),
    h(
      "div",
      { class: "card" },
      segmented(
        [
          { value: "always", label: "Every day, all day" },
          { value: "custom", label: "Only at set times" }
        ],
        schedule.mode,
        (v) => save((c) => (c.schedule.mode = v)),
        { plain: true, label: "Active hours mode" }
      ),
      h("div", { class: "status-line" }, h("span", { class: `dot ${status.active ? "on" : ""}` }), status.label),
      schedule.mode === "custom"
        ? h(
            "div",
            { class: "presets" },
            PRESETS.map((p) =>
              h(
                "button",
                {
                  class: "btn small",
                  type: "button",
                  onClick: () =>
                    save((c) => {
                      c.schedule.days = c.schedule.days.map((_, d) => p.apply(d));
                    }).then(() => toast(`Applied “${p.label}”`))
                },
                p.label
              )
            )
          )
        : h("p", { class: "hint", style: { marginLeft: 0 } }, "OpenFocus runs around the clock. Choose set times to take days or hours off.")
    ),
    schedule.mode === "custom" ? h("div", { class: "card flush", style: { marginTop: "12px" } }, ORDER.map(dayRow)) : null,
    schedule.mode === "custom"
      ? h("p", { class: "hint" }, "A site can ignore these hours and stay always on. Set that on the site's Rules tab.")
      : null
  ];
}

function breaksSection() {
  const { config, runtime } = state;
  const onBreak = runtime.breakUntil > Date.now();
  const left = breaksLeft(config, runtime);
  const take = (kind) =>
    startBreak(kind).then((r) => {
      if (!r.ok) toast("No breaks left today");
    });
  return [
    label("Breaks"),
    h(
      "div",
      { class: "card" },
      h("h2", { class: "card-title" }, icon("coffee"), onBreak ? `On a break until ${formatWhen(new Date(runtime.breakUntil))}` : "Need a breather?"),
      h(
        "p",
        { class: "card-text", style: { margin: 0 } },
        onBreak
          ? "Pauses are off for now. Focus blocks and daily limits still apply."
          : "Turn pauses off for a while. Focus blocks and daily limits keep working."
      ),
      onBreak
        ? h("div", { class: "break-buttons" }, h("button", { class: "btn primary", type: "button", onClick: () => endBreak() }, "End break now"))
        : h(
            "div",
            { class: "break-buttons" },
            [
              ["15", "15 minutes"],
              ["60", "1 hour"],
              ["today", "Rest of today"]
            ].map(([k, text]) => h("button", { class: "btn", type: "button", disabled: left <= 0, onClick: () => take(k) }, text))
          ),
      h("p", { class: "hint", style: { marginLeft: 0 } }, left === Infinity ? "Unlimited breaks per day." : `${left} of ${config.breaksPerDay} breaks left today.`)
    ),
    h(
      "div",
      { class: "card flush", style: { marginTop: "12px" } },
      row(
        "Breaks per day",
        "A small number keeps breaks from becoming a back door.",
        select(
          [1, 2, 3, 5, 10, 0].map((n) => ({ value: n, label: n ? `${n} per day` : "Unlimited" })),
          config.breaksPerDay,
          (v) => save((c) => (c.breaksPerDay = Number(v))),
          { label: "Breaks per day" }
        )
      )
    )
  ];
}

function blockLocked(block) {
  return state.config.strict && !!activeBlockAt(block);
}

function openBlockEditor(blockId, isNew = false) {
  modal({
    title: isNew ? "New focus block" : "Edit focus block",
    body: (render, close) => {
      const block = state.config.blocks.find((b) => b.id === blockId);
      if (!block) return [];
      const locked = blockLocked(block);
      const sites = state.config.sites;
      const nameInput = h("input", { class: "input full", value: block.name, disabled: locked, "aria-label": "Block name" });
      nameInput.addEventListener("change", () => save(() => (block.name = nameInput.value.trim() || "Focus block")));
      const start = h("input", { class: "time", type: "time", value: block.start, disabled: locked, "aria-label": "Start time" });
      const end = h("input", { class: "time", type: "time", value: block.end, disabled: locked, "aria-label": "End time" });
      const onTime = () => {
        if (!start.value || !end.value) return;
        save(() => {
          block.start = start.value;
          block.end = end.value;
        });
      };
      start.addEventListener("change", onTime);
      end.addEventListener("change", onTime);
      return [
        locked ? h("div", { class: "lock-note" }, icon("lock"), "Strict mode is on and this block is running. You can change it after it ends.") : null,
        label("Name"),
        nameInput,
        label("Days"),
        h(
          "div",
          { class: "day-picks" },
          ORDER.map((d) =>
            h(
              "button",
              {
                class: "day-pick",
                type: "button",
                disabled: locked,
                "aria-pressed": String(block.days[d]),
                "aria-label": DAY_NAMES[d],
                onClick: () => save(() => (block.days[d] = !block.days[d])).then(render)
              },
              DAY_SHORT[d]
            )
          )
        ),
        label("Time"),
        h(
          "div",
          { class: "window" },
          start,
          h("span", { class: "muted" }, "to"),
          end,
          toMinutes(block.end) <= toMinutes(block.start) ? h("span", { class: "chip-tag" }, "Ends next day") : null
        ),
        label("Sites"),
        segmented(
          [
            { value: "all", label: "All my sites" },
            { value: "some", label: "Pick sites" }
          ],
          block.sites === "all" ? "all" : "some",
          (v) => {
            if (locked) return;
            save(() => (block.sites = v === "all" ? "all" : [])).then(render);
          },
          { plain: true, label: "Sites" }
        ),
        block.sites !== "all"
          ? sites.length
            ? h(
                "div",
                { class: "check-list" },
                sites.map((s) =>
                  h(
                    "label",
                    null,
                    h("input", {
                      type: "checkbox",
                      disabled: locked,
                      checked: block.sites.includes(s.id),
                      onChange: (e) =>
                        save(() => {
                          block.sites = e.target.checked ? [...block.sites, s.id] : block.sites.filter((id) => id !== s.id);
                        })
                    }),
                    favicon(s.domain),
                    s.name
                  )
                )
              )
            : h("p", { class: "hint" }, "Add sites on the Home page first.")
          : h("p", { class: "hint", style: { marginLeft: 0 } }, "Every site on your list rests during this time, including ones you add later."),
        h("hr", { class: "divider" }),
        h(
          "button",
          {
            class: "btn danger",
            type: "button",
            disabled: locked,
            onClick: () => {
              save((c) => (c.blocks = c.blocks.filter((b) => b.id !== blockId)));
              close();
            }
          },
          icon("trash"),
          "Delete this block"
        )
      ];
    },
    footer: (close) => h("button", { class: "btn primary", type: "button", onClick: close }, "Done"),
    onClose: rerender
  });
}

function blocksSection() {
  const { blocks, sites } = state.config;
  const describe = (b) => {
    const target =
      b.sites === "all"
        ? "All sites"
        : b.sites.length
          ? b.sites
              .map((id) => sites.find((s) => s.id === id)?.name)
              .filter(Boolean)
              .join(", ")
          : "No sites picked";
    return `${daysSummary(b.days)} · ${b.start} to ${b.end} · ${target}`;
  };
  return [
    label("Focus blocks"),
    h(
      "p",
      { class: "hint", style: { margin: "-2px 4px 12px" } },
      "During a focus block, sites stay closed. There is no way through, and breaks do not apply."
    ),
    blocks.length
      ? h(
          "div",
          { class: "card flush" },
          blocks.map((b) => {
            const running = !!activeBlockAt(b);
            const locked = blockLocked(b);
            return h(
              "div",
              { class: "block-card" },
              h(
                "div",
                { class: "grow" },
                h("h3", null, b.name, running ? h("span", { class: "chip-tag clay" }, "Running now") : null, locked ? icon("lock") : null),
                h("p", null, describe(b))
              ),
              h("button", { class: "btn small", type: "button", onClick: () => openBlockEditor(b.id) }, icon("edit"), "Edit"),
              toggle(b.enabled, (v) => save(() => (b.enabled = v)), { label: `${b.name} enabled`, disabled: locked })
            );
          })
        )
      : h("div", { class: "card empty", style: { padding: "28px 20px" } }, "No focus blocks yet. Try one for deep work or for winding down at night."),
    h(
      "div",
      { style: { marginTop: "12px" } },
      h(
        "button",
        {
          class: "btn primary",
          type: "button",
          onClick: () => {
            const b = newBlock();
            save((c) => c.blocks.push(b)).then(() => openBlockEditor(b.id, true));
          }
        },
        icon("plus"),
        "New focus block"
      )
    )
  ];
}

function strictSection() {
  return [
    label("Strict mode"),
    card(
      row(
        "Lock running blocks",
        "While a block runs, it cannot be changed or turned off, and its sites cannot be removed.",
        toggle(state.config.strict, (v) => save((c) => (c.strict = v)), {
          label: "Lock running blocks",
          disabled: state.config.strict && state.config.blocks.some((b) => activeBlockAt(b))
        })
      )
    )
  ];
}

export function renderSchedule() {
  return [
    h(
      "div",
      { class: "page-head" },
      h("h1", { class: "page-title" }, "Schedule"),
      h("p", { class: "page-sub" }, "Decide when OpenFocus runs. Plan breaks, and set times when sites stay closed.")
    ),
    ...activeHoursSection(),
    ...breaksSection(),
    ...blocksSection(),
    ...strictSection()
  ];
}
