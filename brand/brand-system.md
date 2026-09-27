# Azkar Guard — Logo System / Agent Handoff

## Brand
- Brand name: **Azkar Guard**
- Arabic name: **حارس الأذكار**
- Product: browser extension for daily morning and evening adhkar.
- Brand personality: calm, trustworthy, protective, modern, respectful, minimal.

## Primary logo concept
Use a **shield + crescent** as the core mark.
- Shield = protection / “Guard”
- Crescent = Islamic identity / night & daily remembrance
- Keep the symbol geometric and simple enough to work at favicon size.
- Avoid excessive ornament, gradients, mosque silhouettes, or overly decorative Islamic motifs in the core logo.

## Logo variants
Implement these variants as one coherent identity:
1. Primary horizontal: icon + “Azkar Guard” + Arabic “حارس الأذكار”.
2. Secondary/stacked: icon above wordmark for narrow spaces.
3. Icon-only: shield + crescent, suitable for browser extension, favicon, avatar.
4. Monochrome dark: one-color light mark on dark backgrounds.
5. Monochrome light: one-color dark mark on light backgrounds.
6. Small-size simplified icon: preserve only the essential shield/crescent geometry for 16–32 px use.

## Wordmark
- English: **Azkar Guard**
- Use a clean modern sans-serif, preferably **Inter** (fallback: Poppins).
- “Azkar” may remain neutral/dark; “Guard” can use the secondary green as an accent.
- Arabic: **حارس الأذكار**
- Preferred Arabic font: **Tajawal** (fallback: Cairo).
- Arabic must remain readable and visually balanced with the English wordmark.

## Suggested palette
Treat these as proposed brand tokens:
- Primary Deep Green: `#0F5132`
- Secondary Green: `#22C55E`
- Cream / Light Background: `#F8FAF6`
- Dark Text / Dark Mode: `#1F2937`
- Muted Gray: `#9CA3AF`

Use green + cream as the default visual language. Gold should be optional and used sparingly, not as a core color.

## Tagline
Preferred:
**Daily morning & evening Azkar**

Alternative:
**Morning & Evening Azkar, Every Day**

The tagline is secondary to the brand name and should not appear in the small icon or compact extension UI.

## Spacing / clear space
- Maintain clear space around the logo equal to at least the height of the crescent at the smallest practical scale.
- Never crowd the icon against the wordmark.
- Preserve the logo silhouette; do not stretch, skew, rotate, or add drop shadows to the core mark.

## Backgrounds
The logo must work on:
- light/cream background
- deep green background
- dark/night background
- browser UI / toolbar
- store listing cards

Prefer flat or very subtle backgrounds for the core brand assets.

## Extension icon guidance
- Primary favicon/extension icon: icon-only.
- Rounded-square container is acceptable for store/app icon assets.
- At 16–32 px, prioritize silhouette and contrast over internal detail.
- Do not depend on tiny Arabic text or thin decorative strokes.

## Deliverables for the implementation
Generate/export:
- `logo-horizontal.svg`
- `logo-horizontal-dark.svg`
- `logo-horizontal-light.svg`
- `logo-stacked.svg`
- `logo-stacked-dark.svg`
- `logo-icon.svg`
- `logo-icon-dark.svg`
- `favicon-16.png`
- `favicon-32.png`
- `icon-48.png`
- `icon-128.png`
- `icon-512.png`

Also provide transparent-background SVG/PNG assets where practical.

## Design constraints
- Minimal, premium, calm.
- No photorealistic religious imagery in the logo itself.
- No gradients required in the core vector logo.
- No unnecessary text inside the icon.
- The same icon geometry must be reused across website, GitHub, Chrome Web Store, Firefox Add-ons, extension UI, and social/profile assets.

## Reference
See `logo-system-reference.png` for the visual direction and variant exploration.
