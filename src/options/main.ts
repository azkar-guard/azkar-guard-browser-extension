import { estimateMinutes, LEVELS } from "../lib/azkar";
import { formatTime } from "../lib/dates";
import { t, type I18nKey } from "../lib/i18n";
import { getStatus } from "../lib/session";
import { getSettings, set, updateSettings } from "../lib/storage";
import type { Lang, Level, Location, Settings, Strictness, Theme } from "../lib/types";
import { mountToolbar, watchPrefs } from "../ui/prefs";

const SITE_ORIGINS = ["http://*/*", "https://*/*"];

// Aladhan calculation methods (https://api.aladhan.com/v1/methods).
const METHODS: [number, string][] = [
  [3, "Muslim World League"],
  [2, "Islamic Society of North America (ISNA)"],
  [5, "Egyptian General Authority of Survey"],
  [4, "Umm Al-Qura University, Makkah"],
  [1, "University of Islamic Sciences, Karachi"],
  [8, "Gulf Region"],
  [9, "Kuwait"],
  [10, "Qatar"],
  [16, "Dubai"],
  [23, "Jordan (Ministry of Awqaf)"],
  [13, "Diyanet, Turkey"],
  [12, "UOIF, France"],
  [11, "MUIS, Singapore"],
  [17, "JAKIM, Malaysia"],
  [20, "Kemenag, Indonesia"],
  [18, "Tunisia"],
  [19, "Algeria"],
  [21, "Morocco"],
  [14, "Spiritual Administration of Muslims of Russia"],
  [15, "Moonsighting Committee Worldwide"],
];

const form = document.getElementById("form") as HTMLFormElement;
const statusEl = document.getElementById("status")!;
const field = <T extends HTMLElement = HTMLInputElement>(name: string) =>
  form.elements.namedItem(name) as unknown as T;

let lang: Lang = "en";

function setStatus(key: I18nKey, vars: Record<string, string | number> = {}, isError = false): void {
  statusEl.textContent = t(lang, key, vars);
  statusEl.classList.toggle("error", isError);
}

function toggleLocationFields(): void {
  const kind = (form.elements.namedItem("kind") as RadioNodeList).value;
  document.getElementById("city-fields")!.hidden = kind !== "city";
  document.getElementById("coords-fields")!.hidden = kind !== "coords";
}

function renderLevelOptions(): void {
  const select = field<HTMLSelectElement>("level");
  const selected = select.value;
  select.replaceChildren(
    ...LEVELS.map(
      (l) =>
        new Option(
          t(lang, "options.levelOption", {
            level: t(lang, `level.${l}`),
            morning: estimateMinutes("morning", l),
            evening: estimateMinutes("evening", l),
          }),
          l,
        ),
    ),
  );
  if (selected) select.value = selected;
}

function fill(settings: Settings): void {
  const loc = settings.location;
  (form.elements.namedItem("kind") as RadioNodeList).value = loc?.kind ?? "city";
  if (loc?.kind === "city") {
    field("city").value = loc.city;
    field("country").value = loc.country;
  } else if (loc?.kind === "coords") {
    field("latitude").value = String(loc.latitude);
    field("longitude").value = String(loc.longitude);
  }
  field<HTMLSelectElement>("method").value = String(settings.method);
  field<HTMLSelectElement>("level").value = settings.level;
  field("notifications").checked = settings.notifications;
  field("siteBanner").checked = settings.siteBanner;
  field<HTMLSelectElement>("strictness").value = settings.strictness;
  toggleLocationFields();
}

function readLocation(): Location {
  const kind = (form.elements.namedItem("kind") as RadioNodeList).value;
  if (kind === "coords") {
    const latitude = Number(field("latitude").value);
    const longitude = Number(field("longitude").value);
    if (!field("latitude").value || Number.isNaN(latitude) || Math.abs(latitude) > 90) {
      throw new Error("options.errLatitude");
    }
    if (!field("longitude").value || Number.isNaN(longitude) || Math.abs(longitude) > 180) {
      throw new Error("options.errLongitude");
    }
    return { kind: "coords", latitude, longitude };
  }
  const city = field("city").value.trim();
  const country = field("country").value.trim();
  if (!city || !country) throw new Error("options.errCity");
  return { kind: "city", city, country };
}

async function save(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  let location: Location;
  try {
    location = readLocation();
  } catch (err) {
    setStatus((err as Error).message as I18nKey, {}, true);
    return;
  }

  // Language and theme apply immediately on change, so keep whatever is stored.
  await set("settings", {
    ...(await getSettings()),
    location,
    method: Number(field<HTMLSelectElement>("method").value),
    level: field<HTMLSelectElement>("level").value as Level,
    notifications: field("notifications").checked,
    siteBanner: field("siteBanner").checked,
    strictness: field<HTMLSelectElement>("strictness").value as Strictness,
  });
  setStatus("options.savedChecking");

  const status = await getStatus();
  if (status.state === "active") {
    const { session, start, end } = status.window;
    setStatus("options.saved", {
      session: t(lang, `session.${session}`),
      start: formatTime(start, lang),
      end: formatTime(end, lang),
    });
  } else if (status.state === "error") {
    setStatus("options.savedFailed", { error: status.error }, true);
  }
}

// permissions.request must run directly inside the user gesture, so it is
// requested when the box is ticked rather than on save.
async function onBannerToggle(event: Event): Promise<void> {
  const box = event.target as HTMLInputElement;
  if (!box.checked) {
    // Drop site access as soon as the banner is turned off.
    await chrome.permissions.remove({ origins: SITE_ORIGINS });
    return;
  }
  const granted = await chrome.permissions.request({ origins: SITE_ORIGINS });
  if (!granted) {
    box.checked = false;
    setStatus("options.bannerDenied", {}, true);
  }
}

function locate(): void {
  if (!navigator.geolocation) {
    setStatus("options.geoUnavailable", {}, true);
    return;
  }
  setStatus("options.geoLocating");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      field("latitude").value = pos.coords.latitude.toFixed(4);
      field("longitude").value = pos.coords.longitude.toFixed(4);
      setStatus("options.geoFound");
    },
    (err) => setStatus("options.geoFailed", { error: err.message }, true),
    { timeout: 15_000 },
  );
}

const method = field<HTMLSelectElement>("method");
for (const [id, name] of METHODS) method.add(new Option(name, String(id)));

mountToolbar(document.getElementById("toolbar")!);

// Re-localize on every settings change, but only fill the form once so unsaved
// edits are not overwritten when language or theme is toggled.
let filled = false;
await watchPrefs((settings) => {
  lang = settings.language;
  renderLevelOptions();
  field<HTMLSelectElement>("language").value = settings.language;
  field<HTMLSelectElement>("theme").value = settings.theme;
  if (!filled) {
    fill(settings);
    filled = true;
  }
});

form.addEventListener("change", (e) => {
  const target = e.target as HTMLInputElement;
  if (target.name === "kind") toggleLocationFields();
  if (target.name === "language") void updateSettings({ language: target.value as Lang });
  if (target.name === "theme") void updateSettings({ theme: target.value as Theme });
});
form.addEventListener("submit", (e) => void save(e));
field("siteBanner").addEventListener("change", (e) => void onBannerToggle(e));
document.getElementById("locate")!.addEventListener("click", locate);
