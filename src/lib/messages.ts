import type { Lang } from "./types";

/** Messages sent from the site banner content script to the background worker. */
export type BannerMessage =
  | { type: "banner:status" }
  | { type: "banner:dismiss" }
  | { type: "open-checklist" };

/** Banner strings arrive pre-localized so the content script stays dependency-free. */
export type BannerStatus =
  | { show: false }
  | {
      show: true;
      lang: Lang;
      title: string;
      quote: string;
      open: string;
      later: string;
      /** Shown in place of the quote after each "Later" dodge, in order. */
      nudges: string[];
      /** Text scale from the text size setting (1 = regular). */
      scale: number;
    };
