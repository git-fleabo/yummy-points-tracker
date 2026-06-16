export type ActivityPointValue = {
  id: string;
  name: string;
  points: number;
};

export type BadgeRule = {
  id: string;
  name: string;
  threshold: number;
};

export type AdminSettings = {
  activityPointValues: ActivityPointValue[];
  badgeRules: BadgeRule[];
};

export const adminSettingsStorageKey = "yummy-points-admin-settings-v1";

export const defaultAdminSettings: AdminSettings = {
  activityPointValues: [
    { id: "small-miss", name: "Small missed treat", points: 1 },
    { id: "regular-miss", name: "Regular missed treat", points: 2 },
    { id: "big-miss", name: "Big missed treat", points: 5 },
    { id: "special-miss", name: "Special missed plan", points: 10 },
    { id: "major-miss", name: "Major missed experience", points: 20 },
  ],
  badgeRules: [{ id: "first-points", name: "First Points", threshold: 1 }],
};

export function getAdminSettings(): AdminSettings {
  if (typeof window === "undefined") return defaultAdminSettings;

  const storedSettings = window.localStorage.getItem(adminSettingsStorageKey);
  if (!storedSettings) return defaultAdminSettings;

  try {
    return sanitizeAdminSettings(JSON.parse(storedSettings));
  } catch {
    return defaultAdminSettings;
  }
}

export function saveAdminSettings(settings: AdminSettings) {
  const sanitizedSettings = sanitizeAdminSettings(settings);
  window.localStorage.setItem(adminSettingsStorageKey, JSON.stringify(sanitizedSettings));
  return sanitizedSettings;
}

export function resetAdminSettings() {
  window.localStorage.removeItem(adminSettingsStorageKey);
  return defaultAdminSettings;
}

export function getFirstPointsThreshold(settings: AdminSettings) {
  return settings.badgeRules.find((rule) => rule.id === "first-points")?.threshold ?? 1;
}

function sanitizeAdminSettings(value: unknown): AdminSettings {
  const settings = isRecord(value) ? value : {};
  const activityPointValues = Array.isArray(settings.activityPointValues)
    ? settings.activityPointValues
        .map((item, index) => sanitizeActivityPointValue(item, index))
        .filter((item): item is ActivityPointValue => Boolean(item))
    : defaultAdminSettings.activityPointValues;
  const badgeRules = Array.isArray(settings.badgeRules)
    ? settings.badgeRules
        .map((item) => sanitizeBadgeRule(item))
        .filter((item): item is BadgeRule => Boolean(item))
    : defaultAdminSettings.badgeRules;

  return {
    activityPointValues: activityPointValues.length
      ? activityPointValues
      : defaultAdminSettings.activityPointValues,
    badgeRules: badgeRules.length ? badgeRules : defaultAdminSettings.badgeRules,
  };
}

function sanitizeActivityPointValue(value: unknown, index: number) {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const points = Number(value.points);

  if (!name || !Number.isInteger(points) || points <= 0) return null;

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : `activity-${index}`,
    name,
    points,
  };
}

function sanitizeBadgeRule(value: unknown) {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const threshold = Number(value.threshold);

  if (!name || !Number.isInteger(threshold) || threshold <= 0) return null;

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : name.toLowerCase(),
    name,
    threshold,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
