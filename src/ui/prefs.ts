import { dir, isI18nKey, t } from "../lib/i18n";
import { getSettings, onChange, TEXT_SCALE, updateSettings } from "../lib/storage";
import type { Settings, TextSize, Theme } from "../lib/types";
import { h } from "./dom";

/** Apply language, direction, theme and static [data-i18n] strings to the page. */
export function applyPrefs(settings: Settings): void {
  const root = document.documentElement;
  root.lang = settings.language;
  root.dir = dir(settings.language);
  if (settings.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  root.style.setProperty("--text-scale", String(TEXT_SCALE[settings.textSize]));

  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (key && isI18nKey(key)) el.textContent = t(settings.language, key);
  }
}

/** Apply prefs now and whenever settings change. Resolves after the first apply. */
export async function watchPrefs(onApply?: (settings: Settings) => void): Promise<Settings> {
  const run = async () => {
    const settings = await getSettings();
    applyPrefs(settings);
    onApply?.(settings);
    return settings;
  };
  onChange(["settings"], () => void run());
  return run();
}

const THEME_ORDER: Theme[] = ["system", "light", "dark"];
const THEME_ICONS: Record<Theme, string> = { system: "◐", light: "☀", dark: "☾" };
const TEXT_SIZE_ORDER: TextSize[] = ["regular", "medium", "large"];
const TEXT_SIZE_ICONS: Record<TextSize, string> = { regular: "A", medium: "A+", large: "A++" };

/** Language, theme and text size toggle buttons, kept in sync with settings. */
export function mountToolbar(container: HTMLElement): void {
  const render = (settings: Settings) => {
    const lang = settings.language;

    const langButton = h(
      "button",
      { type: "button", class: "toggle", title: t(lang, "toggle.languageLabel"), "aria-label": t(lang, "toggle.languageLabel") },
      t(lang, "toggle.language"),
    );
    langButton.addEventListener("click", () => void updateSettings({ language: lang === "ar" ? "en" : "ar" }));

    const next = THEME_ORDER[(THEME_ORDER.indexOf(settings.theme) + 1) % THEME_ORDER.length]!;
    const label = t(lang, `theme.${settings.theme}`);
    const themeButton = h(
      "button",
      { type: "button", class: "toggle icon", title: label, "aria-label": label },
      THEME_ICONS[settings.theme],
    );
    themeButton.addEventListener("click", () => void updateSettings({ theme: next }));

    const nextSize =
      TEXT_SIZE_ORDER[(TEXT_SIZE_ORDER.indexOf(settings.textSize) + 1) % TEXT_SIZE_ORDER.length]!;
    const sizeLabel = t(lang, "textSize.label", { size: t(lang, `textSize.${settings.textSize}`) });
    const sizeButton = h(
      "button",
      { type: "button", class: "toggle", dir: "ltr", title: sizeLabel, "aria-label": sizeLabel },
      TEXT_SIZE_ICONS[settings.textSize],
    );
    sizeButton.addEventListener("click", () => void updateSettings({ textSize: nextSize }));

    container.replaceChildren(langButton, sizeButton, themeButton);
  };
  void watchPrefs(render);
}
