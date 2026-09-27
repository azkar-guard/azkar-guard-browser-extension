import puppeteer from "puppeteer";
import { readFileSync, writeFileSync } from "node:fs";
const REPO = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
const SRC = `${REPO}/brand/logo-system-reference.png`;
const data = "data:image/png;base64," + readFileSync(SRC).toString("base64");
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(`<img id="i" src="${data}">`);
await page.waitForFunction(() => document.getElementById("i").complete);

const out = await page.evaluate(() => {
  const img = document.getElementById("i");
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  // Bounding box of "dark green" pixels inside a search region.
  const bounds = (x0, y0, x1, y1) => {
    let l = 1e9, t = 1e9, r = -1, b = -1;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * c.width + x) * 4, R = px[i], G = px[i + 1], B = px[i + 2];
      if (G > R + 15 && R + G + B < 330) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
    }
    return { x: l, y: t, w: r - l + 1, h: b - t + 1 };
  };
  // Square crop resized to `size`, corners clipped to a rounded square (transparent outside).
  const icon = (box, size, radius) => {
    const side = Math.max(box.w, box.h);
    const sx = box.x + box.w / 2 - side / 2, sy = box.y + box.h / 2 - side / 2;
    const o = document.createElement("canvas");
    o.width = o.height = size;
    const g = o.getContext("2d");
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.beginPath(); g.roundRect(0, 0, size, size, size * radius); g.clip();
    // Resize in halving steps for sharper downscaling.
    let src = c, s = { x: sx, y: sy, w: side, h: side };
    while (s.w / 2 > size) {
      const t = document.createElement("canvas");
      t.width = t.height = Math.round(s.w / 2);
      const tg = t.getContext("2d"); tg.imageSmoothingQuality = "high";
      tg.drawImage(src, s.x, s.y, s.w, s.h, 0, 0, t.width, t.height);
      src = t; s = { x: 0, y: 0, w: t.width, h: t.height };
    }
    g.drawImage(src, s.x, s.y, s.w, s.h, 0, 0, size, size);
    return o.toDataURL("image/png");
  };
  const rect = (x, y, w, h) => {
    const o = document.createElement("canvas");
    o.width = w; o.height = h;
    o.getContext("2d").drawImage(c, x, y, w, h, 0, 0, w, h);
    return o.toDataURL("image/png");
  };
  const app = bounds(1220, 80, 1530, 360);   // "App icon / extension icon (512x512)"
  const sb = bounds(480, 440, 612, 572);  // "Icon only (small / favicon)"
  // Its box also catches the drop shadow below; the icon itself is square, as wide as the box.
  const small = { x: sb.x + 1, y: sb.y + 1, w: sb.w - 2, h: sb.w - 2 };
  return {
    app, small,
    files: {
      "icon-128.png": icon(app, 128, 0.22),
      "icon-48.png": icon(app, 48, 0.22),
      "icon-32.png": icon(small, 32, 0.22),
      "icon-16.png": icon(small, 16, 0.22),
      "icon-app-source.png": icon(app, Math.max(app.w, app.h), 0.22),
      "logo-primary-dark.png": rect(50, 118, 608, 200),
      "logo-secondary-light.png": rect(712, 128, 492, 180),
      "banner-night.png": rect(626, 854, 910, 170),
    },
  };
});
console.log("app icon box:", JSON.stringify(out.app), "| small icon box:", JSON.stringify(out.small));
for (const [name, uri] of Object.entries(out.files)) {
  const dir = name.startsWith("icon-") && name !== "icon-app-source.png" ? `${REPO}/public/icons` : `${REPO}/brand`;
  writeFileSync(`${dir}/${name}`, Buffer.from(uri.split(",")[1], "base64"));
  console.log("wrote", `${dir.replace(REPO + "/", "")}/${name}`);
}
await browser.close();
