import { MINUTES_SAVED_PER_PREVENTION } from "./defaults.js";

const DAY_MS = 86400000;

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function hourKey(date = new Date()) {
  return `${dayKey(date)}T${String(date.getHours()).padStart(2, "0")}`;
}

export function emptyStats() {
  return { since: Date.now(), days: {}, events: [], lastUse: {}, hourUsage: {}, intentions: [] };
}

export function withStatsDefaults(stats) {
  return { ...emptyStats(), ...(stats || {}) };
}

function bucket(stats, siteId, date = new Date()) {
  const dk = dayKey(date);
  stats.days[dk] ??= {};
  stats.days[dk][siteId] ??= { a: 0, p: 0, c: 0, s: 0 };
  return stats.days[dk][siteId];
}

export function recordEvent(stats, siteId, kind, now = Date.now()) {
  bucket(stats, siteId, new Date(now))[kind] += 1;
  stats.events.push({ t: now, s: siteId, k: kind });
  if (kind === "c") stats.lastUse[siteId] = now;
  prune(stats, now);
}

export function recordUsage(stats, siteId, seconds, now = new Date()) {
  bucket(stats, siteId, now).s += seconds;
  const hk = hourKey(now);
  const cur = stats.hourUsage[siteId];
  stats.hourUsage[siteId] = cur && cur.key === hk ? { key: hk, s: cur.s + seconds } : { key: hk, s: seconds };
}

export function recordIntention(stats, siteId, text, now = Date.now()) {
  stats.intentions.unshift({ t: now, s: siteId, text: text.slice(0, 280) });
  stats.intentions = stats.intentions.slice(0, 100);
}

function prune(stats, now) {
  const cutoff = now - 2 * DAY_MS;
  stats.events = stats.events.filter((e) => e.t >= cutoff).slice(-5000);
  const oldest = dayKey(new Date(now - 400 * DAY_MS));
  for (const dk of Object.keys(stats.days)) if (dk < oldest) delete stats.days[dk];
}

export function usedThisHour(stats, siteId, now = new Date()) {
  const cur = stats.hourUsage[siteId];
  return cur && cur.key === hourKey(now) ? cur.s : 0;
}

export function countToday(stats, siteId, kind, now = new Date()) {
  return stats.days[dayKey(now)]?.[siteId]?.[kind] || 0;
}

export function last24(stats, siteId, now = Date.now()) {
  const cutoff = now - DAY_MS;
  const out = { a: 0, p: 0, c: 0 };
  for (const e of stats.events) {
    if (e.t < cutoff || (siteId && e.s !== siteId)) continue;
    out[e.k] += 1;
  }
  return out;
}

export function totals(stats, siteId) {
  const out = { a: 0, p: 0, c: 0, s: 0 };
  for (const day of Object.values(stats.days)) {
    for (const [id, v] of Object.entries(day)) {
      if (siteId && id !== siteId) continue;
      out.a += v.a;
      out.p += v.p;
      out.c += v.c;
      out.s += v.s;
    }
  }
  return out;
}

export function minutesSaved(prevented) {
  return prevented * MINUTES_SAVED_PER_PREVENTION;
}

export function annualized(stats, since, now = Date.now()) {
  const days = Math.max(1, (now - since) / DAY_MS);
  const perDay = totals(stats).p / days;
  return Math.round(perDay * 365);
}

export function dailySeries(stats, siteId, count = 14, now = new Date()) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const v = stats.days[dayKey(d)]?.[siteId] || { a: 0, p: 0, c: 0, s: 0 };
    out.push({ date: d, ...v });
  }
  return out;
}

// Compares the first week after adding a site with the weekly average since.
export function urgeTrend(stats, site, now = Date.now()) {
  const added = site.addedAt || now;
  const weeks = (now - added) / (7 * DAY_MS);
  if (weeks < 1) return null;
  let firstWeek = 0;
  let total = 0;
  const firstEnd = added + 7 * DAY_MS;
  for (const [dk, day] of Object.entries(stats.days)) {
    const v = day[site.id];
    if (!v) continue;
    total += v.a;
    const t = new Date(`${dk}T12:00:00`).getTime();
    if (t < firstEnd) firstWeek += v.a;
  }
  return { firstWeek, average: Math.round(total / weeks) };
}
