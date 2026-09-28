import { loadAll, saveConfig } from "../lib/storage.js";
import { withDefaults } from "../lib/defaults.js";
import { withStatsDefaults } from "../lib/stats.js";

export const state = {
  config: null,
  stats: null,
  runtime: null,
  allow: {}
};

let renderer = () => {};
// Change events can arrive after later saves, so match each echo against every pending write.
const pendingWrites = new Set();

export function setRenderer(fn) {
  renderer = fn;
}

export function rerender() {
  renderer();
}

export async function init() {
  Object.assign(state, await loadAll());
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let dirty = false;
    if (changes.config) {
      const incoming = JSON.stringify(changes.config.newValue);
      if (pendingWrites.has(incoming)) {
        pendingWrites.delete(incoming);
      } else if (pendingWrites.size === 0) {
        state.config = withDefaults(changes.config.newValue || {});
        dirty = true;
      }
    }
    if (changes.stats) {
      state.stats = withStatsDefaults(changes.stats.newValue);
      dirty = true;
    }
    if (changes.runtime) {
      state.runtime = { ...state.runtime, ...(changes.runtime.newValue || {}) };
      dirty = true;
    }
    if (dirty && !isEditing()) renderer();
  });
}

function isEditing() {
  const a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT") || !!document.querySelector(".modal-backdrop");
}

export async function save(mutate, { render = true } = {}) {
  mutate(state.config);
  const written = JSON.stringify(state.config);
  pendingWrites.add(written);
  setTimeout(() => pendingWrites.delete(written), 3000);
  await saveConfig(state.config);
  if (render) renderer();
}

export function siteById(id) {
  return state.config.sites.find((s) => s.id === id);
}
