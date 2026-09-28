import { getConfig, getRuntime, saveRuntime } from "./storage.js";
import { dayKey } from "./stats.js";

export function breaksLeft(config, runtime) {
  if (!config.breaksPerDay) return Infinity;
  const used = runtime.breaks.day === dayKey() ? runtime.breaks.used : 0;
  return Math.max(0, config.breaksPerDay - used);
}

export function breakEnd(kind, now = new Date()) {
  if (kind === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  }
  return now.getTime() + Number(kind) * 60000;
}

export async function startBreak(kind) {
  const [config, runtime] = await Promise.all([getConfig(), getRuntime()]);
  if (breaksLeft(config, runtime) <= 0) return { ok: false };
  const today = dayKey();
  const used = runtime.breaks.day === today ? runtime.breaks.used : 0;
  runtime.breakUntil = breakEnd(kind);
  runtime.breaks = { day: today, used: used + 1 };
  await saveRuntime(runtime);
  return { ok: true, until: runtime.breakUntil };
}

export async function endBreak() {
  const runtime = await getRuntime();
  runtime.breakUntil = 0;
  await saveRuntime(runtime);
}
