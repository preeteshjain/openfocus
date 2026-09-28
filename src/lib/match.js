export function normalizeEntry(input) {
  let s = String(input || "").trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, "");
  s = s.replace(/^www\./, "");
  s = s.replace(/[?#].*$/, "");
  s = s.replace(/\/+$/, "");
  return s;
}

export function isValidHost(host) {
  if (host === "localhost") return true;
  return /^([a-z0-9-]+\.)+[a-z0-9-]{2,}$/.test(host);
}

export function splitEntry(entry) {
  const slash = entry.indexOf("/");
  if (slash === -1) return { host: entry, path: "" };
  return { host: entry.slice(0, slash), path: entry.slice(slash) };
}

function hostMatches(hostname, host) {
  const h = hostname.toLowerCase();
  return h === host || h.endsWith("." + host);
}

export function entryMatchesUrl(entry, url) {
  const { host, path } = splitEntry(entry);
  if (!hostMatches(url.hostname, host)) return false;
  return !path || url.pathname.toLowerCase().startsWith(path);
}

export function siteMatchesUrl(site, url) {
  const include = site.scope?.include?.length ? site.scope.include : [site.domain];
  const exclude = site.scope?.exclude || [];
  return include.some((e) => entryMatchesUrl(e, url)) && !exclude.some((e) => entryMatchesUrl(e, url));
}

export function findSite(sites, href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  return sites.find((s) => siteMatchesUrl(s, url)) || null;
}

export function matchPatternsFor(sites) {
  const hosts = new Set();
  for (const site of sites) {
    const include = site.scope?.include?.length ? site.scope.include : [site.domain];
    for (const entry of include) hosts.add(splitEntry(entry).host);
  }
  const patterns = [];
  for (const host of hosts) {
    if (!isValidHost(host)) continue;
    patterns.push(host === "localhost" ? `*://localhost/*` : `*://*.${host}/*`);
  }
  return patterns;
}
