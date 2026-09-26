import { checklistUrl } from "../lib/pages";
import { mountChecklist } from "../ui/checklist";
import { mountToolbar } from "../ui/prefs";

mountToolbar(document.getElementById("toolbar")!);
mountChecklist(document.getElementById("app")!);

document.getElementById("open-full")!.addEventListener("click", (e) => {
  e.preventDefault();
  void chrome.tabs.create({ url: checklistUrl() });
  window.close();
});

document.getElementById("open-settings")!.addEventListener("click", (e) => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
});
