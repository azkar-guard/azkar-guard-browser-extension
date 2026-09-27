// GitHub org avatar: the brand kit's app icon, full-bleed square (GitHub rounds the corners itself).
import puppeteer from "puppeteer";
import { readFileSync, writeFileSync } from "node:fs";
const REPO = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
const src = "data:image/png;base64," + readFileSync(`${REPO}/brand/logo-system-reference.png`).toString("base64");
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(`<img id="i" src="${src}">`);
await page.waitForFunction(() => document.getElementById("i").complete);
const uri = await page.evaluate(() => {
  const img = document.getElementById("i");
  // App icon area measured by crop-brand.mjs: x 1265, y 108, 213x216.
  // Inset past the rounded corners so the crop is solid icon background edge to edge.
  const box = { x: 1265, y: 108, w: 213, h: 216 };
  const inset = 0, side = Math.min(box.w, box.h) - inset * 2;
  const sx = box.x + (box.w - side) / 2, sy = box.y + (box.h - side) / 2;
  const size = 460, art = 430;
  // Background: the average colour along the crop's border, so the art blends in.
  const probe = document.createElement("canvas");
  probe.width = probe.height = side;
  const pg = probe.getContext("2d");
  pg.drawImage(img, sx, sy, side, side, 0, 0, side, side);
  const d = pg.getImageData(0, 0, side, side).data;
  let r = 0, gr = 0, b = 0, n = 0;
  for (let i = 40; i < side - 40; i++) for (const [x, y] of [[i, 20], [i, side - 21], [20, i], [side - 21, i]]) {
    const k = (y * side + x) * 4; r += d[k]; gr += d[k + 1]; b += d[k + 2]; n++;
  }
  const bg = `rgb(${Math.round(r / n)},${Math.round(gr / n)},${Math.round(b / n)})`;
  // Art layer with feathered edges.
  const art1 = document.createElement("canvas");
  art1.width = art1.height = art;
  const ag = art1.getContext("2d");
  ag.imageSmoothingEnabled = true; ag.imageSmoothingQuality = "high";
  ag.drawImage(img, sx, sy, side, side, 0, 0, art, art);
  ag.globalCompositeOperation = "destination-in";
  const fade = ag.createRadialGradient(art / 2, art / 2, art * 0.38, art / 2, art / 2, art * 0.5);
  fade.addColorStop(0, "#000"); fade.addColorStop(1, "rgba(0,0,0,0)");
  ag.fillStyle = fade; ag.fillRect(0, 0, art, art);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  g.drawImage(art1, (size - art) / 2, (size - art) / 2);
  return c.toDataURL("image/png");
});
writeFileSync(`${REPO}/brand/github-avatar.png`, Buffer.from(uri.split(",")[1], "base64"));
await browser.close();
console.log("ok");
