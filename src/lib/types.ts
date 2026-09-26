export type Session = "morning" | "evening";
export type Level = "small" | "medium" | "full";
export type Strictness = "gentle" | "normal" | "strict";

/** One entry of src/data/azkar.json. */
export interface Dhikr {
  id: string;
  session: Session | "both";
  arabic_text: string;
  required_count: number;
  /** Smallest level that includes this dhikr. Levels are cumulative: small ⊂ medium ⊂ full. */
  level: Level;
  source: string;
  virtue_note?: string;
}

export type Location =
  | { kind: "city"; city: string; country: string }
  | { kind: "coords"; latitude: number; longitude: number };

export interface Settings {
  location: Location | null;
  /** Aladhan calculation method id. */
  method: number;
  level: Level;
  notifications: boolean;
  strictness: Strictness;
  /** Opt-in banner on all sites; also requires the optional host permission. */
  siteBanner: boolean;
}

/** Prayer times for one calendar date, as epoch milliseconds. */
export interface PrayerDay {
  fajr: number;
  maghrib: number;
}

export interface PrayerCache {
  /** Identifies the location + method the days were fetched for. */
  key: string;
  /** Keyed by YYYY-MM-DD in the location's own calendar. */
  days: Record<string, PrayerDay>;
}

/** An active Azkar window. Morning = Fajr → Maghrib, Evening = Maghrib → next Fajr. */
export interface AzkarWindow {
  session: Session;
  /** Date the window started on (YYYY-MM-DD); an evening after midnight belongs to the previous date. */
  date: string;
  start: number;
  end: number;
}

/** Tap progress for the current window only; reset when the window changes. */
export interface Progress {
  windowKey: string;
  remaining: Record<string, number>;
}

/** Completion timestamps (epoch ms) per date and session. */
export type History = Record<string, Partial<Record<Session, number>>>;
