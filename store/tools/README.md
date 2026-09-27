# Store asset tools

Scripts that produce the Chrome Web Store images in `store/`. They need Puppeteer, which is deliberately not a project dependency:

```bash
npm i --no-save puppeteer
npm run build
node store/tools/raw.mjs        # captures raw 1280x800 screens of dist/ into store/tools/raw/ (uses the real Chrome Web Store page for the banner shot)
node store/tools/compose.mjs    # composes store/screenshots/{ar,en}/*.png on the brand background
node store/tools/promo.mjs      # promo tiles from brand/logo-primary-dark.png
node store/tools/crop-brand.mjs # re-crops icons and logo lockups from brand/logo-system-reference.png
```

Headlines and sub-lines for each slide are in `COPY` in `compose.mjs`.
