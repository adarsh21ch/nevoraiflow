
I checked the current flow and the upload is failing after the app gets the upload URL.

Do I know what the issue is? Yes, mostly.

What I found
- `get-r2-upload-url` is working: it returns `200` plus a valid-looking `uploadUrl` and `videoId`.
- The failure happens in `src/pages/AdminVideosPage.tsx` during the direct browser `PUT` to R2.
- The strongest code-level bug is in `supabase/functions/get-r2-upload-url/index.ts`: the presigned URL is being signed with a hand-written AWS SigV4 implementation that uses the raw `r2Key` in the canonical path.
- Your recent filenames include spaces and parentheses like `videoplayback (47).mp4`; those characters must be URI-encoded correctly for SigV4, and the current code is not production-safe there.
- Because the client only shows a generic `Upload failed`, the real cause is being hidden and stale `uploading` rows are left behind.

```text
AdminVideosPage
  -> get-r2-upload-url   OK (200)
  -> PUT to R2           FAILS
  -> confirm-r2-upload   never runs
```

Implementation plan
1. Replace the fragile manual R2 signing
   - In `supabase/functions/get-r2-upload-url/index.ts`, replace the custom AWS signing block with the official S3 presigner approach.
   - This removes path-encoding/signature edge cases and makes uploads production-safe.

2. Sanitize object keys before signing
   - Keep `original_filename` unchanged for display.
   - Generate a safe storage filename for `r2_key` (lowercase, dash-separated, preserve extension).
   - This prevents spaces/special characters from breaking upload or playback URLs.

3. Harden the admin upload client
   - In `src/pages/AdminVideosPage.tsx`, improve the XHR error handling so it reports:
     - failed to get URL
     - upload blocked by CORS/network
     - upload rejected by R2
     - confirm step failed
   - Reset the file input after each attempt so retrying the same file works.
   - On failed upload, update the existing `video_assets` row to `status = 'failed'` and store `error_message` instead of leaving it stuck on `uploading`.

4. Make public URLs safe too
   - In `supabase/functions/confirm-r2-upload/index.ts`, generate `public_url` from the safe key so `/video/:id` playback remains reliable.
   - This also avoids future broken links in the user gallery and funnel picker.

5. Re-check the R2 CORS setup
   - Verify the bucket allows `PUT`, `GET`, and `HEAD` from the actual app origin.
   - Important detail: the request origin I saw is `https://5b1420fc-ab4f-47dd-9c4a-50546e2dd4e9.lovableproject.com`, so if CORS was tightened from `*`, that exact origin must be allowed too.

Files to update
- `supabase/functions/get-r2-upload-url/index.ts`
- `src/pages/AdminVideosPage.tsx`
- `supabase/functions/confirm-r2-upload/index.ts`

Technical details
- No database migration is required for this fix.
- I can reuse the existing `video_assets.error_message` column for failed uploads.
- The main production fix is not just “more CORS”; it is replacing the custom signer plus sanitizing filenames.

Success checks after implementation
- Upload a file with spaces/parentheses in the name.
- Confirm the row moves from `uploading` to `ready`.
- Copy the Nevorai video link and verify playback on `/video/:id`.
- Test one failed upload and confirm it becomes `failed` with a visible retry path instead of silently breaking.
