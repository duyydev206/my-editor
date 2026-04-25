# Editor Maintenance Plan

## Purpose

This document is the shared operating plan for maintaining and evolving this editor into:

1. A real product that end users can use for large, long-running video projects.
2. A high-quality developer codebase with reusable editor modules.
3. A performance-first application that can handle projects that are hours long and contain media measured in tens of GB.

Every future session should read this file before making architecture, state, timeline, media, preview, export, or performance changes.

## Non-Negotiable Rules

### UI Lock Rule

Do not refactor or redesign UI markup, HTML structure, JSX layout, Tailwind classes, visual styling, or component presentation unless the user explicitly approves it.

Allowed by default:

- Refactor logic out of UI components.
- Replace inline logic with imported helpers or hooks.
- Wire existing UI controls to cleaner actions.
- Add typed payloads and pure functions.
- Improve state architecture, selectors, and performance.

Not allowed by default:

- Changing Tailwind class names.
- Changing visible layout.
- Moving UI elements.
- Rewriting component markup.
- Replacing Ant Design or icon usage.
- Redesigning toolbar, preview, inspector, or timeline visuals.

If a logic refactor requires touching a UI file, keep the JSX and classes unchanged as much as possible and only adjust the minimum code needed to connect the refactored logic.

### Behavior Safety Rule

Do not silently change existing behavior during maintenance refactors.

For every meaningful change, record:

- Old behavior.
- New behavior.
- Why the change was made.
- Benefits.
- Tradeoffs or risks.
- Verification performed.

Use the change log template at the end of this document.

### Performance Rule

Editor performance is a product requirement, not a later polish task.

All architecture decisions should consider:

- Project duration measured in hours.
- Many clips and tracks.
- Large video/audio/image files.
- Smooth dragging, resizing, scrubbing, playback, and preview.
- Minimal React re-renders during timeline and player interactions.
- Clean separation between project data and runtime UI state.

### Source Of Truth Rule

The editor should keep one canonical project model:

- `project.video`
- `project.trackGroups`
- `project.tracks`
- `project.clips`
- `project.mediaAssets`

Runtime-only state must stay separate:

- player state
- preview state
- timeline viewport and toolbar state
- selection state
- interaction state
- text editing state

Preview, timeline, inspector, export, and persistence should all read from the same canonical project model.

## Current Project Understanding

The project is a Next.js video editor built with:

- Next.js 16
- React 19
- TypeScript
- Zustand
- Remotion
- Ant Design
- Tailwind CSS
- dnd-kit

Primary editor code lives in:

```text
src/features/editor
```

Current main areas:

- `src/app/editor/page.tsx`: editor page layout.
- `src/features/editor/stores`: Zustand editor store, initial state, selectors.
- `src/features/editor/types`: project, timeline, preview, player, interaction types.
- `src/features/editor/lib`: pure and semi-pure editor logic.
- `src/features/editor/components/timeline`: timeline UI and interaction.
- `src/features/editor/components/preview`: Remotion preview and text overlay.
- `src/features/editor/components/inspector`: project and clip inspector.
- `src/features/editor/compositions`: Remotion composition.

## Current Status

### Already Working

- App builds successfully with `npm run build`.
- ESLint passes with `npm run lint`.
- Editor route exists at `/editor`.
- Project/runtime state separation already exists.
- Preview uses Remotion Player.
- Timeline has ruler, zoom computation, lane layout, clip layout, playhead, toolbar, and drag ghost preview.
- Text and media clips can be added from the toolbar.
- Local image/video/audio import creates media assets with basic metadata.
- Timeline clip selection is wired to store state.
- Clip delete is implemented.
- Clip move is implemented with dnd-kit and can create/reorder lanes.
- Track mute/hide state affects project data.
- Inspector can show project info and selected clip transform fields.
- Text clip overlay supports selection, direct editing, moving, and resizing in preview.

### Known Gaps

- `splitSelectedClipAtPlayhead` is still a stub.
- `undo` and `redo` are still stubs.
- Timeline resize handles are visible but resize behavior is not fully implemented.
- Snap state exists but snap engine is not complete.
- Shape clip type exists in the model but toolbar shape creation is not implemented.
- Export UI exists but render/export pipeline is not implemented.
- Media asset object URLs do not yet have a complete lifecycle cleanup strategy.
- Timeline is not virtualized.
- No automated tests currently protect timeline math, clip layout, split, move, resize, snap, or duration logic.
- `editor.store.ts` is too large and mixes helpers, action logic, and domain rules.
- Some documentation files have encoding issues.
- README still looks like a generated Next.js starter README.
- Root route and dashboard copy still contain starter/Jira placeholder content.

## Architecture Direction

### Target Store Structure

Refactor the store gradually into domain slices and pure helpers.

Target structure:

```text
src/features/editor/stores/
  editor.store.ts
  editor.types.ts
  editor.initial-state.ts
  editor.selectors.ts
  actions/
    player.actions.ts
    preview.actions.ts
    timeline.actions.ts
    selection.actions.ts
    track.actions.ts
    clip.actions.ts
    media.actions.ts
    text-editing.actions.ts
  helpers/
    clamp.ts
    ids.ts
    project-duration.ts
    tracks.ts
    clips.ts
    layers.ts
```

Rules:

- `editor.store.ts` should compose state and actions.
- Domain logic should live in small pure helper modules.
- Store actions should orchestrate state updates, not contain long algorithms.
- Typed payloads are required.
- Avoid `any`.
- Keep runtime state and project state separate.

### Target Logic Modules

Move reusable editor logic into pure modules:

```text
src/features/editor/lib/
  project-duration.ts
  clip-overlap.ts
  clip-move.ts
  clip-resize.ts
  clip-split.ts
  clip-snap.ts
  layer-order.ts
  media-assets.ts
  timeline-math.ts
  timeline-zoom-engine.ts
  build-track-lane-layouts.ts
  build-clip-layouts.ts
```

Each pure module should be easy to test without React, Remotion, browser DOM, or Zustand.

## Maintenance Roadmap

### Phase 0: Baseline And Guardrails

Goal: make future changes safer.

Tasks:

- Keep this document updated after every meaningful change.
- Record current build/lint status.
- Avoid touching UI markup or Tailwind.
- Identify files that are logic-heavy but UI-presentationally locked.
- Add notes when behavior intentionally changes.

Completion criteria:

- `npm run lint` passes.
- `npm run build` passes.
- Maintenance log is updated.

### Phase 1: Extract Store Helpers

Goal: reduce `editor.store.ts` complexity without changing behavior.

Tasks:

- Extract generic helpers:
  - `clamp`
  - `clampFrame`
  - id generation
  - duration calculation
- Extract track helpers:
  - get track/group labels
  - find compatible group
  - ensure track for clip kind
  - create track during clip move
  - remove empty tracks
- Extract clip helpers:
  - overlap detection
  - next non-overlapping frame
  - centered transform
  - media clip duration
- Extract layer helpers:
  - next layer index
  - sync layer indexes with track order

Completion criteria:

- No behavior change.
- `editor.store.ts` becomes smaller and easier to scan.
- Extracted helpers are typed and reusable.
- `npm run lint` passes.
- `npm run build` passes.

### Phase 2: Normalize Action Layer

Goal: make mutations consistent and easy to reason about.

Tasks:

- Add or normalize project actions:
  - `setProject`
  - `updateVideoConfig`
  - `recalculateProjectDuration`
- Add or normalize clip actions:
  - `addClip`
  - `updateClip`
  - `deleteClip`
  - `deleteSelectedClips`
  - `moveClip`
  - `resizeClip`
  - `splitClipAtFrame`
  - `splitSelectedClipAtPlayhead`
  - `duplicateClip`
- Add or normalize selection actions:
  - `selectOnlyClip`
  - `toggleClipSelection`
  - `clearSelection`
- Keep existing UI controls connected to actions.

Completion criteria:

- Every project mutation has an explicit store action.
- Action payloads are typed.
- Project duration is recalculated in predictable places.
- Selection is cleared or updated consistently after mutations.
- `npm run lint` and `npm run build` pass.

### Phase 3: Core Editor Behaviors

Goal: make the editor basically usable.

Tasks:

- Implement split selected clip at playhead.
- Implement timeline clip resize from start and end handles.
- Implement frame snapping:
  - playhead
  - clip starts
  - clip ends
  - ruler ticks
- Add lock guards for clip and track operations.
- Add overlap guards and predictable conflict resolution.
- Keep preview and timeline synchronized.

Completion criteria:

- Selected clips can be split.
- Clips can be moved and resized safely.
- Snapping is predictable.
- Invalid negative frame/duration states are impossible.
- Locked clips/tracks cannot be edited.

### Phase 4: Tests For Editor Logic

Goal: make future refactors safe.

Recommended test tool: `vitest`.

Test targets:

- timeline zoom calculation
- frame/pixel conversion
- clip layout building
- track lane layout building
- project duration calculation
- clip overlap detection
- move clip behavior
- resize clip clamp behavior
- split clip behavior
- layer order sync
- media duration calculation

Completion criteria:

- Core pure logic has focused tests.
- Tests do not depend on UI markup.
- Tests can run quickly during maintenance.

### Phase 5: Performance Foundation

Goal: support large real projects.

Tasks:

- Replace broad store subscriptions with narrow selectors.
- Avoid subscribing preview/player to full project where possible.
- Memoize derived maps:
  - `trackMap`
  - `laneMap`
  - visible clip lists
  - layout results
- Keep frame updates out of expensive React render paths.
- Add timeline virtualization for tracks/clips.
- Render only visible timeline clips when project grows.
- Batch or throttle continuous pointer updates.
- Commit final project mutation at drag/resize end where practical.
- Design undo/redo to group drag/resize into single entries.

Completion criteria:

- Scrubbing and playback do not re-render unnecessary UI.
- Timeline remains responsive with many clips.
- Drag and resize remain smooth.
- Derived data has clear memoization boundaries.

### Phase 6: Media Pipeline

Goal: make local media handling robust.

Tasks:

- Separate asset library from timeline clips cleanly.
- Track object URL lifecycle.
- Revoke object URLs when assets are removed or project resets.
- Add metadata status/error states.
- Generate video thumbnails.
- Generate audio waveform data.
- Avoid loading large media fully into memory where possible.
- Prepare later migration to backend/object storage.

Completion criteria:

- Imported media is reusable.
- Asset cleanup is explicit.
- Timeline can eventually show thumbnails and waveforms.
- Large files are handled with clear memory discipline.

### Phase 7: Undo, Redo, Persistence

Goal: make editing recoverable and projects reusable.

Tasks:

- Add undo/redo after action boundaries are clean.
- Track project state changes, not transient runtime state.
- Group drag/resize into one history entry.
- Add save/load project JSON.
- Add project schema version.
- Add validation and migration helpers.
- Add autosave after schema stabilizes.

Completion criteria:

- Undo/redo works for add, delete, move, resize, split, inspector edits.
- Project JSON can be saved and restored.
- Old project versions can be migrated safely.

### Phase 8: Export

Goal: allow end users to produce real video output.

Tasks:

- Add Remotion export composition entry.
- Use the same serializable `EditorProject` as preview.
- Add export API route or server action.
- Use Remotion renderer to render MP4.
- Show progress and error states.
- Return downloadable output.

Completion criteria:

- Exported video matches preview.
- Export supports at least MP4/H.264.
- Export failure does not corrupt editor state.

### Phase 9: Developer Product Quality

Goal: make the repo reusable by other developers.

Tasks:

- Replace starter README with product README.
- Document architecture.
- Document editor project schema.
- Document action conventions.
- Document how to add a new clip type.
- Document how to add a new toolbar action.
- Document performance principles.
- Fix encoding issues in roadmap/timeline docs.
- Remove or rename placeholder Jira/dashboard/starter copy when approved.

Completion criteria:

- A new developer can understand the editor architecture quickly.
- Core modules are reusable.
- Docs match implementation.

## Prioritized Next Milestones

### Milestone 1: Store Foundation Refactor

Scope:

- Extract helpers from `editor.store.ts`.
- Keep behavior unchanged.
- Do not change UI markup or Tailwind.
- Run lint/build.
- Update maintenance log.

Why first:

- The store is the main complexity hotspot.
- New features will be safer after mutation logic is cleaner.
- Split, resize, undo, redo, and export all depend on clean action boundaries.

### Milestone 2: Clip Editing Backbone

Scope:

- Implement split selected clip at playhead.
- Implement timeline resize logic.
- Centralize duration recalculation.
- Add guards for invalid clip states.

### Milestone 3: Tests For Pure Logic

Scope:

- Add test runner.
- Test extracted logic.
- Protect timeline math and clip mutation behavior.

### Milestone 4: Snap And Interaction Quality

Scope:

- Implement snap engine.
- Add snap guide state.
- Improve drag/resize interaction correctness.

### Milestone 5: Performance Pass

Scope:

- Audit store selectors.
- Reduce unnecessary re-renders.
- Add visible clip filtering or virtualization plan.

## Change Log Template

Every meaningful maintenance change should add an entry below using this format:

```md
### YYYY-MM-DD - Short Change Title

Files changed:

- `path/to/file.ts`

Old:

- Describe old behavior or structure.

New:

- Describe new behavior or structure.

Why:

- Explain why this change was needed.

Benefits:

- List practical benefits.

Tradeoffs / Risks:

- List risks, migration concerns, or things to watch.

Verification:

- `npm run lint`
- `npm run build`
- Other manual or automated checks.
```

## Maintenance Log

### 2026-04-25 - Add Timeline Maintenance Baseline Document

Files changed:

- `TIMELINE.md`
- `MAINTENANCE_PLAN.md`

Old:

- Timeline behavior and refactor constraints existed mostly in chat history and scattered maintenance log entries.
- There was no single Timeline-specific contract describing current drag/drop, ruler, playhead, lane creation, resize, and performance expectations.

New:

- Added `TIMELINE.md` as the dedicated Timeline maintenance baseline.
- Documented current behavior that must be preserved.
- Documented known technical debt and performance goals.
- Added a phased refactor plan:
  - constants/types extraction
  - preview track builder extraction
  - drop preview calculation extraction
  - drag auto-scroll hook
  - panel resize hook
  - keyboard shortcut hook
  - tests
  - performance pass

Why:

- Timeline has become the most interaction-sensitive part of the editor.
- Future cleanup must preserve behavior while reducing complexity and improving performance.

Benefits:

- Future sessions can recover Timeline context quickly.
- Refactor work can proceed in safer small phases.
- Behavior regressions become easier to identify.

Tradeoffs / Risks:

- Documentation must stay synchronized with behavior changes.
- No runtime code was optimized in this step; this is the planning/baseline step before behavior-preserving refactors.

Verification:

- Documentation-only change.

### 2026-04-25 - Remove Drag Ghost Border And Disable Lane Creation For Single-Lane Timelines

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- Drag target ghost reused selected clip shell, so it showed a border.
- Lane creation logic could run even when the timeline had only one lane.

New:

- Drag target ghost is now a plain rounded gray block without a border.
- Lane creation previews and create-lane drops are disabled when the timeline has only one lane.

Why:

- The ghost should be visually quieter than the real dragged clip.
- A single-lane timeline should not create extra lanes through drag/drop.

Benefits:

- Cleaner drag target preview.
- Prevents unwanted lane creation in the one-lane case.

Tradeoffs / Risks:

- Users cannot create a second lane by dragging out of a single existing lane; lane creation will need an explicit action if required later.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Isolate Timeline Panel Resize From Ruler And Playhead Scrubbing

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `src/features/editor/components/timeline/components/timeline-ruler.tsx`
- `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`
- `src/features/editor/components/timeline/components/playhead.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- Timeline panel resize used window-level pointermove listeners but did not capture the pointer on the resize handle.
- While resizing, pointermove events could still reach the ruler or playhead handle with `buttons === 1`.
- The ruler/playhead interpreted those resize pointer moves as seek/scrub input, pulling the playhead toward the resize cursor.
- In some edge cases the playhead scrub state could become inconsistent until the user clicked the playhead again.

New:

- Timeline resize handle captures the pointer on resize start and releases it on pointer end/cancel.
- Timeline now tracks `isTimelinePanelResizing`.
- Ruler interactions are disabled while the timeline panel is resizing.
- Playhead scrub interactions are disabled while the timeline panel is resizing.
- Playhead itself also avoids pointer capture when interactions are disabled.
- The playhead line is kept as a CSS-stretched line rather than a hardcoded SVG path.

Why:

- Resizing the timeline panel is a layout operation, not a timeline seek operation.
- Pointer streams for resize must not be shared with ruler/playhead scrub handlers.

Benefits:

- Resizing timeline height no longer moves the playhead.
- Ruler click/seek remains available after resize.
- Playhead does not enter a stuck scrub state from resize pointer events.
- Playhead line remains dynamic with timeline height.

Tradeoffs / Risks:

- During timeline panel resize, ruler and playhead interactions are intentionally ignored until the pointer is released.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Make Playhead Line Height Dynamic

Files changed:

- `src/features/editor/components/timeline/components/playhead.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- The playhead handle and vertical line were drawn together in one SVG path.
- The vertical line length was hardcoded inside the SVG path data with a fixed large value.
- When the timeline panel/content became taller than that value, the playhead line could appear too short.

New:

- The SVG now only draws the playhead handle.
- The vertical line is a CSS element positioned from `top: 0` to `bottom: 0` inside the playhead root.
- The playhead root itself is positioned from top to bottom of the playhead layer.

Why:

- Playhead height should follow layout, not a hardcoded SVG coordinate.
- CSS layout is the correct source of truth for a line that must stretch with the timeline viewport/layer.

Benefits:

- Playhead line scales with timeline height.
- Removes brittle hardcoded SVG line length.
- Keeps the existing handle visual.

Tradeoffs / Risks:

- The line and handle are now separate elements, so future visual changes need to account for both.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Make Between-Lane Drop Create Lane Only For Occupied Adjacent Lanes

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- The between-lane blue line could appear even when one adjacent lane was effectively empty after excluding the clip currently being dragged.
- Dropping on the between-lane line was a no-op.
- This meant dragging a clip between two lanes did not create a new lane there.

New:

- The between-lane blue line appears only when both adjacent lanes contain at least one real clip after excluding the currently dragged clip.
- A clip that is currently being dragged out of its source lane no longer counts as occupying that lane for gap-line eligibility.
- Dropping on a valid between-lane line now creates a new lane at that position and moves the clip into it.
- The normal store cleanup still removes the old source lane if it becomes empty after the move.

Why:

- A valid between-lane insert target should exist only between two occupied lanes.
- Top/bottom boundary drag previews and between-lane insertion are different UX modes:
  - top/bottom shows a temporary lane immediately while dragging
  - between existing occupied lanes shows only a line while dragging and creates the lane on drop

Benefits:

- Prevents misleading gap lines beside lanes that are effectively empty.
- Enables actual drop-to-create-lane behavior between two occupied lanes.
- Keeps lane cleanup behavior compact after drop.

Tradeoffs / Risks:

- Dropping between lanes is only available when both adjacent lanes have real clips.
- If a future UX needs inserting between empty lanes, it should be added as an explicit lane management feature.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Restore Fixed Track Corner And Playhead Overlay Containment

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- The scroll viewport was changed to `position: relative` while adding lane-gap preview overlays.
- That accidentally changed the containing block for existing absolute overlays inside the timeline.
- As a result, the track corner could scroll with `scrollLeft`/`scrollTop`, and the playhead viewport layer could scroll vertically with content.
- Originally only the ruler sticky behavior had a bug; track corner and playhead overlay were not supposed to move with content.

New:

- Removed `relative` from the scroll viewport so absolute overlays are again anchored to the outer timeline surface.
- The lane-gap preview line now uses stored `timeline.viewport.scrollTop` to align vertically without making the scroll viewport the containing block.

Why:

- Track corner and playhead are viewport overlays, not scroll-content elements.
- The scroll viewport must not become the positioning ancestor for those overlays.

Benefits:

- Track corner no longer scrolls with timeline content.
- Playhead overlay no longer scrolls vertically with lanes.
- Lane-gap preview still aligns with visible scrolled content.

Tradeoffs / Risks:

- Lane-gap preview now depends on the timeline scroll state being synced from the scroll handler.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Correct Drag Ghost And Dragged Clip Visual Roles

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- The pointer-following `DragOverlay` used the gray clip-shaped block.
- The target/drop preview rendered the clip content.
- This inverted the intended visual roles.

New:

- The target/drop preview is the gray clip-shaped ghost/placeholder.
- The pointer-following dragged clip renders like the real timeline clip, with selected border and `TimelineItemContent`.

Why:

- In the editor UX, "ghost" means the gray placeholder at the target position.
- The item being dragged should continue to look like the actual clip.

Benefits:

- Drag feedback now matches the requested mental model.
- The user can distinguish the real dragged clip from the target placeholder.

Tradeoffs / Risks:

- There are still two visuals during drag by design: real dragged clip overlay and gray target ghost.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Clamp Drag Auto-Scroll To Timeline Width And Restore Gray Drag Ghost

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- Drag auto-scroll used the viewport's live `scrollWidth` and `scrollHeight`.
- Absolute drag/drop previews could contribute to scrollable overflow, causing `scrollWidth` to grow while dragging.
- This allowed horizontal drag scrolling to continue beyond the real timeline width.
- Drag overlay rendered selected clip content instead of the older gray clip-shaped ghost style.

New:

- Horizontal drag auto-scroll is clamped to `TRACK_HEADER_WIDTH + timelineWidth - viewportWidth`.
- Vertical drag auto-scroll is clamped to the computed timeline content height.
- Dragged frame position is clamped to the visible timeline duration, so target previews cannot move beyond the real timeline content.
- Drag overlay is now a clip-shaped selected shell with a gray background, matching the older ghost style more closely.

Why:

- Auto-scroll must use canonical timeline geometry, not browser `scrollWidth`, because preview elements can temporarily affect overflow.
- The user wanted the old gray ghost style while retaining current safer drag architecture.

Benefits:

- Dragging horizontally stops at the real end of the timeline.
- Prevents drag previews from inflating scrollable width indefinitely.
- Restores the gray clip-shaped drag ghost feel.

Tradeoffs / Risks:

- Drag target movement is limited to the current visible timeline duration; future infinite/tail extension behavior would need an explicit timeline extension model.
- The pointer ghost no longer shows clip label/content, by design.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Match Drag Ghost To Selected Clip UI And Add Bounded Drag Auto-Scroll

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- Drag overlay used a custom translucent block and did not reuse the selected clip shell.
- The pointer-following ghost could visually sit below target lines/previews in some cases.
- dnd-kit auto-scroll stayed disabled to avoid the earlier infinite-height overflow bug.
- There was no replacement bounded auto-scroll for dragging near the timeline viewport edges.

New:

- Drag overlay and target clip preview now reuse `TimelineItemShell` with `isSelected`.
- The drag ghost keeps the same focused/selected border treatment as a selected timeline clip.
- The pointer-following drag overlay uses a higher z-index than timeline preview lines and target previews.
- Added custom bounded drag auto-scroll:
  - horizontal scroll when dragging near left/right viewport edges
  - vertical scroll when dragging near top/bottom viewport edges
  - scroll is clamped to the real `scrollWidth`/`scrollHeight`
  - drag target math includes scroll deltas so previews remain aligned while auto-scrolling

Why:

- The user expects the dragged clip to look like the real selected clip, not a separate simplified block.
- The old free-dragging feel is needed, but native dnd-kit auto-scroll previously contributed to unbounded overflow behavior.
- A custom bounded auto-scroll gives edge scrolling without restoring the earlier parent-height growth bug.

Benefits:

- Drag ghost looks consistent with selected clips.
- Ghost stays visually above insert lines and drop previews.
- Dragging near timeline edges can reveal more horizontal/vertical content.
- Auto-scroll stops at actual timeline bounds.

Tradeoffs / Risks:

- Custom auto-scroll is intentionally simple and pointer-driven; future polish may tune speed/thresholds.
- There can still be both a pointer ghost and a target preview, by design.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Restore Free-Dragging Clip Ghost With DragOverlay

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- The original implementation let dnd-kit apply a transform to the real source clip element.
- That made the clip feel like it moved freely with the pointer, but it also allowed the transformed source element to expand the scroll container overflow.
- A later fix hid the source item and relied only on controlled drop previews, which prevented overflow but made dragging feel like the clip disappeared.

New:

- The source clip remains hidden during drag so it cannot expand the timeline scroll container.
- A dnd-kit `DragOverlay` renders the dragged clip content and follows the pointer freely.
- Existing controlled previews still handle valid drop targets:
  - top/bottom boundary drags can create a temporary lane preview
  - between existing lanes shows a line-only gap preview
  - normal lane drags show the target preview

Why:

- The desired UX is the old free-moving clip ghost, but the old implementation was unsafe because it moved the real DOM node inside the scroll container.
- `DragOverlay` gives the same free-dragging feel while rendering outside the scrollable timeline layout.

Benefits:

- Restores visible clip ghost while dragging.
- Avoids the infinite parent height bug.
- Keeps current lane creation and gap preview rules.
- The ghost includes real clip content through `TimelineItemContent`.

Tradeoffs / Risks:

- There are now two drag visuals in some states: a pointer-following overlay and a controlled target/drop preview.
- Future polish may choose to visually distinguish the pointer ghost from the target preview more clearly.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Separate Boundary Lane Creation From Between-Lane Gap Preview

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- The same insert-lane behavior was used for top/bottom boundary drags and for dragging between two existing lanes.
- Dragging between existing lanes could create a temporary lane preview and could commit a lane-creation move.
- The drag ghost was a plain translucent block without the clip's real content, so it looked like the clip disappeared or only left an empty shadow.

New:

- Dragging above the top lane or below the bottom lane uses `lane-insert`: it creates a temporary lane preview and shows the clip ghost on that lane.
- Dragging between two existing lanes uses `lane-gap`: it shows only a thin blue divider across the track headers and timeline body.
- Dropping on a `lane-gap` does not move the clip or create a lane.
- The clip ghost now renders `TimelineItemContent`, so the dragged item shows its icon/label/content instead of an empty shadow.

Why:

- The intended behavior is that only top/bottom boundary drags create a new lane.
- The gap between existing lanes should be an insertion hint only, not an actual lane creation target.
- Users need to see the dragged clip content while dragging.

Benefits:

- Prevents accidental lane creation between existing lanes.
- Keeps top/bottom lane creation clear and explicit.
- Makes drag feedback recognizable because the ghost contains the real clip content.

Tradeoffs / Risks:

- Dropping exactly on a between-lane divider is now a no-op.
- If future UX needs lane creation between existing lanes, it should be reintroduced as a separate explicit mode or modifier.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Show Clip Ghost On Temporary Insert Lanes

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- During insert-lane drag, the original source clip was hidden to prevent unbounded scroll overflow.
- The insert-lane preview showed only a thin blue line.
- This made the dragged clip feel like it disappeared when moving above the top lane, below the bottom lane, or between lanes.

New:

- Insert-lane drag still creates a temporary lane preview in the timeline.
- The drop preview is now a clip-shaped ghost positioned on that temporary lane.
- The thin full-width blue line overlay was removed for insert-lane drag.

Why:

- The user needs to see the actual clip ghost on the new lane target, not only an insertion line.
- The source item should remain hidden during drag to avoid the previous infinite-height overflow bug, but the controlled ghost must represent the dragged clip clearly.

Benefits:

- Dragging a clip into a new lane target is visually clear.
- The temporary lane and clip ghost communicate the final drop result.
- Keeps the overflow-safe drag architecture from the previous fix.

Tradeoffs / Risks:

- The moving visual is still a controlled ghost, not the original DOM node.
- Future custom auto-scroll must keep this ghost bounded to valid timeline targets.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Add Real Temporary Lane Preview And Restore Empty Lane Cleanup

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `src/features/editor/stores/editor.store.ts`
- `MAINTENANCE_PLAN.md`

Old:

- Insert-lane drag preview was a thin line only in the timeline body.
- Track headers did not show a temporary lane, so the user could not see the new lane as a real drop target.
- The previous create-lane change preserved empty tracks after create-lane drops.
- Repeated drag/drop operations could leave many empty lanes behind, creating a poor editing experience.

New:

- During lane-insert drag, the timeline builds a temporary preview track list.
- Track headers, lane backgrounds, and existing clip layouts are rebuilt from that temporary list while dragging.
- The user now sees a real temporary lane in both track headers and timeline body before dropping.
- The insert indicator is thinner and rendered across both the track header area and the timeline content area.
- After drop, `moveClip` again removes empty tracks for all move cases, including create-lane drops.

Why:

- The correct UX is to preview the new lane as a real lane before committing it.
- The committed project state should not accumulate empty lanes unless there is an explicit user action to create/keep them.
- Empty lane cleanup keeps the timeline compact and avoids the bad state shown by repeated drag/drop operations.

Benefits:

- Clearer lane insertion feedback.
- Track headers and body stay visually aligned during insert preview.
- Empty lanes are cleaned up after drag/drop.
- Keeps the project model cleaner and easier to maintain.

Tradeoffs / Risks:

- The temporary preview lane is UI-only and is not committed until drop.
- Because empty lanes are removed after drop, moving the only clip out of a lane may keep the total lane count the same even though a new lane was used as the drop target.
- Future explicit lane management may need separate actions for "create empty lane" and "delete empty lane".

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Preserve Existing Lanes When Drag-Creating New Timeline Lanes

Files changed:

- `src/features/editor/stores/editor.store.ts`
- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- Dragging a clip above the top lane or below the bottom lane could request a new track.
- After moving the clip, `moveClip` always called `removeEmptyTracks`.
- If the clip's original lane became empty, the original lane was removed immediately.
- The result behaved more like moving a lane slot than creating an additional lane, so lane numbers did not consistently shift as expected.
- Top/bottom boundary previews used a clip-shaped ghost, which could overlap existing lanes and was less clear for "insert lane" actions.

New:

- When `moveClip` is called with `createTrackPlacement`, existing tracks are preserved instead of removing empty tracks.
- Dropping above the top lane creates a new top lane, making the top display index increase.
- Dropping below the bottom lane creates a new bottom lane, making existing lane numbers shift upward.
- Top and bottom boundary previews now use a controlled lane-insert line instead of a clip-shaped ghost.
- Moving between existing lanes without creating a new lane still removes empty tracks, preserving the previous cleanup behavior for normal moves.

Why:

- The requested behavior is explicit lane creation, not just moving a clip into a replacement lane.
- Preserving existing tracks during create-lane drops is required for lane numbering to shift correctly.
- A lane-insert preview communicates the operation more accurately and avoids reintroducing unbounded drag overflow.

Benefits:

- Dragging above the current top lane creates a real new top lane.
- Dragging below the current bottom lane creates a real new bottom lane.
- Existing lanes keep their identity and display numbers shift predictably.
- Boundary drag preview remains bounded and safe.

Tradeoffs / Risks:

- This allows empty lanes to remain after create-lane drag operations.
- A future explicit "remove empty lane" or lane cleanup command may be needed.
- Normal moves still clean empty tracks, so behavior differs intentionally between "move to existing lane" and "create new lane".

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Fix Infinite Timeline Height During Clip Drag

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `src/features/editor/components/timeline/components/timeline-item/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- dnd-kit applied a `transform` directly to the real timeline clip element while dragging.
- The real clip element lived inside the vertically scrollable timeline content.
- When the user dragged a clip far downward, the transformed element could contribute to the scroll container's visual overflow.
- dnd-kit auto-scroll could then keep scrolling the container while the transformed source kept extending the overflow area, making the parent height/scroll range appear to grow without a practical bound.

New:

- While a clip is being dragged, the original timeline item no longer receives the dnd-kit visual transform.
- The original item is hidden with opacity during drag.
- The existing controlled timeline drop preview is responsible for showing the potential drop position.
- dnd-kit automatic scrolling is disabled for the timeline drag context.

Why:

- The timeline already has its own drag ghost/drop preview that is clamped to valid lane/drop states.
- Letting the source DOM node move freely inside the scroll container created an unbounded overflow path.
- Disabling dnd-kit auto-scroll avoids a feedback loop between pointer position, scroll position, transformed source overflow, and scrollHeight growth.

Benefits:

- Prevents dragged clips from expanding the timeline parent height indefinitely.
- Keeps drop preview behavior controlled by timeline logic.
- Avoids changing UI markup or Tailwind styling.
- Creates a safer base for a future bounded editor-specific auto-scroll implementation.

Tradeoffs / Risks:

- During drag, the original clip disappears and the existing ghost preview becomes the only visual moving indicator.
- Built-in dnd-kit auto-scroll is disabled, so dragging to off-screen lanes will need a future custom bounded auto-scroll implementation.
- This assumes `clipDropPreview` remains accurate and visible during drag.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Fix Timeline Ruler Vertical Sticky Boundary

Files changed:

- `src/features/editor/components/timeline/index.tsx`
- `MAINTENANCE_PLAN.md`

Old:

- The timeline content container that owned the ruler used viewport-height sizing.
- `TimelineRuler` used `position: sticky`, but sticky positioning is bounded by the height of its containing block.
- When many clips/tracks made the timeline vertically scrollable, scrolling far enough could make the ruler reach the bottom of its parent and scroll away with the content.

New:

- The timeline content container now has a height equal to `RULER_HEIGHT + laneResult.totalHeight`.
- The ruler's sticky containing block now spans the full scrollable timeline content height.
- This keeps the ruler pinned at the top during vertical scrolling.

Why:

- The bug was caused by sticky containment, not by the ruler itself.
- A sticky element can only remain fixed while its parent still occupies the scroll range. The parent was too short for tall timelines.

Benefits:

- Fixes the ruler drifting when the timeline has many clips/tracks.
- Keeps horizontal ruler behavior unchanged.
- Keeps UI markup and Tailwind presentation essentially intact.
- Avoids a larger scroll architecture rewrite.

Tradeoffs / Risks:

- This keeps the current single-scroll-container architecture, so future virtualization may still require a deeper timeline scroll refactor.
- The fix depends on `laneResult.totalHeight` staying accurate.

Verification:

- `npm run lint` passed.
- `npm run build` passed.

### 2026-04-25 - Create Maintenance Plan

Files changed:

- `MAINTENANCE_PLAN.md`

Old:

- Maintenance direction existed only in chat context and scattered planning documents.
- Future sessions had no single concise source of truth for rules, roadmap, and logging expectations.

New:

- Added a dedicated maintenance plan with architecture direction, phased roadmap, non-negotiable UI lock rules, performance principles, and a required change log template.

Why:

- The project is growing into a serious editor product, so future work needs shared constraints and a durable plan that survives across chat sessions.

Benefits:

- Future sessions can quickly recover context.
- UI preservation rule is explicit.
- Logic refactor priorities are clear.
- Every meaningful change now has a place to record old/new behavior and rationale.

Tradeoffs / Risks:

- This document must be kept current or it will become stale.
- The plan is intentionally strict about UI changes, so some improvements may require explicit user approval before touching presentation code.

Verification:

- Documentation-only change.
