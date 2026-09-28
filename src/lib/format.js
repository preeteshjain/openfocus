function trim(n) {
  return n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

export function formatSaved(minutes) {
  if (!minutes) return "–";
  if (minutes < 60) return `${Math.round(minutes)} ${Math.round(minutes) === 1 ? "min" : "mins"}`;
  const hours = minutes / 60;
  if (hours < 24) return `${trim(hours)} ${hours === 1 ? "hr" : "hrs"}`;
  const days = hours / 24;
  if (days < 7) return `${trim(days)} ${days === 1 ? "day" : "days"}`;
  const weeks = days / 7;
  return `${trim(weeks)} ${weeks === 1 ? "wk" : "wks"}`;
}

export function formatSeconds(seconds) {
  if (!seconds) return "0 mins";
  if (seconds < 60) return "< 1 min";
  return formatSaved(seconds / 60);
}

export function formatAgo(ts, now = Date.now()) {
  if (!ts) return "never";
  const mins = Math.floor((now - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days.toLocaleString()} days ago`;
}

export function formatCount(n) {
  return `${Number(n).toLocaleString()}×`;
}
