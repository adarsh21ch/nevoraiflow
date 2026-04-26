## nFlow Bluish-Gold Rebrand — full plan

A complete visual rebrand from teal/blue/green to **champagne gold + deep navy**, applied everywhere: app, marketing, auth, funnel editor, public viewers, logo, favicons, PWA icons, manifest theme color, and email templates.

---

### 1. Color tokens (`src/index.css`)

Replace the green/teal/blue accent system with bluish-gold. Keep the deep navy background (already premium-feeling).

**New token values:**

```text
Dark theme
  --primary       45 75% 58%      (#E0B84A champagne gold)
  --primary-foreground  222 40% 7%   (dark navy text on gold)
  --secondary     210 90% 55%     (kept blue, slightly tuned, for "bluish-gold")
  --accent        45 85% 68%      (#F4D77A bright gold highlight)
  --ring          45 75% 58%
  --sidebar-primary  45 75% 58%
  --member        174 72% 56%     (Nevorai Member badge stays teal — separate identity)

Light theme
  --primary       42 70% 42%      (deeper bronze-gold for white bg contrast)
  --primary-foreground  0 0% 100%
  --accent        45 85% 55%
  --ring          42 70% 42%
```

**New gradients (replace `.gradient-primary`, `.gradient-text`, `.gradient-bg-subtle`):**

```text
gradient-primary:  linear-gradient(135deg, #F4D77A 0%, #E0B84A 35%, #D4AF37 70%, #1A4FD6 100%)
                   — champagne → gold → deep blue, the "bluish-gold" you described
gradient-text:     same stops
gradient-bg-subtle: radial gold glow top + subtle blue glow bottom-right
glow-primary:      shadow uses gold rgba(224,184,74,0.3)
glow-accent:       shadow uses bright gold rgba(244,215,122,0.3)
premium-card hover: gold border at 25% opacity
```

The Nevorai Member badge stays teal — it's a separate sub-brand marker and keeping it teal makes "Member" visually distinct from the new gold primary.

---

### 2. Tailwind config (`tailwind.config.ts`)

No structural change — all colors flow through CSS vars. Keep as-is.

---

### 3. Logo + icon assets

Generate gold versions of:
- `src/assets/nevorai-mark.png` — the swirl used in the sidebar `Logo` component
- `src/assets/nflow-logo.png`, `src/assets/nevorai-flow-logo.png`, `src/assets/logo.png` — full logos
- `public/logo.png`, `public/favicon.png`, `public/favicon.ico`, `public/favicon-16.png`, `public/favicon-32.png`, `public/favicon-48.png`
- `public/apple-touch-icon.png`, `public/apple-touch-icon-152.png`, `public/apple-touch-icon-167.png`
- `public/icons/icon-192x192.png`, `icon-192x192-maskable.png`, `icon-512x512.png`, `icon-512x512-maskable.png`

Approach: feed the existing `nevorai-mark.png` to Nano Banana with an edit prompt — recolor the swirl to the champagne→gold→blue gradient, preserve shape and proportions. Then derive the favicon/PWA sizes from the recolored 1024px master via ImageMagick. Maskable icons get a navy `#080C1A` safe-area background.

---

### 4. PWA + browser theme color

- `public/manifest.json`: keep `background_color: "#080C1A"`. Change `theme_color` from `#080C1A` → keep navy (good with gold).
- `index.html`: update `<meta name="theme-color">` if present, ensure favicon links point to refreshed files.

---

### 5. Components that hardcode colors (not via tokens)

Audit and fix any inline `#7EE83A / #00D4C8 / #00AAFF / #1A4FD6` references found in:
- `src/components/layout/DashboardLayout.tsx` (sidebar accent)
- `src/components/ui/button.tsx` — `hero` variant uses `gradient-primary` (already token-driven, no change needed) but its `shadow-blue-500/25` should become `shadow-[#E0B84A]/25`
- Auth input focus ring (`src/index.css` `.auth-input:focus`) — change `#00AAFF` → gold
- `.glow-primary` / `.glow-accent` rgba values
- `.search-premium:focus-within` — gold focus ring
- `.premium-card:hover` border — gold

---

### 6. Funnel editor (reverting earlier "skip gold")

You confirmed: gold everywhere now. The funnel editor will pick up the new tokens automatically since it uses `bg-primary` / `text-primary`. Verify the auto-save indicator, progress dots, "Edit" buttons, and step number badges all read gold.

---

### 7. Email templates

`supabase/functions/_shared/email-templates/` — none exist yet (auth emails use Lovable defaults). No work needed unless you want branded auth emails; out of scope here. Transactional templates inside `send-landing-page-confirmation` and `send-gmail-email` will be scanned for hardcoded brand colors and updated if found.

---

### 8. Member badge clarification

`--member` token (Nevorai Member teal pill) stays teal. Rationale: it marks a different audience (verified Nevorai members) and visually separating it from the gold primary keeps the "premium tier inside premium product" hierarchy clear. If you'd rather have it gold too, say so and I'll switch in one line.

---

### Files touched

```text
src/index.css                              token + utility rewrite
src/components/ui/button.tsx               hero shadow color
src/components/layout/DashboardLayout.tsx  any inline accent colors
public/manifest.json                       theme_color review
index.html                                 meta theme-color + favicon links
public/favicon*.png, favicon.ico           regenerated gold
public/apple-touch-icon*.png               regenerated gold
public/icons/icon-*.png                    regenerated gold + maskable
public/logo.png                            regenerated gold
src/assets/nevorai-mark.png                recolored gold
src/assets/nflow-logo.png                  recolored gold
src/assets/nevorai-flow-logo.png           recolored gold
src/assets/logo.png                        recolored gold
```

No backend / database / RLS / edge function logic changes. Visual + asset only.

---

### QA pass before shipping

1. View dashboard, funnel editor, landing page editor, public funnel viewer, public landing page, auth page, pricing page in **both dark and light** themes.
2. Confirm gold contrast on white (light theme) is readable — adjust `--primary` lightness if it looks washed out.
3. Render the new favicon at 16px, 32px, 48px and visually confirm the swirl is still recognizable at small sizes (gold can muddy at 16px — may need to bump saturation for the smallest favicons).
4. Confirm PWA install icon (192/512) renders correctly with the navy maskable safe area.
5. Confirm Member badge still reads teal and looks intentional next to gold UI.

---

### What you'll get

A single cohesive bluish-gold identity: navy backgrounds, champagne-gold primary actions, bright gold highlights, deep blue as a secondary accent inside the gradient. Premium feel without losing the "flow" wave logo recognition. Reversible — all changes are token + asset swaps, so we can dial the gold warmer/cooler in one file if it feels off after you see it live.