// Compose 1280x800 marketing screenshots from the raw captures, on the Azkar Guard brand.
import puppeteer from "puppeteer";
import { readFileSync } from "node:fs";
const REPO = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
const RAW = new URL("./raw/", import.meta.url).pathname;
const b64 = (p, mime) => `data:${mime};base64,${readFileSync(p).toString("base64")}`;
const img = (name) => b64(RAW + name, "image/png");
const brandIcon = b64(`${REPO}/brand/icon-app-source.png`, "image/png");
const toolbarIcon = b64(`${REPO}/public/icons/icon-32.png`, "image/png");
const font = (pkg, file) => b64(`${REPO}/node_modules/@fontsource/${pkg}/files/${file}`, "font/woff2");
const FONTS = `
  @font-face { font-family: Inter; font-weight: 500; src: url(${font("inter", "inter-latin-500-normal.woff2")}); }
  @font-face { font-family: Inter; font-weight: 800; src: url(${font("inter", "inter-latin-800-normal.woff2")}); }
  @font-face { font-family: Tajawal; font-weight: 500; src: url(${font("tajawal", "tajawal-arabic-500-normal.woff2")}); }
  @font-face { font-family: Tajawal; font-weight: 800; src: url(${font("tajawal", "tajawal-arabic-800-normal.woff2")}); }`;

// Banner positions measured by raw.mjs: after the 1st "Later" (right edge) and the 2nd (left edge).
const BANNER = JSON.parse(readFileSync(`${RAW}banner.json`, "utf8"));

const COPY = {
  ar: {
    brand: "حارس الأذكار",
    slides: [
      { h: "لا تفوتك أذكار الصباح والمساء بعد اليوم", s: "اضغط على كل ذكر ليُعدّ حتى يكتمل، والتذكير لا يتوقف حتى تُتمّها", pills: ["مجاني للأبد", "بلا إعلانات", "بياناتك على جهازك"] },
      { h: "حتى «لاحقًا» ليست سهلة", s: "شريط تذكير اختياري في المواقع التي تزورها… يهرب من «لاحقًا» ويذكّرك بلطف" },
      { h: "دائمًا أمامك بنقرة واحدة", s: "العداد على الأيقونة يخبرك كم بقي، والأذكار في نافذة صغيرة" },
      { h: "على قدر وقتك وطاقتك", s: "ثلاثة مستويات: مختصر (نحو 3 د) ومتوسط وكامل، وخط أكبر لمن يحتاجه" },
      { h: "الحمد لله… أتممتها", s: "احتفال هادئ، ومداومة تُحتسب كل يوم، وتعود صفحة التبويب الجديد لطبيعتها" },
    ],
  },
  en: {
    brand: "Azkar Guard",
    slides: [
      { h: "Never miss your morning & evening Azkar", s: "Tap to count each dhikr. The reminders don't stop until you're done.", pills: ["Free forever", "No ads", "Your data stays on your device"] },
      { h: "Even “Later” isn't that easy", s: "An optional reminder bar on the sites you visit. It dodges “Later” and nudges you gently." },
      { h: "Always one click away", s: "The badge shows how many are left. The checklist opens right from the toolbar." },
      { h: "Fits your time and energy", s: "Three levels: Small (~3 min), Medium and Full, plus larger text when you need it." },
      { h: "Alhamdulillah, done for today", s: "A calm celebration, a daily streak, and your new tab goes back to normal." },
    ],
  },
};

const css = (L) => `${FONTS}
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 800px; overflow: hidden; position: relative;
    background: radial-gradient(ellipse at 50% -20%, #1a7a4c 0%, #0f5132 38%, #0a2a1d 78%, #081f16 100%);
    font-family: ${L === "ar" ? "Tajawal, Inter" : "Inter, Tajawal"}, sans-serif; color: #f8faf6; }
  .brand { position: absolute; top: 26px; ${L === "ar" ? "right" : "left"}: 36px; display: flex; align-items: center; gap: 10px;
    font-weight: 800; font-size: 20px; direction: ${L === "ar" ? "rtl" : "ltr"}; }
  .brand img { width: 38px; height: 38px; }
  .brand .accent { color: #22c55e; }
  .text { position: absolute; top: 70px; left: 0; right: 0; text-align: center; padding: 0 90px; }
  h1 { font-size: ${L === "ar" ? 48 : 44}px; font-weight: 800; letter-spacing: ${L === "ar" ? 0 : -0.8}px; line-height: 1.2; }
  p.sub { margin-top: 12px; font-size: 21px; font-weight: 500; color: #d7e4dc; line-height: 1.45; }
  .pills { margin-top: 16px; display: flex; gap: 10px; justify-content: center; }
  .pill { font-size: 15px; font-weight: 800; padding: 6px 15px; border-radius: 999px; color: #0b1f18; background: #22c55e; }
  .win { position: absolute; left: 50%; transform: translateX(-50%); border-radius: 14px; overflow: hidden;
    background: #fff; box-shadow: 0 30px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08); }
  .bar { height: 34px; background: #dee1e6; display: flex; align-items: center; gap: 7px; padding: 0 14px; direction: ltr; }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .url { flex: 1; margin-left: 14px; height: 22px; border-radius: 11px; background: #fff; font: 12px -apple-system, sans-serif; color: #5f6368; display: flex; align-items: center; padding: 0 12px; }
  .ext { position: relative; width: 22px; height: 22px; }
  .ext img { width: 22px; height: 22px; border-radius: 5px; }
  .badge { position: absolute; right: -8px; bottom: -5px; background: #b45309; color: #fff; font: 700 10px -apple-system, sans-serif; border-radius: 7px; padding: 1px 4px; }
  .shot { display: block; background-repeat: no-repeat; }
`;

const win = ({ top, width, src, cropH, cropTop = 0, url, badge, extra = "" }) => {
  const scale = width / 1280;
  return `<div class="win" style="top:${top}px;width:${width}px">
    <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span>
      <div class="url">${url}</div>${badge ? `<div class="ext"><img src="${toolbarIcon}"><span class="badge">${badge}</span></div>` : ""}</div>
    <div class="shot" style="position:relative;width:${width}px;height:${Math.round(cropH * scale)}px;background-image:url(${src});background-size:${width}px auto;background-position:0 -${Math.round(cropTop * scale)}px">${extra}</div>
  </div>`;
};

const slides = (L) => {
  const { brand, slides: c } = COPY[L];
  const brandHtml = L === "ar"
    ? `<div class="brand"><img src="${brandIcon}"><span>حارس <span class="accent">الأذكار</span></span></div>`
    : `<div class="brand"><img src="${brandIcon}"><span>Azkar <span class="accent">Guard</span></span></div>`;
  const pills = (x) => (x.pills ? `<div class="pills">${x.pills.map((p) => `<span class="pill">${p}</span>`).join("")}</div>` : "");
  const text = (x) => `${brandHtml}<div class="text" dir="${L === "ar" ? "rtl" : "ltr"}"><h1>${x.h}</h1><p class="sub">${x.s}</p>${pills(x)}</div>`;
  const nt = L === "ar" ? "علامة تبويب جديدة" : "New Tab";

  // 2: the banner's second dodge (right edge -> left edge) on the real page.
  const W2 = 1080, s2 = W2 / 1280, T2 = 300, b = BANNER[L];
  const sc = (r) => ({ x: r.x * s2, y: (r.y - T2) * s2, w: r.w * s2, h: r.h * s2 });
  const g = sc(b.from), a = sc(b.to);
  const fromX = g.x + g.w / 2, toX = a.x + a.w / 2, fromY = g.y - 12, toY = a.y - 14;
  const peak = Math.min(fromY, toY) - 110;
  const ghost = `<div style="position:absolute;left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px;border-radius:10px;
      background:url(${img(`banner-b-${L}.png`)}) -${g.x}px -${b.from.y * s2}px / ${W2}px auto;opacity:.35;outline:2px dashed #22c55e;outline-offset:4px"></div>
    <svg width="${W2}" height="${(800 - T2) * s2}" style="position:absolute;inset:0;overflow:visible"><defs><marker id="h" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#0f5132"/></marker></defs>
      <path d="M ${fromX} ${fromY} C ${fromX} ${peak}, ${toX} ${peak}, ${toX} ${toY}" fill="none" stroke="#0f5132" stroke-width="4.5" stroke-dasharray="10 8" marker-end="url(#h)"/></svg>`;

  // 3: popup anchored under the extension icon of a regular page.
  const W3 = 1000, top3 = 250;
  const popup = `<div style="position:absolute;top:${top3 + 34 + 4}px;left:${(1280 - W3) / 2 + W3 - 330}px;width:320px;border-radius:12px;overflow:hidden;
      box-shadow:0 18px 50px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.08)"><img src="${img(`popup-${L}.png`)}" style="display:block;width:320px"></div>`;

  return [
    `${text(c[0])}${win({ top: 262, width: 980, src: img(`checklist-${L}.png`), cropH: 620, url: nt })}`,
    `${text(c[1])}${win({ top: 232, width: W2, src: img(`banner-c-${L}.png`), cropTop: T2, cropH: 800 - T2, url: "chromewebstore.google.com", extra: ghost })}`,
    `${text(c[2])}${win({ top: top3, width: W3, src: img(`banner-a-${L}.png`), cropH: 640, url: "chromewebstore.google.com", badge: "8" })}${popup}`,
    `${text(c[3])}${win({ top: 232, width: 980, src: img(`large-${L}.png`), cropH: 620, url: nt })}`,
    `${text(c[4])}${win({ top: 262, width: 1180, src: img(`complete-${L}.png`), cropTop: 70, cropH: 380, url: nt })}`,
  ];
};

const NAMES = ["1-checklist", "2-site-banner", "3-toolbar-popup", "4-levels-text-size", "5-complete"];
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
for (const L of ["ar", "en"]) {
  const list = slides(L);
  for (let i = 0; i < list.length; i++) {
    await page.setContent(`<!doctype html><html><head><style>${css(L)}</style></head><body>${list[i]}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 200));
    await page.screenshot({ path: `${REPO}/store/screenshots/${L}/${NAMES[i]}.png` });
  }
}
await browser.close();
console.log("ok");
