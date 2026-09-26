import { estimateMinutes, LEVEL_LABELS, LEVELS, SESSION_LABELS } from "../lib/azkar";
import { formatTime } from "../lib/dates";
import { randomReminder } from "../lib/reminders";
import { getStatus, tap, type ActiveStatus, type Status } from "../lib/session";
import { onChange, updateSettings } from "../lib/storage";
import type { Dhikr, Level } from "../lib/types";
import { h } from "./dom";

/** Minimum gap between counted taps, to prevent rapid-fire tapping. */
const TAP_COOLDOWN_MS = 400;

export function mountChecklist(root: HTMLElement): void {
  let lastTap = 0;
  let busy = false;

  const render = async (status?: Status) => {
    const current = status ?? (await getStatus());
    const scrollTop = document.scrollingElement?.scrollTop ?? 0;
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset.id;

    root.replaceChildren(view(current));

    if (document.scrollingElement) document.scrollingElement.scrollTop = scrollTop;
    if (focusedId) root.querySelector<HTMLElement>(`[data-id="${CSS.escape(focusedId)}"]`)?.focus();
  };

  const onTap = async (id: string, button: HTMLElement) => {
    const now = Date.now();
    if (busy || now - lastTap < TAP_COOLDOWN_MS) {
      button.classList.remove("rejected");
      void button.offsetWidth; // restart the animation
      button.classList.add("rejected");
      return;
    }
    lastTap = now;
    busy = true;
    try {
      await render(await tap(id));
    } finally {
      busy = false;
    }
  };

  const view = (status: Status): HTMLElement => {
    switch (status.state) {
      case "unconfigured":
        return h(
          "section",
          { class: "panel" },
          h("h2", {}, "Set your location to start"),
          h("p", {}, "Prayer times decide when the morning and evening windows open."),
          button("Open settings", () => void chrome.runtime.openOptionsPage()),
        );
      case "error":
        return h(
          "section",
          { class: "panel" },
          h("h2", {}, "Could not load prayer times"),
          h("p", { class: "muted" }, status.error),
          button("Retry", () => void render()),
          " ",
          button("Settings", () => void chrome.runtime.openOptionsPage(), "secondary"),
        );
      case "active":
        return status.complete ? completeView(status) : activeView(status);
    }
  };

  const header = (status: ActiveStatus): HTMLElement => {
    const { session, end } = status.window;
    const label = SESSION_LABELS[session];
    const percent = Math.round((status.doneCount / status.total) * 100);
    return h(
      "header",
      { class: "session-header" },
      h(
        "div",
        { class: "title-row" },
        h("h1", {}, label.en),
        h("span", { class: "arabic-title", lang: "ar", dir: "rtl" }, label.ar),
      ),
      h(
        "p",
        { class: "meta" },
        `${status.doneCount} / ${status.total} done · window ends ${formatTime(end)} · streak ${status.streak} ${status.streak === 1 ? "day" : "days"}`,
      ),
      h("div", {
        class: "bar",
        role: "progressbar",
        "aria-valuenow": String(percent),
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        style: `--p:${percent}%`,
      }),
    );
  };

  const levelPicker = (status: ActiveStatus): HTMLElement => {
    const pick = (level: Level) => {
      const selected = level === status.settings.level;
      const el = h(
        "button",
        { type: "button", class: `level${selected ? " selected" : ""}`, "aria-pressed": String(selected) },
        h("strong", {}, LEVEL_LABELS[level]),
        h("span", {}, `~${estimateMinutes(status.window.session, level)} min`),
      );
      el.addEventListener("click", () => void updateSettings({ level }));
      return el;
    };
    return h(
      "div",
      { class: "levels", role: "group", "aria-label": "How much time do you have?" },
      ...LEVELS.map(pick),
    );
  };

  const dhikrCard = (d: Dhikr, left: number): HTMLElement => {
    if (left === 0) {
      return h(
        "li",
        { class: "dhikr done" },
        h("span", { class: "check", "aria-hidden": "true" }, "✓"),
        h("span", { class: "arabic snippet", lang: "ar", dir: "rtl" }, d.arabic_text),
      );
    }
    const card = h(
      "button",
      {
        type: "button",
        class: "dhikr-button",
        "data-id": d.id,
        "aria-label": `Count one repetition, ${left} left`,
      },
      h("p", { class: "arabic", lang: "ar", dir: "rtl" }, d.arabic_text),
      h(
        "div",
        { class: "card-footer" },
        d.virtue_note ? h("p", { class: "virtue" }, d.virtue_note) : h("span"),
        h("span", { class: "count", "aria-hidden": "true" }, String(left)),
      ),
    );
    card.addEventListener("click", () => void onTap(d.id, card));
    return h("li", { class: "dhikr" }, card);
  };

  const activeView = (status: ActiveStatus): HTMLElement =>
    h(
      "div",
      {},
      header(status),
      levelPicker(status),
      h("ol", { class: "list" }, ...status.items.map((d) => dhikrCard(d, status.remaining[d.id] ?? 0))),
    );

  const completeView = (status: ActiveStatus): HTMLElement => {
    const next = status.window.session === "morning" ? "Evening" : "Morning";
    const reminder = randomReminder();
    return h(
      "section",
      { class: "panel complete" },
      h("p", { class: "arabic big", lang: "ar", dir: "rtl" }, "الحمد لله"),
      h("h2", {}, `${SESSION_LABELS[status.window.session].en} complete`),
      h(
        "p",
        { class: "meta" },
        `${next} Azkar opens at ${formatTime(status.window.end)} · streak ${status.streak} ${status.streak === 1 ? "day" : "days"}`,
      ),
      h("blockquote", {}, reminder.text, h("cite", {}, reminder.ref)),
    );
  };

  onChange(["settings", "progress", "history"], () => {
    if (!busy) void render();
  });
  void render();
}

function button(label: string, onClick: () => void, variant = "primary"): HTMLButtonElement {
  const el = h("button", { type: "button", class: `btn ${variant}` }, label);
  el.addEventListener("click", onClick);
  return el;
}
