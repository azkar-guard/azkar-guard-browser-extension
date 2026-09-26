import { SESSION_LABELS } from "../lib/azkar";
import { MINUTE } from "../lib/dates";
import type { BannerMessage, BannerStatus } from "../lib/messages";
import { randomReminder } from "../lib/reminders";
import { getStatus, type ActiveStatus, type Status } from "../lib/session";
import { get, getSettings, onChange, set } from "../lib/storage";
import type { Strictness } from "../lib/types";

const ALARM_BOUNDARY = "window-boundary";
const ALARM_NAG = "nag";
const NAG_MINUTES = 30;
const NOTIFICATION_ID = "azkar-nag";
const BANNER_SCRIPT_ID = "site-banner";
const SITE_ORIGINS = ["http://*/*", "https://*/*"];

/** How long a dismissed site banner stays hidden. */
const BANNER_SNOOZE: Record<Strictness, number> = {
  gentle: 60 * MINUTE,
  normal: 30 * MINUTE,
  strict: 10 * MINUTE,
};

// Serialize refreshes: storage changes fire in bursts (one per tap), and
// content-script registration is not safe to run concurrently.
let chain: Promise<void> = Promise.resolve();
function refresh(opts: { windowStarted?: boolean } = {}): Promise<void> {
  chain = chain
    .then(() => doRefresh(opts))
    .catch((err) => console.error("Azkar Guard refresh failed:", err));
  return chain;
}

async function doRefresh({ windowStarted = false }: { windowStarted?: boolean }): Promise<void> {
  const status = await getStatus();
  await updateBadge(status);
  await syncBannerScript();

  if (status.state !== "active") {
    await chrome.alarms.clear(ALARM_NAG);
    // Retry soon on errors (e.g. offline) so windows are picked up once online.
    if (status.state === "error") await chrome.alarms.create(ALARM_BOUNDARY, { delayInMinutes: 15 });
    return;
  }

  await chrome.alarms.create(ALARM_BOUNDARY, { when: status.window.end + 1000 });

  if (status.complete) {
    await chrome.alarms.clear(ALARM_NAG);
    await chrome.notifications.clear(NOTIFICATION_ID);
    return;
  }

  if (windowStarted) {
    // New window: remind right away, then every 30 minutes from now.
    await chrome.alarms.clear(ALARM_NAG);
    await notify(status);
  }
  if (!(await chrome.alarms.get(ALARM_NAG))) {
    await chrome.alarms.create(ALARM_NAG, {
      delayInMinutes: NAG_MINUTES,
      periodInMinutes: NAG_MINUTES,
    });
  }
}

async function nag(): Promise<void> {
  const status = await getStatus();
  if (status.state === "active" && !status.complete) {
    await notify(status);
  } else {
    await chrome.alarms.clear(ALARM_NAG);
  }
}

async function notify(status: ActiveStatus): Promise<void> {
  if (!status.settings.notifications) return;
  const reminder = randomReminder();
  await chrome.notifications.create(NOTIFICATION_ID, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title: `${SESSION_LABELS[status.window.session].en} not finished yet`,
    message: `${status.doneCount} of ${status.total} done. "${reminder.text}" (${reminder.ref})`,
    priority: 1,
  });
}

async function updateBadge(status: Status): Promise<void> {
  let text = "";
  let title = "Azkar Guard";
  if (status.state === "unconfigured") {
    text = "!";
    title = "Azkar Guard: set your location to start";
  } else if (status.state === "error") {
    text = "?";
    title = `Azkar Guard: ${status.error}`;
  } else {
    const label = SESSION_LABELS[status.window.session].en;
    if (status.complete) {
      title = `${label} complete`;
    } else {
      text = String(status.total - status.doneCount);
      title = `${label}: ${status.doneCount}/${status.total} done`;
    }
  }
  await chrome.action.setBadgeBackgroundColor({ color: "#b45309" });
  await chrome.action.setBadgeText({ text });
  await chrome.action.setTitle({ title });
}

/** Register the site banner only when the user enabled it and granted host access. */
async function syncBannerScript(): Promise<void> {
  const settings = await getSettings();
  const granted = await chrome.permissions.contains({ origins: SITE_ORIGINS });
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [BANNER_SCRIPT_ID] });
  const wanted = settings.siteBanner && granted;

  if (wanted && registered.length === 0) {
    await chrome.scripting.registerContentScripts([
      { id: BANNER_SCRIPT_ID, js: ["content.js"], matches: SITE_ORIGINS, runAt: "document_idle" },
    ]);
  } else if (!wanted && registered.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [BANNER_SCRIPT_ID] });
  }
}

async function bannerStatus(): Promise<BannerStatus> {
  const status = await getStatus();
  if (status.state !== "active" || status.complete || !status.settings.siteBanner) {
    return { show: false };
  }
  const dismissedAt = (await get("bannerDismissedAt")) ?? 0;
  if (Date.now() - dismissedAt < BANNER_SNOOZE[status.settings.strictness]) return { show: false };
  return {
    show: true,
    session: status.window.session,
    doneCount: status.doneCount,
    total: status.total,
    reminder: randomReminder(),
  };
}

async function openChecklist(): Promise<void> {
  await chrome.tabs.create({ url: chrome.runtime.getURL("src/newtab/index.html") });
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await refresh();
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) await chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(() => void refresh());

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_BOUNDARY) void refresh({ windowStarted: true });
  else if (alarm.name === ALARM_NAG) void nag();
});

onChange(["settings", "progress", "history"], () => void refresh());

chrome.permissions.onAdded.addListener(() => void refresh());
chrome.permissions.onRemoved.addListener(() => void refresh());

chrome.notifications.onClicked.addListener(async (id) => {
  if (id !== NOTIFICATION_ID) return;
  await chrome.notifications.clear(id);
  await openChecklist();
});

chrome.runtime.onMessage.addListener((message: BannerMessage, _sender, sendResponse) => {
  const handle = async (): Promise<unknown> => {
    switch (message.type) {
      case "banner:status":
        return bannerStatus();
      case "banner:dismiss":
        await set("bannerDismissedAt", Date.now());
        return { ok: true };
      case "open-checklist":
        await openChecklist();
        return { ok: true };
    }
  };
  handle()
    .then(sendResponse)
    .catch((err) => {
      console.error("Azkar Guard message failed:", err);
      sendResponse({ show: false });
    });
  return true; // keep the channel open for the async response
});
