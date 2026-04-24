

# Plan — Video Upload Compatibility & Player Hardening

Pure client-side hardening. No edge function changes, no transcoding, no storage changes. Existing upload flow stays intact — only adds a validation/UI layer.

---

## 1. `src/components/VideoUploadModal.tsx` — Stricter validation + better UX

**Allowed formats (extension + MIME double-check):**
- `.mp4` / `video/mp4`
- `.mov` / `video/quicktime`
- `.webm` / `video/webm`
- Reject everything else (avi, mkv, wmv, flv, 3gp, …) with:
  > "Please convert your video to MP4 format before uploading. Use any free converter like handbrake.fr or cloudconvert.com"

**Size limit (unchanged at 500MB) — clearer message:**
> "Video too large. Maximum size is 500MB. Please compress your video first."

**Update file input:** `accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"` (replaces broad `video/*`).

**Helper text under upload button:**
- Line 1: "Supported: MP4, MOV, WEBM | Max: 500MB"
- Info icon (`lucide-react Info`) → shadcn `Tooltip`:
  > "For best results, use MP4 format. WhatsApp videos: save as MP4 before uploading. Google Drive: download as MP4 format."

**Progress UI upgrade:**
- Track `bytesUploaded` + `startTime` to compute speed and ETA
- Show: `"Uploading… 47% • 2 min remaining"`
- After XHR hits 100% but before `confirm-r2-upload` resolves, show: `"Upload complete! Processing…"` with spinner
- ETA formatter: `<60s → "Xs remaining"`, `<60m → "X min remaining"`, else `"Xh Ym remaining"`

**Retry on failure:**
- On error, keep the selected `file` in state, set `error` message
- Show inline error block + "Retry Upload" button that re-runs `handleUpload` (also clear error on file re-select)

---

## 2. `src/lib/r2VideoUpload.ts` — Surface bytes for ETA

Extend `onProgress` signature (backward-compatible) so the modal can compute ETA without duplicating XHR wiring:

```ts
onProgress?: (
  percent: number,
  meta?: { loaded: number; total: number }
) => void;
```

Inside the XHR `progress` listener pass `{ loaded: event.loaded, total: event.total }` as the second arg. Existing callers (e.g. `TestimonialVideoUpload`) keep working — they just ignore the second param.

Force a known good `Content-Type` when MIME is missing/odd (some `.mov` files come through as `application/octet-stream` from older browsers):
```ts
const contentType =
  file.type ||
  (file.name.toLowerCase().endsWith(".mp4")  ? "video/mp4" :
   file.name.toLowerCase().endsWith(".mov")  ? "video/quicktime" :
   file.name.toLowerCase().endsWith(".webm") ? "video/webm" :
   "application/octet-stream");
xhr.setRequestHeader("Content-Type", contentType);
```
This guarantees R2 stores the object with a correct `Content-Type` header (R2 echoes the upload header on GET) — so item #4 of the request ("Content-Type: video/mp4 for all videos") is satisfied without server-side config.

---

## 3. Player hardening — add `preload="metadata"` + `playsInline` + onError

Touch every `<video>` tag in the app and add:
```tsx
preload="metadata"
playsInline
onError={() => setVideoError(true)}
```

Files to update:
- `src/pages/PublicVideoPage.tsx` — add an `onError` state that swaps the player for a friendly error block:
  > ⚠️ "Video format not supported. Please re-upload as MP4 format."
- `src/pages/PublicFunnel.tsx` — `CustomVideoPlayer` `<video>` element (already has `playsInline`; add `preload="metadata"` and an `onError` handler that surfaces the same message inside the player overlay).
- `src/components/funnel/TestimonialsViewer.tsx` — testimonial mini-player.
- `src/pages/PublicLivePage.tsx` — live-page player.
- `src/pages/VideosPage.tsx` — gallery `<video>` thumbnail tag (already has no controls; just add `preload="metadata"` + `playsInline` + `muted`).

For owner-facing surfaces (`PublicVideoPage`, `VideosPage`) the error block also includes a "Re-upload" button that opens `VideoUploadModal`. For viewer-facing surfaces (PublicFunnel, PublicLive, Testimonials) we only show the message — viewers can't re-upload.

---

## 4. What we are NOT changing

- `supabase/functions/get-r2-upload-url/index.ts` — stays as-is. The presigned PUT already accepts whatever `Content-Type` the browser sends; the new client-side normalization (item #2) makes that header reliable.
- `supabase/functions/confirm-r2-upload/index.ts` — no change.
- R2 bucket settings — we can't (and shouldn't) modify Cloudflare config from here. Because we now always send a correct `Content-Type` on PUT, R2 will return the right `Content-Type` on GET automatically. ✅
- Database schema, storage paths, RLS — untouched.

---

## Files edited

1. `src/components/VideoUploadModal.tsx` — validation, helper text + tooltip, ETA, "Processing…" state, retry button
2. `src/lib/r2VideoUpload.ts` — extended `onProgress` signature, fallback Content-Type
3. `src/pages/PublicVideoPage.tsx` — `preload`, `playsInline`, error fallback + re-upload CTA
4. `src/pages/PublicFunnel.tsx` — `preload="metadata"`, `onError` overlay
5. `src/components/funnel/TestimonialsViewer.tsx` — `preload`, `playsInline`, `onError`
6. `src/pages/PublicLivePage.tsx` — `preload`, `playsInline`, `onError`
7. `src/pages/VideosPage.tsx` — `preload="metadata"`, `playsInline`, `muted` on the gallery thumbnail `<video>`

No new dependencies. No edge function deploys. No DB migrations.

