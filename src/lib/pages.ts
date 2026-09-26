/** Query parameter marking an explicit open of the checklist (vs. a new tab). */
export const CHECKLIST_PARAM = "checklist";

/** URL of the full-page checklist, opened explicitly from the popup or a notification. */
export function checklistUrl(): string {
  return chrome.runtime.getURL(`src/newtab/index.html?${CHECKLIST_PARAM}`);
}
