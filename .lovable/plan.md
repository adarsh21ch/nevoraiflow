## Found it: [SMART INCOME FUNNEL](/projects/cb4e093e-0bcb-428f-b101-0f9ed06766a5)

I scanned both codebases and identified what's new in Smart Income that nFlow doesn't have. Here's the concrete diff and the porting plan.

---

## What's actually new in Smart Income (worth porting)

### A. Per-step access codes — biggest unlock
**New files:** `StepCodeGate.tsx`, edge function `verify-step-access-code`
**What it does:** Each step inside a multi-step funnel can have its own access code (not just the funnel itself). Viewer must enter the right code to unlock that specific step. Includes 5-attempt lockout, shake animation, show/hide eye toggle.

### B. Per-step speakers
**New file:** `PerStepSpeakerAssignment.tsx`
**What it does:** Today nFlow has one speaker per funnel. Smart Income lets each step have its own speaker (name, title, bio, photo) — useful for masterclasses with multiple instructors. Includes "copy speaker from another step" shortcut.

### C. Landing page access codes
**New files:** `LandingPageCodeGate.tsx`, edge function `verify-landing-page-code`
**What it does:** Lock an entire landing page behind a code (today nFlow only locks funnels).

### D. Date-of-birth input field
**New file:** `DateOfBirthInput.tsx`
**What it does:** A proper 3-segment DD/MM/YYYY input with validation, used as a new lead-form/registration field option.

### E. Better post-submit video player
**New file:** `landing/PostSubmitVideoPlayer.tsx`
**What it does:** Custom-built player for the "thank you" video after registration — autoplay-muted, unmute hint, custom seek bar, fullscreen, auto-hiding controls. Way more polished than the bare `<video>` tag nFlow uses today.

### F. Editor UX improvements
- `FunnelEditor.tsx` is **1,283 lines** in Smart Income vs nFlow's current size — likely refined wizard flow, better non-tech copy, clearer step labels
- `LandingPageEditor.tsx` — same story
- `TestimonialsBuilderStep.tsx` (386 lines) and `TestimonialsViewer.tsx` (233 lines) — refinements to the testimonial UX you already have

### G. Misc utilities
- `auth-email-hook` edge function (custom auth emails)
- `verify-invite-code` (admin-issued invite codes — likely client-specific, will skip)

---

## What I'm NOT porting (client-specific to Smart Income)

- Pages: `MemberHome.tsx`, `MemberProfile.tsx`, `SubAdminAccessPage.tsx`, `AdminProgramPage.tsx`, `AdminInviteCodesPage.tsx`, `AdminLandingPageManager.tsx`
- Component: `WhySmartIncome.tsx` (branded landing section)
- `get-member-content` and `verify-invite-code` edge functions (gated-program model, not nFlow's market)
- The `logo.png` asset, brand colors, copy on landing pages
- "Smart Income"-named tables/columns, if any

---

## Database changes (additive only — won't touch existing data)

I'll add these to nFlow with safe defaults:

```text
funnel_steps:
  + access_code_enabled  bool       DEFAULT false
  + access_code_plain    text       NULL
  + speaker_mode_step    text       DEFAULT 'inherit'
  + speaker_name_custom  text       NULL
  + speaker_title        text       NULL
  + speaker_bio          text       NULL
  + speaker_photo_url_custom  text  NULL

landing_pages:
  + access_code_enabled  bool       DEFAULT false
  + access_code_plain    text       NULL

funnel_step_progress:
  + access_code_unlocked bool       DEFAULT false
```

Plus 1 new tracking table for step-code attempts (rate-limit / audit), modeled on existing `funnel_access_logs`.

**No table drops. No column drops. No RLS changes to existing tables.** New tables get fresh RLS policies (commented inline as you requested).

---

## Edge functions to add

| Name | Purpose | Notes |
|---|---|---|
| `verify-step-access-code` | Validate per-step code, log attempt, mark progress unlocked | Mirrors existing `verify-funnel-code` pattern |
| `verify-landing-page-code` | Validate landing-page-level code | Same pattern |

Both reuse `verify_jwt = false` + the project's `corsHeaders` pattern. Inputs validated. Constant-time compare for codes.

---

## Execution plan (in order)

```text
PHASE 1 — DB migrations (additive)
  1.1 Add columns to funnel_steps, landing_pages, funnel_step_progress
  1.2 Create step_access_logs table + RLS policies (with inline comments)

PHASE 2 — Edge functions
  2.1 verify-step-access-code
  2.2 verify-landing-page-code

PHASE 3 — Viewer-side components (port + restrip branding)
  3.1 StepCodeGate.tsx       (uses nFlow design tokens, not Smart Income's #0a0a0a)
  3.2 LandingPageCodeGate.tsx (uses nFlow logo, not Smart Income's logo.png)
  3.3 DateOfBirthInput.tsx   (drop-in, no branding)
  3.4 PostSubmitVideoPlayer.tsx (drop-in)

PHASE 4 — Wire viewers
  4.1 MultiStepViewer.tsx — show StepCodeGate when step.access_code_enabled
  4.2 PublicLandingPage.tsx — show LandingPageCodeGate when page.access_code_enabled
  4.3 PublicLandingPage.tsx (post-submit) — swap raw <video> for PostSubmitVideoPlayer
  4.4 PrivateLeadForm + landing page form — add optional DOB field

PHASE 5 — Editor-side (builder UX)
  5.1 PerStepSpeakerAssignment.tsx — port + integrate into FunnelEditor multi-step flow
  5.2 FunnelEditor — add "Access code for this step" toggle in StepConfigPanel
  5.3 LandingPageEditor — add "Lock with access code" toggle
  5.4 LandingPageEditor — add DOB to optional fields list
  5.5 Funnel/Landing form configs — add "Date of Birth" field option

PHASE 6 — Live preview parity
  6.1 FunnelLivePreview — render lock icon on coded steps + per-step speaker badge
  6.2 LandingPagePreview — render lock state when access_code_enabled

PHASE 7 — Smoke test
  7.1 Existing funnels still load (no access codes set → no gate shown)
  7.2 Existing landing pages still load
  7.3 Existing testimonials unchanged
  7.4 Brand-new step code: create → publish → enter code → unlock → progress
```

**Pause point:** I will stop after **Phase 1.1** and show you the exact migration SQL before running it (per your standing rule about RLS / DB rewrites).

---

## What I will NOT touch (per your rules + recent security work)

- Auth flow (just hardened)
- Payment verification (just hardened)
- Admin panel routing/RBAC (just hardened)
- KYC, refunds, gateway settings
- Testimonials core schema (already matches)
- nFlow brand tokens (`#080C1A`, lime→blue gradient, Plus Jakarta Sans)

---

## Estimated scope

- **2 new edge functions**
- **1 new migration** (~6 columns + 1 small table)
- **4 new components** ported & rebranded
- **~6 existing files** modified (editor + viewer wiring)
- **Zero** breaking changes to existing data, funnels, landing pages, leads, payments

Approve and I'll start with Phase 1, pause for the migration review, then continue straight through.
