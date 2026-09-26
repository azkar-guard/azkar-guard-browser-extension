// Opt-in site banner. Registered at runtime by the background worker only when
// the user enabled it and granted host access. It never reads page content.
import type { BannerMessage, BannerStatus } from "../lib/messages";

const RECHECK_MS = 5 * 60_000;
const HOST_ID = "azkar-guard-banner";
const SESSION_NAMES = { morning: "Morning", evening: "Evening" } as const;

const STYLE = `
  :host { all: initial; }
  .banner {
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
    max-width: 340px; padding: 14px 16px; border-radius: 12px;
    background: #1b1f1c; color: #e8ebe8; border: 1px solid #2d332f;
    box-shadow: 0 8px 24px rgba(0,0,0,.25);
    font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .title { font-weight: 600; margin: 0 0 4px; }
  .quote { margin: 0 0 12px; color: #9aa69f; font-size: 12.5px; }
  .actions { display: flex; gap: 8px; }
  button {
    font: inherit; cursor: pointer; border-radius: 8px; padding: 6px 12px;
    border: 1px solid #5cc08f;
  }
  .open { background: #5cc08f; color: #121513; }
  .later { background: transparent; color: #5cc08f; }
`;

function send<T>(message: BannerMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

function remove(): void {
  document.getElementById(HOST_ID)?.remove();
}

function show(status: Extract<BannerStatus, { show: true }>): void {
  remove();
  const host = document.createElement("div");
  host.id = HOST_ID;
  const root = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLE;

  const banner = document.createElement("div");
  banner.className = "banner";
  banner.setAttribute("role", "status");

  const title = document.createElement("p");
  title.className = "title";
  title.textContent = `${SESSION_NAMES[status.session]} Azkar: ${status.doneCount} of ${status.total} done`;

  const quote = document.createElement("p");
  quote.className = "quote";
  quote.textContent = `"${status.reminder.text}" (${status.reminder.ref})`;

  const open = document.createElement("button");
  open.className = "open";
  open.textContent = "Open checklist";
  open.addEventListener("click", () => {
    remove();
    void send({ type: "open-checklist" });
  });

  const later = document.createElement("button");
  later.className = "later";
  later.textContent = "Later";
  later.addEventListener("click", () => {
    remove();
    void send({ type: "banner:dismiss" });
  });

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(open, later);
  banner.append(title, quote, actions);
  root.append(style, banner);
  document.documentElement.append(host);
}

async function check(): Promise<void> {
  if (document.visibilityState !== "visible") return;
  try {
    const status = await send<BannerStatus>({ type: "banner:status" });
    if (status.show) show(status);
    else remove();
  } catch {
    // Extension was reloaded or updated; this orphaned script can no longer talk to it.
    clearInterval(timer);
  }
}

const timer = window.top === window ? setInterval(() => void check(), RECHECK_MS) : undefined;
if (timer !== undefined) {
  void check();
  document.addEventListener("visibilitychange", () => void check());
}
