import type { Lang } from "./types";

/** Messages sent from the site banner content script to the background worker. */
export type BannerMessage =
  | { type: "banner:status" }
  | { type: "banner:dismiss" }
  | { type: "open-checklist" };

/** Banner strings arrive pre-localized so the content script stays dependency-free. */
export type BannerStatus =
  | { show: false }
  | { show: true; lang: Lang; title: string; quote: string; open: string; later: string };
