

# Update nFlow Logo with New F Logo Image

## Overview
Replace the current F logo asset throughout the app with the newly uploaded logo image. The cleaner version (IMG_0748.PNG) is better suited for UI use due to its tighter composition.

## Changes

1. **Replace logo asset** — Copy `IMG_0748.PNG` to `src/assets/nflow-logo.png` (overwriting the existing one) and to `public/favicon.png` for the browser tab icon.

2. **Update PWA icons** — Copy the logo to replace the existing PWA icon files (`public/icons/icon-192x192.png`, `public/icons/icon-512x512.png`, and maskable variants, `public/logo.png`).

3. **No code changes needed** — The `Logo.tsx` component already imports from `src/assets/nflow-logo.png`, so it will pick up the new image automatically. Same for `index.html` which references `/favicon.png`.

## Technical Details
- Source file: `user-uploads://IMG_0748.PNG`
- Destinations: `src/assets/nflow-logo.png`, `public/favicon.png`, `public/logo.png`, `public/icons/icon-*.png`
- All existing component imports remain unchanged

