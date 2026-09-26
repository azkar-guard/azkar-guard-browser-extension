import { estimateMinutes, LEVEL_LABELS, LEVELS } from "../lib/azkar";
import { formatTime } from "../lib/dates";
import { getStatus } from "../lib/session";
import { getSettings, set } from "../lib/storage";
import type { Level, Location, Settings, Strictness } from "../lib/types";

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

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function toggleLocationFields(): void {
  const kind = (form.elements.namedItem("kind") as RadioNodeList).value;
  document.getElementById("city-fields")!.hidden = kind !== "city";
  document.getElementById("coords-fields")!.hidden = kind !== "coords";
}

function populateSelects(): void {
  const method = field<HTMLSelectElement>("method");
  for (const [id, name] of METHODS) method.add(new Option(name, String(id)));

  const level = field<HTMLSelectElement>("level");
  for (const l of LEVELS) {
    const minutes = `~${estimateMinutes("morning", l)} min morning, ~${estimateMinutes("evening", l)} min evening`;
    level.add(new Option(`${LEVEL_LABELS[l]} (${minutes})`, l));
  }
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
      throw new Error("Latitude must be a number between -90 and 90.");
    }
    if (!field("longitude").value || Number.isNaN(longitude) || Math.abs(longitude) > 180) {
      throw new Error("Longitude must be a number between -180 and 180.");
    }
    return { kind: "coords", latitude, longitude };
  }
  const city = field("city").value.trim();
  const country = field("country").value.trim();
  if (!city || !country) throw new Error("Enter both a city and a country.");
  return { kind: "city", city, country };
}

async function save(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  let settings: Settings;
  try {
    settings = {
      location: readLocation(),
      method: Number(field<HTMLSelectElement>("method").value),
      level: field<HTMLSelectElement>("level").value as Level,
      notifications: field("notifications").checked,
      siteBanner: field("siteBanner").checked,
      strictness: field<HTMLSelectElement>("strictness").value as Strictness,
    };
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
    return;
  }

  await set("settings", settings);
  setStatus("Saved. Checking prayer times…");

  const status = await getStatus();
  if (status.state === "active") {
    const { session, start, end } = status.window;
    setStatus(`Saved. Current window: ${session}, ${formatTime(start)} to ${formatTime(end)}.`);
  } else if (status.state === "error") {
    setStatus(`Saved, but prayer times failed: ${status.error}`, true);
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
    setStatus("Site access was not granted, so the banner stays off.", true);
  }
}

function locate(): void {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not available in this browser.", true);
    return;
  }
  setStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      field("latitude").value = pos.coords.latitude.toFixed(4);
      field("longitude").value = pos.coords.longitude.toFixed(4);
      setStatus("Location found. Press Save to apply.");
    },
    (err) => setStatus(`Could not get location: ${err.message}`, true),
    { timeout: 15_000 },
  );
}

populateSelects();
fill(await getSettings());

form.addEventListener("change", (e) => {
  if ((e.target as HTMLInputElement).name === "kind") toggleLocationFields();
});
form.addEventListener("submit", (e) => void save(e));
field("siteBanner").addEventListener("change", (e) => void onBannerToggle(e));
document.getElementById("locate")!.addEventListener("click", locate);
