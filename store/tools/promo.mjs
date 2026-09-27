// Promo tiles from the brand kit's primary (dark) logo lockup.
import puppeteer from "puppeteer";
import { readFileSync } from "node:fs";
const REPO = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
const lockup = "data:image/png;base64," + readFileSync(`${REPO}/brand/logo-primary-dark.png`).toString("base64");
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
// Sample the lockup's own background so the tile blends with it seamlessly.
await page.setContent(`<img id="i" src="${lockup}">`);
await page.waitForFunction(() => document.getElementById("i").complete);
const bg = await page.evaluate(() => {
  const i = document.getElementById("i"), c = document.createElement("canvas");
  c.width = i.naturalWidth; c.height = i.naturalHeight;
  const g = c.getContext("2d"); g.drawImage(i, 0, 0);
  const d = g.getImageData(2, 2, 1, 1).data;
  return `rgb(${d[0]},${d[1]},${d[2]})`;
});
console.log("lockup background:", bg);
const tile = (w, h, lockupW) => `<body style="margin:0;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;background:${bg}">
  <img src="${lockup}" style="width:${lockupW}px;-webkit-mask-image:radial-gradient(ellipse 72% 78% at 50% 50%, #000 78%, transparent 100%)"></body>`;
for (const [w, h, lw, name] of [[440, 280, 400, "promo-small-440x280.png"], [1400, 560, 860, "promo-marquee-1400x560.png"]]) {
  await page.setViewport({ width: w, height: h });
  await page.setContent(tile(w, h, lw));
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: `${REPO}/store/${name}` });
}
await browser.close();
