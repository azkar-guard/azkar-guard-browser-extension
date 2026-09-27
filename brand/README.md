# Azkar Guard brand

The source of truth is the brand kit:

- [`brand-system.md`](brand-system.md): logo system spec (concept, variants, palette, typography, usage rules)
- [`logo-system-reference.png`](logo-system-reference.png): the reference sheet with all variants

## Assets derived from the reference sheet

The kit ships no separate vector files, so these are cropped from `logo-system-reference.png` (1536×1024):

| File | Taken from | Used for |
|---|---|---|
| `public/icons/icon-128.png`, `icon-48.png` | "App icon / extension icon" (213×216 px area) | Store icon, extensions page |
| `public/icons/icon-32.png`, `icon-16.png` | "Icon only (small / favicon)" (88×88 px area) | Toolbar and favicon sizes, as the spec asks for 16–32 px |
| `icon-app-source.png` | "App icon", full crop | Source for marketing images |
| `logo-primary-dark.png` | "Primary logo (dark background)" lockup | Promo tiles, dark backgrounds |
| `logo-secondary-light.png` | "Secondary logo (light background)" lockup | Light backgrounds |
| `banner-night.png` | Bottom banner | Marketing |

Icons are square crops with the rounded corners made transparent and downscaled in halving steps. The largest clean icon is 213 px, so there is no 512 px icon yet. The store only needs 128 px.

**To do:** when vector files (SVG) of the logo exist, export all sizes from them and replace these crops.

## Tokens used in code

| Token | Value | Where |
|---|---|---|
| Deep green (primary) | `#0F5132` | light-mode accent |
| Green (secondary) | `#22C55E` | dark-mode accent, site banner buttons |
| Cream | `#F8FAF6` | light background |
| Slate | `#1F2937` | light-mode text |
| Gray | `#9CA3AF` | dark-mode muted text (light mode uses `#6B7280` for contrast on cream) |
| Inter / Tajawal | bundled via `@fontsource` (OFL-1.1) | UI text, English / Arabic |
