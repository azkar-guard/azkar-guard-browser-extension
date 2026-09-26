import { mountChecklist } from "../ui/checklist";

mountChecklist(document.getElementById("app")!);

document.getElementById("open-settings")!.addEventListener("click", (e) => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
});
