export const CATALOG = [
  { name: "YouTube", domain: "youtube.com" },
  { name: "Instagram", domain: "instagram.com" },
  { name: "Facebook", domain: "facebook.com" },
  { name: "X (Twitter)", domain: "x.com" },
  { name: "Twitter", domain: "twitter.com" },
  { name: "TikTok", domain: "tiktok.com" },
  { name: "Reddit", domain: "reddit.com" },
  { name: "LinkedIn", domain: "linkedin.com" },
  { name: "Threads", domain: "threads.net" },
  { name: "Bluesky", domain: "bsky.app" },
  { name: "Snapchat", domain: "snapchat.com" },
  { name: "Pinterest", domain: "pinterest.com" },
  { name: "Tumblr", domain: "tumblr.com" },
  { name: "Twitch", domain: "twitch.tv" },
  { name: "Kick", domain: "kick.com" },
  { name: "Discord", domain: "discord.com" },
  { name: "WhatsApp Web", domain: "web.whatsapp.com" },
  { name: "Telegram Web", domain: "web.telegram.org" },
  { name: "Netflix", domain: "netflix.com" },
  { name: "Prime Video", domain: "primevideo.com" },
  { name: "Disney+", domain: "disneyplus.com" },
  { name: "Hulu", domain: "hulu.com" },
  { name: "Max", domain: "max.com" },
  { name: "Hacker News", domain: "news.ycombinator.com" },
  { name: "Google News", domain: "news.google.com" },
  { name: "CNN", domain: "cnn.com" },
  { name: "BBC News", domain: "bbc.com" },
  { name: "The New York Times", domain: "nytimes.com" },
  { name: "Medium", domain: "medium.com" },
  { name: "Quora", domain: "quora.com" },
  { name: "9GAG", domain: "9gag.com" },
  { name: "Imgur", domain: "imgur.com" },
  { name: "Amazon", domain: "amazon.com" },
  { name: "eBay", domain: "ebay.com" },
  { name: "AliExpress", domain: "aliexpress.com" },
  { name: "Temu", domain: "temu.com" },
  { name: "Shein", domain: "shein.com" },
  { name: "Etsy", domain: "etsy.com" },
  { name: "Steam", domain: "store.steampowered.com" },
  { name: "Roblox", domain: "roblox.com" },
  { name: "Chess.com", domain: "chess.com" },
  { name: "ESPN", domain: "espn.com" },
  { name: "Mastodon", domain: "mastodon.social" },
  { name: "VK", domain: "vk.com" },
  { name: "Weibo", domain: "weibo.com" },
  { name: "Bilibili", domain: "bilibili.com" },
  { name: "ChatGPT", domain: "chatgpt.com" }
];

export const SUGGESTED = ["instagram.com", "youtube.com", "x.com", "tiktok.com", "reddit.com", "facebook.com"];

export function catalogName(domain) {
  return CATALOG.find((c) => c.domain === domain)?.name || null;
}

export function prettyName(domain) {
  const known = catalogName(domain);
  if (known) return known;
  const parts = domain.split(".");
  const core = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  return core.charAt(0).toUpperCase() + core.slice(1);
}

export function searchCatalog(query, excludeDomains = []) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CATALOG.filter(
    (c) => !excludeDomains.includes(c.domain) && (c.name.toLowerCase().includes(q) || c.domain.includes(q))
  ).slice(0, 6);
}
