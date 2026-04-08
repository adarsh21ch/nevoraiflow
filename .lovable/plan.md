
# Phase 1 — Nevorai Flow Production Upgrade

## Batch A: Landing Page Cleanup & Auth Removal
1. **Remove login/signup toggles** from landing page editor (`allow_login`, `allow_signup` fields)
2. **Remove auth-related UI** from public landing pages
3. **Fix labels** — replace "Hero image URL", "Photo URL", "Image URL" with upload buttons across the landing page editor

## Batch B: Image Upload System
4. **Create a reusable `ImageUploadField` component** that handles device upload → storage bucket → returns URL
5. **Create `landing-page-assets` storage bucket** for landing page media
6. **Replace all URL input fields** in the landing page editor with the upload component:
   - Hero image
   - Section images
   - Speaker/Host photo
   - OG image
7. **Show image previews** with change/remove options

## Batch C: Private Funnel Flow Polish
8. **Improve CodeGateScreen** wording — use "Unlock Program", "Get Access" instead of generic text
9. **Improve PrivateLeadForm** — premium wording, "Continue to Program" button
10. **Add success popup/modal** after form submission with content visible behind
11. **Add loading state** "Unlocking your access…" between form submit and content reveal

## Batch D: Live Preview for Landing Page Editor
12. **Add split-pane layout** — editor left, live preview right (desktop)
13. **Add Edit/Preview tabs** on mobile
14. **Build `LandingPagePreview` component** that renders sections in real-time

## Batch E: Mobile & UX Polish
15. **Mobile-optimize** the landing page editor (touch-friendly, collapsible sections)
16. **Fix section labels** and helper text across editors for non-technical users
17. **Add friendly error messages** for uploads, form validation, missing fields

---

### Not in Phase 1 (Future phases):
- Email confirmation system (needs email domain setup)
- Multiple access codes per funnel
- Advanced analytics
- WhatsApp notifications
- Paid funnels
- Team access
