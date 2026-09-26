import { estimateMinutes, LEVELS } from "../lib/azkar";
import { formatTime } from "../lib/dates";
import { t } from "../lib/i18n";
import { randomReminder } from "../lib/reminders";
import { getStatus, tap, type ActiveStatus, type Status } from "../lib/session";
import { onChange, updateSettings } from "../lib/storage";
import type { Dhikr, Lang, Level, Session } from "../lib/types";
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
    const lang = status.settings.language;
    switch (status.state) {
      case "unconfigured":
        return h(
          "section",
          { class: "panel" },
          h("h2", {}, t(lang, "unconfigured.title")),
          h("p", {}, t(lang, "unconfigured.body")),
          button(t(lang, "action.openSettings"), () => void chrome.runtime.openOptionsPage()),
        );
      case "error":
        return h(
          "section",
          { class: "panel" },
          h("h2", {}, t(lang, "error.title")),
          h("p", { class: "muted" }, status.error),
          h(
            "div",
            { class: "actions" },
            button(t(lang, "action.retry"), () => void render()),
            button(t(lang, "action.settings"), () => void chrome.runtime.openOptionsPage(), "secondary"),
          ),
        );
      case "active":
        return status.complete ? completeView(status) : activeView(status);
    }
  };

  const streakText = (lang: Lang, n: number) =>
    t(lang, "meta.streak", { n, days: t(lang, n === 1 ? "days.one" : "days.other") });

  const header = (status: ActiveStatus): HTMLElement => {
    const lang = status.settings.language;
    const { session, end } = status.window;
    const percent = Math.round((status.doneCount / status.total) * 100);
    return h(
      "header",
      { class: "session-header" },
      h(
        "div",
        { class: "title-row" },
        h("h1", {}, t(lang, `session.${session}`)),
        // In English mode, also show the Arabic session name.
        lang === "en" && h("span", { class: "arabic-title", lang: "ar", dir: "rtl" }, t("ar", `session.${session}`)),
      ),
      h(
        "p",
        { class: "meta" },
        [
          t(lang, "meta.progress", { done: status.doneCount, total: status.total }),
          t(lang, "meta.ends", { time: formatTime(end, lang) }),
          streakText(lang, status.streak),
        ].join(" · "),
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
    const lang = status.settings.language;
    const pick = (level: Level) => {
      const selected = level === status.settings.level;
      const el = h(
        "button",
        { type: "button", class: `level${selected ? " selected" : ""}`, "aria-pressed": String(selected) },
        h("strong", {}, t(lang, `level.${level}`)),
        h("span", {}, t(lang, "level.minutes", { n: estimateMinutes(status.window.session, level) })),
      );
      el.addEventListener("click", () => void updateSettings({ level }));
      return el;
    };
    return h("div", { class: "levels", role: "group", "aria-label": t(lang, "level.group") }, ...LEVELS.map(pick));
  };

  const dhikrCard = (d: Dhikr, left: number, lang: Lang): HTMLElement => {
    if (left === 0) {
      return h(
        "li",
        { class: "dhikr done" },
        h("span", { class: "check", "aria-hidden": "true" }, "✓"),
        h("span", { class: "arabic snippet", lang: "ar", dir: "rtl" }, d.arabic_text),
      );
    }
    const virtue =
      lang === "ar"
        ? d.virtue_note_ar && h("p", { class: "virtue", lang: "ar", dir: "rtl" }, d.virtue_note_ar)
        : d.virtue_note && h("p", { class: "virtue", lang: "en", dir: "ltr" }, d.virtue_note);
    const card = h(
      "button",
      { type: "button", class: "dhikr-button", "data-id": d.id, "aria-label": t(lang, "tap.label", { n: left }) },
      h("p", { class: "arabic", lang: "ar", dir: "rtl" }, d.arabic_text),
      lang === "en" && h("p", { class: "transliteration", lang: "ar-Latn", dir: "ltr" }, d.transliteration),
      lang === "en" && h("p", { class: "translation", lang: "en", dir: "ltr" }, d.translation_en),
      h("div", { class: "card-footer" }, virtue || h("span"), h("span", { class: "count", "aria-hidden": "true" }, String(left))),
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
      h(
        "ol",
        { class: "list" },
        ...status.items.map((d) => dhikrCard(d, status.remaining[d.id] ?? 0, status.settings.language)),
      ),
    );

  const completeView = (status: ActiveStatus): HTMLElement => {
    const lang = status.settings.language;
    const next: Session = status.window.session === "morning" ? "evening" : "morning";
    const reminder = randomReminder(lang);
    return h(
      "section",
      { class: "panel complete" },
      h("p", { class: "arabic big", lang: "ar", dir: "rtl" }, t(lang, "complete.praise")),
      h("h2", {}, t(lang, "complete.title", { session: t(lang, `session.${status.window.session}`) })),
      h(
        "p",
        { class: "meta" },
        [
          t(lang, "complete.next", { session: t(lang, `session.${next}`), time: formatTime(status.window.end, lang) }),
          streakText(lang, status.streak),
        ].join(" · "),
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
