import { defaultConfig, withDefaults } from "./defaults.js";
import { dayKey, withStatsDefaults } from "./stats.js";

export async function getConfig() {
  const { config } = await chrome.storage.local.get("config");
  return config ? withDefaults(config) : defaultConfig();
}

export async function saveConfig(config) {
  await chrome.storage.local.set({ config });
}

export async function getStats() {
  const { stats } = await chrome.storage.local.get("stats");
  return withStatsDefaults(stats);
}

export async function saveStats(stats) {
  await chrome.storage.local.set({ stats });
}

// Break state is written by the dashboard and popup. Allowances live under a separate key
// that only the background writes, so the two never overwrite each other.
export async function getRuntime() {
  const { runtime } = await chrome.storage.local.get("runtime");
  return { breakUntil: 0, breaks: { day: dayKey(), used: 0 }, ...(runtime || {}) };
}

export async function saveRuntime(runtime) {
  await chrome.storage.local.set({ runtime });
}

export async function loadAll() {
  const [config, stats, runtime] = await Promise.all([getConfig(), getStats(), getRuntime()]);
  return { config, stats, runtime };
}
