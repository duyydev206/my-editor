# Editor Completion Plan

## Working Rules

- Do not remove, rewrite, or replace existing UI code or comments unless the user explicitly approves it.
- Do not silently change existing behavior. If a logic change is required to make a feature work, document the proposed change and ask before editing.
- Follow the current code style, folder structure, naming style, and component boundaries.
- Keep code clean, typed, maintainable, and scalable.
- Do not use `any`. Prefer discriminated unions, narrow interfaces, utility types, generics, and explicit return types where they improve safety.
- Keep source-of-truth state in the editor store unless there is a clear reason to keep state local.
- Keep Remotion composition data serializable so preview and export can use the same project model.
- Keep UI implementation incremental. Build a working vertical slice before expanding feature breadth.

## Current State

The editor already has a useful foundation:

- Project state contains video config, track groups, tracks, and clips.
- Clip model supports text, video, audio, image, and shape clips.
- Runtime state supports player, preview, timeline, selection, interaction, and text editing.
- Preview uses Remotion Player and passes the project into `EditorPreviewComposition`.
- Timeline has ruler, zoom computation, lane layout, clip layout, playhead, toolbar, and visual clip shells.
- Toolbar has controls for playback, snap, loop, mute, fullscreen, zoom, split, delete, undo, and redo.

Important gaps:

- Initial tracks and clips are currently commented out.
- Inspector is a placeholder.
- Main editor toolbar buttons are not connected to actions.
- Timeline selection is not wired into item rendering.
- Timeline drag, resize, snapping, and playhead dragging are not implemented.
- Toolbar commands for split, delete, undo, and redo are stubs.
- Preview does not yet support selecting, dragging, resizing, or rotating visual objects.
- Export flow is not implemented.
- Media import, metadata extraction, thumbnails, and waveforms are not implemented.

## Target Architecture

### Core Data Model

The editor should keep one canonical project model:

- `project.video`: fps, dimensions, duration, aspect ratio, background.
- `project.trackGroups`: logical groups such as text, media, audio, overlays.
- `project.tracks`: ordered lanes with lock, mute, hide, height, and media kind.
- `project.clips`: discriminated union by clip type.
- `clip.transform`: visual transform for preview rendering.
- `clip.from`, `clip.durationInFrames`, `clip.sourceStartFrame`: timeline timing.

Runtime state should remain separate from project data:

- Player state: frame, status, mute, playback rate.
- Timeline UI state: zoom, viewport, toolbar toggles.
- Selection state: selected clips, selected track, selected group.
- Interaction state: drag playhead, move clip, resize clip.
- Text editing state: active clip and draft text.

### Action Layer

Add explicit store actions before adding more UI behavior:

- Project actions:
  - `setProject`
  - `updateVideoConfig`
  - `recalculateProjectDuration`
- Track actions:
  - `addTrack`
  - `updateTrack`
  - `deleteTrack`
  - `reorderTracks`
  - `toggleTrackLocked`
  - `toggleTrackMuted`
  - `toggleTrackHidden`
- Clip actions:
  - `addClip`
  - `updateClip`
  - `deleteClip`
  - `deleteSelectedClips`
  - `moveClip`
  - `resizeClip`
  - `splitClipAtFrame`
  - `splitSelectedClipAtPlayhead`
  - `duplicateClip`
- Selection actions:
  - `selectClip`
  - `toggleClipSelection`
  - `selectOnlyClip`
  - `clearSelection`
- Interaction actions:
  - `startDragPlayhead`
  - `updateDragPlayhead`
  - `endDragPlayhead`
  - `startMoveClip`
  - `updateMoveClip`
  - `endMoveClip`
  - `startResizeClip`
  - `updateResizeClip`
  - `endResizeClip`

Each action should have a typed payload. Avoid passing loose objects whose shape is inferred only at call sites.

## Implementation Phases

### Phase 1: Stabilize Existing Foundation

Goal: make the current editor state visible and testable without changing the UI design.

Tasks:

1. Restore or create a minimal typed seed project only if approved.
2. Wire selected clip state into `TimelineItem`.
3. Implement clip selection on timeline click.
4. Implement `deleteSelectedClips`.
5. Implement `splitSelectedClipAtPlayhead`.
6. Keep project duration in sync after clip changes.
7. Fix obvious interaction bugs only after approval if they require modifying existing logic.

Completion criteria:

- A user can see clips on the timeline.
- Clicking a clip selects it.
- Selected clips show selected styling through existing `isSelected`.
- Delete removes selected clips.
- Split cuts a selected clip at the playhead when the playhead is inside that clip.

### Phase 2: Timeline Editing

Goal: make the timeline usable for basic editing.

Tasks:

1. Implement playhead dragging on the ruler/body.
2. Implement clip dragging horizontally by frame.
3. Implement clip dragging vertically between compatible tracks.
4. Implement resize from start and end handles.
5. Add frame snapping when `snapEnabled` is true.
6. Add snap points for playhead, clip starts, clip ends, and ruler ticks.
7. Clamp clips so they cannot have invalid negative duration.
8. Respect track and clip lock states.
9. Track scroll position in store if needed for accurate coordinate math.

Suggested approach:

- Start with native Pointer Events for timeline-specific precision.
- Add a small typed coordinate conversion layer:
  - pointer x to timeline x
  - x to frame
  - frame to x
  - y to track id
  - delta px to delta frames
- Use `@dnd-kit/core` later only if native Pointer Events become hard to maintain.

Completion criteria:

- Dragging clips updates `clip.from`.
- Resizing updates `clip.from` and `clip.durationInFrames`.
- Snapping feels predictable.
- Locked clips and tracks cannot be edited.
- Timeline and preview remain synchronized.

### Phase 3: Inspector

Goal: selected clip properties can be edited from the right panel.

Tasks:

1. Show empty state when no clip is selected.
2. Show typed panels by selected clip type.
3. Add common controls:
  - label
  - from
  - duration
  - hidden
  - locked
  - transform x/y
  - scale x/y
  - rotation
  - opacity
  - width/height where applicable
4. Add text controls:
  - text
  - font family
  - font size
  - font weight
  - color
  - background color
  - alignment
5. Add media controls:
  - source
  - volume
  - muted
  - playback rate
  - source start frame
6. Add shape controls:
  - shape type
  - fill
  - stroke
  - stroke width

Completion criteria:

- Inspector edits update store and preview immediately.
- Controls are typed by clip kind.
- Invalid values are clamped or rejected in one predictable place.

### Phase 4: Add Clip Creation

Goal: toolbar buttons create useful clips.

Tasks:

1. Add text clip creation.
2. Add shape clip creation.
3. Add image clip creation from imported media.
4. Add video clip creation from imported media.
5. Add audio clip creation from imported media.
6. Place new clips at the playhead.
7. Pick a compatible track automatically or create one if needed.
8. Select newly created clips.

Completion criteria:

- Toolbar buttons create clips without manual state editing.
- Newly added clips appear in timeline and preview.
- Clip defaults are centralized and typed.

### Phase 5: Media Import Pipeline

Goal: users can add local media and the editor can understand duration/dimensions.

Tasks:

1. Add media asset type separate from timeline clips.
2. Store asset metadata:
  - id
  - type
  - src/object URL
  - name
  - duration
  - durationInFrames
  - width/height for visual media
  - mime type
3. Add file picker for image/video/audio.
4. Extract video/audio duration.
5. Extract image dimensions.
6. Generate video thumbnails.
7. Generate audio waveform data.
8. Revoke object URLs when assets are removed.

Possible libraries:

- Native browser APIs first for metadata.
- `@remotion/media-utils` for media information where it fits.
- Web Audio API for waveform generation.

Completion criteria:

- Imported files become reusable assets.
- Creating clips from assets uses accurate source duration.
- Timeline can eventually show thumbnails and waveforms.

### Phase 6: Preview Object Editing

Goal: users can manipulate selected visual clips directly in preview.

Tasks:

1. Add a preview overlay layer above Remotion Player.
2. Map composition coordinates to rendered preview coordinates.
3. Select visual clips from preview.
4. Drag selected visual clips.
5. Resize selected visual clips.
6. Rotate selected visual clips.
7. Support snapping to center, edges, and other clip bounds.
8. Keep transform updates in project state.

Suggested library:

- `react-moveable` for draggable, resizable, rotatable, scalable, groupable, and snappable controls.

Completion criteria:

- Preview transform matches exported Remotion output.
- Timeline selection and preview selection stay synchronized.
- Transform math is stable across fit, fill, custom zoom, and fullscreen modes.

### Phase 7: Undo and Redo

Goal: editing actions can be safely reverted.

Tasks:

1. Add undo/redo middleware after project actions are stable.
2. Track project changes, not runtime-only state like current frame or hover interactions.
3. Group continuous drag/resize updates into one history entry.
4. Wire toolbar undo/redo buttons.
5. Add canUndo/canRedo selectors for disabled states.

Suggested library:

- `zundo`, because it integrates with Zustand and supports undo/redo through temporal state.

Completion criteria:

- Undo/redo works for add, delete, move, resize, split, and inspector edits.
- Dragging a clip does not create excessive history entries.

### Phase 8: Export

Goal: export the current project to a video file.

Tasks:

1. Create a Remotion composition entry for export.
2. Pass the same serializable `project` data used by preview.
3. Add an export API route or server action.
4. Bundle/select composition.
5. Render media with chosen codec and output path.
6. Stream or download the exported file.
7. Show render progress and errors.

Suggested Remotion pieces:

- `@remotion/bundler`
- `@remotion/renderer`
- `renderMedia`
- `selectComposition`

Completion criteria:

- Exported video matches preview.
- Export supports at least MP4/H.264.
- User sees progress and final download.

### Phase 9: Polish and Scale

Goal: make the editor feel complete and maintainable.

Tasks:

1. Keyboard shortcuts:
  - play/pause
  - delete
  - split
  - undo
  - redo
  - copy/paste
  - frame step
2. Multi-select clips.
3. Copy/paste clips.
4. Track add/delete/reorder.
5. Track collapse/expand groups.
6. Clip context menu.
7. Timeline zoom around cursor/playhead.
8. Auto-scroll while dragging.
9. Save/load project JSON.
10. Autosave.
11. Project validation.
12. Error boundaries around preview/export.

Completion criteria:

- The app supports a complete basic editing workflow.
- Project data can be saved and restored.
- Common keyboard workflows are fast.
- Errors do not corrupt editor state.

## Technology Decisions

Recommended to keep:

- Next.js
- React
- TypeScript
- Zustand
- Remotion
- Ant Design
- Tailwind CSS
- React Icons

Recommended to add later:

- `zundo` for undo/redo after action boundaries are clean.
- `react-moveable` for preview object transform controls.
- `@dnd-kit/core` only if timeline Pointer Events become too complex or keyboard-accessible drag becomes a priority.

Avoid for now:

- Large all-in-one editor frameworks that fight the existing architecture.
- Untyped event payloads.
- Duplicating project state separately for preview and export.
- Adding persistence before the project schema stabilizes.

## Testing Strategy

Start with focused tests around pure logic:

- timeline frame/pixel math
- clip layout building
- lane layout building
- split clip behavior
- resize clamp behavior
- snap calculation
- project duration recalculation

Then add interaction tests:

- select clip
- drag clip
- resize clip
- delete selected clip
- inspector edit

Manual verification for each milestone:

- Timeline and preview stay synchronized.
- No selected clip state gets stuck.
- Locked/hidden/muted states are respected.
- Export matches preview.

## First Implementation Milestone

The first practical milestone should be:

1. Add typed clip/project actions.
2. Enable a minimal seed project if approved.
3. Wire timeline selection.
4. Implement delete selected clips.
5. Implement split selected clip at playhead.
6. Add a basic inspector for selected clip timing and label.

This milestone creates the editing backbone without committing too early to heavier libraries.
