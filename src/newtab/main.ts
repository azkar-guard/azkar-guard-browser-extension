import { CHECKLIST_PARAM } from "../lib/pages";
import { getStatus } from "../lib/session";
import { mountChecklist } from "../ui/checklist";
import { mountToolbar } from "../ui/prefs";

/** Chrome's own new tab page, shown when there is nothing left to enforce. */
const CHROME_NEW_TAB = "chrome://new-tab-page/";

// This page is also the new tab override. As a new tab it should only stand in the
// way while the current session is incomplete; once it is done, hand over to Chrome's
// normal new tab page. Explicit opens (popup, notification) carry CHECKLIST_PARAM
// and always show the checklist.
async function shouldHandOver(): Promise<boolean> {
  if (new URLSearchParams(location.search).has(CHECKLIST_PARAM)) return false;
  const status = await getStatus();
  return status.state === "active" && status.complete;
}

if (await shouldHandOver()) {
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id !== undefined) await chrome.tabs.update(tab.id, { url: CHROME_NEW_TAB });
} else {
  document.body.hidden = false;
  mountToolbar(document.getElementById("toolbar")!);
  mountChecklist(document.getElementById("app")!);

  document.getElementById("open-settings")!.addEventListener("click", (e) => {
    e.preventDefault();
    void chrome.runtime.openOptionsPage();
  });
}
