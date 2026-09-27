import type { History, PrayerCache, Progress, Settings } from "./types";

interface Store {
  settings: Settings;
  prayerCache: PrayerCache;
  progress: Progress;
  history: History;
  bannerDismissedAt: number;
}

export type StoreKey = keyof Store;

export const DEFAULT_SETTINGS: Settings = {
  location: null,
  method: 3, // Muslim World League
  level: "small",
  notifications: true,
  strictness: "normal",
  siteBanner: false,
  language: "en",
  theme: "system",
  textSize: "regular",
};

/** Text scale per size setting, relative to the regular size. */
export const TEXT_SCALE: Record<Settings["textSize"], number> = {
  regular: 1,
  medium: 1.15,
  large: 1.35,
};

/** Browser UI language decides the default interface language until the user picks one. */
function defaultLanguage(): Settings["language"] {
  return chrome.i18n.getUILanguage().toLowerCase().startsWith("ar") ? "ar" : "en";
}

export async function get<K extends StoreKey>(key: K): Promise<Store[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as Store[K] | undefined;
}

export async function set<K extends StoreKey>(key: K, value: Store[K]): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, language: defaultLanguage(), ...(await get("settings")) };
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await set("settings", next);
  return next;
}

/** Subscribe to changes of the given keys. Returns an unsubscribe function. */
export function onChange(keys: StoreKey[], callback: () => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && keys.some((k) => k in changes)) callback();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
