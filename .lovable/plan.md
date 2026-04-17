

## Goal
Fix the "Add to Home Screen" icon so the Nevorai mark looks bold, edge-to-edge, with no white border — matching premium apps on the iOS/Android home screen.

## Root Cause
1. **Logo is ~30% of canvas** — current `icon-512x512.png` has tons of empty dark space around a small "n" mark, so it shrinks further when iOS rounds the corners.
2. **White border on iOS** — no proper `apple-touch-icon` at 180×180 and no opaque, properly-sized PNG, so iOS falls back to a white-padded default frame.
3. **Maskable icon doesn't use the safe zone correctly** — should fill ~80% (currently fills ~30%).

## Fix (1 step, no UI route changes)

### Regenerate all PWA + Apple icons from `src/assets/nevorai-flow-logo.png`

Generate fresh icons where the gradient "n" mark fills ~80% of the square on a solid `#080C1A` background (no transparency, edge-to-edge):

| File | Size | Purpose |
|---|---|---|
| `public/icons/icon-192x192.png` | 192 | PWA standard |
| `public/icons/icon-512x512.png` | 512 | PWA standard |
| `public/icons/icon-192x192-maskable.png` | 192 | Android adaptive (mark at ~70% for safe zone) |
| `public/icons/icon-512x512-maskable.png` | 512 | Android adaptive |
| `public/apple-touch-icon.png` | 180 | iOS home screen (canonical size) |
| `public/apple-touch-icon-152.png` | 152 | iPad |
| `public/apple-touch-icon-167.png` | 167 | iPad Pro |
| `public/favicon-32.png` | 32 | Browser tab |
| `public/favicon-16.png` | 16 | Browser tab |

All with **opaque** `#080C1A` background — kills the white iOS frame.

### Update `index.html` head
Replace the single apple-touch-icon line with proper sized variants:
```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
```

### Update `public/manifest.json`
Bump the maskable icons (mark inside safe zone) and remove the tiny 64×64 logo entry that was confusing Android launchers.

## Outcome
- iOS home screen: solid dark tile, large gradient "n" filling the rounded square — no white border.
- Android home screen: adaptive icon that crops cleanly to circle/squircle without losing the mark.
- Browser tab: crisp 32px favicon instead of the upscaled 64px one.

