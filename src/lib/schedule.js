import { DAY_SHORT } from "./defaults.js";

export function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesOf(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// A window whose end is at or before its start runs past midnight into the next day.
function inWindowToday(win, m) {
  const s = toMinutes(win.start);
  const e = toMinutes(win.end);
  if (s < e) return m >= s && m < e;
  return m >= s;
}

function inWindowTail(win, m) {
  const s = toMinutes(win.start);
  const e = toMinutes(win.end);
  return e <= s && m < e;
}

export function isScheduleActive(schedule, date = new Date()) {
  if (!schedule || schedule.mode !== "custom") return true;
  const day = date.getDay();
  const m = minutesOf(date);
  const today = schedule.days[day];
  const yesterday = schedule.days[(day + 6) % 7];

  if (today?.on) {
    if (today.allDay) return true;
    if (today.windows.some((w) => inWindowToday(w, m))) return true;
  }
  if (yesterday?.on && !yesterday.allDay) {
    if (yesterday.windows.some((w) => inWindowTail(w, m))) return true;
  }
  return false;
}

function blockAppliesToSite(block, siteId) {
  return block.sites === "all" || (Array.isArray(block.sites) && block.sites.includes(siteId));
}

function endDate(date, hhmm, dayOffset) {
  const d = new Date(date);
  d.setDate(d.getDate() + dayOffset);
  const mins = toMinutes(hhmm);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

export function activeBlockAt(block, date = new Date()) {
  if (!block.enabled) return null;
  const day = date.getDay();
  const m = minutesOf(date);
  const win = { start: block.start, end: block.end };
  const overnight = toMinutes(block.end) <= toMinutes(block.start);

  if (block.days[day] && inWindowToday(win, m)) {
    return endDate(date, block.end, overnight ? 1 : 0);
  }
  if (block.days[(day + 6) % 7] && inWindowTail(win, m)) {
    return endDate(date, block.end, 0);
  }
  return null;
}

export function activeBlockFor(blocks, siteId, date = new Date()) {
  for (const block of blocks || []) {
    if (!blockAppliesToSite(block, siteId)) continue;
    const until = activeBlockAt(block, date);
    if (until) return { block, until: until.getTime() };
  }
  return null;
}

export function anyActiveBlock(blocks, date = new Date()) {
  return (blocks || []).filter((b) => activeBlockAt(b, date));
}

// Walks forward minute by minute to find when the schedule flips. Two days is plenty for UI copy.
export function nextScheduleChange(schedule, date = new Date()) {
  const start = new Date(date);
  start.setSeconds(0, 0);
  const current = isScheduleActive(schedule, start);
  for (let i = 1; i <= 60 * 24 * 8; i++) {
    const t = new Date(start.getTime() + i * 60000);
    if (isScheduleActive(schedule, t) !== current) return t;
  }
  return null;
}

export function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatWhen(date, now = new Date()) {
  const sameDay = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay) return formatClock(date);
  if (date.toDateString() === tomorrow.toDateString()) return `tomorrow ${formatClock(date)}`;
  return `${DAY_SHORT[date.getDay()]} ${formatClock(date)}`;
}

export function scheduleStatus(schedule, now = new Date()) {
  if (schedule.mode !== "custom") return { active: true, label: "Active all the time" };
  const active = isScheduleActive(schedule, now);
  const next = nextScheduleChange(schedule, now);
  if (active) return { active, label: next ? `Active until ${formatWhen(next, now)}` : "Active" };
  return { active, label: next ? `Off until ${formatWhen(next, now)}` : "Off (no active hours set)" };
}

export function daysSummary(days) {
  const on = days.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  if (on.length === 7) return "Every day";
  if (on.length === 0) return "No days";
  if (on.join() === "1,2,3,4,5") return "Weekdays";
  if (on.join() === "0,6") return "Weekends";
  return on.map((i) => DAY_SHORT[i]).join(", ");
}
