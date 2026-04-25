## Goal

Bring nFlow's Funnel Builder to feature parity with the upgraded **Smart Income Program** funnel builder — same UX, same options, same backend logic — without breaking any existing nFlow funnels (all changes additive).

I've already read both projects' `FunnelEditor.tsx`, `StepConfigPanel.tsx`, `FunnelLivePreview.tsx`, `PerStepSpeakerAssignment.tsx`, `StepTypeSelector.tsx`, and the live nFlow DB schema. Below is the exact gap and how to close it.

---

## What's missing in nFlow (vs SIP)

### A. Step Config Panel (right-side sheet when editing a step)
nFlow has access codes + speaker overrides only. SIP adds:
- **Unlock Condition tabs** — "Full Watch / Percentage / Time Spent" (silently mapped to legacy `unlock_rule_type/value` so old funnels keep working)
- **Extra Gates collapsible**:
  - Waiting period after unlock (`time_delay_enabled`, `time_delay_minutes`)
  - Timer CTA during wait (`timer_cta_enabled/text/url/style`)
  - Access Code Gate with **hashed code** (SHA-256), show/hide eye, and viewer message
- **Per-step Video Topics ("Key Points")** — array of `{icon, text}`, max 10
- **Between Steps collapsible** (Audio Note + Text Message) — already in DB, needs UI
- Section summaries shown when collapsed (e.g. "30m wait · Code")

### B. Speaker tab
- New **Speaker Scope** toggle (multi-step only): "🌍 One speaker for all steps" vs "🎯 Different per step"
- When per-step is chosen, render the new **`PerStepSpeakerAssignment`** component (per-step cards with photo upload, name/title/bio, copy-from-step shortcut)

### C. Video Topics tab
- New **Topics Scope** toggle: "Same for all steps" vs "Different per step"
- When "different per step" is chosen, the global topics editor is replaced with a hint pointing to per-step Key Points inside each step

### D. Build Journey screen (step list)
- Redesigned step cards: thicker gold left-border when active, badge row (step type, unlock rule, 🔐 Code, ⏱ wait, 👤 speaker, 📋 topics)
- Vertical connector line + chevron between cards
- Reorder up/down buttons appear on hover
- "Add Step" CTA card with subline copy

### E. Live Preview panel (right side)
- Replace nFlow's current dark panel with SIP's lighter card-style preview that:
  - Mirrors the **currently edited step** (uses `editingStepIdx`)
  - Shows mini navbar with "nFlow" + Share, "Open" link to public URL
  - Shows video thumbnail + step progress list (highlights active step)
  - Footer note: "Prospects see this exact experience"

### F. Database
nFlow already has all access-code + speaker-override columns from prior migrations. Missing columns to add (additive, all nullable/defaulted):

`funnel_steps`:
- `unlock_condition text default 'full_watch'`
- `unlock_percentage int default 80`
- `time_delay_enabled boolean default false`
- `time_delay_minutes int default 0`
- `video_topics_step_enabled boolean default false`
- `video_topics_step jsonb default '[]'`
- `timer_cta_enabled boolean default false`
- `timer_cta_text text`, `timer_cta_url text`, `timer_cta_style text default 'gold'`
- `access_code_hash text` (replace plaintext with SHA-256 hash; keep `access_code_plain` for back-compat read)
- `access_code_message text`

`funnels`:
- `speaker_scope text default 'global'` (`global` | `per_step`)
- `video_topics_scope text default 'global'` (`global` | `per_step`)

### G. Public viewer (`MultiStepViewer`, `PublicFunnel`)
- Honor new unlock conditions (`full_watch` / `percentage` / `time_spent`)
- Show waiting-period countdown + Timer CTA when `time_delay_enabled`
- Verify access code via SHA-256 hash (update existing `verify-step-access-code` edge function to hash-compare instead of plaintext compare; keep plaintext fallback for already-saved funnels)
- Render per-step speaker override and per-step Key Points when present

---

## Implementation order

1. **DB migration** — add the columns above to `funnel_steps` and `funnels` (additive, defaults safe).
2. **Update `verify-step-access-code` edge function** — accept SHA-256 hash, fall back to plaintext for legacy rows.
3. **Port `PerStepSpeakerAssignment.tsx`** as new file in `src/components/funnel/`.
4. **Rewrite `StepConfigPanel.tsx`** to match SIP layout (Step Info → Unlock Condition → Extra Gates → Speaker per step → Key Points → Between Steps → Step Active). Hash access codes on save.
5. **Update `FunnelEditor.tsx`**:
   - Extend `FlowStep` interface + `funnel` state with new fields (`speaker_scope`, `video_topics_scope`, etc.)
   - Hydrate from existing rows (defaults preserve old behavior)
   - Add scope toggles in Speaker step + Video Topics step
   - Redesigned step cards in Build Journey with badge row + connectors + hover actions
   - Pass `editingStepIdx` and `userProfile` into preview/config
   - On save: compute SHA-256 hash for any newly entered access codes
6. **Replace `FunnelLivePreview.tsx`** with SIP's card-style preview (accepts `previewStepIndex`).
7. **Update `MultiStepViewer.tsx`**:
   - New unlock-condition logic (percentage / time-spent)
   - Time-delay countdown + Timer CTA
   - Per-step Key Points panel
   - Per-step speaker override block
8. **Smoke-test** existing (legacy) funnels load and play unchanged; new funnels can use all new gates and per-step features.

---

## What stays untouched

- Existing routes, auth, plan limits, Razorpay/UPI payment flow, KYC, daily view limiter
- Landing pages, testimonials, live sessions
- Database tables other than `funnels` / `funnel_steps`
- nFlow branding (Plus Jakarta Sans, dark theme, brand gradient) — SIP's Smart-Income-specific styling is stripped; only generic UX upgrades are ported

---

## Technical notes

- Access codes are SHA-256 hashed client-side (`crypto.subtle.digest`) before save — matches SIP exactly. Edge function does timing-safe hash comparison; legacy rows with only `access_code_plain` continue to work via fallback.
- `unlock_condition` is the new source of truth; on every change we silently write the equivalent legacy `unlock_rule_type/value` so the existing viewer + analytics keep working without a flag day.
- All new step columns are nullable / defaulted, so existing rows hydrate cleanly with no migration data backfill needed.
- TypeScript types for the new columns will land automatically via `src/integrations/supabase/types.ts` after the migration runs.

---

## Outcome

After this plan, opening any nFlow funnel will show the same upgraded builder you have in Smart Income Program — same wizard layout, same step-config sheet with collapsible sections, same per-step speaker assignment, same Live Preview panel that follows the step you're editing — and your existing funnels will continue to work without any change in behavior.
