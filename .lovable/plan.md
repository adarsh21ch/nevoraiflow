

# Plan — Add "Pro Tip" Box to VideoUploadModal

UI-only change to `src/components/VideoUploadModal.tsx`. No backend, no schema, no other files touched.

---

## 1. Add collapsible Pro Tip box (above the upload area)

Use shadcn `Collapsible` (already available at `src/components/ui/collapsible.tsx`).

**Default (collapsed) state:**
- Light indigo/blue background: `bg-indigo-500/10 border border-indigo-500/20`
- Rounded: `rounded-lg`
- Padding: `p-3`
- Left: `Info` icon from `lucide-react` (indigo tint)
- Center text: `💡 Best video quality tip` (text-sm, muted)
- Right: chevron that rotates on expand
- Whole row is the `CollapsibleTrigger` (cursor-pointer)

**Expanded state — reveals:**
```
💡 Pro Tip — For Best Playback Quality:

Videos downloaded from YouTube play the smoothest on nFlow.
If your video lags or buffers, try this:

1. Upload your video to YouTube (can be Unlisted)
2. Download it using any YouTube downloader app
3. Upload that downloaded file here

This ensures perfect quality for all your viewers.
```
- `text-sm text-muted-foreground` body
- Numbered steps as an ordered list with proper spacing
- Smooth expand via `data-[state=open]:animate-...` (Collapsible defaults)

**Placement:** Inside `DialogContent`, immediately under `DialogHeader`, above the file picker.

---

## 2. Soften format rejection (warning, not block) for MOV/WEBM

Current behavior in `handleFileChange`:
- Rejects anything not in `[.mp4, .mov, .webm]` with a hard error.
- Same hard reject for unmatched MIME.

New behavior:
- **Hard reject only truly unsupported formats** (avi, mkv, wmv, flv, 3gp, etc.) — extension OR MIME outside the allowed set → toast error:
  > "This format may not play correctly. For best results, upload a video downloaded from YouTube, or convert your video to MP4 using cloudconvert.com"
- **MP4** → accept silently (best path).
- **MOV / WEBM** → accept the file BUT show a non-blocking yellow warning banner inside the modal:
  > ⚠️ "This format may not play correctly on all devices. For best results, upload a video downloaded from YouTube, or convert to MP4 using cloudconvert.com"
  - Banner sits between the file row and the helper text.
  - Dismissable (X) but reappears if user picks another non-MP4 file.
- 500MB size cap stays a hard reject (unchanged copy).

Implementation:
- Add `formatWarning: string | null` state
- `isAcceptedVideo` returns `'ok' | 'warn' | 'reject'` instead of boolean
- Reset warning on file clear / on successful MP4 pick

---

## 3. Update helper text under format/info row

Change current line:
> "Supported: MP4, MOV, WEBM | Max: 500MB"

To:
> "Supported: MP4, MOV, WEBM | Max: 500MB | YouTube downloads work best ✓"

Tooltip content (already present) stays as-is — already mentions MP4/WhatsApp/Drive guidance.

---

## 4. Visual / styling notes

- Pro Tip box uses Tailwind tokens that respect dark theme: `bg-indigo-500/10`, `border-indigo-500/20`, `text-indigo-300` for icon, `text-foreground` for collapsed label, `text-muted-foreground` for expanded body.
- Warning banner: `bg-yellow-500/10 border border-yellow-500/30 text-yellow-300` with `AlertTriangle` icon.
- Collapsible animation comes from shadcn defaults — no extra CSS needed.

---

## What is NOT changing

- `src/lib/r2VideoUpload.ts` — untouched.
- Edge functions, R2 settings, DB — untouched.
- Other video upload surfaces (`TestimonialVideoUpload.tsx`) — untouched (out of scope; they use a different flow).
- Existing progress UI, retry button, ETA, "Processing…" state — preserved exactly.

---

## File edited

1. `src/components/VideoUploadModal.tsx` — adds `Collapsible` import, Pro Tip box, soft-warning banner for MOV/WEBM, updated helper text, updated rejection copy.

