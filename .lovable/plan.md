

# Nevorai Flow — Production Readiness Plan

## Summary

The app has a solid foundation but is missing critical functionality: admin setup, video management (Cloudflare R2), a proper admin panel, and the video-link sharing model. This plan addresses all gaps to make the platform production-ready.

---

## Key Concept Change: Video Access Model

Per your request, the video model changes significantly:
- **Only admins** can upload videos directly (via Cloudflare R2)
- Every uploaded video gets a unique **Nevorai Video Link** (e.g. `/video/:id`)
- **Regular users** add videos to their gallery by pasting a Nevorai Video Link
- The same link lets anyone watch the video on the platform
- Users select linked videos when building funnels

---

## Phase 1 — Admin Setup & Role System

1. **Insert admin role** for `teamnevorai@gmail.com` (user ID: `8dd45ed4-94ae-4421-a606-1755ad63f68d`) into `user_roles` table
2. **Create `useAdmin` hook** — checks `user_roles` for admin role via the existing `has_role` database function
3. **Add admin route guard** (`AdminRoute` component) that checks admin status server-side
4. **Add admin nav items** in `DashboardLayout` — only visible to admins

---

## Phase 2 — Cloudflare R2 Video Upload (Admin Only)

5. **Add R2 secrets** — request `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL` from user
6. **Create edge function `get-r2-upload-url`** — generates presigned PUT URL for admin uploads; validates admin JWT
7. **Create edge function `confirm-r2-upload`** — admin confirms upload complete, updates `video_assets` status to `ready`, sets `public_url`
8. **Create edge function `get-r2-playback-url`** — generates signed playback URL for video content

---

## Phase 3 — Admin Video Management Page

9. **Build `/admin/videos`** — full video management for admins:
   - Upload videos via drag-and-drop with R2 presigned URLs
   - Progress bar during upload
   - Set title, description for each video
   - Each video shows its **Nevorai Video Link** (`/video/:id`) with copy button
   - Delete videos, edit metadata
   - View all videos across the platform

---

## Phase 4 — User Video Gallery (Link-Based)

10. **Redesign `/videos` for regular users**:
    - Remove direct upload button
    - Add "Add Video by Link" button — user pastes a Nevorai Video Link
    - System validates the link, fetches video metadata from `video_assets`
    - Creates entry in `video_asset_access` table (grants view access)
    - User's gallery shows all linked videos with thumbnails
    - Each video card: preview, title, duration, "Use in Funnel" button

11. **Build `/video/:id` public page** — watch any Nevorai video:
    - Dark, minimal video player page
    - Shows video title, description
    - Branded "Nevorai Flow" watermark
    - Route added to `App.tsx`

---

## Phase 5 — Funnel Editor Video Integration

12. **Update funnel editor Step 1 (Video)**:
    - "Select from My Videos" button opens gallery picker modal
    - Gallery shows only videos the user has access to
    - Selected video links to funnel via `video_asset_id`
    - Shows video preview after selection
    - Remove the broken drag-and-drop upload zone for regular users

---

## Phase 6 — Full Admin Panel

13. **Build complete admin pages**:
    - `/admin` — Dashboard with real KPI counts (users, funnels, videos, leads, MRR from `user_subscriptions`)
    - `/admin/users` — User table with search, filter by plan/KYC status, view user details, suspend/unsuspend
    - `/admin/kyc` — KYC review queue with document viewer, approve/reject with reason
    - `/admin/subscriptions` — All subscriptions table, manual plan override
    - `/admin/settings` — Platform announcement, maintenance mode (reads/writes `platform_settings`)
    - `/admin/analytics` — Platform-wide charts (signups over time, top creators, revenue)

14. **Add admin routes** to `App.tsx` wrapped in `AdminRoute`

---

## Phase 7 — Storage Buckets

15. **Create Supabase storage buckets** via migration:
    - `kyc-documents` (private) — PAN, Aadhaar, selfie uploads
    - `payment-screenshots` (private) — UPI payment proof
    - `audio-notes` (private) — funnel audio notes
    - `qr-codes` (public) — UPI QR code images
    - RLS policies: users can upload to their own path, admins can read all

---

## Phase 8 — UI/UX Polish

16. **Improve DashboardLayout**:
    - Add admin section in sidebar (only for admins)
    - Logout button actually calls `signOut`
    - Unread notification badge on Bell icon

17. **Add skeleton loaders** on all data-loading pages instead of blank screens

18. **Add confirmation dialogs** for destructive actions (delete funnel, delete video)

19. **Mobile responsiveness** audit — ensure all pages work at 375px

20. **Error boundaries** — wrap routes in error boundary component

---

## Phase 9 — Seed Data

21. **Insert subscription plans** into `admin_subscription_plans` with all 7 plan tiers from the spec
22. **Insert default platform settings** (announcement_text, announcement_active, maintenance_mode)

---

## Technical Details

### Database Changes
- Insert admin role: `INSERT INTO user_roles (user_id, role) VALUES ('8dd45ed4-...', 'admin')`
- Create storage buckets with RLS policies
- Insert seed data for plans and settings

### Edge Functions (3 new)
- `get-r2-upload-url` — admin-only, returns presigned PUT URL
- `confirm-r2-upload` — admin-only, marks video ready
- `get-r2-playback-url` — returns signed URL for video playback

### New Components
- `AdminRoute` — route guard checking admin role
- `useAdmin` hook — admin status check
- `VideoLinkModal` — for users to add videos by link
- `VideoPickerModal` — for funnel editor video selection
- Admin pages: Users, KYC, Subscriptions, Settings, Analytics, Videos

### Files Modified
- `App.tsx` — new routes
- `DashboardLayout.tsx` — admin nav, logout fix
- `VideosPage.tsx` — link-based model
- `FunnelEditor.tsx` — video picker integration
- `AdminDashboard.tsx` — real data

