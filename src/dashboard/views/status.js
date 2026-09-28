import { h } from "../ui.js";
import { state } from "../state.js";
import { scheduleStatus, anyActiveBlock, formatWhen } from "../../lib/schedule.js";

export function currentStatus(now = new Date()) {
  const { config, runtime } = state;
  const blocks = anyActiveBlock(config.blocks, now);
  if (runtime.breakUntil > now.getTime()) {
    return { kind: "break", title: "On a break", label: `Back on at ${formatWhen(new Date(runtime.breakUntil), now)}` };
  }
  if (blocks.length) {
    return { kind: "block", title: "Focus block on", label: blocks.length === 1 ? `“${blocks[0].name}” is running` : `${blocks.length} blocks are running` };
  }
  const s = scheduleStatus(config.schedule, now);
  return { kind: s.active ? "on" : "off", title: s.active ? "OpenFocus is on" : "OpenFocus is off", label: s.label };
}

export function statusCard() {
  const s = currentStatus();
  return h(
    "a",
    { class: "status-card", href: "#/schedule", title: "Open schedule" },
    h("div", { class: "status-top" }, h("span", { class: `dot ${s.kind}` }), s.title),
    h("div", { class: "status-sub" }, s.label)
  );
}
