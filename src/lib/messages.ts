import type { Reminder } from "./reminders";
import type { Session } from "./types";

/** Messages sent from the site banner content script to the background worker. */
export type BannerMessage =
  | { type: "banner:status" }
  | { type: "banner:dismiss" }
  | { type: "open-checklist" };

export type BannerStatus =
  | { show: false }
  | { show: true; session: Session; doneCount: number; total: number; reminder: Reminder };
