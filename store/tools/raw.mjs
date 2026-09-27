// Capture raw 1280x800 screens of the real built extension, per language.
import puppeteer from "puppeteer";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const REPO = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
const EXT = `${REPO}/dist`;
const CONTENT = readFileSync(`${EXT}/content.js`, "utf8");
const RAW = new URL("./raw/", import.meta.url).pathname;
mkdirSync(RAW, { recursive: true });
const bannerRects = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const STR = {
  ar: { title: "أذكار الصباح: أُنجز 0 من 8", quote: "«أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ» (الرعد: 28)", open: "افتح الأذكار", later: "لاحقًا",
        nudges: ["ثبّتّني حتى لا تنسى… هل ستؤجّلها فعلًا؟", "لن تأخذ أكثر من نحو 3 د… والأذكار حصن المسلم.", "آخر مرة أسألك… «فَاذْكُرُونِي أَذْكُرْكُمْ»"], hl: "ar" },
  en: { title: "Morning Azkar: 0 of 8 done", quote: "«Verily, in the remembrance of Allah do hearts find rest.» (Qur'an 13:28)", open: "Open checklist", later: "Later",
        nudges: ["You installed me so you wouldn't forget. Putting it off again?", "It takes only about 3 min… and the Azkar are the Muslim's fortress.", "Last time I'll ask… “Remember Me; I will remember you.” (2:152)"], hl: "en" },
};
const THEME = { ar: "dark", en: "light" };

const browser = await puppeteer.launch({ headless: true, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
const swT = await browser.waitForTarget((t) => t.type() === "service_worker" && t.url().endsWith("background.js"));
const sw = await swT.worker();
const base = `chrome-extension://${new URL(swT.url()).host}`;
await sleep(1000);
const settings = (o) => sw.evaluate((o) => chrome.storage.local.set({ settings: { location: { kind: "city", city: "Cairo", country: "Egypt" }, method: 5, level: "small", notifications: true, strictness: "normal", siteBanner: false, language: "en", theme: "light", textSize: "regular", ...o } }), o);
const reset = () => sw.evaluate(() => chrome.storage.local.remove(["progress", "history"]));
const open = async (path, w = 1280, h = 800) => {
  const p = await browser.newPage();
  p.on("pageerror", (e) => errors.push(`${path}: ${e.message}`));
  await p.setViewport({ width: w, height: h });
  await p.goto(`${base}/${path}`);
  await sleep(800);
  return p;
};
const tapFirst = (p) => p.evaluate(() => document.querySelector(".list .dhikr-button").click());
const top = async (p) => { await p.evaluate(() => window.scrollTo(0, 0)); await sleep(300); };

for (const L of ["ar", "en"]) {
  // Checklist: one done, next one mid-count
  await reset(); await settings({ language: L, theme: THEME[L], level: "small" });
  let p = await open("src/newtab/index.html?checklist");
  for (let i = 0; i < 2; i++) { await tapFirst(p); await sleep(430); }
  await top(p);
  await p.screenshot({ path: `${RAW}checklist-${L}.png` });
  // Completion, caught mid-celebration
  while (await p.$(".list .dhikr-button")) { await tapFirst(p); await sleep(420); }
  await sleep(1550);
  await p.screenshot({ path: `${RAW}complete-${L}.png` });
  await p.close();

  // Levels: medium selected, large text
  await reset(); await settings({ language: L, theme: THEME[L], level: "medium", textSize: "large" });
  p = await open("src/newtab/index.html?checklist");
  await top(p);
  await p.screenshot({ path: `${RAW}large-${L}.png` });
  await p.close();

  // Popup
  await settings({ language: L, theme: THEME[L], level: "small", textSize: "regular" });
  p = await open("src/popup/index.html", 400, 600);
  await p.screenshot({ path: `${RAW}popup-${L}.png` });
  await p.close();

  // Settings, scrolled to reminders + credits
  p = await open("src/options/index.html");
  await p.evaluate(() => document.querySelector(".credits").scrollIntoView({ block: "end" }));
  await sleep(300);
  await p.screenshot({ path: `${RAW}settings-${L}.png` });
  await p.close();

  // Site banner on the real Chrome Web Store page, before and after one "Later"
  p = await browser.newPage();
  await p.setBypassCSP(true);
  await p.setViewport({ width: 1280, height: 800 });
  await p.setUserAgent((await browser.userAgent()).replace("HeadlessChrome", "Chrome"));
  await p.setExtraHTTPHeaders({ "Accept-Language": STR[L].hl });
  await p.goto(`https://chromewebstore.google.com/?hl=${STR[L].hl}`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500);
  // Dismiss Chrome Web Store's "switch to Chrome?" prompt shown to test browsers.
  const dismissed = await p.evaluate(() => {
    const b = [...document.querySelectorAll("button, [role=button]")].find((e) => /^(لا، شكرًا|لا، شكراً|No thanks)$/.test(e.textContent.trim()));
    if (b) b.click();
    return Boolean(b);
  });
  console.log(L, "prompt dismissed:", dismissed);
  await sleep(800);
  await p.evaluate((s) => {
    const stub = { runtime: { sendMessage: async (m) => (m.type === "banner:status" ? { show: true, lang: s.hl, scale: 1, ...s } : { ok: true }) } };
    Object.defineProperty(window, "chrome", { value: stub, configurable: true, writable: true });
  }, STR[L]);
  await p.addScriptTag({ content: CONTENT });
  await sleep(800);
  const rect = () => p.evaluate(() => {
    const hit = (x, y) => document.elementFromPoint(x, y)?.id === "azkar-guard-banner";
    const y0 = innerHeight - 40;
    let l = null, r = null;
    for (let x = 0; x < innerWidth; x += 2) if (hit(x, y0)) { l ??= x; r = x; }
    if (l === null) return null;
    const cx = Math.round((l + r) / 2);
    let t = null, b = null;
    for (let y = innerHeight - 1; y > innerHeight - 220; y--) if (hit(cx, y)) { b ??= y; t = y; }
    return { x: l, y: t, w: r - l + 1, h: b - t + 1 };
  });
  const before = await rect();
  await p.screenshot({ path: `${RAW}banner-a-${L}.png` });
  // "Later" is the last button: leftmost in RTL, rightmost in LTR.
  const laterX = L === "ar" ? before.x + 40 : before.x + before.w - 40;
  await p.mouse.click(laterX, before.y + before.h / 2);
  await sleep(900);
  const after = await rect();
  await p.screenshot({ path: `${RAW}banner-b-${L}.png` });
  // Second "Later": the banner runs to the other edge with the next nudge.
  const laterX2 = L === "ar" ? after.x + 40 : after.x + after.w - 40;
  await p.mouse.click(laterX2, after.y + after.h / 2);
  await sleep(900);
  const after2 = await rect();
  await p.screenshot({ path: `${RAW}banner-c-${L}.png` });
  console.log(L, "banner", JSON.stringify({ before, after, after2 }));
  bannerRects[L] = { from: after, to: after2 };
  await p.close();
}
writeFileSync(`${RAW}banner.json`, JSON.stringify(bannerRects, null, 2));
console.log("errors:", errors.length ? errors : "none");
await browser.close();
