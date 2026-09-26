export type Session = "morning" | "evening";
export type Level = "small" | "medium" | "full";
export type Strictness = "gentle" | "normal" | "strict";
export type Lang = "en" | "ar";
export type Theme = "system" | "light" | "dark";

/** One entry of src/data/azkar.json. */
export interface Dhikr {
  id: string;
  session: Session | "both";
  arabic_text: string;
  required_count: number;
  /** Smallest level that includes this dhikr. Levels are cumulative: small ⊂ medium ⊂ full. */
  level: Level;
  source: string;
  /** English translation of meaning. */
  translation_en: string;
  /** Latin transliteration for readers who cannot read Arabic script. */
  transliteration: string;
  virtue_note?: string;
  /** Arabic virtue note: a verbatim hadith excerpt with reference, or a paraphrase marked «بمعناه». */
  virtue_note_ar?: string;
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
  /** Interface language. The dhikr itself is always shown in Arabic. */
  language: Lang;
  theme: Theme;
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
