# Media Upload Pipeline Plan

## Current Temporary Flow

- The editor imports local image, video, and audio files from the browser file picker.
- Each selected file becomes a `MediaAsset` in `project.mediaAssets`.
- The preview source is currently a browser `object URL`.
- A matching timeline clip is created immediately at the current playhead frame.
- Browser metadata APIs read:
  - image width and height
  - video duration, width, and height
  - audio duration

This is good enough for local preview, but it is not stable enough for save/load or export.

## Why Object URLs Are Temporary

- Object URLs only live in the current browser session.
- They cannot be serialized into a project JSON and restored later.
- They are not reliable for server-side Remotion export.
- They must be revoked when assets are removed to avoid memory leaks.

## Stable Upload Direction

1. Add a real asset storage layer.
   - For local-only MVP: copy files into a controlled project media folder.
   - For web/server usage: upload files to server storage or object storage.

2. Store durable asset references.
   - `id`
   - `kind`
   - `name`
   - `mimeType`
   - durable `src` or storage key
   - original file size
   - duration and `durationInFrames`
   - width and height for image/video
   - created/updated timestamps if persistence is added

3. Keep browser object URLs as preview-only runtime cache.
   - Project data should store durable references.
   - Runtime can map `assetId -> objectUrl` for immediate preview.
   - Revoke object URLs when replacing/removing assets or unloading the project.

4. Add asset validation.
   - Reject unsupported MIME types.
   - Cap file size.
   - Cap duration for early MVP if needed.
   - Show import errors in UI instead of failing silently.

5. Add generated media data.
   - Video thumbnails for timeline.
   - Audio waveform samples.
   - Optional poster frame for video assets.

6. Make export consume the same project model.
   - Remotion preview can use runtime object URLs.
   - Remotion export should resolve durable asset references to local/server-readable files.
   - Avoid storing File objects, Blob objects, or object URLs as the only source of truth.

## Recommended Implementation Order

1. Add `assetId` references to media clips while keeping `src` as a resolved preview source.
2. Add asset removal and object URL cleanup.
3. Add import error state and file validation.
4. Add persistent project JSON shape.
5. Add durable media storage.
6. Add thumbnails and waveform generation.
7. Wire export to resolve durable assets.
