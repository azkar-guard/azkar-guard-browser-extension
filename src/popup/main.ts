import { mountChecklist } from "../ui/checklist";

mountChecklist(document.getElementById("app")!);

document.getElementById("open-full")!.addEventListener("click", (e) => {
  e.preventDefault();
  void chrome.tabs.create({ url: chrome.runtime.getURL("src/newtab/index.html") });
  window.close();
});

document.getElementById("open-settings")!.addEventListener("click", (e) => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
});
