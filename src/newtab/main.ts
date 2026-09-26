import { mountChecklist } from "../ui/checklist";
import { mountToolbar } from "../ui/prefs";

mountToolbar(document.getElementById("toolbar")!);
mountChecklist(document.getElementById("app")!);

document.getElementById("open-settings")!.addEventListener("click", (e) => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
});
