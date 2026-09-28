export const MINUTES_SAVED_PER_PREVENTION = 3;

export const DURATIONS = [3, 6, 10, 20, 40, 60].map((value) => ({ value, label: `${value} seconds` }));

export const INTERVAL_OPTIONS = [1, 2, 5, 10, 15, 20, 30, 45, 60];

export const DAILY_LIMIT_OPTIONS = [0, 1, 2, 3, 5, 10, 20];

export const SWITCHING_OPTIONS = [
  { value: "once", label: "Only this visit" },
  { value: "5", label: "Free for 5 minutes" },
  { value: "15", label: "Free for 15 minutes" },
  { value: "30", label: "Free for 30 minutes" },
  { value: "60", label: "Free for 1 hour" }
];

export const INTERVENTION_TYPES = [
  {
    id: "tide",
    name: "Rising Tide",
    description: "A calm wave rises as you breathe in and sinks as you breathe out."
  },
  {
    id: "breath",
    name: "Breathing Orb",
    description: "Breathe along with a glowing circle before the site opens."
  },
  {
    id: "minimal",
    name: "Quiet Orb",
    description: "The same breathing circle, with no words or numbers."
  },
  {
    id: "typing",
    name: "Copy the Code",
    description: "Type a short random code by hand to get through."
  },
  {
    id: "reflect",
    name: "Name Your Why",
    description: "Write down what you came to do before the site opens."
  }
];

export const TYPING_LENGTHS = [
  { value: 8, label: "8 characters" },
  { value: 16, label: "16 characters" },
  { value: 32, label: "32 characters" }
];

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEKDAYS_9_TO_6 = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  on: d >= 1 && d <= 5,
  allDay: false,
  windows: [{ start: "09:00", end: "18:00" }]
}));

export function defaultConfig() {
  return {
    version: 4,
    sites: [],
    interventions: {
      types: ["tide"],
      tideText: "Let’s take one slow, deep breath.",
      breathText: "Slow down. Breathe with the circle.",
      typingLength: 16,
      reflectPrompt: "What brings you to {site} right now?"
    },
    duration: 20,
    escalate: false,
    switching: "once",
    closeTabOnExit: false,
    reinterventionMinutes: 15,
    schedule: {
      mode: "always",
      days: structuredClone(WEEKDAYS_9_TO_6)
    },
    blocks: [],
    strict: false,
    breaksPerDay: 3
  };
}

export function siteDefaults() {
  return {
    interventionEnabled: true,
    mode: "immediate",
    delayMinutes: 5,
    askMaxMinutes: 15,
    duration: "default",
    reintervention: false,
    schedule: "global",
    dailyLimit: 0
  };
}

export function newSite(domain, name) {
  return {
    ...siteDefaults(),
    id: `${domain.replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
    domain,
    name,
    scope: { include: [domain], exclude: [] },
    addedAt: Date.now()
  };
}

export function withDefaults(config) {
  const base = defaultConfig();
  const merged = { ...base, ...config };
  merged.interventions = { ...base.interventions, ...(config.interventions || {}) };
  merged.schedule = { ...base.schedule, ...(config.schedule || {}) };
  merged.sites = (config.sites || []).map((s) => ({ ...siteDefaults(), ...s }));
  // Version 2 shipped wording we have since replaced. Swap it only if the user never edited it.
  if ((config.version || 2) < 3) {
    if (merged.interventions.breathText === "It’s time to take a deep breath...") merged.interventions.breathText = base.interventions.breathText;
    if (merged.interventions.reflectPrompt === "Why do you want to open {site} right now?") merged.interventions.reflectPrompt = base.interventions.reflectPrompt;
    merged.version = 3;
  }
  // Version 4 made Rising Tide the default. Move people who never changed their style onto it.
  if (merged.version < 4) {
    const t = merged.interventions.types;
    if (t.length === 1 && t[0] === "breath") merged.interventions.types = ["tide"];
    merged.version = 4;
  }
  return merged;
}

export function newBlock() {
  return {
    id: `block-${Date.now().toString(36)}`,
    name: "Focus block",
    enabled: true,
    days: [false, true, true, true, true, true, false],
    start: "09:00",
    end: "12:00",
    sites: "all"
  };
}
