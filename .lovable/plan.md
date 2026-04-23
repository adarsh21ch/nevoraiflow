

# Nevorai Flow — Complete Video System Technical Documentation

This is a **read-only analysis** — no files will be changed. Below is everything you need to replicate the video upload, storage, preview, and player system in another Lovable project.

---

## 1. HOW VIDEO UPLOAD WORKS

### Upload UI Component
- **File:** `src/components/VideoUploadModal.tsx`
- **Triggered from:** `src/pages/VideosPage.tsx` ("Upload Video" button)

### Accepted Files & Limits
- **File types:** `accept="video/*"` (MP4, MOV, WebM, etc. — anything `video/*` MIME)
- **Max size:** **500 MB** (enforced client-side: `f.size > 500 * 1024 * 1024`)
- **Title:** required; **Description:** optional

### Storage: Cloudflare R2 (NOT Supabase Storage)
Two upload paths exist:

**A. Main path — Browser → R2 directly via presigned URL** (used by `VideoUploadModal`)
- Helper: `src/lib/r2VideoUpload.ts` → `uploadVideoToR2()`
- Edge function: `supabase/functions/get-r2-upload-url/index.ts` returns a presigned PUT URL (AWS SDK v3 `@aws-sdk/client-s3` + `s3-request-presigner`, valid 1 hour)
- Browser does `XMLHttpRequest PUT` directly to R2 (XHR is used so we can read upload progress)
- Edge function: `supabase/functions/confirm-r2-upload/index.ts` marks the row `ready` and writes `public_url` from `R2_PUBLIC_URL` env

**B. Alt path — Server-side base64 upload** (used for short testimonial clips)
- Edge function: `supabase/functions/upload-testimonial-video/index.ts` (uploads from server using AWS SDK; only safe for small files due to base64 overhead)

### Progress Bar
Yes — real progress via `xhr.upload.addEventListener("progress", …)` → `onProgress(percent)` → `<Progress value={progress} />` from `src/components/ui/progress.tsx` (Radix). Modal shows "Uploading… 47%".

### How URL Lands in DB

| Step | Action |
|---|---|
| 1 | `get-r2-upload-url` inserts row into `video_assets` (status `uploading`, percent 0) |
| 2 | Sets `r2_key = videos/{video.id}/{sanitized-filename}` |
| 3 | Returns `{ uploadUrl, videoId, r2Key }` |
| 4 | Browser PUTs file to R2 |
| 5 | `confirm-r2-upload` updates row: `status='ready'`, `upload_percent=100`, `public_url='${R2_PUBLIC_URL}/${r2_key}'`, `is_shared=true`, `file_size_bytes` |

### Required R2 Env Secrets (Edge Functions)
`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (e.g. `https://cdn.nevorai.com`)

---

## 2. HOW VIDEO PREVIEW WORKS

### Player Component
- **Main custom player:** `CustomVideoPlayer` defined inline in `src/pages/PublicFunnel.tsx` (lines ~74–457)
- **Reused for multi-step funnels:** `src/components/funnel/MultiStepViewer.tsx` (receives `VideoPlayer` as a prop)
- **Public single-video page:** `src/pages/PublicVideoPage.tsx` (route `/video/:id`) — uses a plain `<video controls>` for shared video gallery links
- **Testimonial mini-player:** `VideoPlayer` defined inline in `src/components/funnel/TestimonialsViewer.tsx`

### Tech Choice
**Native HTML5 `<video>` tag** wrapped in custom React UI — **no Plyr / Video.js / iframe**. All controls are custom Tailwind + `lucide-react` icons.

### Controls Shown
Play/Pause · Current/Total time · Mute/Unmute · Speed (Gauge popover) · Fullscreen · Custom progress bar with watched + buffered + max-watched overlay · Animated thumb on hover

### Thumbnail Before Play
Yes — `poster={thumbnail_url}`. A center play button overlays the poster until the user taps. If `autoplay=true`, browser tries unmuted first → falls back to muted autoplay → falls back to manual click.

### Preview Trigger
**Click** the center play button (or autoplay if configured). Not hover-based. Shown inline (not modal) on the funnel/landing page.

### Full Video, Not a Clip
Always the **full video**. Restrictions are about *how* they watch it (no skip), not *how much*.

### Access Restrictions
- **Daily view limit per funnel owner** — checked via edge function `check-funnel-view-limit` + DB function `increment_user_daily_view` (free tier 20/day, custom override possible). Renders `FunnelDailyLimitGate` when blocked.
- **Private funnels** — `CodeGateScreen` requires access code before video loads.
- **Visibility** — `funnels.is_published` and `funnels.visibility = 'public'` enforced by RLS.
- **Multi-step unlock** — next step locked until previous video reaches X% watch (`funnel_steps.unlock_after_percent` + `funnel_step_progress` table).

---

## 3. HOW PLAYER OPTIONS WORK

### Per-Funnel Settings (stored on `funnels` table)
| Column | Purpose |
|---|---|
| `allow_seek` (bool, default `false`) | Forward-seek prevention |
| `allow_speed_change` (bool, default `true`) | Show speed popover |
| `cta_timing_seconds` | When to reveal CTA button |
| `cta_enabled`, `cta_text`, `cta_url`, `lock_cta` | CTA configuration |
| `audio_note_url`, `audio_note_timing`, `audio_note_autoplay`, `audio_lock_video` | Optional audio overlay |
| `thumbnail_url` | Poster image |

### Watermark
Hardcoded text overlay: `"Powered by nFlow"` — bottom-right, `text-white/50`, `pointer-events-none select-none z-10`, only shown after `started=true` (line ~328 in `PublicFunnel.tsx`). **Not configurable per video.**

### Forward-Seek Prevention (`allowSeek=false`)
- `maxWatched` ref tracks furthest point reached during playback
- `onSeeking` handler: if `currentTime > maxWatched + 0.5`, reset to `maxWatched` and show toast "Skipping forward is not allowed"
- Progress-bar click-to-seek also clamped
- Keyboard shortcuts blocked: `→`, `L`, `1–9` (jump to %)
- `←` (rewind 5s) is **always** allowed
- A subtle gray overlay on the unwatched portion of the progress bar visually communicates the lock

### Speed Control
- Component: `SpeedControl` (lines ~22–72 of `PublicFunnel.tsx`) — Gauge icon button + popover
- Speeds: `[0.75, 1, 1.25, 1.5, 2]`
- Sets `videoRef.current.playbackRate`
- Hidden entirely when `allowSpeed=false`

### Watch Tracking
- `onTimeUpdate` callback fires every frame the browser provides
- `maxWatched.current` tracks deepest point (used for seek prevention)
- Outer page tracks `watchSeconds` and `videoDuration` for CTA timing & analytics
- Sent to `funnel_video_analytics` table (event_type, watch_seconds, progress_percent, session_id)
- Multi-step progress written to `funnel_step_progress` (`max_watched_seconds`, `watched_percentage`, `last_position_seconds`, `status`)

### Other Player Behaviors
- Right-click disabled (`onContextMenu={e => e.preventDefault()}`)
- Keyboard: Space/K = play-pause, M = mute, F = fullscreen
- Auto-hide controls after 3s while playing
- Loading spinner during buffering
- Autoplay-muted banner ("Tap to unmute") when browser blocks unmuted autoplay

---

## 4. EXACT DATABASE STRUCTURE

### Table: `public.video_assets` (the master video table)
```sql
id UUID PK DEFAULT gen_random_uuid()
owner_id UUID FK → profiles(id) ON DELETE CASCADE NOT NULL
title TEXT NOT NULL
description TEXT
original_filename TEXT
file_size_bytes BIGINT
duration_seconds INTEGER
r2_key TEXT UNIQUE             -- e.g. videos/{uuid}/my-clip.mp4
r2_thumbnail_key TEXT
public_url TEXT                -- final CDN URL — what player consumes
thumbnail_url TEXT
folder_id UUID FK → video_folders(id) ON DELETE SET NULL
status TEXT DEFAULT 'uploading'   -- 'uploading' | 'ready' | 'failed'
upload_percent INTEGER DEFAULT 0
error_message TEXT
is_shared BOOLEAN DEFAULT false   -- enables /video/:id public page
view_count INTEGER DEFAULT 0
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```
**RLS:** owner full access · users with `video_asset_access` row can SELECT · anyone can SELECT when `is_shared=true`.

### Table: `public.video_asset_access` (sharing via "Add by nFlow Link")
```sql
id UUID PK
video_id UUID FK → video_assets(id) ON DELETE CASCADE
granted_to UUID FK → profiles(id)
granted_by UUID FK → profiles(id)
granted_at TIMESTAMPTZ
UNIQUE(video_id, granted_to)
```

### Linking video → funnel/landing-page/step
| Table | Column | Notes |
|---|---|---|
| `funnels` | `video_asset_id UUID FK → video_assets(id)` | Single-video funnel + `allow_seek`, `allow_speed_change`, `thumbnail_url` |
| `funnel_steps` | `video_asset_id UUID FK` | Multi-step funnels; per-step CTA, unlock rules |
| `landing_pages` | `post_submit_video_asset_id UUID FK` | Video shown after lead form submit |
| `landing_page_testimonials` | `video_url TEXT`, `thumbnail_url TEXT` | Stored as raw URL (separate flow) |

### Tracking tables
- `funnel_video_analytics` — per-event watch tracking
- `funnel_step_progress` — per-lead/session multi-step gate state
- `user_daily_views` + `user_view_sessions` — daily view-cap enforcement

---

## 5. EXACT FILE PATHS

### Player Components
| Purpose | File |
|---|---|
| Main custom player | `src/pages/PublicFunnel.tsx` (`CustomVideoPlayer`, lines ~74–457) |
| Speed popover | Same file (`SpeedControl`, lines ~22–72) |
| Multi-step viewer (consumes player as prop) | `src/components/funnel/MultiStepViewer.tsx` |
| Public single-video page (`/video/:id`) | `src/pages/PublicVideoPage.tsx` |
| Testimonial mini-player | `src/components/funnel/TestimonialsViewer.tsx` |
| Live-page player | `src/pages/PublicLivePage.tsx` |

### Upload Components
| Purpose | File |
|---|---|
| Modal (file picker + progress bar) | `src/components/VideoUploadModal.tsx` |
| R2 upload helper (XHR + presign + confirm) | `src/lib/r2VideoUpload.ts` |
| Add-by-link modal | `src/components/VideoLinkModal.tsx` |
| Share modal (grant access) | `src/components/VideoShareModal.tsx` |
| Rename modal | `src/components/VideoRenameModal.tsx` |
| Gallery page | `src/pages/VideosPage.tsx` |
| Testimonial video upload | `src/components/funnel/TestimonialVideoUpload.tsx` |

### Edge Functions (Deno, in `supabase/functions/`)
| Function | Purpose |
|---|---|
| `get-r2-upload-url/` | Issues presigned PUT URL + creates `video_assets` row |
| `confirm-r2-upload/` | Marks `status=ready`, sets `public_url`, `file_size_bytes` |
| `upload-testimonial-video/` | Server-side base64 upload (small files) |
| `get-funnel-data/` | Bundles funnel + video + creator + steps in one call (cached) |
| `get-landing-page-data/` | Same for landing pages |
| `check-funnel-view-limit/` | Enforces per-owner daily view cap |

### Settings UI (per-video options)
- **Per-funnel toggles** (`allow_seek`, `allow_speed_change`, CTA timing, audio note, etc.):
  `src/pages/FunnelEditor.tsx` (the 10-step funnel-creation wizard) — these are funnel-level, not stored on `video_assets`.
- **Per-step config** (multi-step funnels): `src/components/funnel/StepConfigPanel.tsx`

---

## Key Design Decisions to Carry Forward (or Improve)

1. **Native `<video>` over libraries** — full styling control, no bundle bloat (~0kb for player core).
2. **R2 + presigned URL + browser XHR** — bypasses Supabase Storage limits & egress costs; CDN delivery via `R2_PUBLIC_URL` (e.g. Cloudflare custom domain).
3. **`video_assets` is decoupled** from funnels — same video can power N funnels/steps/landing pages.
4. **Settings live on the consumer table** (`funnels`, not `video_assets`) so the same video can have different seek/speed rules per funnel.
5. **Watermark is hardcoded** — for your replication, consider moving it to a per-video `watermark_text` column + position enum.
6. **`is_shared` boolean** is a simple but coarse public-access flag — consider replacing with an explicit `visibility` enum (`private | unlisted | public`) for the new project.
7. **Two upload paths exist** (browser-direct vs. server base64) — pick one depending on max file size you'll allow.

