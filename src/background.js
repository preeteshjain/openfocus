import { getConfig, getStats, saveStats, getRuntime } from "./lib/storage.js";
import { findSite, matchPatternsFor } from "./lib/match.js";
import { activeBlockFor, isScheduleActive } from "./lib/schedule.js";
import { countToday, last24, recordEvent, recordIntention, recordUsage, usedThisHour } from "./lib/stats.js";

const SCRIPT_ID = "openfocus-pause";
const CONTENT_FILES = ["src/content/overlay.js", "src/content/content.js"];
const RECENT_EXPIRY_MS = 30 * 60000;

function queue() {
  let chain = Promise.resolve();
  return (fn) => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };
}
const writes = queue();
const registrations = queue();

async function getAllow() {
  const { allow } = await chrome.storage.local.get("allow");
  return allow || {};
}

async function getTabAllow() {
  const { tabAllow } = await chrome.storage.session.get("tabAllow");
  return tabAllow || {};
}

function syncRegistration() {
  return registrations(async () => {
    const config = await getConfig();
    const matches = matchPatternsFor(config.sites);
    const registered = await chrome.scripting.getRegisteredContentScripts();
    const stale = registered.filter((s) => s.id !== SCRIPT_ID).map((s) => s.id);
    if (stale.length) await chrome.scripting.unregisterContentScripts({ ids: stale });
    const existing = registered.filter((s) => s.id === SCRIPT_ID);
    if (!matches.length) {
      if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
      return;
    }
    const script = {
      id: SCRIPT_ID,
      matches,
      js: CONTENT_FILES,
      runAt: "document_start",
      allFrames: false,
      persistAcrossSessions: true
    };
    if (existing.length) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);
  });
}

async function injectIntoOpenTabs(patterns) {
  if (!patterns.length) return;
  const tabs = await chrome.tabs.query({ url: patterns });
  for (const tab of tabs) {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_FILES }).catch(() => {});
  }
}

function randomText(length) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

function nextMidnight(now) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function interventionPayload({ config, stats, site, now, askMax, reason, sessionStart }) {
  const types = config.interventions.types.length ? config.interventions.types : ["breath"];
  const recent = last24(stats, site.id, now);
  let duration = site.duration === "default" ? config.duration : Number(site.duration);
  if (config.escalate) duration += Math.min(recent.a * 2, 40);
  return {
    action: "intervene",
    type: types[Math.floor(Math.random() * types.length)],
    duration,
    tideText: config.interventions.tideText,
    breathText: config.interventions.breathText,
    typingText: randomText(config.interventions.typingLength),
    reflectPrompt: config.interventions.reflectPrompt.replaceAll("{site}", site.name),
    attempts: recent.a + 1,
    lastUse: stats.lastUse[site.id] || 0,
    askMax: askMax || 0,
    reason: reason || "open",
    sessionMinutes: sessionStart ? Math.round((now - sessionStart) / 60000) : 0
  };
}

async function decide(href, tabId) {
  const [config, stats, runtime, allow, tabAllow] = await Promise.all([
    getConfig(),
    getStats(),
    getRuntime(),
    getAllow(),
    getTabAllow()
  ]);
  const site = findSite(config.sites, href);
  if (!site) return { action: "none" };

  const now = Date.now();
  const date = new Date(now);
  const base = { siteId: site.id, siteName: site.name, domain: site.domain };

  const block = activeBlockFor(config.blocks, site.id, date);
  if (block) return { ...base, action: "block", blockName: block.block.name, until: block.until };

  if (site.dailyLimit > 0 && countToday(stats, site.id, "c", date) >= site.dailyLimit) {
    return { ...base, action: "limit", limit: site.dailyLimit, until: nextMidnight(now) };
  }

  if (!site.interventionEnabled) return { ...base, action: "allow" };
  if (runtime.breakUntil > now) return { ...base, action: "allow", recheckAt: runtime.breakUntil };
  if (site.schedule !== "always" && !isScheduleActive(config.schedule, date)) return { ...base, action: "allow" };

  const tab = tabAllow[tabId];
  if (tab && tab.siteId === site.id && (!tab.until || tab.until > now)) {
    return { ...base, action: "allow", recheckAt: tab.until || null };
  }
  const siteAllow = allow[site.id];
  if (siteAllow && siteAllow.until > now) return { ...base, action: "allow", recheckAt: siteAllow.until };

  if (site.mode === "delayed") {
    const used = usedThisHour(stats, site.id, date);
    const limit = site.delayMinutes * 60;
    if (used < limit) return { ...base, action: "allow", recheckAt: now + (limit - used) * 1000 };
  }

  const tabExpired = tab && tab.siteId === site.id && tab.until && tab.until <= now;
  const siteExpired = siteAllow && now - siteAllow.until < RECENT_EXPIRY_MS;
  const reason = tabExpired || siteExpired ? "timeup" : "open";
  const sessionStart = tabExpired ? tab.since : siteExpired ? siteAllow.since : 0;

  if (site.mode === "ask") {
    const askMax = site.askMaxMinutes;
    if (!(tabExpired && tab.ask)) {
      const recent = last24(stats, site.id, now);
      return {
        ...base,
        action: "ask",
        askMax,
        attempts: recent.a + 1,
        lastUse: stats.lastUse[site.id] || 0
      };
    }
    return { ...base, ...interventionPayload({ config, stats, site, now, askMax, reason, sessionStart }) };
  }

  return { ...base, ...interventionPayload({ config, stats, site, now, reason, sessionStart }) };
}

async function grantAllowance(siteId, tabId, minutes) {
  const config = await getConfig();
  const site = config.sites.find((s) => s.id === siteId);
  if (!site) return {};
  const now = Date.now();
  const reint = site.reintervention ? config.reinterventionMinutes * 60000 : 0;

  // Time picked with "Ask me each time" is for this tab only. A new tab asks again, and the
  // time ends when the tab closes.
  if (minutes) {
    const tabAllow = await getTabAllow();
    tabAllow[tabId] = { siteId, until: now + minutes * 60000, since: now, ask: true };
    await chrome.storage.session.set({ tabAllow });
    return { recheckAt: tabAllow[tabId].until };
  }
  if (config.switching === "once") {
    const tabAllow = await getTabAllow();
    tabAllow[tabId] = { siteId, until: reint ? now + reint : 0, since: now };
    await chrome.storage.session.set({ tabAllow });
    return { recheckAt: tabAllow[tabId].until || null };
  }
  const windowMs = Number(config.switching) * 60000;
  const allow = await getAllow();
  allow[siteId] = { until: now + (reint ? Math.min(windowMs, reint) : windowMs), since: now };
  await chrome.storage.local.set({ allow });
  return { recheckAt: allow[siteId].until };
}

async function mutateStats(fn) {
  return writes(async () => {
    const stats = await getStats();
    fn(stats);
    await saveStats(stats);
  });
}

async function handle(message, sender) {
  const tabId = sender.tab?.id;
  switch (message.type) {
    case "check":
      return decide(message.url, tabId);

    case "shown":
      await mutateStats((stats) => {
        recordEvent(stats, message.siteId, "a");
        if (message.hard) recordEvent(stats, message.siteId, "p");
      });
      return { ok: true };

    case "continue": {
      await mutateStats((stats) => {
        recordEvent(stats, message.siteId, "c");
        if (message.intention) recordIntention(stats, message.siteId, message.intention);
      });
      return writes(() => grantAllowance(message.siteId, tabId, message.minutes));
    }

    case "exit": {
      if (!message.hard) await mutateStats((stats) => recordEvent(stats, message.siteId, "p"));
      const config = await getConfig();
      if (tabId === undefined) return { ok: true };
      if (config.closeTabOnExit) await chrome.tabs.remove(tabId).catch(() => {});
      else await chrome.tabs.update(tabId, { url: "chrome://newtab/" }).catch(() => {});
      return { ok: true };
    }

    case "usage":
      await mutateStats((stats) => recordUsage(stats, message.siteId, Math.min(message.seconds, 60)));
      return { ok: true };

    default:
      return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handle(message, sender).then(sendResponse, (err) => sendResponse({ action: "error", error: String(err) }));
  return true;
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await syncRegistration();
  const config = await getConfig();
  await injectIntoOpenTabs(matchPatternsFor(config.sites));
  if (reason === "install") chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(() => {
  syncRegistration();
});

const RULE_KEYS = ["interventionEnabled", "mode", "delayMinutes", "askMaxMinutes", "reintervention", "schedule", "dailyLimit", "scope"];

// A pass granted under old rules should not outlive them. Otherwise switching a site to
// "Ask me each time" would do nothing in a tab that was already let through.
async function resetPasses(siteIds) {
  if (!siteIds.length) return;
  await writes(async () => {
    const [allow, tabAllow] = await Promise.all([getAllow(), getTabAllow()]);
    for (const id of siteIds) delete allow[id];
    for (const [tabId, entry] of Object.entries(tabAllow)) if (siteIds.includes(entry.siteId)) delete tabAllow[tabId];
    await Promise.all([chrome.storage.local.set({ allow }), chrome.storage.session.set({ tabAllow })]);
  });
}

async function askTabsToRecheck(patterns) {
  if (!patterns.length) return;
  const tabs = await chrome.tabs.query({ url: patterns });
  for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: "recheck" }).catch(() => {});
}

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes.config) return;
  const oldSites = changes.config.oldValue?.sites || [];
  const newSites = changes.config.newValue?.sites || [];
  const before = new Set(matchPatternsFor(oldSites));
  const after = matchPatternsFor(newSites);
  const changed = newSites
    .filter((s) => {
      const prev = oldSites.find((o) => o.id === s.id);
      return prev && RULE_KEYS.some((k) => JSON.stringify(prev[k]) !== JSON.stringify(s[k]));
    })
    .map((s) => s.id);
  await resetPasses(changed);
  await syncRegistration();
  await injectIntoOpenTabs(after.filter((p) => !before.has(p)));
  await askTabsToRecheck(after.filter((p) => before.has(p)));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  writes(async () => {
    const tabAllow = await getTabAllow();
    if (!tabAllow[tabId]) return;
    delete tabAllow[tabId];
    await chrome.storage.session.set({ tabAllow });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  writes(async () => {
    const tabAllow = await getTabAllow();
    const entry = tabAllow[tabId];
    if (!entry) return;
    const config = await getConfig();
    const site = findSite(config.sites, changeInfo.url);
    if (site && site.id === entry.siteId) return;
    delete tabAllow[tabId];
    await chrome.storage.session.set({ tabAllow });
  });
});
