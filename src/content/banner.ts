// Opt-in site banner. Registered at runtime by the background worker only when
// the user enabled it and granted host access. It never reads page content.
import type { BannerMessage, BannerStatus } from "../lib/messages";

const RECHECK_MS = 5 * 60_000;
const HOST_ID = "azkar-guard-banner";
/** "Later" makes the banner run away this many times before it really hides. */
const DODGES = 3;
/** Gap kept between the banner and the viewport edge when it runs to a side. */
const EDGE_GAP = 16;

const STYLE = `
  :host { all: initial; }
  .banner {
    --x: 0px;
    position: fixed; left: 50%; bottom: 16px; z-index: 2147483647;
    transform: translateX(calc(-50% + var(--x)));
    transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-sizing: border-box; width: max-content; max-width: min(640px, calc(100vw - 32px));
    display: flex; align-items: center; gap: 16px;
    padding: 12px 16px; border-radius: 12px;
    background: #1b1f1c; color: #e8ebe8; border: 1px solid #2d332f;
    box-shadow: 0 8px 24px rgba(0,0,0,.25);
    font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .text { min-width: 0; }
  .title { font-weight: 600; margin: 0 0 2px; }
  .quote { margin: 0; color: #9aa69f; font-size: 12.5px; }
  .quote.nudge { color: #f4c56a; font-size: 13px; }
  .actions { display: flex; gap: 8px; flex: none; }
  button {
    font: inherit; cursor: pointer; border-radius: 8px; padding: 6px 12px;
    border: 1px solid #5cc08f; white-space: nowrap;
  }
  .open { background: #5cc08f; color: #121513; }
  .later { background: transparent; color: #5cc08f; }
  @media (max-width: 520px) {
    .banner { flex-direction: column; align-items: stretch; }
  }
  @media (prefers-reduced-motion: reduce) {
    .banner { transition: none; }
  }
`;

function send<T>(message: BannerMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

function remove(): void {
  document.getElementById(HOST_ID)?.remove();
}

function show(status: Extract<BannerStatus, { show: true }>): void {
  // Keep an existing banner as is, so a mid-way dodge is not reset by a recheck.
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement("div");
  host.id = HOST_ID;
  const root = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLE;

  const banner = document.createElement("div");
  banner.className = "banner";
  banner.setAttribute("role", "status");
  banner.lang = status.lang;
  banner.dir = status.lang === "ar" ? "rtl" : "ltr";

  const title = document.createElement("p");
  title.className = "title";
  title.textContent = status.title;

  const quote = document.createElement("p");
  quote.className = "quote";
  quote.textContent = status.quote;

  const text = document.createElement("div");
  text.className = "text";
  text.append(title, quote);

  const open = document.createElement("button");
  open.className = "open";
  open.textContent = status.open;
  open.addEventListener("click", () => {
    remove();
    void send({ type: "open-checklist" });
  });

  // A light nudge: the first few "Later" clicks make the banner run to the right,
  // then the left, and so on. After that, "Later" really dismisses it.
  let dodges = 0;
  const later = document.createElement("button");
  later.className = "later";
  later.textContent = status.later;
  later.addEventListener("click", () => {
    if (dodges >= DODGES) {
      remove();
      void send({ type: "banner:dismiss" });
      return;
    }
    // Swap the quote for a gentle nudge first, so the width used below is final.
    const nudge = status.nudges[dodges];
    if (nudge) {
      quote.textContent = nudge;
      quote.classList.add("nudge");
    }
    const reach = Math.max(0, (window.innerWidth - banner.offsetWidth) / 2 - EDGE_GAP);
    const side = dodges % 2 === 0 ? 1 : -1; // right, left, right…
    banner.style.setProperty("--x", `${side * reach}px`);
    dodges++;
  });

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(open, later);
  banner.append(text, actions);
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
