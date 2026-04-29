# File Review Notes

Muc tieu cua file nay:

- Ghi lai review tung file mot cach co cau truc
- Giu duoc buc tranh hien tai cua codebase khi project da lon dan
- Giup lan sau review tiep tung file ma khong phai doc lai tu dau
- Tap trung vao: file nay lam gi, state/variable nao quan trong, ham nao dung de lam gi, `useEffect` nao dang co, va layout JSX hien tai ra sao

Nguyen tac ghi:

- Moi lan chi review 1 file hoac 1 cum file nho
- Ghi trung tinh, dung hien trang
- Neu thay code mui / risk / cho can tach sau nay thi note ro
- Khong co gang review tat ca trong 1 lan

---

# Session Summary Template

Dung mau nay cho moi buoi lam viec tiep theo.
Khong can day du 100% moi muc, nhung nen giu format on dinh de de scan lich su.

```md
## Session YYYY-MM-DD

### 1. Focus cua buoi nay

- 

### 2. Da lam duoc

- 

### 3. File / concern da dong vao

- 

### 4. Van de gap phai

- 

### 5. Quyết dinh da chot

- 

### 6. Risk / dieu can de mat

- 

### 7. Verify da chay

- 

### 8. Viec tiep theo de xuat

- 
```

### Cach dung template

1. Moi buoi append 1 block moi
2. Ghi ngan, uu tien su that va quyet dinh
3. Neu co bug/perf/regression, ghi ro file lien quan
4. Neu co thay doi semantics, note lai ngay o muc "Quyet dinh da chot"

---

## 2026-04-24 - Review 01

### File

`src/features/editor/components/timeline/index.tsx`

### Vai tro cua file

Day la file hub cua Timeline UI. No dang giai quyet cung luc nhieu viec:

1. Render khung Timeline tong
2. Noi toolbar, ruler, track headers, timeline body, playhead viewport layer
3. Tinh toan lane layout va clip layout
4. Dieu phoi drag/drop clip bang `dnd-kit`
5. Tao `drop preview` cho clip va lane-insert
6. Handle scroll sync vao store
7. Handle resize panel Timeline
8. Nghe shortcut xoa clip va boundary-scroll event

Noi ngan gon: file nay dang dong vai tro `container/orchestrator` cua Timeline.

### Dependency chinh

- UI:
  - `TimelineToolbar`
  - `TimelineRuler`
  - `TimelineBody`
  - `TimelineItem`
  - `TimelineTrackHeaders`
  - `TimelinePlayheadViewportLayer`
- Logic/layout:
  - `buildTrackLaneLayouts`
  - `buildClipLayouts`
  - `computeTimelineZoom`
  - `frameToPx`
  - `getEditorPlaybackDurationInFrames`
- DnD:
  - `DndContext`
  - `PointerSensor`
- Store:
  - `useEditorStore`

### Cac constant hien tai

- `TIMELINE_MIN_PANEL_HEIGHT = 220`
  - min panel height khi resize Timeline
- `PREVIEW_MIN_PANEL_HEIGHT = 140`
  - min phan Preview con lai khi Timeline dang duoc resize
- `LANE_INSERT_PREVIEW_HEIGHT = 3`
  - do day thanh xanh khi drag chen giua 2 lane
- `LANE_INSERT_SNAP_THRESHOLD = 8`
  - khoang cach Y de coi la dang snap vao boundary giua 2 lane

### Type local trong file

#### `ClipDropPreview`

Dung de mo ta ghost/drop preview trong luc drag clip.

Field:

- `clipId`: clip dang drag
- `from`: frame se dat clip neu drop
- `left`, `top`, `width`, `height`: thong so layout de render preview
- `trackId?`: lane dich hien tai
- `createTrackPlacement?`: tao lane moi o `above`/`below`
- `relativeTrackId?`: lane tham chieu khi chen lane moi vao giua
- `previewKind?`: `"clip"` hoac `"lane-insert"`

#### `TimelineBoundaryScrollEvent`

Custom event cho toolbar:

- `"start"` => scroll ve dau
- `"end"` => scroll ve cuoi

### Ref va state local

#### Refs

- `scrollViewportRef`
  - tro vao container scroll chinh cua Timeline
  - dung cho:
    - doc `scrollLeft/scrollTop`
    - scroll ve boundary
    - tinh scrollbar height

- `timelineContentRef`
  - tro vao vung content ben phai track headers
  - dung cho ruler/playhead scrub mapping clientX -> frame

- `timelineRootRef`
  - tro vao root cua Timeline
  - dung de lay height that luc bat dau resize panel

- `timelineScrollRafRef`
  - dung de throttle `setTimelineScroll(...)` bang `requestAnimationFrame`
  - tranh spam store moi pixel scroll

#### State local

- `horizontalScrollbarHeight`
  - do day scrollbar ngang
  - dung de layer playhead khong de len scrollbar

- `clipDropPreview`
  - object preview khi dang drag clip

- `draggingClipId`
  - clip nao dang drag, dung de render ghost va mo rong body khi can

### Store data dang lay

- `project`
- `selectedClipIds`
- `setSelectedClipIds`
- `moveClip`
- `seekToFrame`
- `deleteSelectedClips`
- `setTimelineScroll`
- `setTimelinePanelHeight`
- `zoomValue`

### Derived variable quan trong

- `tracks = project.tracks`
- `clips = project.clips`
- `fps = project.video.fps`
- `durationInFrames = project.video.durationInFrames`
- `playbackDurationInFrames = getEditorPlaybackDurationInFrames(project)`

#### `sensors`

`dnd-kit` pointer sensor voi:

- `activationConstraint.distance = 4`

Tuc la phai di chuot mot it moi coi la drag, tranh click bi nham thanh drag.

#### `zoomComputed`

Ket qua tu `computeTimelineZoom(...)`.

Thuc te file nay dang phu thuoc manh vao:

- `zoomComputed.pixelsPerFrame`
- `zoomComputed.visibleDurationInFrames`
- `zoomComputed.tickFrames`
- `zoomComputed.timelineWidth`

#### `laneResult`

`useMemo(buildTrackLaneLayouts(tracks, clips))`

Day la source layout cho:

- header rows
- lane top/height
- total body height

#### `clipLayouts`

`useMemo(buildClipLayouts(...))`

Day la source layout cho:

- vi tri clip trong body
- width clip
- height clip
- lock/mute/hide state per layout

### Ham local quan trong

#### `getClipDropPreview(clipId, delta)`

Day la ham local phuc tap nhat trong file.

Nhiem vu:

1. Tim clip dang drag
2. Tim layout hien tai cua clip
3. Tinh `requestedFrom` theo `delta.x`
4. Tinh `targetLaneCenterY` theo `delta.y`
5. Quyết định 1 trong 4 tinh huong:

- ra khoi top stack => tao lane moi `above`
- ra khoi bottom stack => tao lane moi `below`
- nam sat boundary giua 2 lane => hien `lane-insert` preview
- nam trong 1 lane => snap vao lane do

Ham con ben trong:

##### `getNextVisibleFrom(trackId, requestedFrom)`

Dung de day clip ve phia truoc neu bi overlap trong cung lane.

Logic:

- kiem tra overlap
- neu overlap thi nhay `nextFrom = overlappingClip.from + overlappingClip.durationInFrames`
- lap lai toi khi het overlap

Day la ly do drop vao giua clip khac nhung trong cung lane thi clip se ra sau clip do, khong overlap.

#### `handleClipDragStart`

- set `draggingClipId`
- clear ghost cu
- set selection clip dang drag

#### `handleClipDragMove`

- moi lan drag move => update `clipDropPreview`

#### `handleClipDragEnd`

- tinh lai `dropPreview`
- clear dragging state
- bo qua neu khong co preview
- bo qua neu drop khong doi vi tri/lane
- goi `moveClip(...)` xuong store

#### `handleClipDragCancel`

- clear drag state

#### `handleTimelineResizeStart`

Handle resize panel Timeline bang pointer.

Buoc:

1. chan default + stopPropagation
2. lay `timelineRoot` + `gridContainer`
3. lay `startPointerY`
4. lay `startPanelHeight` tu DOM height that cua Timeline
5. tinh `maxPanelHeight`
6. tren `pointermove`:
   - `deltaY = startPointerY - moveEvent.clientY`
   - `nextPanelHeight = clamp(startPanelHeight + deltaY)`
   - goi `setTimelinePanelHeight(nextPanelHeight)`
7. cleanup event listener khi `pointerup/pointercancel`

### Cac `useEffect` / `useLayoutEffect`

#### Effect 1 - boundary scroll listener

Lang nghe:

- `editor:timeline-scroll-to-boundary`

Dung cho toolbar:

- skip back => ve dau
- skip forward => ve cuoi

Tac dung:

- scroll container ve start/end theo `scrollWidth - clientWidth`

#### Effect 2 - delete/backspace shortcut

Lang nghe `keydown` toan cuc.

Neu target dang la:

- `contentEditable`
- `INPUT`
- `TEXTAREA`
- `SELECT`

thi bo qua.

Neu la `Delete` hoac `Backspace`:

- `preventDefault()`
- goi `deleteSelectedClips()`

#### Effect 3 - clear stale drop preview

Lang nghe:

- `pointerup`
- `pointercancel`
- `blur`

Dung de clear ghost trong cac case browser cancel pointer ngoai DnD surface.

#### Effect 4 - cleanup `timelineScrollRafRef`

Unmount thi cancel RAF neu con pending.

#### LayoutEffect 5 - sync scrollbar height

Dung `ResizeObserver` + `window.resize`.

Nhiem vu:

- do `viewport.offsetHeight - viewport.clientHeight`
- set vao `horizontalScrollbarHeight`

Tac dung:

- playhead viewport layer tru di phan scrollbar o day

### JSX / HTML structure hien tai

#### Root

```tsx
<div ref={timelineRootRef} className='w-full max-h-full h-full flex flex-col'>
```

Timeline dang bi ep full height theo panel cha.

#### Toolbar

```tsx
<TimelineToolbar />
```

#### Resize handle

```tsx
<div className='absolute w-full ...' onPointerDown={handleTimelineResizeStart} />
```

Day la diem bat dau resize panel.

#### Outer panel

```tsx
<div className='flex-1 w-full h-full shrink-0 overflow-hidden border'>
```

Phan khung bao timeline body.

#### Scroll viewport

```tsx
<div
  ref={scrollViewportRef}
  className='flex h-full w-full overflow-x-scroll overflow-y-scroll'
  onScroll={...}
>
```

Day la vung scroll chinh.

#### Track headers

```tsx
<div className='sticky left-0 ... z-30 min-w-28 bg-white'>
  <TimelineTrackHeaders ... />
</div>
```

Cot trai sticky.

#### Track corner

```tsx
<div className='absolute top-0 left-0 h-7 z-30 bg-gray-300' />
```

O vuong tren cung ben trai, che goc giao nhau giua header cot va ruler.

#### Timeline content

```tsx
<div className='relative h-full w-full' ref={timelineContentRef}>
```

Vung content ben phai.

#### Ruler

```tsx
<TimelineRuler ... onSeekFrame={seekToFrame} />
```

#### Dnd body

```tsx
<DndContext ...>
  <TimelineBody ...>
    {dropPreview}
    {clipLayouts.map(...TimelineItem)}
  </TimelineBody>
</DndContext>
```

#### Playhead overlay

```tsx
<div
  className='pointer-events-none absolute top-0 right-0 bottom-0 z-20 overflow-hidden'
  style={{ left: TRACK_HEADER_WIDTH, bottom: horizontalScrollbarHeight }}
>
  <TimelinePlayheadViewportLayer ... />
</div>
```

Luu y:

- day la viewport overlay
- khong de len track headers
- khong de xuong phan scrollbar ngang

### Hien trang behavior cua file

File nay hien dang support:

- click clip => select
- drag clip giua lane
- drag clip len tren / xuong duoi => tao lane moi
- drag clip vao giua 2 lane => hien lane insert preview va chen lane moi
- ruler seek
- playhead layer tach rieng
- toolbar boundary scroll
- delete selected clips bang keyboard
- resize panel Timeline

### Code smell / diem can de y sau nay

1. `index.tsx` dang qua nhieu trach nhiem
   - drag/drop logic
   - panel resize
   - scroll sync
   - boundary event
   - keyboard delete
   - layout compose

   Ve sau nen tach them:
   - `useTimelineDropPreview`
   - `useTimelinePanelResize`
   - `useTimelineKeyboardShortcuts`
   - `useTimelineScrollSync`

2. `getClipDropPreview(...)` dang rat day logic va la diem de phat sinh bug
   - chen lane
   - snap vao lane
   - overlap walk-forward
   - top/bottom create lane

   Ve sau nen tach thanh cac ham nho hon.

3. File dang phu thuoc rat manh vao `project` full object
   - co the chap nhan duoc hien tai
   - nhung neu clip/lane lon hon nua thi can can nhac selector hep hon

4. `Timeline` van la mot file “central brain”
   - tot cho giai doan hien tai
   - nhung khi them resize clip, snapping, waveforms, thumbnails, multi-select thi se rat de phinh tiep

### Ket luan file nay

`timeline/index.tsx` la file quan trong nhat cua Timeline hien tai.

No dang lam tot vai tro container, nhung cung la file co nguy co phinh logic nhanh nhat.

Neu tiep tuc phat trien Timeline:

- can giu no sach bang cach tach hook/helper theo concern
- uu tien tach phan drop-preview va panel-resize truoc
- khong nen de them nhieu logic media/text transform nua vao file nay

---

## Review tiep theo de xuat

Lan sau nen review 1 trong 3 file nay:

1. `src/features/editor/components/preview/components/preview-text-overlay.tsx`
2. `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`
3. `src/features/editor/stores/editor.store.ts`

Neu muon review de phuc vu maintain nhanh nhat, uu tien:

`preview-text-overlay.tsx`

vi day la file vua co state editing, selection, move, resize va de sinh bug nhat trong cum Text.

---

## 2026-04-24 - Review 02

### File

`src/features/editor/components/preview/components/preview-text-overlay.tsx`

### Vai tro cua file

File nay la lop editor overlay cho Text tren Preview.

No khong render text chinh cua composition. Text chinh van do `EditorPreviewComposition` render.
File nay chi phu trach:

1. Tim cac `TextClip` dang visible o frame hien tai
2. Ve overlay interactive ben tren Player
3. Select / focus text clip
4. Double click de vao edit mode
5. Nhap text truc tiep qua `contentEditable`
6. Move text tren canvas
7. Resize text tu 4 goc
8. Clear selection khi click ra ngoai

No la cau noi giua:

- `project.clips`
- `runtime.selection`
- `runtime.textEditing`
- `updateClipTransform`
- `updateTextDraft`

### Dependency chinh

- `useEditorStore`
- type `TextClip`
- React hooks:
  - `useEffect`
  - `useMemo`
  - `useRef`
  - `useState`

### Type va constant trong file

#### `PreviewTextOverlayProps`

Thong tin viewport:

- `compositionWidth`
- `compositionHeight`
- `renderedWidth`
- `renderedHeight`

Dung de doi coordinate tu composition sang viewport that dang hien.

#### `ResizeHandle`

Union:

- `"top-left"`
- `"top-right"`
- `"bottom-left"`
- `"bottom-right"`

#### `TEXT_RESIZE_HANDLE_SIZE = 8`

Do lon handle resize 4 goc.

#### `MIN_TEXT_RENDER_SIZE = 24`

Nguong min de resize text khong bi qua nho.

#### `RESIZE_HANDLE_CONFIG`

Bang config cho moi goc:

- `cursor`
- `horizontalDirection`
- `verticalDirection`
- `className`

Day la diem tot cua file nay:

- no tách duoc phan “geometry behavior” ra khoi JSX
- them goc resize moi sau nay se don gian hon

### Ham helper

#### `isTextVisibleAtFrame(clip, frame)`

Kiem tra Text clip co dang xuat hien o `frame` hien tai hay khong.

#### `getTextOverlayStyle(...)`

Ham sinh `CSSProperties` cho overlay text.

No dang gom ca 2 mode:

- selected/display
- editing

Thong tin layout quan trong:

- `left = transform.x * scaleX`
- `top = transform.y * scaleY`
- `transform = translate(-50%, -50%) rotate(...) scale(...)`

Luu y:

- file nay dang scale bang `transform.scaleX/scaleY`
- khong dung `width/height` cho overlay container
- text resize hien tai thuc chat dang doi `scaleX/scaleY`

#### `getTextTransform(clip)`

Tra ve `clip.transform` neu co, neu khong thi fallback mot object default.

Muc dich:

- tranh lap fallback transform nhieu noi

### Hook local

#### `useTextMove(clip, scaleX, scaleY)`

Muc dich:

- handle drag move text tren preview

State noi bo:

- `dragStartRef`
  - `pointerX`
  - `pointerY`
  - `clipX`
  - `clipY`

Ham trong hook:

- `startMove(event)`
  - set pointer capture
  - luu vi tri pointer va vi tri clip luc bat dau

- `moveText(event)`
  - tinh `nextX`, `nextY` theo delta pointer / scale
  - goi `updateClipTransform`

- `stopMove()`
  - clear ref

Nhan xet:

- hook nay gon
- ro trach nhiem
- co the tai su dung cho media sau nay neu tong quat hoa them

#### `useTextResize(...)`

Muc dich:

- resize text tu 4 goc

State noi bo:

- `resizeStartRef`
  - `handle`
  - `pointerX/pointerY`
  - `clipX/clipY`
  - `scaleX/scaleY`
  - `width/height`

Ham trong hook:

- `startResize(handle)`
  - dong vai tro factory function
  - moi goc tra ve 1 pointer handler rieng
  - luu snapshot resize ban dau

- `resizeText(event)`
  - lay config cua handle
  - tinh delta X/Y theo chieu resize cua tung goc
  - tinh `nextRenderedWidth/Height`
  - tinh delta kich thuoc moi
  - update:
    - `x`
    - `y`
    - `scaleX`
    - `scaleY`

- `stopResize()`
  - clear ref

Nhan xet:

- logic hien tai la “resize bang scale”
- vi the no khong can width/height explicit cho text layer
- day la lua chon hop ly o giai doan nay

Rui ro:

- vi overlay dang do size bang DOM rect, resize text co the bi anh huong boi line break / font metrics
- sau nay neu co text box thuc su (`width`, `height`, wrapping`) thi logic nay se can xem lai

### Component local

#### `TextDisplayLayer`

Vai tro:

- render text overlay o display mode
- render selection box va resize handles
- handle click/select
- handle move
- handle double click vao edit mode

Ref/state:

- `rootRef`
- `measuredSize`

Store action dung:

- `setSelectedClipIds`
- `startTextEditing`

Hook dung:

- `useTextMove`
- `useTextResize`

`useEffect` trong component:

- do `measuredSize` bang `ResizeObserver`
- theo doi:
  - `clip.text`
  - `isSelected`

JSX quan trong:

- root `div` co `data-editor-focus-target='preview-text'`
- ben trong co:
  - `<span>{clip.text}</span>`
  - 4 handle resize
  - size label

Behavior:

- `onPointerDown` => select + start move
- `onPointerMove` => move
- `onPointerUp/Cancel/LostPointerCapture` => stop move
- `onClick` => select
- `onDoubleClick` => start text editing

Luu y:

- handle resize la `span` absolute trong root
- no co pointer event rieng de khong bi lan voi move

#### `TextEditLayer`

Vai tro:

- render text khi dang edit
- quan ly `contentEditable`
- sync text typing vao store

Store action dung:

- `updateTextDraft`
- `stopTextEditing`

`useEffect`:

- focus vao element
- set `textContent = clip.text`
- select toan bo noi dung

Dependency:

- `[clip.id, clip.text]`

Behavior:

- `onInput` => cap nhat draft/store
- `onBlur` => stop edit
- `onKeyDown(Escape)` => blur de thoat edit
- `onPointerDown/onClick` => stopPropagation

Diem rat quan trong:

- File nay da tach `TextEditLayer` va `TextDisplayLayer` thanh 2 nhanh DOM rieng
- day la sua doi dung de tranh loi `removeChild` da gap truoc do

### Component chinh

#### `PreviewTextOverlay`

Vai tro:

- lay project/runtime state can thiet
- loc text clips dang visible
- dong / cleanup edit state neu clip edit khong con visible
- clear selection/edit khi click ngoai
- render `TextEditLayer` hoac `TextDisplayLayer`

Store data dang dung:

- `project`
- `runtime.player.currentFrame`
- `runtime.selection.selectedClipIds`
- `runtime.textEditing`
- `clearSelection`
- `stopTextEditing`

#### `visibleTextClips`

`useMemo` loc tu `project.clips`.

Dieu kien:

- `clip.type === "text"`
- `!clip.isHidden`
- `!track?.isHidden`
- visible o frame hien tai

Day la source chinh cua overlay render.

#### Effect 1 - stop editing neu clip khong con visible

Neu:

- dang edit
- nhung `editingClipId` khong con xuat hien trong `visibleTextClips`

thi:

- `stopTextEditing()`

Case duoc cover:

- seek sang frame khac
- hide track
- hide clip
- clip bi xoa

#### Effect 2 - click outside de clear selection/edit

Dang nghe `document.pointerdown`.

Neu target:

- khong phai `HTMLElement` => bo qua
- co `closest("[data-editor-focus-target]")` => bo qua

Con lai:

- `clearSelection()`
- `stopTextEditing()`

Day la global focus policy cua Text hien tai.

### JSX structure tong

```tsx
<div className='pointer-events-none absolute inset-0 z-20'>
  {visibleTextClips.map(...)}
</div>
```

Moi text clip:

- neu dang edit => `TextEditLayer`
- neu khong => `TextDisplayLayer`

### Hien trang behavior cua file

File nay hien dang support:

- text visible theo frame
- text respect `clip.isHidden`
- text respect `track.isHidden`
- click text => select
- click clip timeline => selection sync sang preview qua store
- double click => edit
- typing => update text vao store
- click outside => clear selection/edit
- drag move text
- resize tu 4 goc
- stop edit neu clip khong con visible

### Diem manh hien tai

1. Da tach display/edit DOM
   - giam bug voi `contentEditable`

2. Move va resize da duoc tach thanh hook local
   - de doc hon
   - de tai su dung hon

3. Focus policy da ro rang hon
   - nhin qua `data-editor-focus-target`
   - khong can giong selector tay tung noi

### Code smell / risk / diem can de y

1. `getTextOverlayStyle` dang kiem qua nhieu trach nhiem
   - position
   - visual state
   - text typography
   - edit/display differences

   Ve sau co the tach:
   - `getTextBaseStyle`
   - `getTextEditStyle`
   - `getTextSelectedStyle`

2. `TextDisplayLayer` dang vua:
   - do size
   - move
   - resize
   - select
   - start edit

   Hien tai van chap nhan duoc, nhung no se la diem de phinh khi them:
   - rotate handle
   - aspect lock
   - keyboard nudge
   - multi-select

3. Resize hien tai dua vao `getBoundingClientRect`
   - hop ly cho giai doan nay
   - nhung phu thuoc vao rendered DOM thuc te
   - sau nay neu text box co width/height explicit thi can doi model

4. Global `document.pointerdown` cho clear focus
   - don gian va hieu qua
   - nhung sau nay khi app co them inspector/form/floating menu/context menu thi selector `data-editor-focus-target` can duoc quan ly ky

5. File nay dang chua co keyboard support cho selection/resize
   - chua la loi
   - nhung can note neu muon lam editor manh hon sau nay

### Ket luan file nay

`preview-text-overlay.tsx` la file interactive quan trong nhat cua Text editor tren Preview.

No dang giai quyet tot mot vertical slice:

- select
- edit
- move
- resize
- clear focus

Day la file co nhieu nguy co bug nho ve DOM interaction, `contentEditable`, pointer event, selection state.

Neu tiep tuc phat trien Text:

- giu file nay la layer editor-only
- khong de render logic composition that vao day
- uu tien tach them style helpers va interaction hooks neu logic tang them

---

## Thu tu review de xuat tiep theo

Theo hien trang hien nay, thu tu tiep theo hop ly:

1. `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`
2. `src/features/editor/stores/editor.store.ts`
3. `src/features/editor/compositions/editor-composition.tsx`

Ly do:

- `timeline-playhead-viewport-layer.tsx` dang la diem nhay cam nhat ve performance / sync / scrub
- `editor.store.ts` la source of truth va la noi nguy co sinh side effect logic cao nhat
- `editor-composition.tsx` la noi quyet dinh preview/export parity

---

## 2026-04-24 - Review 03

### File

`src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`

### File lien quan can doc kem

- `src/features/editor/components/timeline/components/playhead.tsx`
- `src/features/editor/lib/preview-seek.ts`

### Vai tro cua file

Day la layer dieu phoi Playhead trong Timeline theo kieu viewport overlay.

File nay khong tu render toan Timeline. No chi giai quyet cum chuc nang xoay quanh Playhead:

1. Ve Playhead trong viewport layer
2. Tinh vi tri Playhead theo `currentFrame`
3. Bu `scrollLeft` de Playhead dung theo viewport thay vi content
4. Drag/scrub Playhead
5. Sync scrub sang Preview ngay lap tuc
6. Sync scrub sang store theo nhip throttle
7. Auto-scroll Timeline khi Playhead chay toi mep phai
8. Scroll ve dau/cuoi khi currentFrame dung o boundary

No la file “bridge” giua:

- store player state
- scroll viewport
- DOM transform cua Playhead
- Preview seek event

### Dependency chinh

- `Playhead`
- `useEditorStore`
- `frameToPx`
- `TIMELINE_GUTTER_X`
- `dispatchPreviewSeekFrame`

### Constant hien tai

#### `PLAYHEAD_PAGE_SCROLL_THRESHOLD = 2`

Khoang dem de xac dinh khi nao Playhead da cham sat mep phai viewport va can page-scroll.

#### `PLAYHEAD_SCRUB_STORE_SYNC_INTERVAL_MS = 33`

Nhip dong bo scrub vao store.

Gia tri nay tuong duong khoang 30fps.

Y nghia:

- Preview co the seek nhanh hon qua RAF event
- store khong bi cap nhat qua day luc scrub

### Props cua component

#### `scrollViewportRef`

Tro vao container scroll chinh cua Timeline.

Dung de:

- doc `scrollLeft`
- add listener scroll
- auto-scroll khi play
- scroll ve dau/cuoi khi currentFrame o boundary

#### `timelineContentRef`

Tro vao content ben phai track headers.

Dung de:

- tinh `clientX -> frame` khi scrub Playhead

#### `pixelsPerFrame`

Ti le frame sang pixel hien tai cua Timeline.

#### `visibleDurationInFrames`

Dung truyen vao `Playhead` component de clamp frame.

#### `playbackDurationInFrames`

Duration end boundary that cua project/timeline.

Dung de clamp scrub va boundary scroll.

### Ref local

#### `playheadRef`

Tro vao DOM node goc cua Playhead.

File nay khong dua hoan toan vao React render de di chuyen Playhead.
No update `style.transform` truc tiep qua ref de giam re-render.

#### `scrubFrameRef`

Frame tam thoi khi dang drag scrub.

Dung de:

- luu frame hien tai cua scrub
- biet co dang scrub hay khong
- apply offset dung frame tam thoi

#### `scrollLeftRef`

Luu `scrollLeft` hien tai.

Dung de:

- bu offset viewport
- tranh phai dung `useState(scrollLeft)` va re-render lien tuc

#### `scrubSyncTimeoutRef`

Timeout pending cho lan sync store bi delay.

#### `scrubLastSyncedAtRef`

Moc thoi gian lan cuoi sync scrub vao store.

#### `scrubPreviewAnimationFrameRef`

RAF id cho preview seek event.

### Store data dang dung

- `currentFrame`
- `playbackStatus`
- `seekToFrame`
- `pause`

Nhan xet:

File nay subscribe hep, tot cho performance.
Nó khong dung ca object `runtime`, chi lay field can thiet.

### Ham local quan trong

#### `applyPlayheadOffset(frame)`

Nhiem vu:

- lay DOM node Playhead
- tinh `nextLeft = frameToPx(frame, pixelsPerFrame) - scrollLeftRef.current`
- set:
  ```ts
  playhead.style.transform = `translate3d(${nextLeft}px, 0, 0)`
  ```

Day la ham core cua file.

Toan bo behavior viewport-style Playhead dua tren ham nay.

#### `syncPreviewToScrubFrame()`

Nhiem vu:

- lay frame dang scrub tu `scrubFrameRef`
- dispatch custom event `editor:preview-seek-frame`

No khong seek Preview bang store.
No seek Preview truc tiep qua event.

Day la diem rat quan trong cua architecture hien tai.

#### `schedulePreviewScrubSync()`

Neu chua co RAF pending thi tao `requestAnimationFrame(syncPreviewToScrubFrame)`.

Muc dich:

- Preview seek theo nhip animation frame
- tranh dispatch event qua day moi pointer move

#### `syncStoreToScrubFrame(frame)`

Nhiem vu:

- sync frame dang scrub vao store theo throttle 33ms

Logic:

- neu da qua 33ms ke tu lan sync cuoi => `seekToFrame(frame)` ngay
- neu chua => dat timeout cho phan con lai

Muc dich:

- Preview cap nhat nhanh
- store cap nhat vua du
- giam load reactivity cua app khi scrub

#### `getFrameFromClientX(clientX)`

Map `clientX` thanh frame.

Buoc:

1. lay `rect` cua `timelineContentRef`
2. `timelineX = clientX - rect.left`
3. `frame = round((timelineX - TIMELINE_GUTTER_X) / pixelsPerFrame)`
4. clamp vao `[0, playbackDurationInFrames]`

#### `scrubToClientX(clientX)`

Day la ham scrub thuc te.

Buoc:

1. doi `clientX -> frame`
2. set `scrubFrameRef.current = frame`
3. tat transition cua Playhead
4. `applyPlayheadOffset(frame)`
5. schedule preview sync
6. sync store theo throttle

#### `handlePlayheadScrubStart`

- `preventDefault`
- `stopPropagation`
- neu dang play => `pause()`
- scrub ngay frame dau tien theo vi tri chuot

#### `handlePlayheadScrubMove`

- `preventDefault`
- `stopPropagation`
- scrub theo chuot

#### `handlePlayheadScrubEnd`

Buoc:

1. commit frame cuoi vao store qua `seekToFrame`
2. clear timeout pending
3. clear RAF pending
4. tra lai `transition` cho Playhead
5. reset scrub refs

### Cac `useEffect` / `useLayoutEffect`

#### Effect 1 - scroll listener tren viewport

Nhiem vu:

- nghe `scroll`
- cap nhat `scrollLeftRef.current`
- neu dang scrub => apply offset theo `scrubFrameRef`
- neu khong => apply offset theo `currentFrame`

Day la co che de Playhead khong can re-render theo scroll.

#### Effect 2 - dong bo Playhead theo `currentFrame`

Neu khong dang scrub:

- `applyPlayheadOffset(currentFrame)`

#### LayoutEffect 3 - apply offset som hon paint

No lap lai cung muc tieu voi Effect 2, nhung o phase `layout`.

Y do:

- giam flash/lẹch frame luc DOM sap paint

Nhan xet:

Co su trung lap voi Effect 2.
Khong nhat thiet la sai, nhung day la diem can de y.

#### Effect 4 - auto-scroll khi dang play

Dieu kien:

- `playbackStatus === "playing"`

Logic:

1. tinh `playheadX`
2. doi ra `playheadViewportX = playheadX - viewport.scrollLeft`
3. neu chua cham mep phai => bo qua
4. neu cham => scroll viewport sang phai

`targetScrollLeft` dang tinh:

```ts
playheadX - TIMELINE_GUTTER_X
```

No la logic “page-scroll” cho Timeline.

#### Effect 5 - scroll boundary khi khong playing

Dieu kien:

- khong playing
- khong dang scrub

Neu:

- `currentFrame <= 0` => scroll ve dau
- `currentFrame >= playbackDurationInFrames` => scroll ve cuoi

#### Effect 6 - cleanup timeout / RAF

Unmount thi:

- clear timeout scrub
- cancel RAF preview seek

### JSX structure

```tsx
<div className='pointer-events-none absolute inset-y-0 left-0 right-0 z-20 overflow-hidden'>
  <Playhead ... />
</div>
```

File nay khong render nhieu.

Nó chu yeu la wrapper logic cho:

- `Playhead`

#### Props truyen xuong `Playhead`

- `ref={playheadRef}`
- `currentFrame`
- `durationInFrames={visibleDurationInFrames}`
- `pixelsPerFrame`
- `leftOffset={frameToPx(currentFrame, pixelsPerFrame)}`
- `isPlaying`
- `onScrubStart`
- `onScrubMove`
- `onScrubEnd`

Luu y:

- `leftOffset` render-time o day chi la gia tri ban dau
- offset thuc te sau do duoc ham `applyPlayheadOffset(...)` ghi truc tiep vao DOM

### File lien quan 1 - `playhead.tsx`

Vai tro:

- component presentational cua Playhead
- co marker head SVG
- co body doc ve bang path SVG
- co pointer handler cho scrub

Logic chinh:

- tinh `left` tu `leftOffset` hoac `frameToPx(...)`
- set `transform: translate3d(...)`
- khi `isPlaying` thi them `transition: transform 40ms linear`

Note:

- body doc cua Playhead hien tai van la SVG path hard-code
- day la ly do ve sau da co discussion ve “Playhead chua full height”

### File lien quan 2 - `preview-seek.ts`

Rat nho, chi co:

- type `PreviewSeekEvent`
- `dispatchPreviewSeekFrame(frame)`

Nhung file nay quan trong vi no chot contract event giua Timeline scrub va Preview Player.

### Hien trang behavior cua file

File nay hien dang support:

- Playhead viewport overlay
- scrub Playhead
- pause khi scrub trong luc playing
- Preview update nhanh khi scrub
- store update theo throttle khi scrub
- auto-scroll Timeline khi play toi mep phai
- boundary scroll khi frame o dau/cuoi
- giam re-render bang DOM transform imperatively

### Diem manh hien tai

1. Selector store hep
   - tot cho performance

2. Dung ref + DOM transform cho Playhead
   - tranh re-render ca Timeline tree

3. Preview seek va store seek tach 2 toc do
   - Preview nhanh theo RAF
   - store cham hon theo throttle

4. Logic scrub duoc gom vao mot file rieng
   - tot hon nhieu so voi de trong `timeline/index.tsx`

### Code smell / risk / diem can de y

1. Co su trung lap giua:
   - `useEffect(() => applyPlayheadOffset(currentFrame))`
   - `useLayoutEffect(() => applyPlayheadOffset(currentFrame))`

   Co the co ly do de tranh flicker, nhung day la diem nen re-check sau nay.

2. File dang mix 3 concern:
   - scrub input
   - viewport scroll sync
   - auto-scroll while playing

   Hien tai van on, nhung neu playhead behavior phuc tap hon thi co the tach tiep:
   - `usePlayheadScrub`
   - `usePlayheadViewportOffset`
   - `usePlayheadAutoScroll`

3. `leftOffset` o prop `Playhead` va DOM imperative update dang cung ton tai
   - architecture nay chay duoc
   - nhung nguoi moi vao doc se hoi “gia tri nao la source of truth?”
   - can note ky trong review, vi rat de gay nham

4. Auto-scroll logic hien tai la dang “page jump”
   - khi cham mep phai thi scroll den target ngay
   - neu sau nay can visual mem hon, day la diem can lam tiep

5. `Playhead` dang con phu thuoc vao SVG path hard-code cho than doc
   - khong phai loi cua file nay
   - nhung la risk cua cum playhead

### Ket luan file nay

`timeline-playhead-viewport-layer.tsx` la file performance-sensitive nhat cua cum Timeline.

No dang giai quyet dung bai toan:

- Playhead phai nhin muot
- Timeline khong duoc re-render qua nhieu
- Preview phai theo kip scrub

Architecture hien tai hop ly cho giai doan nay.

Neu phat trien tiep:

- nen giu file nay la “playhead coordination layer”
- khong nen nhet them logic unrelated vao day
- uu tien tach auto-scroll ra neu file tiep tuc phinh len

---

## Thu tu review de xuat tiep theo

Theo hien trang sau 3 file da review, thu tu hop ly tiep theo la:

1. `src/features/editor/stores/editor.store.ts`
2. `src/features/editor/compositions/editor-composition.tsx`
3. `src/features/editor/components/timeline/components/timeline-ruler.tsx`

Ly do:

- `editor.store.ts` la source of truth va anh huong lon nhat den maintainability
- `editor-composition.tsx` lien quan truc tiep den preview/export parity
- `timeline-ruler.tsx` nho hon, co the review sau khi da nam store va composition

---

## 2026-04-24 - Review 04

### File

`src/features/editor/stores/editor.store.ts`

### Muc do quan trong

Rat cao.

Day la **source of truth mutating layer** cua editor.

Neu xem `EditorState` la du lieu canh, thi file nay la noi quyet dinh:

- state nao duoc phep thay doi
- thay doi theo cach nao
- cac invariant nao dang duoc giu
- runtime va project phoi hop ra sao

No la file co anh huong lon nhat den:

- maintainability
- behavior consistency
- preview/timeline sync
- future export correctness

### Vai tro cua file

File nay co 2 lop chinh:

1. **Helper functions** o dau file  
   Dung de:
   - clamp
   - tinh duration
   - tao track
   - detect overlap
   - clean empty tracks
   - sync layer order
   - tao transform mac dinh

2. **Zustand store actions**  
   Gom cac nhom:
   - player
   - preview
   - timeline zoom
   - timeline viewport
   - timeline toolbar
   - selection
   - track controls
   - clip creation
   - clip move
   - text editing
   - delete
   - undo/redo stub

### Dependency chinh

- `zustand/create`
- `EditorStore` type
- `INITIAL_EDITOR_STATE`
- types:
  - `ClipTransform`
  - `EditorProject`
  - `MediaAsset`
  - `TimelineClip`
  - `TimelineTrack`
  - `TimelineTrackGroup`
  - `TrackMediaKind`
- `getEditorPlaybackDurationInFrames`

### Kieu architecture hien tai

File nay dang theo kieu:

- helper thuần
- sau do `create<EditorStore>((set, get) => ({ ...actions }))`

No khong dung middleware phuc tap nhu:

- immer
- slices
- devtools-specific logic trong file
- command pattern

Hien tai architecture nay van hop ly cho giai doan nay, nhung file da bat dau dai va dang cho thay dau hieu can tach slice sau nay.

---

## A. Helper functions o dau file

### 1. `clamp(value, min, max)`

Helper co ban.

Dung de clamp:

- frame
- zoom level
- cac gia tri co gioi han

### 2. `clampFrame(frame, durationInFrames)`

Muc dich:

- clamp current frame theo duration editor hien tai

Behavior hien tai:

- neu `durationInFrames <= 0` => tra `0`
- nguoc lai => clamp trong `[0, durationInFrames]`

Luu y:

- file nay cho phep UI playhead dung o **end boundary**
- tuc la frame co the bang chinh `durationInFrames`
- day la chon lua dung de ruler/playhead khop voi diem ket thuc clip

### 3. `DEFAULT_TRACK_HEIGHT_BY_KIND`

Map kind -> lane height mac dinh:

- `text: 35`
- `shape: 35`
- `audio: 35`
- `video: 71`
- `image: 35`

Y nghia:

- khi tao track moi, no lay height tu day
- day la default project/store value, khong phai layout tinh dong theo clip

### 4. `CLIP_COLOR_BY_KIND`

Map kind -> mau clip.

Dung khi tao clip moi.

### 5. `getNextId(prefix)`

Tao id tam theo:

- `Date.now()`
- random suffix

Nhan xet:

- du dung local editor/session
- chua phai ID strategy on dinh cho collab / persistence / BE-generated IDs

### 6. `getProjectDurationInFrames(clips)`

Tinh duration project dua tren clip end lon nhat.

Logic:

- empty clips => `0`
- nguoc lai => `max(clip.from + clip.durationInFrames)`
- ensure min `1` neu co clip

Day la helper cuc ky quan trong.

No duoc dung rat nhieu o:

- add clip
- move clip
- delete clip
- update player clamp

### 7. `getTrackLabel(kind)`

Map kind -> label UI.

### 8. `getGroupLabel(kind)`

Map kind -> group label:

- `text` => `Text`
- `shape` => `Overlays`
- media kinds => `Media`

### 9. `getCompatibleGroup(trackGroups, kind)`

Muc dich:

- tim group phu hop de gan track moi vao

Logic:

1. uu tien group co `group.kind === kind`
2. neu kind la `video/audio/image` thi fallback vao group co `label === "Media"`
3. neu khong co thi `null`

Nhan xet:

- day la logic grouping mang tinh UX/organization
- co phan “heuristic” vi media group dang dung label string `"Media"`
- ve sau nen can nhac dung semantic key chac hon label text

### 10. `ensureTrackForKind(project, kind)`

Muc dich:

- tao **mot top lane moi** cho clip moi cua `kind`

Behavior:

1. tim group phu hop
2. tao `groupId` va `trackId` neu can
3. shift toan bo `project.tracks` xuong 1 bac (`index + 1`)
4. tao `nextTrack` voi `index = 0`
5. cap nhat `trackGroups`
6. return:
   - `trackId`
   - `tracks`
   - `trackGroups`

Y nghia kien truc:

- them clip moi => tao lane moi tren cung
- layer stacking cua preview ve sau se dua theo thu tu lane

Day la helper define mot luat UX rat quan trong cua editor hien tai.

### 11. `createTrackForMovedClip(project, kind, placement, relativeTrackId?)`

Muc dich:

- tao lane moi khi drag/drop clip ra ngoai lane hien co
- support 3 kieu:
  - chen top
  - chen bottom
  - chen vao giua theo `relativeTrackId`

Behavior chi tiet:

1. tim `existingGroup`
2. tao `trackId`
3. sort tracks theo index
4. tim `relativeTrack` neu co
5. suy ra:
   - `insertAtTop`
   - `insertAtBottom`
   - `insertionIndex`
6. tao `nextTrack`
7. shift index cua cac track can thiet
8. cap nhat `trackGroups.trackIds`
9. return:
   - `trackId`
   - `tracks`
   - `trackGroups`

Day la helper phuc tap va rat quan trong cho DnD lane insertion.

Rui ro:

- logic group order va track order dang duoc cap nhat o cung mot cho
- de sai neu sau nay co reorder group / collapsed group / multi-group move

### 12. `getClipOverlapInTrack(...)`

Muc dich:

- tim clip overlap dau tien trong lane target

Input:

- `clips`
- `clipId`
- `trackId`
- `from`
- `durationInFrames`

Tra ve:

- clip overlap dau tien
- hoac `null`

### 13. `getNextNonOverlappingFrameInTrack(...)`

Muc dich:

- day clip toi frame hop le tiep theo neu drop vao noi dang overlap

Logic:

1. loc clip trong lane
2. sort theo `from`
3. neu lane rong => tra `requestedFrom`
4. lap:
   - tim overlap
   - neu co thi nhay toi cuoi overlap clip
   - lap lai den khi het overlap

Day la helper support luat:

- trong cung lane clip khong duoc de len nhau
- clip bi drop de se “di ra sau” clip dang chiem cho

### 14. `getCenteredTransform(project, width?, height?)`

Muc dich:

- tao transform mac dinh cho clip visual

Field:

- `x = project.video.width / 2`
- `y = project.video.height / 2`
- `scaleX = 1`
- `scaleY = 1`
- `rotation = 0`
- `opacity = 1`
- `width?`
- `height?`
- `anchorX = 0.5`
- `anchorY = 0.5`

Y nghia:

- clip moi duoc dat giua canvas
- co the co width/height cho image/video

### 15. `getVisualAssetSize(project)`

Hien tai:

- return full canvas width/height

Y nghia:

- image/video moi fill preview canvas mac dinh

### 16. `getMediaClipDuration(project, asset)`

Logic:

- image => `fps * 5`
- media co metadata duration => dung duration do
- fallback => `fps * 5`

### 17. `getNextLayerIndex(clips)`

Muc dich:

- tao `layerIndex` moi lon hon tat ca clip hien co

Hien tai:

- return `max(layerIndex) + 1`

### 18. `removeEmptyTracks(tracks, trackGroups, clips)`

Muc dich:

- xoa lane rong sau khi delete/move clip

Behavior:

1. tim `usedTrackIds`
2. loc tracks con clip
3. sort theo index
4. reindex lai lien tuc tu 0
5. cap nhat `trackGroups` bo trackIds da mat
6. bo luon group neu group khong con track

Day la helper cleanup rat quan trong.

### 19. `syncClipLayerIndexesWithTrackOrder(clips, tracks)`

Muc dich:

- dong bo `clip.layerIndex` theo thu tu lane hien tai

Logic:

1. sort tracks tu bottom -> top (`b.index - a.index`)
2. voi moi track:
   - loc clip trong track
   - sort clip theo `layerIndex`, roi `from`
3. gan lai `nextLayerIndex` lien tuc
4. map lai `clips`

Y nghia:

- Preview stacking phai giong Timeline stacking
- lane tren cung phai co clip layer cao hon lane duoi

Day la helper de giu invariant quan trong:

**track order -> preview render order**

---

## B. Store initialization

### `useEditorStore = create<EditorStore>((set, get) => ({ ... }))`

File nay merge:

- `...INITIAL_EDITOR_STATE`
- cac action custom

Luu y:

- state khong bi normalize sau create
- khong co middleware undo/redo
- khong co persistence middleware

---

## C. Player actions

### 1. `setCurrentFrame(frame)`

Behavior:

- lay duration tu project hien tai
- clamp frame
- update `runtime.player.currentFrame`

### 2. `setPlaybackStatus(status)`

Simple setter cho `runtime.player.status`

### 3. `play()`

Behavior:

- neu current frame dang o end boundary => reset ve `0`
- neu duration editor <= 0 => `status = "paused"`
- nguoc lai => `status = "playing"`

Day la chon lua dung:

- project rong khong duoc play
- o cuoi roi nhan play thi restart

### 4. `pause()`

Dat `status = "paused"`

### 5. `togglePlay()`

Behavior:

- neu dang khong play va frame dang o end boundary => reset ve `0`
- neu dang play hoac duration <= 0 => `paused`
- nguoc lai => `playing`

Nhan xet:

- logic co mot chut lap voi `play()`
- van chap nhan duoc, nhung sau nay co the tach helper `getNextPlaybackToggleState(...)`

### 6. `seekToFrame(frame)`

Behavior:

- clamp frame theo duration
- update current frame
- neu dang playing thi pause luon

Day la luat UX cua editor hien tai:

- seek/scrub la mot hanh dong pause

### 7. `seekByFrames(delta)`

Behavior:

- lay current frame hien tai
- cong delta
- clamp
- neu dang playing thi pause

### 8. `setMuted(muted)` / `toggleMuted()`

Chi dong vao:

- `runtime.player.isMuted`

### 9. `setPlaybackRate(rate)`

Chi dong vao:

- `runtime.player.playbackRate`

Nhan xet tong ve player actions:

- nhom nay kha gon
- khong dong vao Remotion truc tiep
- chi cap nhat source of truth

Day la diem tot.

---

## D. Preview actions

### 1. `setPreviewContainerSize`

Cap nhat:

- `runtime.preview.containerWidth`
- `runtime.preview.containerHeight`

### 2. `setPreviewZoom`

Cap nhat `runtime.preview.zoom`

### 3. `setPreviewMode`

Cap nhat `runtime.preview.mode`

### 4. `togglePreviewFullscreen`

Dao `runtime.preview.isFullscreen`

### 5. `setPreviewFullscreen`

Set explicit `isFullscreen`

Nhan xet:

- nhom nay la pure runtime UI state
- khong cham vao project data

---

## E. Timeline zoom / viewport / toolbar actions

### Timeline Zoom

#### `setTimelineZoomLevel(zoomLevel)`

- lay `minZoomLevel`, `maxZoomLevel`
- clamp
- update `runtime.timeline.zoom.zoomLevel`

#### `zoomTimelineIn()`

- lay zoom hien tai
- `zoomLevel + 1`
- clamp

#### `zoomTimelineOut()`

- `zoomLevel - 1`
- clamp

#### `setTimelinePixelsPerFrame(pixelsPerFrame)`

- set thang vao `runtime.timeline.zoom.pixelsPerFrame`

Note:

- project hien tai dang co ca `zoomLevel` va `pixelsPerFrame`
- can hieu quan he giua 2 cai nay o layer compute zoom ben ngoai store

### Timeline Viewport

#### `setTimelineViewportSize`

Cap nhat:

- `viewportWidth`
- `viewportHeight`

#### `setTimelinePanelHeight`

Cap nhat:

- `runtime.timeline.panelHeight = Math.max(220, Math.round(panelHeight))`

Note:

- day la noi lock minimum timeline height cua resize panel

#### `setTimelineScroll({ scrollLeft, scrollTop })`

Cap nhat tung phan:

- co the chi truyen `scrollLeft`
- hoac chi truyen `scrollTop`

Behavior:

- field nao khong co thi giu nguyen gia tri cu

### Timeline Toolbar

#### `toggleSnap`
#### `toggleLoop`
#### `toggleShowRuler`
#### `toggleShowWaveforms`
#### `toggleShowThumbnails`

Tat ca deu la pure toggles tren `runtime.timeline.toolbar`

Nhan xet tong:

- nhom timeline runtime state kha sach
- mutability pattern dong nhat

---

## F. Selection actions

### 1. `setSelectedClipIds(clipIds)`
### 2. `setSelectedTrackId(trackId)`
### 3. `setSelectedGroupId(groupId)`

Simple setters cho `runtime.selection`

### 4. `clearSelection()`

Reset:

- `selectedClipIds = []`
- `selectedTrackId = null`
- `selectedGroupId = null`

Luu y:

- action nay **khong dong vao `textEditing`**
- nen clear selection va stop edit la 2 action tach rieng

Day la lua chon hop ly vi selection va text-editing la 2 state khac nhau.

---

## G. Track control actions

### 1. `toggleTrackHidden(trackId)`

Tac dong:

- project.tracks: dao `isHidden`
- runtime.selection.selectedTrackId = trackId

### 2. `toggleTrackMuted(trackId)`

Tac dong:

- project.tracks: dao `isMuted`
- runtime.selection.selectedTrackId = trackId

Nhan xet:

- hide/mute la project data, khong phai runtime data
- day la chon dung vi no anh huong ket qua preview/export

---

## H. Clip creation actions

### 1. `addTextClipAtPlayhead(payload)`

Behavior chi tiet:

1. chot `text = payload?.text?.trim() || "Text"`
2. `ensureTrackForKind(project, "text")`
3. tao `clipId`
4. chot `durationInFrames`
   - default = `fps * 3`
5. tao `nextClip`
   - type `text`
   - `from = currentFrame`
   - `sourceStartFrame = 0`
   - `layerIndex = getNextLayerIndex(...)`
   - text style default
   - `transform = getCenteredTransform(project)`
6. push vao `clips`
7. recalc `project.video.durationInFrames`
8. runtime:
   - select clip moi
   - `textEditing` vao mode edit ngay

Day la action co UX kha tot:

- add text xong edit ngay

### 2. `addMediaAssetAsClip({ asset })`

Behavior chi tiet:

1. `ensureTrackForKind(project, asset.kind)`
2. tao `clipId`
3. tinh `durationInFrames` tu `getMediaClipDuration`
4. tao `baseClip`
5. tao `nextClip` theo `asset.kind`

#### Case audio

- type `audio`
- `src`
- `sourceDurationInFrames`
- `volume: 1`

#### Case video

- type `video`
- `src`
- `sourceDurationInFrames`
- `volume: 1`
- `transform = getCenteredTransform(...full canvas size...)`

#### Case image

- type `image`
- `src`
- `objectFit = "cover"`
- `transform = getCenteredTransform(...full canvas size...)`

Sau do:

- append asset vao `mediaAssets`
- append clip vao `clips`
- recalc duration
- select clip moi

Nhan xet:

- action nay dang tach ro audio vs visual
- du maintain duoc
- ve sau neu co shape/sticker/gif co the can them helper tao clip theo kind

---

## I. Clip move action

### `moveClip({ clipId, from, trackId, createTrackPlacement, relativeTrackId })`

Day la action phuc tap nhat trong file.

#### Muc dich

- move clip trong timeline
- move sang lane khac
- tao lane moi top/bottom
- chen lane moi giua 2 lane
- tranh overlap trong cung lane
- xoa lane rong sau khi move
- sync lai layerIndex
- recalc duration
- cap nhat selection

#### Flow chi tiet

1. tim clip
2. chan neu:
   - khong co clip
   - clip locked
3. tim currentTrack
4. chan neu:
   - khong co currentTrack
   - currentTrack locked
5. neu `createTrackPlacement` co:
   - goi `createTrackForMovedClip(...)`
6. xac dinh:
   - `projectTracks`
   - `projectTrackGroups`
   - `nextTrackId`
   - `nextTrack`
7. chan neu:
   - `nextTrack` khong ton tai
   - `nextTrack.isLocked`
8. `requestedFrom = round(from)`
9. kiem tra overlap trong lane target
10. neu overlap:
    - `getNextNonOverlappingFrameInTrack(...)`
11. map `movedClips`
12. `removeEmptyTracks(...)`
13. `syncClipLayerIndexesWithTrackOrder(...)`
14. recalc `durationInFrames`
15. clamp lai player current frame theo duration moi
16. update selection clip/lane

#### Invariant ma action nay dang giu

- khong move clip vao lane locked
- khong cho overlap trong cung lane
- lane rong bi xoa
- lane order = preview layer order
- currentFrame khong vuot qua duration moi

Nhan xet:

Day la action core nhat cua timeline editing hien tai.

Rui ro:

- da gom qua nhieu concern
- de tro thanh action kho maintain nhat cua store

Neu refactor sau nay, day la ung cu vien hang dau de tach:

- `resolveMoveTarget(...)`
- `resolveMoveOverlap(...)`
- `applyTrackCleanup(...)`
- `applyLayerSync(...)`

---

## J. Text editing actions

### 1. `updateClipTransform({ clipId, transform })`

Behavior:

- map qua toan bo clips
- neu clip id khop:
  - lay `baseTransform`
  - merge `...baseTransform, ...transform`

Hien tai action nay la generic cho moi clip co transform.

No dang duoc dung cho:

- move text
- resize text
- co the ve sau dung cho image/video/shape

### 2. `startTextEditing({ clipId, draftText })`

Cap nhat:

- `editingClipId`
- `draftText`
- `isEditing = true`

### 3. `updateTextDraft(draftText)`

Behavior:

1. map qua `project.clips`
2. chi update clip:
   - co `id === editingClipId`
   - type `text`
3. update:
   - `text`
   - `label`
4. runtime:
   - cap nhat `draftText`

Note rat quan trong:

- typing text dang update thang vao `project`
- khong chi la local draft

Y nghia:

- preview / timeline / label sync ngay
- nhung cung co nghia la khong co “cancel edit de rollback”

### 4. `stopTextEditing()`

Reset:

- `editingClipId = null`
- `draftText = ""`
- `isEditing = false`

Nhan xet tong ve text editing:

- don gian, ro rang
- nhung “draft” hien tai thuc ra la live-committed text
- ten `draftText` co the gay nham mot chut ve semantics

---

## K. Delete / undo / redo

### 1. `splitSelectedClipAtPlayhead()`

Hien tai:

- `console.log(...)`
- chua implement

### 2. `deleteSelectedClips()`

Behavior:

1. lay `selectedClipIds`
2. neu rong => return state
3. loc bo selected clips
4. `removeEmptyTracks(...)`
5. recalc `durationInFrames`
6. tinh `currentFrame` moi
   - neu het clip => `0`
   - nguoc lai clamp theo playback duration moi
7. clear selection

Day la action delete tot va da xu ly cleanup dung muc.

### 3. `undo()` / `redo()`

Hien tai:

- stub
- `console.log(...)`

Day la khoang trong lon cua store hien tai.

---

## L. Pattern update state hien tai

File nay dang dung pattern:

- `set((state) => ({ ... }))`
- spread nested object thu cong

Vi du:

- `runtime -> player`
- `runtime -> timeline -> toolbar`
- `project -> tracks/clips/video`

Uu diem:

- ro rang
- khong phu thuoc middleware

Nhuoc diem:

- file dai
- rat nhieu boilerplate spread
- de sai khi nested sau hon nua

Neu project lon tiep, 2 huong co the can can nhac:

1. tach slice store
2. dung immer middleware

Hien tai chua bat buoc, nhung du da den muc nen bat dau can nhac.

---

## M. Invariant / luat ngam ma file nay dang giu

Day la phan cuc ky quan trong de maintain.

### Invariant 1

`project.video.durationInFrames` phai theo duration thuc cua clips.

No dang duoc recalc trong:

- add text
- add media
- move clip
- delete clips

### Invariant 2

`runtime.player.currentFrame` khong duoc vuot duration editor.

No dang duoc giu bang:

- `clampFrame`
- recalc currentFrame sau move/delete

### Invariant 3

Trong cung lane, clip khong duoc overlap.

No dang duoc giu bang:

- `getClipOverlapInTrack`
- `getNextNonOverlappingFrameInTrack`

### Invariant 4

Lane order tren Timeline phai giong layer order trong Preview.

No dang duoc giu bang:

- `syncClipLayerIndexesWithTrackOrder`

### Invariant 5

Track hide/mute la project state, khong phai runtime state.

Y nghia:

- preview/export co the dung chung

### Invariant 6

Them clip moi => tao lane moi tren cung.

No dang duoc giu bang:

- `ensureTrackForKind`

### Invariant 7

Move clip co the tao lane moi o top/bottom/giua.

No dang duoc giu bang:

- `createTrackForMovedClip`

---

## N. Diem manh cua file hien tai

1. Helper functions dau file rat gia tri
   - nhieu logic kho da duoc tach khoi action body

2. Runtime state va project state duoc phan biet kha ro

3. Cac action player / preview / toolbar kha clean

4. `moveClip` da handle kha nhieu case thuc te

5. `deleteSelectedClips` da cleanup dung:
   - clips
   - tracks
   - groups
   - currentFrame
   - selection

6. `updateClipTransform` du generic de tai dung cho cac clip visual ve sau

---

## O. Code smell / risk / diem can de y

### 1. File qua dai va qua nhieu trach nhiem

Hien tai file nay gom:

- pure helper
- player actions
- preview actions
- timeline runtime actions
- track actions
- clip creation
- clip move
- text editing
- delete logic

Day la file nen tach slice som nhat ve sau.

### 2. `moveClip` la action nguy hiem nhat ve maintainability

Ly do:

- lane creation
- overlap resolve
- empty track cleanup
- layer sync
- duration recalc
- player clamp
- selection update

Chi can them them resize clip / snap system / ripple edit la no se phinh nhanh.

### 3. `updateTextDraft` dang commit thang vao project

Ten `draftText` co the gay nham rang day la local draft.
Nhung thuc te:

- no la live source update

Neu sau nay can `cancel edit` phuc tap hon, phan nay se can doi model.

### 4. `getCompatibleGroup()` dang dua mot phan vao string label

`group.label === "Media"` la heuristic mong.

Ve sau nen co identifier semantic chac hon.

### 5. `getNextId()` la local-only id strategy

Hop voi giai doan nay.
Khong hop neu sau nay:

- collab
- sync server
- import/export roundtrip voi BE generated ids

### 6. Rat nhieu action dang map toan bo arrays

Vi du:

- `project.clips.map`
- `project.tracks.map`

Hien tai chap nhan duoc.
Ve sau neu project rat lon can can nhac normalization hoac selector tot hon.

### 7. Khong co transaction/history abstraction

Undo/redo dang la stub.

Khi implement sau nay, store nay se la noi de bi “vo” nhat neu khong chot strategy truoc.

---

## P. Goi y refactor ve sau

Neu muon nang chat maintainability cua file nay, thu tu tach hop ly:

1. Tach helper sang file rieng:
   - `editor-store.helpers.ts`
   - `editor-store.track-helpers.ts`
   - `editor-store.clip-helpers.ts`

2. Tach slices:
   - `playerSlice`
   - `previewSlice`
   - `timelineUiSlice`
   - `selectionSlice`
   - `trackSlice`
   - `clipSlice`
   - `textEditingSlice`

3. Tach `moveClip` thanh pipeline helper

4. Chot strategy undo/redo truoc khi them nhieu edit action nua

---

## Q. Ket luan file nay

`editor.store.ts` hien tai la trai tim cua editor.

No dang giu duoc kha nhieu invariant quan trong va hien tai van coherent.

Nhung day cung la file co nguy co tro thanh bottleneck maintainability lon nhat.

Neu tiep tuc phat trien:

- can coi day la file uu tien hang dau cho viec tach concern
- khong nen tiep tuc don them nhieu logic phuc tap vao cung action body neu khong tach helper
- dac biet can de y `moveClip`, `updateTextDraft`, va cac action sau nay lien quan den resize/split/trim

---

## Thu tu review de xuat tiep theo

Sau file store, thu tu hop ly tiep theo:

1. `src/features/editor/compositions/editor-composition.tsx`
2. `src/features/editor/components/timeline/components/timeline-ruler.tsx`
3. `src/features/editor/components/preview/index.tsx`

Ly do:

- `editor-composition.tsx` quyet dinh preview/export parity
- `timeline-ruler.tsx` quan trong cho seek/tick model
- `preview/index.tsx` la cau noi giua store va Remotion Player

---

## 2026-04-24 - Review 05

### File

`src/features/editor/compositions/editor-composition.tsx`

### File lien quan can doc kem

- `src/features/editor/lib/playback-duration.ts`

### Muc do quan trong

Rat cao.

Day la file quyet dinh:

- Preview dang render cai gi
- Thu tu stacking cua clip tren canvas
- Timing clip tren composition co dung voi timeline hay khong
- Sau nay export co ra giong preview hay khong

Neu `editor.store.ts` la source of truth ve state, thi file nay la source of truth ve **cach project duoc bien thanh khung hinh**.

### Vai tro cua file

File nay la Remotion composition chinh cua editor.

No nhan:

- `project`

va render ra:

- text
- video
- image
- audio

theo:

- frame hien tai cua Remotion
- track/layer order
- clip timing
- clip transform
- hide/mute state

### Dependency chinh

- Remotion:
  - `AbsoluteFill`
  - `Audio`
  - `Img`
  - `Sequence`
  - `useCurrentFrame`
  - `useVideoConfig`
  - `Video`
- Types:
  - `EditorProject`
  - `TimelineClip`
  - `TimelineTrack`
  - `TextClip`
  - `VideoClip`
  - `ImageClip`
  - `AudioClip`

### Kieu architecture hien tai

File nay dang co 3 lop:

1. helper functions o dau file
2. clip-layer components theo tung media type
3. composition root `EditorPreviewComposition`

Day la architecture hop ly cho giai doan hien tai.

No giup:

- helper timing/sorting tach khoi JSX root
- moi media type co component rieng
- root map clip -> layer mot cach ro rang

---

## A. Fallback project

### `fallbackProject`

Muc dich:

- dam bao composition van render duoc neu khong co `project` prop

No gom:

- 1 video config demo
- 1 text track
- 1 text clip

Nhan xet:

- tot cho safety / dev fallback
- tuy nhien ve sau neu app da dam bao luon truyen `project`, fallback co the tro thanh du thua hoac chi nen giu cho story/test

---

## B. Helper functions

### 1. `isClipVisibleAtFrame(clip, frame)`

Logic:

- visible neu `frame >= clip.from && frame < clip.from + clip.durationInFrames`

Day la rule co ban cua clip timing.

### 2. `getTrackIndexMap(tracks)`

Tao `Map(track.id -> track.index)`.

Dung cho sort render order.

### 3. `getClipLayerIndex(clip)`

Hien tai chi return:

- `clip.layerIndex`

Nhin co ve don gian, nhung no dong vai tro abstraction nho:

- neu ve sau layer order doi cach tinh, co the doi tai day truoc

### 4. `sortVisualClipsForRender(clips, tracks)`

Day la helper rat quan trong.

Thu tu sort hien tai:

1. `clip.layerIndex`
2. `track.index`
3. `clip.from`

Y nghia:

- layerIndex la uu tien chinh cho stacking
- neu layerIndex bang nhau thi fallback theo track index
- neu track cung bang nhau thi fallback theo frame bat dau

Day la helper dong bo voi invariant tu store:

- `syncClipLayerIndexesWithTrackOrder(...)`

Nen:

- Timeline lane order
- Preview render order

dang duoc noi voi nhau qua combination:

- store helper
- composition helper nay

### 5. `getClipLocalFrame(clip, frame)`

Tra ve:

- `frame - clip.from`

Dung de clip-layer biet frame local cua minh.

### 6. `getBasicClipTransitionStyle(clip, localFrame, fps)`

Hien tai la stub transition.

Dang return:

- `opacity: 1`
- `translateY: 0`
- `scale: 1`

Y nghia:

- architecture da mo san cho animation/effect sau nay
- hien tai chua co transition that

Nhan xet:

- ten ham hop ly
- nhung no hien tai dang “fake abstraction”
- khi chua co animation system, van chap nhan duoc

---

## C. Clip layer components

### 1. `TextClipLayer`

#### Vai tro

Render text clip trong composition that.

#### Dau vao

- `clip`
- `frame`
- `trackOrder`

#### Logic

1. lay `fps` tu `useVideoConfig`
2. tinh `localFrame`
3. lay `transition`
4. lay `transform`
5. render `div` absolute

#### Style quan trong

- `left = transform.x`
- `top = transform.y`
- transform:
  - `translate(-50%, -50%)`
  - `translateY(...)`
  - `rotate(...)`
  - `scale(...)`
- `opacity = transform.opacity * transition.opacity`
- `zIndex = trackOrder`

#### Typography

No pass thang kha nhieu field tu `clip.style`:

- `textAlign`
- `color`
- `backgroundColor`
- `fontFamily`
- `fontSize`
- `fontWeight`
- `fontStyle`
- `lineHeight`
- `letterSpacing`
- `textDecoration`
- `textTransform`

Nhan xet:

- `TextClipLayer` dang kha day du cho text visual
- phan edit UI khong nam trong file nay, do la dung

### 2. `VideoClipLayer`

#### Vai tro

Render video clip visual.

#### Dau vao

- `clip`
- `frame`
- `trackOrder`
- `isTrackMuted`

#### Logic

1. tinh `localFrame`
2. lay `transition`
3. lay `transform`
4. render wrapper `div`
5. render `Video`

#### Remotion `Video` props quan trong

- `src={clip.src}`
- `startFrom={clip.sourceStartFrame}`
- `endAt={clip.sourceStartFrame + clip.durationInFrames}`
- `volume={clip.isMuted || isTrackMuted ? 0 : clip.volume}`
- `playbackRate={clip.playbackRate ?? 1}`

#### Style quan trong

- wrapper dung `anchorX/anchorY`
- `width = transform.width`
- `height = transform.height`
- inner video `objectFit: "cover"`

Nhan xet rat quan trong:

- `startFrom/endAt` chi cat media source
- con timing clip tren timeline duoc quyet dinh boi `Sequence` o root

Day chinh la cho da sua bug clip offset bi den giua chung.

### 3. `ImageClipLayer`

Giong `VideoClipLayer` nhung render `Img`.

Khac biet:

- khong co `startFrom/endAt`
- `objectFit = clip.objectFit ?? "contain"`

Note:

- store dang tao image moi voi `objectFit: "cover"`
- nhung layer nay van fallback `contain` neu data khong co

### 4. `AudioClipLayer`

Rat gon.

Render:

- `Audio`

Props:

- `src`
- `startFrom`
- `endAt`
- `volume`
- `playbackRate`

Note:

- audio khong co wrapper `div`
- khong co transform visual

### 5. `EmptyPreviewState`

Render placeholder khi:

- `project.clips.length === 0`

Text:

- `Drop videos and images here to get started`

Nhan xet:

- day la empty UI trong composition, khong phai overlay editor

---

## D. Root component `EditorPreviewComposition`

### Props

- `project?: EditorProject`

Fallback:

- `project = fallbackProject`

### Runtime hooks

- `frame = useCurrentFrame()`
- `width, height, fps = useVideoConfig()`

### Memo 1 - `visibleSortedClips`

Day la pipeline render quan trong nhat.

Buoc:

1. tao `trackMap`
2. loc `project.clips`
3. dieu kien visible:
   - `!clip.isHidden`
   - `!track?.isHidden`
   - `isClipVisibleAtFrame(clip, frame)`
4. sort bang `sortVisualClipsForRender`

Y nghia:

- composition root hien tai chi render clip dang visible o frame hien tai
- clip hide va track hide deu duoc ton trong

### Memo 2 - `trackMap`

Tao `Map(track.id -> track)` de:

- tra `isTrackMuted`
- co the dung cho logic khac sau nay

### JSX root

```tsx
<AbsoluteFill
  style={{
    background: project.video.backgroundColor ?? "#000",
    width,
    height,
    overflow: "hidden",
  }}
>
```

Luu y:

- background theo project config
- composition size theo `useVideoConfig()`

### Empty state condition

```tsx
{project.clips.length === 0 && <EmptyPreviewState />}
```

Note:

- neu project co clip nhung frame hien tai khong co clip nao visible thi composition se khong hien empty state
- no se chi hien background den

Day la behavior hop ly.

### Map `visibleSortedClips`

Moi clip:

1. lay `trackOrder = getClipLayerIndex(clip)`
2. lay `track`
3. lay `isTrackMuted`
4. switch theo `clip.type`
5. tao `clipLayer`
6. neu `clipLayer === null` => return null
7. wrap trong:

```tsx
<Sequence
  key={clip.id}
  from={clip.from}
  durationInFrames={clip.durationInFrames}
  style={{ pointerEvents: "none" }}
>
  {clipLayer}
</Sequence>
```

Day la diem quan trong nhat cua file.

### Vi sao `Sequence` quan trong

Day la logic da sua bug lon truoc do.

Neu khong co `Sequence`:

- clip dat o `from > 0` van bi media source doc theo frame toan cuc
- video/audio se het som / den / im lang sai

Co `Sequence`:

- timing cua clip tren timeline duoc map dung vao Remotion local frame
- Preview khop hon voi timeline
- Export sau nay co co so de khop Preview

Noi ngan gon:

`Sequence` la primitive timing dung cua Remotion cho editor nay.

### Debug footer

File dang render them:

```tsx
<span className='p-1 text-end text-white'>
  {width} x {height} • {fps} FPS • Frame {frame}
</span>
```

Note:

- day la debug overlay trong composition
- khong phai phan editor UI ngoai composition
- co the can bo/toggle sau nay neu khong muon no vao export

---

## E. File lien quan `playback-duration.ts`

### 1. `getEditorPlaybackDurationInFrames(project)`

Logic:

- no clips => `0`
- co clips => `max(project.video.durationInFrames, maxClipEnd)`

Y nghia:

- playback duration cua editor phai theo real timeline end
- khong bi gioi han boi duration asset goc

### 2. `getRemotionPlayerDurationInFrames(playbackDurationInFrames)`

Logic:

- `Math.max(1, playbackDurationInFrames)`

Y nghia:

- Remotion Player can duration duong
- editor co the rong nhung Player van can 1 frame toi thieu

File composition nay khong goi helper do truc tiep, nhung no song cung architecture playback cua Preview.

---

## F. Invariant ma file nay dang giu

### Invariant 1

Clip chi render khi dung frame hien tai.

### Invariant 2

Track hide phai an toan bo clip trong lane.

### Invariant 3

Track mute phai mute audio trong lane.

### Invariant 4

Track/layer order cua timeline phai duoc ton trong trong preview render.

### Invariant 5

Timing clip tren timeline phai map dung sang Remotion qua `Sequence`.

Day la invariant quan trong nhat cua file nay.

---

## G. Diem manh cua file hien tai

1. Architecture root ro rang
   - helper
   - layer component
   - composition root

2. Da sua dung bai toan local timing bang `Sequence`

3. Visual clip components tach rieng theo media type

4. Hide/mute/layer logic da duoc ton trong

5. Preview dang bam rat sat project model
   - day la dieu kien tot cho export parity

---

## H. Code smell / risk / diem can de y

### 1. Lap lai fallback transform o nhieu component

Hien tai:

- `TextClipLayer`
- `VideoClipLayer`
- `ImageClipLayer`

deu co block:

- `clip.transform ?? { ...default }`

Nen can nhac tach helper:

- `getClipTransform(clip)`

### 2. `getBasicClipTransitionStyle` hien tai la placeholder

No tot de mo rong sau nay.
Nhung trong hien trang, no tao cam giac da co animation system trong khi thuc te chua co.

Can note ky de tranh nguoi doc hieu nham.

### 3. `visibleSortedClips` dang loc clip theo frame roi moi wrap `Sequence`

Architecture nay van dung.

Nhung can hieu:

- root dang quyet dinh clip nao ton tai trong frame hien tai
- `Sequence` dang lo timing local khi clip da ton tai

Ve sau neu co effect can premount/postmount/transition overlaps phuc tap hon, architecture nay co the can dieu chinh.

### 4. Debug footer dang nam trong composition

Neu export dung cung composition nay, footer co nguy co di vao video output tru khi co logic tat no.

Day la diem can chu y thuc te.

### 5. `zIndex` trong layer component + `Sequence`

Hien tai du dung.

Nhung can nho:

- `Sequence` khong tu giai quyet het stacking
- stacking that van la trong inner layer node

### 6. `fallbackProject` cung la mot mini data model duplicate

Khong phai loi lon.
Nhung ve sau neu schema project thay doi nhieu, fallback nay de bi out-of-sync.

---

## I. Ket luan file nay

`editor-composition.tsx` la file mang tinh “renderer contract” cua editor.

No quyet dinh:

- project model duoc hieu the nao trong Preview
- clip timing co dung khong
- layer stacking co khop Timeline khong
- hide/mute co tac dung den render khong

Hien tai file nay dang o trang thai kha tot.

Diem quan trong nhat can nho:

**Preview/export parity ve sau se phu thuoc rat manh vao viec giu file nay bam sat project model va tiep tuc dung `Sequence` dung cho timing clip.**

---

## Thu tu review de xuat tiep theo

Sau composition, thu tu hop ly tiep theo:

1. `src/features/editor/components/timeline/components/timeline-ruler.tsx`
2. `src/features/editor/components/preview/index.tsx`
3. `src/features/editor/components/timeline/components/playhead.tsx`

Ly do:

- `timeline-ruler.tsx` la noi quyet dinh seek model va tick rendering
- `preview/index.tsx` la bridge giua store va Remotion Player
- `playhead.tsx` la piece presentational nhung lien quan truc tiep den UX va visual correctness

---

## 2026-04-24 - Review 06

### File

`src/features/editor/components/timeline/components/timeline-ruler.tsx`

### File lien quan can doc kem

- `src/features/editor/lib/timeline-math.ts`
- `src/features/editor/lib/preview-seek.ts`

### Muc do quan trong

Trung binh - cao.

File nay nho hon nhieu file khac, nhung no giu 3 vai tro rat quan trong:

1. Render tick/timecode cua Timeline
2. Chuyen pointer tren ruler thanh frame seek
3. Dong bo nhanh Preview khi click/drag tren ruler

No la "time navigation surface" co ban cua Timeline.

### Vai tro cua file

File nay la component UI va interaction cho ruler ben tren Timeline.

No phu trach:

- tinh vi tri marker theo `timelineWidth`
- format timecode
- render cac vach tick va label
- cho phep click/drag tren ruler de seek
- dispatch preview seek event qua RAF

No khong biet den lane/clip/playhead layout, chi lam viec voi:

- frame scale
- timeline width
- ruler UX

### Dependency chinh

- React:
  - `useEffect`
  - `useRef`
- `Frames` type
- `TIMELINE_GUTTER_X`
- `RULER_HEIGHT`
- `dispatchPreviewSeekFrame`

### Props

#### `fps`

Dung de format timecode.

#### `visibleDurationInFrames`

Khoang frame dang duoc trai tren timeline width hien tai.

Dung de tinh:

- `pixelsPerFrame`
- so marker

#### `maxSeekFrame`

Frame toi da cho phep seek.

Thuong la:

- `playbackDurationInFrames`

#### `tickFrames`

Khoang cach frame giua 2 moc tick lon.

#### `timelineWidth`

Tong chieu rong timeline content.

#### `onSeekFrame`

Callback de sync seek vao store.

### Helper trong file

#### `formatTimecode(frame, fps)`

Logic:

1. `totalSeconds = floor(frame / fps)`
2. `frames = frame % fps`
3. format:
   - `minutes`
   - `seconds`
   - `frameText`

Output:

- neu `frameText === "00"`:
  - `"mm:ss:00"`
- neu khac `"00"`:
  - `"mm:ss:ff"`
  - kem them chu `"f"`

Vi du:

- `00:01:00`
- `00:01:15f`

Nhan xet:

- file dang co chu y thuc de phan biet frame boundary va sub-second frame
- day la lua chon UX rieng, khong phai SMPTE standard full

### Ref local

#### `previewSeekFrameRef`

Luu frame seek preview tam thoi truoc khi flush qua RAF.

#### `previewSeekRafRef`

Luu RAF id cua preview seek.

Muc dich cua 2 ref nay:

- khi pointer move lien tuc, chi dispatch 1 event preview seek moi frame paint

### Derived variable

#### `usableWidth`

```ts
Math.max(0, timelineWidth - TIMELINE_GUTTER_X * 2)
```

No the hien ruler dang ton trong gutter 2 ben.

#### `pixelsPerFrame`

```ts
visibleDurationInFrames > 0 ? usableWidth / visibleDurationInFrames : 0
```

Day la ti le frame -> px cua ruler.

#### `tickCount`

```ts
Math.floor(visibleDurationInFrames / tickFrames)
```

So marker se render.

#### `markers`

Array marker duoc tao bang:

- `frame = index * tickFrames`
- `left = TIMELINE_GUTTER_X + frame * pixelsPerFrame`
- `label = formatTimecode(frame, fps)`

Note:

- marker hien tai la marker deu, khong co cap minor/major tick phuc tap

### Ham local quan trong

#### `flushPreviewSeekFrame()`

Nhiem vu:

- lay frame trong `previewSeekFrameRef`
- clear `previewSeekRafRef`
- `dispatchPreviewSeekFrame(frame)`

Day la buoc sync nhanh sang Preview.

#### `schedulePreviewSeek(frame)`

Nhiem vu:

- update `previewSeekFrameRef.current = frame`
- neu chua co RAF => dat `requestAnimationFrame(flushPreviewSeekFrame)`

Y nghia:

- ruler drag co the ra nhieu event
- preview khong bi dispatch event qua day

#### `seekFromPointer(event, shouldCapture)`

Day la ham interaction chinh cua file.

Buoc:

1. neu `pixelsPerFrame <= 0` => bo qua
2. neu `shouldCapture` => `setPointerCapture`
3. lay `rect`
4. tinh `x = event.clientX - rect.left`
5. tinh frame:

```ts
Math.round((x - TIMELINE_GUTTER_X) / pixelsPerFrame)
```

6. clamp vao `[0, maxSeekFrame]`
7. goi:
   - `onSeekFrame?.(clampedFrame)` => sync store
   - `schedulePreviewSeek(clampedFrame)` => sync preview nhanh

Day la architecture giong scrub playhead:

- store sync
- preview sync nhanh

### Effect

#### Cleanup RAF

`useEffect(() => return cleanup, [])`

Unmount thi:

- cancel RAF neu con pending

File nay gon, chi co 1 effect.

### JSX structure

Root:

```tsx
<div className='sticky top-0 z-10'>
```

Y nghia:

- ruler sticky tren cung vung timeline content
- stack duoi playhead, duoi track headers (theo z-index da sap xep)

#### Background layer

```tsx
<div
  className='min-w-full pointer-events-none absolute top-0 h-7 bg-gray-300'
  style={{ width: timelineWidth }}
/>
```

Day la nen cua ruler.

#### Tick header interactive layer

```tsx
<div
  id='tick-headers'
  className='relative min-w-full overflow-hidden select-none h-7 cursor-pointer'
  onPointerDown={...}
  onPointerMove={...}
  style={{ width: timelineWidth }}
>
```

Behavior:

- `onPointerDown` => seek + capture
- `onPointerMove` (chi khi `buttons === 1`) => scrub ruler

#### Marker rendering

Moi `marker`:

- container absolute tai `left`
- 1 duong doc `border-l`
- 1 label text neu co

File hien tai render tat ca marker deu nhau, khong co phan cap do marker visual.

### Hien trang behavior cua file

File nay hien dang support:

- render ruler theo timeline width hien tai
- render timecode marker theo `tickFrames`
- click ruler de seek
- drag tren ruler de scrub
- sync store frame
- sync preview seek nhanh qua RAF event

### Diem manh cua file hien tai

1. File gon, ro trach nhiem

2. Logic seek tach kha ro:
   - convert pointer -> frame
   - sync store
   - sync preview

3. Da co cleanup RAF

4. Dung chung convention `preview seek` voi playhead scrub

### Code smell / risk / diem can de y

#### 1. `formatTimecode` la custom format

No khong phai SMPTE/industry format full.

Neu sau nay can:

- drop-frame timecode
- hour field
- exact broadcast format

thi phan nay se can doi.

#### 2. `tickCount = floor(visibleDuration / tickFrames)`

No co the bo qua marker cuoi cung neu duration khong chia het cho tickFrames.

Hien tai chap nhan duoc vi ruler dang mang tinh visual navigation.

#### 3. Tat ca marker hien tai deu duoc render nhu nhau

Chua co:

- minor tick
- major tick
- emphasis theo second/minute boundary

Neu sau nay timeline phuc tap hon, file nay la noi nen nang cap.

#### 4. `seekFromPointer` vua sync store vua sync preview

Architecture nay dang hop ly.

Nhung no co nghia:

- ruler dang biet toi 2 kieu sync

Neu muon architecture dong nhat hon nua, ve sau co the trich ra helper chung:

- `scheduleTimelinePreviewSeek`

#### 5. Khong co `onPointerUp`

Hien tai ruler khong can finalize phuc tap nhu playhead scrub.
Van chap nhan duoc.

Nhung neu sau nay can:

- commit/finalize state
- snap on release

thi se can bo sung.

### Lien he voi `timeline-math.ts`

File nay phu thuoc truc tiep vao:

- `TIMELINE_GUTTER_X`
- `RULER_HEIGHT`

Y nghia:

- ruler la mot trong cac noi dung su dung he toa do timeline chung
- neu gutter doi, ruler seek va marker placement se doi theo

### Lien he voi `preview-seek.ts`

File nay goi:

- `dispatchPreviewSeekFrame(frame)`

Contract event nay la diem noi voi:

- `preview/index.tsx`
- `timeline-playhead-viewport-layer.tsx`

Tuc la ruler va playhead scrub hien tai dang chia se cung 1 preview-seek pipeline.

Day la mot diem architecture tot.

### Ket luan file nay

`timeline-ruler.tsx` la file nho nhung quan trong.

No dang lam dung 3 viec:

- ruler display
- pointer -> frame mapping
- preview/store seek sync

File nay hien tai kha sach va de maintain.

Neu phat trien tiep:

- co the nang cap visual marker system
- co the tach helper seek chung neu muon dong nhat hon voi playhead
- nhung hien tai chua can refactor manh

---

## Thu tu review de xuat tiep theo

Sau ruler, thu tu hop ly tiep theo:

1. `src/features/editor/components/preview/index.tsx`
2. `src/features/editor/components/timeline/components/playhead.tsx`
3. `src/features/editor/lib/timeline-zoom-engine.ts`

Ly do:

- `preview/index.tsx` la bridge quan trong giua store va Remotion Player
- `playhead.tsx` la piece visual nhay cam ve UX
- `timeline-zoom-engine.ts` la noi quyet dinh scale cua timeline, anh huong nhieu den UX va maintainability

---

## 2026-04-24 - Review 07

### File

`src/features/editor/components/preview/index.tsx`

### File lien quan can doc kem

- `src/features/editor/components/preview/components/preview-viewport.tsx`
- `src/features/editor/components/preview/components/preview-stage.tsx`
- `src/features/editor/lib/playback-duration.ts`
- `src/features/editor/lib/preview-seek.ts`

### Muc do quan trong

Rat cao.

Neu `editor-composition.tsx` la renderer contract, thi file nay la **runtime bridge** giua:

- store
- Remotion Player instance
- preview seek event
- play / pause / frameupdate

Day la noi quyet dinh:

- currentFrame trong store sync voi Player the nao
- preview scrub nhanh duoc thuc hien ra sao
- end boundary cua UI co duoc giu dung hay khong

### Vai tro cua file

`EditorPlayer` la container runtime cua Preview.

No phu trach:

1. tao `playerRef`
2. do kich thuoc container preview
3. tinh `playbackDurationInFrames`
4. sync `playbackStatus` store -> Player
5. sync `currentFrame` store -> Player khi khong playing
6. nghe `editor:preview-seek-frame` de seek nhanh
7. nghe callback `frameupdate/play/pause` tu Player va dua nguoc ve store
8. render `PreviewViewport`
9. handle fullscreen preview mode

No khong render clip noi dung truc tiep.
No chi dieu phoi runtime va truyen props xuong `PreviewViewport`.

### Dependency chinh

- React:
  - `useCallback`
  - `useEffect`
  - `useMemo`
  - `useRef`
- `PlayerRef` tu `@remotion/player`
- `PreviewViewportState`
- `useElementSize`
- `PreviewViewport`
- store selectors/actions:
  - `useEditorStore`
  - `useLoopEnabled`
  - `usePreviewFullscreen`
- `getEditorPlaybackDurationInFrames`
- `PreviewSeekEvent`

---

## A. Ref va state/derived values

### 1. `playerRef`

`useRef<PlayerRef>(null)`

Day la handle imperative den Remotion Player instance.

Tat ca sync runtime thuc te deu dua vao ref nay:

- `seekTo`
- `play`
- `pause`
- `getCurrentFrame`
- `isPlaying`

### 2. `useElementSize()`

Tra ve:

- `ref`
- `size`

Muc dich:

- do container preview hien tai
- dung de tinh viewport layout
- sync size vao store

### 3. Store/project values

- `project`
- `video = project.video`
- `playbackDurationInFrames = getEditorPlaybackDurationInFrames(project)`
- `playbackStatus`
- `isLoopEnabled`
- `isFullscreen`
- `setCurrentFrame`
- `setPlaybackStatus`
- `setPreviewContainerSize`

Nhan xet:

- file nay subscribe kha hep
- khong lay thang ca runtime object
- day la diem tot cho performance

### 4. `viewport`

`useMemo<PreviewViewportState>(...)`

Hien tai return:

- `containerWidth`
- `containerHeight`
- `zoom: 1`
- `mode: "fit"`
- `isFullscreen: false`

Nhan xet:

- viewport dang duoc tao local tu size hien tai
- no chua read full runtime.preview tu store
- dat biet:
  - `zoom` dang hard-code `1`
  - `mode` dang hard-code `"fit"`
  - `isFullscreen` dang hard-code `false`

Day la diem can note ky:

UI/store co action `setPreviewZoom`, `setPreviewMode`, `setPreviewFullscreen`, nhung file nay hien tai chua phan anh day du cac gia tri do vao `viewport`.

Tuc la preview runtime model da mo ra, nhung EditorPlayer hien tai chua dung het.

---

## B. Callback quan trong

### 1. `handlePause`

Muc dich:

- xu ly callback khi Remotion Player pause

Logic:

1. lay `currentFrameInPlayer`
2. xac dinh `isEnded`
   - `currentFrameInPlayer >= playbackDurationInFrames - 1`
3. neu ended:
   - `setCurrentFrame(playbackDurationInFrames)`
   - `setPlaybackStatus("ended")`
4. neu khong:
   - `setPlaybackStatus("paused")`

Day la logic rat quan trong.

Y nghia:

- Remotion render frame cuoi cung la `duration - 1`
- nhung UI editor muon dung o **end boundary** = `duration`

File nay dang giu cau noi do.

### 2. `handleFrameUpdate(frame)`

Muc dich:

- xu ly callback `frameupdate` tu Player

Logic:

1. doc `runtime` truc tiep qua `useEditorStore.getState()`
2. xac dinh:
   - `isLastRenderableFrame`
   - `isUiAtEndBoundary`
3. neu:
   - frame da o last renderable
   - va UI da ended hoac da dung o end boundary
   => bo qua
4. nguoc lai:
   - `setCurrentFrame(frame)`

Y nghia:

- chan Player keo UI frame tu `duration` ve `duration - 1`
- giu playhead/ruler/time label dung o end boundary

Day la mot trong nhung callback quan trong nhat cua file nay.

### 3. `handlePlay`

Rat gon:

- `setPlaybackStatus("playing")`

---

## C. Cac `useEffect`

### Effect 1 - sync preview container size vao store

```tsx
useEffect(() => {
  setPreviewContainerSize(...)
}, [size.width, size.height])
```

Muc dich:

- store biet kich thuoc preview hien tai

Y nghia:

- cac feature canvas/editor sau nay co the dua vao runtime.preview.containerWidth/Height

### Effect 2 - sync playback status tu store -> Remotion Player

Day la effect bridge 1 chieu quan trong.

Logic:

#### Neu `playbackStatus === "playing"`

1. doc:
   - `runtime`
   - `project`
2. tinh `playbackDuration`
3. tinh `frameForPlayer = min(currentFrame, playbackDuration - 1)`
4. neu current frame trong Player khac:
   - `instance.seekTo(frameForPlayer)`
5. neu Player chua play:
   - `instance.play()`

#### Neu khong playing

- neu Player dang play:
  - `instance.pause()`

Y nghia:

- store la source of truth cho status
- Player bi dieu khien theo status do

Nhan xet:

- effect nay la imperative sync
- no khong dua vao render Player tree de cap nhat
- day la lua chon dung cho preview nang

### Effect 3 - sync currentFrame tu store -> Player khi khong playing

Day la effect subscribe quan trong nhat cua file.

No khong dung dependency re-render thong thuong.
No dung:

```ts
return useEditorStore.subscribe((state, previousState) => { ... })
```

Logic:

1. lay `instance`
2. neu khong co instance => return
3. neu `state.runtime.player.status === "playing"` => bo qua
4. xac dinh:
   - `currentFrameChanged`
   - `durationChanged`
5. neu khong doi cai nao => bo qua
6. tinh `playbackDuration`
7. tinh `frameForPlayer`
8. neu Player frame khac:
   - `instance.seekTo(frameForPlayer)`

Y nghia:

- khi user seek / click ruler / drag playhead / skip frame
- va preview khong dang play
- Player duoc seek imperatively ma khong can re-render component tree

Day la mot diem architecture rat tot.

### Effect 4 - nghe `editor:preview-seek-frame`

Day la effect bridge 2 chieu nhanh tu Timeline -> Preview.

Logic:

1. nghe event window `editor:preview-seek-frame`
2. lay `instance`
3. doc `project`, `runtime` qua `useEditorStore.getState()`
4. neu `runtime.player.status === "playing"` => bo qua
5. tinh `playbackDuration`
6. clamp `frameForPlayer`
7. neu Player dang o dung frame do roi => bo qua
8. nguoc lai:
   - `instance.seekTo(frameForPlayer)`

Y nghia:

- Timeline ruler/playhead scrub co the update Preview nhanh hon store path thong thuong
- giam lag khi scrub

Day la file tiep nhan contract tu:

- `preview-seek.ts`
- `timeline-ruler.tsx`
- `timeline-playhead-viewport-layer.tsx`

---

## D. JSX va flow render

### Root render

File nay render 2 branch:

1. non-fullscreen
2. fullscreen

### Non-fullscreen branch

```tsx
<div ref={ref} className='h-full w-full min-h-0 min-w-0 overflow-hidden'>
  <PreviewViewport ... />
</div>
```

Day la branch thong thuong.

### Fullscreen branch

```tsx
<div className='fixed inset-0 z-50 bg-black flex items-center justify-center'>
  <div className='w-full h-full flex items-center justify-center'>
    <PreviewViewport ... />
  </div>
</div>
```

Note:

- fullscreen hien tai la overlay fixed
- van dung cung `PreviewViewport`

### Props truyen xuong `PreviewViewport`

- `playerRef`
- `video`
- `playbackDurationInFrames`
- `viewport`
- `isLoopEnabled`
- `onFrameUpdate`
- `onPlay`
- `onPause`

---

## E. File lien quan 1 - `preview-viewport.tsx`

### Vai tro

Tinh layout preview surface trong container.

No dung:

- `getPreviewSurfaceLayout(...)`

de suy ra:

- `offsetX`
- `offsetY`
- `renderedWidth`
- `renderedHeight`

Sau do render:

- `PreviewStage`

Y nghia:

- `EditorPlayer` lo sync runtime
- `PreviewViewport` lo fit/fill geometry

Day la phan tach ro rang va tot.

### Note quan trong

`viewport` prop nhan vao co:

- `zoom`
- `mode`

Nhung `EditorPlayer` dang hard-code hai field nay.

Nen `PreviewViewport` hien co architecture san cho zoom/mode,
nhung root bridge chua tan dung het.

## F. File lien quan 2 - `preview-stage.tsx`

### Vai tro

Render Remotion `Player` that va dat `PreviewTextOverlay` ben tren.

Nhiem vu:

1. subscribe event cua Player:
   - `frameupdate`
   - `play`
   - `pause`
2. callback nguoc len `EditorPlayer`
3. render:
   - `<Player component={EditorPreviewComposition} ... />`
   - `<PreviewTextOverlay ... />`

Day la layer “stage”.

Noi ngan gon:

- `EditorPlayer`: runtime bridge
- `PreviewViewport`: geometry/layout
- `PreviewStage`: player canvas + overlay editor

Phan tach nay kha on.

---

## G. Invariant ma file nay dang giu

### Invariant 1

Store la source of truth cho playback status.

Player phai obey store status.

### Invariant 2

UI co the dung o `end boundary = duration`,
trong khi Remotion Player chi render toi `duration - 1`.

File nay giu bridge do qua:

- `handlePause`
- `handleFrameUpdate`

### Invariant 3

Khi khong playing, seek tu Timeline phai cap nhat Preview nhanh ma khong can render lai toan bo component tree.

File nay giu invariant do qua:

- store subscribe effect
- preview seek event effect

### Invariant 4

Preview seek event khong duoc can thiep khi Player dang playing.

File nay dang enforce:

- `if (runtime.player.status === "playing") return;`

---

## H. Diem manh cua file hien tai

1. Runtime sync kha ro va dung huong imperative

2. Da tranh duoc viec re-render Player tree theo tung frame

3. Da handle dung bai toan end boundary cua UI vs frame cuoi cua Remotion

4. Fullscreen va non-fullscreen dung chung mot pipeline

5. Phan tach 3 lop:
   - player runtime
   - viewport layout
   - stage render

la tot cho maintainability

---

## I. Code smell / risk / diem can de y

### 1. `viewport` dang hard-code `zoom`, `mode`, `isFullscreen`

Day la diem can note ro nhat.

Store da co preview state:

- `zoom`
- `mode`
- `isFullscreen`

Nhung `EditorPlayer` hien tai chi dung:

- `containerWidth`
- `containerHeight`

Con 3 field kia dang hard-code.

Tuc la:

- model da co
- UI bridge chua doc het model

### 2. `playbackDurationInFrames` duoc dung o nhieu cho trong file

Day la dung.

Nhung vi file dang co nhieu effect bridge, can rat can than neu sau nay doi semantics cua duration.

### 3. Effect subscribe store dung `durationChanged` theo:

- `project.video.durationInFrames`
- `project.clips.length`

Dieu nay co nghia:

- neu clip doi `from`/`durationInFrames` ma khong doi so luong clip
- nhung `project.video.durationInFrames` van doi dung thi on
- neu co bug khien field do khong cap nhat thi Player sync co the lech

Tuc la effect nay tin vao invariant store da recalc duration dung.

### 4. `PreviewSeekEvent` path va store subscribe path cung cung co the seek Player

Architecture nay hien tai co chu y:

- path event => seek nhanh
- path store => state chinh thuc

Day la hop ly.

Nhung no co nghia nguoi moi doc se can hieu ro co 2 dong sync song song.

### 5. Fullscreen branch van dung cung `viewport` object

Hien tai `viewport.isFullscreen` trong object local dang hard-code false.

Khong gay loi ngay lap tuc vi layout fullscreen dang duoc xu ly ben ngoai qua wrapper fixed.

Nhung day la mot mismatch nho giua “branch UI” va “viewport object semantic”.

---

## J. Ket luan file nay

`preview/index.tsx` la runtime bridge quan trong cua Preview.

No khong render clip, nhung no quyet dinh:

- player co play/pause dung khong
- seek co muot khong
- UI co giu duoc end boundary khong
- Preview co khop Timeline khi scrub khong

Hien tai file nay dang o trang thai kha tot ve runtime sync.

Diem can note lon nhat ve maintainability:

- preview runtime model trong store hien da mo rong hon, nhung `EditorPlayer` chua doc het (`zoom`, `mode`, `isFullscreen`)

---

## Thu tu review de xuat tiep theo

Sau `preview/index.tsx`, thu tu hop ly tiep theo:

1. `src/features/editor/components/timeline/components/playhead.tsx`
2. `src/features/editor/lib/timeline-zoom-engine.ts`
3. `src/features/editor/components/preview/components/preview-stage.tsx`

Ly do:

- `playhead.tsx` la visual piece nhay cam ve UX va dang co hard-code body path
- `timeline-zoom-engine.ts` anh huong truc tiep den ruler, clip width, seek scale
- `preview-stage.tsx` la lop nho nhung quan trong de hieu event bridge voi Player

---

# File review 7 - `src/features/editor/components/timeline/components/playhead.tsx`

## A. Vai tro cua file

Day la file render visual Playhead that su dung trong Timeline.

No khong tu quan ly:

- current frame state
- auto scroll
- timeline viewport sync
- playback loop

No chi lo 3 viec:

1. quy doi `currentFrame` thanh vi tri `left`
2. render dau Playhead + than doc
3. phat pointer event nguoc ra ngoai de parent handle scrub

Noi cach khac, day la mot visual-interaction component rat "thin".

Chinh vi no "thin", file nay dang dung huong.
Nhung cung chinh vi no la visual piece trung tam cua Timeline, moi hard-code trong day deu rat de lo ra ngoai UX.

---

## B. Import va dependency

File import:

- `forwardRef`
- `PointerEvent`
- `Frame`, `Frames`
- `TIMELINE_GUTTER_X`
- `frameToPx`

Y nghia:

- React chi duoc dung de tao component co `ref`
- logic tinh vi tri duoc tai su dung tu `timeline-math`
- file nay khong phu thuoc store
- file nay khong biet gi ve DOM viewport cua timeline

Day la dependency boundary tot.

---

## C. Props cua component

### 1. `currentFrame`

Frame hien tai cua UI.

Dung de tinh vi tri Playhead.

### 2. `durationInFrames`

Tong duration boundary cua project.

File nay dung de clamp `currentFrame`.

### 3. `pixelsPerFrame`

He so zoom ngang.

`frameToPx()` can field nay de tinh `left`.

### 4. `isPlaying`

Chi dung cho visual interpolation:

- co transition khi play
- khong co transition khi pause/scrub

Day la mot quyet dinh UI, khong anh huong state logic.

### 5. `leftOffset`

Prop nay cho phep parent bo qua logic `frameToPx(...)` mac dinh va dua vao vi tri da tinh san.

Y nghia kien truc:

- Playhead co the render theo toa do content
- hoac render theo toa do viewport

ma khong can doi component.

Day la diem hay.

### 6. `onScrubStart`
### 7. `onScrubMove`
### 8. `onScrubEnd`

Ba callback nay la interaction contract cua Playhead.

File nay khong scrub frame truc tiep.
No chi:

- bat pointer
- forward event len parent

Nen viec map pointer -> frame van thuoc parent layer.

Day la phan tach dung.

---

## D. Logic ben trong file

### 1. `clampedFrame`

```tsx
const clampedFrame = Math.min(
    Math.max(currentFrame, 0),
    durationInFrames,
);
```

Muc dich:

- khong cho Playhead ve frame am
- khong cho Playhead vuot qua end boundary

Note:

file dang clamp toi `durationInFrames`, khong phai `durationInFrames - 1`.

Dieu nay dung voi semantics UI hien tai cua editor:

- UI duoc phep dung o end boundary
- Remotion Player chi render toi last renderable frame

Nghia la file nay dang follow dung semantics cua Timeline UI, khong follow semantics thuan cua frame render.

### 2. `left`

```tsx
const left =
    leftOffset ??
    frameToPx(clampedFrame, pixelsPerFrame, TIMELINE_GUTTER_X);
```

Thu tu uu tien:

1. neu parent dua `leftOffset` vao => dung gia tri do
2. neu khong => tu tinh bang `frameToPx`

Dieu nay giup file nay giu duoc tinh tai su dung tot.

Nhung can note:

- khi parent dua `leftOffset`, component nay khong con kiem soat he toa do nua
- luc do parent phai tu dam bao da tru `scrollLeft`, da cong gutter, da can bang viewport dung

Tuc la:

- component de maintain
- nhung bug he toa do se thuong nam o parent, khong nam o file nay

---

## E. Ref va HTML structure hien tai

File xuat ra mot root:

```tsx
<div
  ref={ref}
  className='pointer-events-none absolute top-0 flex flex-col items-center -ml-2.5'
  id='playhead'
  style={{ ... }}
>
```

### Giai thich tung phan

#### `pointer-events-none`

Root khong bat pointer.

Dieu nay cho phep pointer chi tap trung vao handle o ben trong.

Huong nay dung, tranh root layer vo tinh chan interaction khac.

#### `absolute top-0`

Playhead duoc dat absolutely trong layer cha.

Nhung can note ro:

`absolute` khong co nghia la no se "thoat khoi scroll".

Neu cha cua no nam trong scroll container thi no van bi anh huong boi scroll cua ancestor.

Do do nhieu bug truoc day lien quan toi playhead scroll Y thuc chat khong nam trong file nay, ma nam o cho parent render no o dau.

#### `flex flex-col items-center`

Dung de can giua dau Playhead va than doc.

#### `-ml-2.5`

Day la visual offset de canh giua marker vao dung vi tri duong time.

Gia tri nay co tinh chat "magic number".

No dung khi:

- width marker hien tai la 19px
- vi tri trung tam dang nam quanh truc giua cua marker

Neu sau nay doi SVG width, canh nay rat de lech.

### Inline style cua root

```tsx
style={{
    left: 0,
    transform: `translate3d(${left}px, 0, 0)`,
    zIndex: 1,
    transition: isPlaying ? "transform 40ms linear" : undefined,
    willChange: isPlaying ? "transform" : undefined,
}}
```

#### `left: 0` + `transform`

File nay dat root tai moc 0 roi dung `transform` de dich ngang.

Day la cach dung hon so voi viec doi `left` lien tuc, vi:

- compositor than thien hon
- animation muot hon
- it gay layout thrash hon

#### `zIndex: 1`

File nay co comment ro:

- cu: Playhead tu mang z-index cao
- moi: parent viewport layer quan ly stacking

Day la quyet dinh kien truc dung.

Visual primitive nhu Playhead khong nen tu y gianh quyen stack voi ruler, header, scrollbar.

#### `transition` / `willChange`

Day la phan can note ky.

Khi `isPlaying`, file them:

- `transition: transform 40ms linear`
- `willChange: transform`

Muc dich:

- lam Playhead nhin bot "nhay"

Nhung no la visual smoothing rat nhe, khong phai frame interpolation that.

Rui ro:

- neu parent cap nhat frame khong deu, transition nay co the tao cam giac "lat qua lat lai"
- neu scrub tay ma parent quen tat `isPlaying`, cam giac drag se bi tre

Hien tai contract cua file la:

- parent phai dua `isPlaying` dung

---

## F. Handle pointer interaction

Ben trong root, file render mot handle:

```tsx
<div
  className='sticky z-1 top-0 pointer-events-auto cursor-pointer'
  onPointerDown={...}
  onPointerMove={...}
  onPointerUp={onScrubEnd}
  onPointerCancel={onScrubEnd}
>
```

### 1. Tai sao la `sticky top-0`

Day la mot chi tiet quan trong.

No cho dau Playhead bam vao top cua viewport/layer ma no dang nam trong.

Tuc la:

- than doc di xuong duoi
- marker head co the giu o vung ruler/top area de nguoi dung con nam duoc

Nhung vi no la `sticky`, no rat phu thuoc vao:

- parent scroll container
- parent overflow
- parent stacking context

Nen neu thay doi cau truc DOM cua Timeline, day la diem rat de vo.

### 2. `pointer-events-auto`

Root tat pointer, handle bat lai pointer.

Day la pattern hop ly.

### 3. `onPointerDown`

```tsx
event.currentTarget.setPointerCapture(event.pointerId);
onScrubStart?.(event);
```

File tu capture pointer ngay tai handle.

Muc dich:

- khi drag nhanh ra khoi marker, Playhead van tiep tuc nhan move/up

Day la xu ly dung va can thiet.

### 4. `onPointerMove`

```tsx
if (event.buttons !== 1) return;
onScrubMove?.(event);
```

Guard nay loai bo move event khi khong dang giu chuot trai.

Tot.

Nhung note nho:

- file nay chi support pointer flow kieu primary button drag
- neu sau nay can stylus / touch behavior chi tiet hon, parent va file nay se can mo rong contract

### 5. `onPointerUp` / `onPointerCancel`

Ca hai deu forward ve `onScrubEnd`.

Day la xu ly day du cho case:

- tha chuot binh thuong
- browser cancel pointer

---

## G. SVG head va than Playhead

File render:

```tsx
<svg viewBox='0 0 54 55' ...>
  <path d='M50.4313 ... L 30.4998 1800 L 25 1800 ...' />
</svg>
```

Day la diem can note ky nhat cua file.

### Hien trang

Mot `path` duy nhat dang ve ca:

- dau marker
- than doc rat dai

Noi cach khac, than doc khong phai mot `div` rieng ma dang duoc "ve ke" trong SVG path.

### He qua

1. Chieu cao than Playhead la hard-code

Gia tri `1800` dang dong vai tro chieu cao ao cua than.

Neu Timeline cao hon muc nay, Playhead se lo thieu chieu cao.

2. "height: 100%" trong style cua path khong giai quyet van de

Vi path vector dang co toa do ve co dinh.

3. File nay kho scale theo Timeline height that

Muon thay doi max height, hien tai cach nhanh nhat la doi con so hard-code.

4. File nay kho dung lai neu muon:

- doi dau marker
- doi stroke line rieng
- doi style line va marker tach biet

### Ket luan cho doan nay

Ve mat ky thuat, day la diem yeu lon nhat cua file.

Huong dung ve lau dai se la:

1. tach marker head ra mot SVG rieng
2. tach than doc ra thanh `div` / pseudo element rieng
3. de than doc bam theo chieu cao that cua layer cha

---

## H. Invariant ma file nay dang giu

### Invariant 1

Playhead chi la visual + interaction primitive, khong giu business state.

### Invariant 2

Vi tri Playhead duoc tinh tu:

- `leftOffset`
hoac
- `frameToPx`

chu khong doc truc tiep scroll/store.

### Invariant 3

Parent layer phai quan ly z-index that su.

`playhead.tsx` chi giu local baseline.

### Invariant 4

Pointer drag chi la event forwarding; parent moi la noi quy doi pointer thanh frame.

---

## I. Diem manh cua file hien tai

1. File ngan, boundary ro

2. Khong phu thuoc store

3. Da dung `transform` thay vi set `left` frame-by-frame

4. Da dung `setPointerCapture`, day la diem dung va quan trong

5. Da cho phep parent override toa do qua `leftOffset`

---

## J. Code smell / risk / diem can de y

### 1. Hard-code than doc bang SVG path

Day la risk lon nhat.

No gay ra:

- lo thieu height
- kho maintain
- kho ly giai cho nguoi moi

### 2. `-ml-2.5` la magic number

No dang phu thuoc vao marker width hien tai.

### 3. `sticky` ben trong playhead handle la phu thuoc manh vao parent layout

Neu doi DOM cua Timeline, kha nang cao se phai sua lai.

### 4. `transition: transform 40ms linear`

Co the giup muot hon mot chut, nhung khong phai luc nao cung dung.

Can test ky trong case:

- playing + scroll
- scrub lien tuc
- currentFrame update khong deu

### 5. `leftOffset` va `frameToPx` song song la linh hoat, nhung cung tang burden cho parent

Nguoi maintain phai hieu ro hien tai parent dang dua toa do theo he nao:

- content
- viewport
- da tru scrollLeft hay chua

---

## K. Ket luan file nay

`playhead.tsx` hien tai la mot component nho nhung rat nhay cam.

No dang lam dung vai tro:

- visual primitive
- pointer primitive

va khong om qua nhieu logic.

Nhung diem can de y lon nhat cua file la phan visual implementation:

- than Playhead dang duoc hard-code trong SVG path

Day la ly do truc tiep cua cac van de:

- khong full height theo Timeline
- kho resize max
- kho giu UI clean khi thay doi layout

Neu sau nay can refactor, day la mot trong nhung file nen sua som vi gia tri maintainability kha cao.

---

## Thu tu review de xuat tiep theo

Sau `playhead.tsx`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/timeline-zoom-engine.ts`
2. `src/features/editor/components/preview/components/preview-stage.tsx`
3. `src/features/editor/components/preview/components/preview-viewport.tsx`

Ly do:

- `timeline-zoom-engine.ts` anh huong truc tiep den scale ngang cua toan bo Timeline
- `preview-stage.tsx` la lop noi Player voi overlay
- `preview-viewport.tsx` la geometry bridge cua Preview

---

# File review 8 - `src/features/editor/lib/timeline-zoom-engine.ts`

## A. Vai tro cua file

Day la file tinh toan trung tam cho bai toan zoom ngang cua Timeline.

File nay khong render UI.
No cung khong biet gi ve store, React, drag-drop hay playhead.

No chi nhan vao:

- `durationInFrames`
- `fps`
- `zoomLevel`

roi tra ra mot goi so lieu chuan hoa de cac phan khac cua Timeline dung:

- `tickUnit`
- `tickFrames`
- `visibleDurationInFrames`
- `timelineWidth`
- `pixelsPerFrame`
- `tickCount`

Noi ngan gon:

- `timeline-zoom-spec.ts` dinh nghia luat
- `timeline-zoom-engine.ts` bien luat thanh so cu the de UI dung duoc

Day la file rat quan trong vi no la source tinh scale ngang cho:

- ruler
- clip width
- seek mapping
- scroll range
- zoom cam giac "co thay doi that hay khong"

---

## B. Import va dependency

File import:

- `Frames`, `Pixels`
- `DurationBucketRule`
- `MIN_TIMELINE_WIDTH`
- `TIMELINE_DURATION_BUCKET_RULES`
- `TickUnit`
- `getTickUnitFrames`

Y nghia:

- file nay phu thuoc manh vao `timeline-zoom-spec.ts`
- spec file quyet dinh luat zoom, con engine file quyet dinh cach ap luat

Boundary nay dung va de maintain:

- muon doi chinh sach zoom => uu tien sua spec
- muon doi cong thuc tinh width / spacing => sua engine

Neu giu duoc boundary nay, code se de scale hon.

---

## C. Type output - `TimelineZoomComputed`

```ts
export type TimelineZoomComputed = {
    tickUnit: TickUnit;
    tickFrames: Frames;
    visibleDurationInFrames: Frames;
    timelineWidth: Pixels;
    pixelsPerFrame: number;
    tickCount: number;
};
```

### 1. `tickUnit`

Major tick family dang duoc chon.

Vi du:

- 1 second
- 15 frames
- 5 seconds

Field nay mang tinh semantic.

### 2. `tickFrames`

So frame that ung voi `tickUnit`.

Field nay la bridge quan trong tu semantic sang toan hoc.

### 3. `visibleDurationInFrames`

Tong khoang thoi gian Timeline se "show", khong nhat thiet bang dung project duration.

Day la mot field rat quan trong.

File nay dang co chu truong:

- Timeline co the dai hon project
- de cho co tick dep
- de cho co tail padding

### 4. `timelineWidth`

Tong width px cua content Timeline.

Day la width quyet dinh scrollbar ngang va khong gian de render clip/ruler.

### 5. `pixelsPerFrame`

He so quan trong nhat cho seek va layout clip.

Gan nhu moi bai toan ngang cua Timeline deu se su dung field nay.

### 6. `tickCount`

Tong so major tick duoc render.

Field nay co tac dong truc tiep den:

- mat do ruler
- cam giac project "rong" hay "thua"
- width tinh toan cuoi cung

---

## D. Helper function ben trong file

### 1. `clampZoom`

```ts
const clampZoom = (zoomLevel: number) => Math.max(1, Math.min(10, zoomLevel));
```

Vai tro:

- chot range zoom hop le la `1 -> 10`

Y nghia:

- UI co the dua vao slider / state nao do
- nhung engine se khong cho vuot khoi domain no da duoc thiet ke

Day la guard can thiet.

Nhung can note:

- range `1..10` dang la hard-code trong engine
- neu UI sau nay doi so nc zoom step, file nay cung phai doi theo

Tuc la hien tai range nay chua duoc centralize 100%.

### 2. `getDurationBucketRule`

```ts
const getDurationBucketRule = (
    durationInSeconds: number,
): DurationBucketRule => {
    return (
        TIMELINE_DURATION_BUCKET_RULES.find(
            (rule) => durationInSeconds <= rule.maxDurationSeconds,
        ) ??
        TIMELINE_DURATION_BUCKET_RULES[
            TIMELINE_DURATION_BUCKET_RULES.length - 1
        ]
    );
};
```

Vai tro:

- chon bucket rule dua tren tong do dai project

Y nghia kien truc:

editor dang khong dung mot cong thuc zoom duy nhat cho moi project.
No dung chinh sach theo bucket:

- project ngan
- project trung binh
- project dai

se co map zoom khac nhau.

Day la quyet dinh UX hop ly, vi:

- project 5 giay va 5 phut khong the co cung behavior zoom

Note:

- file nay tin rang `TIMELINE_DURATION_BUCKET_RULES` da sort theo `maxDurationSeconds`
- neu spec file bi sua sai thu tu, engine nay se cho ket qua sai ma khong co guard

### 3. `snapUpToMultiple`

```ts
const snapUpToMultiple = (value: number, step: number) => {
    if (step <= 0) return value;
    return Math.ceil(value / step) * step;
};
```

Vai tro:

- lam tron len duration visible theo buoc `tickFrames`

Muc dich:

- ruler ket thuc o moc dep
- tick khong bi cat le

Day la helper nho nhung gia tri rat cao cho UX.

### 4. `getTargetTickSpacingPx`

```ts
const getTargetTickSpacingPx = (zoomLevel: number) => {
    return 191.9 + (zoomLevel - 1) * 45;
};
```

Comment cua file noi ro:

- toi muc tick unit = 15f thi zoom tiep se tang width/gap, khong doi tick family nua

Vai tro:

- quyet dinh khoang cach muc tieu giua major ticks theo zoom

Day la mot ham UX tuning.

No khong "toan hoc tuyet doi".
No la chinh sach visual.

Note quan trong:

- `191.9` la magic number
- `45` cung la magic number

Hai so nay rat co gia tri UX, nhung nguoi moi doc file se khong biet vi sao la 191.9 va 45.

Nen trong note maintainability, day la diem can danh dau ro.

### 5. `MIN_VISIBLE_TICK_COUNT`

```ts
const MIN_VISIBLE_TICK_COUNT = 10;
```

Vai tro:

- dam bao du tick tren ruler ke ca project rong / rat ngan

Day la sua loi ma truoc do user da thay:

- project ngan hoac rong thi qua it tick

Hien tai con so 10 nay dang la global floor.

---

## E. Helper - `getMinimumTimelineWidthForZoom`

```ts
const getMinimumTimelineWidthForZoom = (zoomLevel: number) => {
    return MIN_TIMELINE_WIDTH * (1 + (zoomLevel - 1) * 0.25);
};
```

Comment cua file:

- logic cu: timeline ngan bi clamp cung mot min width => zoom 2 nhin gan nhu khong doi
- logic moi: min width tang theo zoom

Day la sua loi UX quan trong.

Y nghia:

Ngay ca khi project ngan, tang zoom van phai thay do thay doi that.

Day la quyet dinh dung, vi neu khong:

- user keo zoom ma khong thay doi
- cam giac zoom bi "hong"

Note:

- he so `0.25` hien tai la tham so tuning
- no co tac dong manh den project ngan hon la project dai

---

## F. Ham chinh - `computeTimelineZoom`

Day la ham trung tam cua file.

### Input

```ts
{
    durationInFrames,
    fps,
    zoomLevel,
}
```

### Output

`TimelineZoomComputed`

---

## G. Tung buoc tinh toan ben trong `computeTimelineZoom`

### Buoc 1 - Chuan hoa zoom

```ts
const safeZoom = clampZoom(zoomLevel);
```

Khong tin input tu ngoai vao.
Day la dung.

### Buoc 2 - Quy doi duration sang giay

```ts
const durationInSeconds = durationInFrames / fps;
```

Y nghia:

bucket rule hoat dong theo seconds, khong theo frames.

Day la quyet dinh hop ly vi semantic cua ruler / zoom policy thuong giong voi cam nhan theo giay.

### Buoc 3 - Chon bucket rule

```ts
const bucketRule = getDurationBucketRule(durationInSeconds);
```

Tu day ve sau, behavior zoom cua project da duoc "nhom" vao mot family.

### Buoc 4 - Lay `tickUnit` va `tickFrames`

```ts
const tickUnit = bucketRule.zoomMap[safeZoom];
const tickFrames = getTickUnitFrames(tickUnit, fps);
```

Day la bridge rat quan trong:

- `zoomMap` chon semantic tick family theo zoom
- `getTickUnitFrames` doi semantic do sang frame that

Can note:

- engine nay tin rang `zoomMap` co du key cho moi `safeZoom`
- neu spec thieu key, `tickUnit` co the ra `undefined`

Hien tai TypeScript co the dang cover mot phan qua typing, nhung ve runtime van la invariant ngam.

### Buoc 5 - Tail padding

```ts
const tailPaddingFrames = bucketRule.tailPaddingSeconds * fps;
```

Y nghia:

- Timeline khong ket thuc sat mep clip cuoi
- co them khoang trong phia sau

Gia tri nay anh huong truc tiep den:

- ruler visible tail
- cho de nhin playhead / clip ket thuc
- scroll feel gan cuoi project

### Buoc 6 - Padded visible duration va snap

```ts
const paddedVisibleDurationInFrames = snapUpToMultiple(
    durationInFrames + tailPaddingFrames,
    tickFrames,
);
```

Logic nay rat dep.

No ket hop 2 muc tieu:

1. them tail
2. dam bao ket thuc timeline van dung moc tick lon

### Buoc 7 - Ep so tick toi thieu

```ts
const minimumVisibleDurationInFrames = tickFrames * MIN_VISIBLE_TICK_COUNT;
const visibleDurationInFrames = Math.max(
    minimumVisibleDurationInFrames,
    paddedVisibleDurationInFrames,
);
```

Day la noi ma file chot chien luoc:

- project duration that co the ngan
- nhung timeline visible duration co the dai hon

Ly do:

- can du tick de ruler de doc

Day la logic dung cho UI editor.

Nhung can note ro:

file nay dang phan biet:

- project duration that
- timeline visible duration

Neu nguoi moi maintain khong nam duoc distinction nay, rat de gay bug.

### Buoc 8 - Tinh `tickCount`

```ts
const tickCount = Math.max(
    1,
    Math.round(visibleDurationInFrames / tickFrames),
);
```

Vi `visibleDurationInFrames` da duoc snap theo `tickFrames`, nen `round` o day thuong an toan.

Nhung ve mat y do, `Math.round` van hoi "mem" hon `Math.floor`/`Math.ceil`.

Neu sau nay boi canh thay doi va `visibleDurationInFrames` khong con duoc snap chac chan nua, day co the la diem de gay lech 1 tick.

### Buoc 9 - Tinh target spacing va computed width

```ts
const targetTickSpacingPx = getTargetTickSpacingPx(safeZoom);
const computedWidth = tickCount * targetTickSpacingPx;
```

Cong thuc nay noi len chinh sach rat ro:

- width cua timeline duoc dan dat chu yeu boi so major tick * spacing target

Tuc la zoom tang chu yeu lam:

- khoang cach tick tang

rat hop ly ve mat UX.

### Buoc 10 - Clamp minimum timeline width

```ts
const timelineWidth = Math.max(
    getMinimumTimelineWidthForZoom(safeZoom),
    computedWidth,
);
```

Buoc nay giai quyet bai toan project ngan.

No la mot lop bao hiem bo sung sau `MIN_VISIBLE_TICK_COUNT`.

Y nghia:

- du tick
- du width

ca hai deu phai co thi zoom moi "ra hinh".

### Buoc 11 - Tinh `pixelsPerFrame`

```ts
const usableWidth = Math.max(0, timelineWidth - 30);
const pixelsPerFrame =
    visibleDurationInFrames > 0 ? usableWidth / visibleDurationInFrames : 0;
```

Day la cho can note ky.

#### Tai sao co `- 30`

Day la mot offset hard-code.

Nghia la:

- engine dang biet ngầm rang co mot khoang width khong nen tinh vao mapping frame

Co the lien quan den:

- gutter
- visual padding
- ruler/head alignment

Nhung trong chinh file nay, khong co comment nao giai thich vi sao la `30`.

Day la magic number quan trong.

#### Tai sao `pixelsPerFrame` dung `visibleDurationInFrames`

Vi mapping ngang cua Timeline phai theo duration visible, khong phai project duration that.

Neu khong:

- ruler va clip width se lech nhau
- playhead seek mapping se sai

### Buoc 12 - Return object

File tra ve mot object rat gon, rat dung huong.

No cho phep caller lay toan bo derived data mot lan, tranh tinh lai tung manh ro roi.

---

## H. Invariant ma file nay dang giu

### Invariant 1

Timeline co the dai hon project duration that.

Day la chu truong co y.

### Invariant 2

Timeline luon co du mot muc tick toi thieu, ke ca project rong hoac rat ngan.

### Invariant 3

Zoom level hop le nam trong `1..10`.

### Invariant 4

Moi project duration se roi vao dung mot bucket rule.

### Invariant 5

`pixelsPerFrame` phai duoc tinh tu `visibleDurationInFrames`, khong phai tu `durationInFrames`.

Neu vo invariant nay, toan bo Timeline se lech scale.

---

## I. Diem manh cua file hien tai

1. La pure function + pure helper, rat de test

2. Boundary voi `timeline-zoom-spec.ts` kha ro

3. Da xu ly dung 2 bai toan UX ma editor timeline rat hay gap:

- zoom thay doi nhung nhin khong thay gi
- project ngan qua nen ruler qua it tick

4. Distinction giua `durationInFrames` va `visibleDurationInFrames` la dung va co gia tri lon

5. Tra ve mot goi computed data day du, caller de dung

---

## J. Code smell / risk / diem can de y

### 1. Nhieu magic number

Trong file nay co it nhat cac so can note:

- `191.9`
- `45`
- `10`
- `0.25`
- `30`

Chung deu co y nghia UX/layout, nhung hien tai chua duoc dat ten day du hoac giai thich sau hon.

### 2. Phu thuoc ngam vao thu tu cua `TIMELINE_DURATION_BUCKET_RULES`

`find(...)` gia dinh mang da sort tang dan theo `maxDurationSeconds`.

### 3. Phu thuoc ngam vao do day du cua `zoomMap`

Neu bucket nao do thieu key cho zoom 7, 8, 9, 10 thi runtime co the bi vo.

### 4. `usableWidth = timelineWidth - 30`

Day la risk maintainability kha cao vi no la offset co tinh "layout implementation detail" bi dat trong engine toan hoc.

Theo huong kien truc sach hon, offset nay nen:

- duoc dat ten ro nghia
hoac
- duoc dua sang mot constant chung co comment

### 5. `tickCount` dang dung `Math.round`

Hien tai chua thay bug, nhung day la diem can de mat neu sau nay bo snap hoac doi logic visible duration.

### 6. File khong tu validate input xau hon nua

Vi du:

- `fps = 0`
- `durationInFrames < 0`

Hien tai file dang tin caller.

Co the chap nhan duoc vi day la core internal utility, nhung can ghi nho dieu nay.

---

## K. Ket luan file nay

`timeline-zoom-engine.ts` la mot file nho nhung la "math contract" cua toan bo Timeline ngang.

Neu file nay sai, cac phan sau deu lech:

- ruler
- clip width
- seek mapping
- scroll range
- cam giac zoom

Hien tai file nay co chat luong kha tot:

- pure
- ro boundary
- quyet duoc dung van de UX that

Hai diem can de y lon nhat ve maintainability:

1. distinction giua `project duration` va `visible duration`
2. cum magic number / offset layout trong engine

Neu sau nay can refactor, huong tot nhat la:

- centralize theming/UX constants ro nghia hon
- bo sung test cases cho cac bucket duration + zoom extremes

---

## Thu tu review de xuat tiep theo

Sau `timeline-zoom-engine.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/components/preview/components/preview-stage.tsx`
2. `src/features/editor/components/preview/components/preview-viewport.tsx`
3. `src/features/editor/lib/get-preview-surface-layout.ts`

Ly do:

- `preview-stage.tsx` la lop gan nhat voi Remotion Player
- `preview-viewport.tsx` la geometry wrapper cua stage
- `get-preview-surface-layout.ts` la pure math core cua preview fit/fill

---

# File review 9 - `src/features/editor/components/preview/components/preview-stage.tsx`

## A. Vai tro cua file

Day la stage layer cua Preview.

No nam giua:

- `EditorPlayer` / `PreviewViewport`
va
- Remotion `Player`

Nhiem vu that cua file nay co 3 nhom:

1. mount Remotion `Player`
2. noi event tu `Player` ra callback cua parent
3. dat `PreviewTextOverlay` len tren composition render

Noi ngan gon:

- `EditorPlayer` lo runtime bridge
- `PreviewViewport` lo layout geometry
- `PreviewStage` lo canvas that + overlay editor

File nay rat quan trong cho preview/export parity, vi no la noi dau tien ta thay:

- cai gi la "render that" cua Remotion
- cai gi la "overlay HTML cua editor"

Neu boundary nay bi mo, code se rat nhanh tro nen kho maintain.

---

## B. Import va dependency

File import:

- `React`, `useEffect`
- `Player`, `PlayerRef` tu `@remotion/player`
- `ProjectVideoConfig`
- `useEditorStore`
- `EditorPreviewComposition`
- `getRemotionPlayerDurationInFrames`
- `PreviewTextOverlay`

Y nghia:

- file nay la noi duy nhat trong cum Preview dang cham truc tiep vao Remotion `Player`
- composition that duoc mount tu `EditorPreviewComposition`
- text selection/edit khong di qua composition ma di qua `PreviewTextOverlay`

Boundary nay la dung.

Day la mot quyet dinh kien truc quan trong:

- preview render layer
- editor interaction overlay

duoc tach thanh 2 lop ro rang.

---

## C. Props cua component

```ts
type PreviewStageProps = {
    playerRef: React.RefObject<PlayerRef | null>;
    video: ProjectVideoConfig;
    playbackDurationInFrames: number;
    width: number;
    height: number;
    isLoopEnabled: boolean;
    onFrameUpdate: (frame: number) => void;
    onPlay: () => void;
    onPause: () => void;
};
```

### 1. `playerRef`

Ref duoc parent quan ly.

File nay khong so huu Player state, no chi mount `Player` va gan ref vao.

Day la dung vi:

- parent can seek/play/pause imperatively
- stage khong nen om runtime state

### 2. `video`

Chua thong tin co ban cua composition:

- `fps`
- `width`
- `height`

Dung de config `Player`.

### 3. `playbackDurationInFrames`

Day la duration UI/editor da duoc tinh toan o tang tren.

File nay khong tu tinh lai playback duration.
No chi doi sang duration phu hop voi Remotion Player qua helper:

- `getRemotionPlayerDurationInFrames(...)`

Day la diem dung.

### 4. `width`, `height`

Kich thuoc rendered that cua stage trong viewport hien tai.

Khong phai composition size.

Day la distinction can nho:

- `width/height` = kich thuoc preview surface dang hien tren man hinh
- `video.width/video.height` = kich thuoc composition goc

### 5. `isLoopEnabled`

Forward thang vao `Player`.

### 6. `onFrameUpdate`
### 7. `onPlay`
### 8. `onPause`

Day la callback bridge.

File nay nhan event tu Remotion Player roi day len parent.

No khong chua logic business cho play/pause/frameupdate.

Day la boundary tot.

---

## D. Store data ma file doc

File nay doc duy nhat:

```ts
const project = useEditorStore((state) => state.project);
```

Y nghia:

- moi khi project doi, `Player` se nhan `inputProps={{ project }}`

Day la source du lieu render that cua composition.

Can note ro:

File nay khong doc `currentFrame`, `status`, `selection`, `zoom`.

No chi quan tam du lieu composition that.

Day la cach giam coupling dung.

---

## E. `useEffect` dang co trong file

File nay chi co 1 `useEffect`.
Nhung day la effect quan trong.

### Muc dich

Dang ky event listener cho Remotion `Player`.

Code:

```tsx
useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleFrameUpdate = () => {
        onFrameUpdate(player.getCurrentFrame());
    };

    const handlePlay = () => {
        onPlay();
    };

    const handlePause = () => {
        onPause();
    };

    player.addEventListener("frameupdate", handleFrameUpdate);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);

    return () => {
        player.removeEventListener("frameupdate", handleFrameUpdate);
        player.removeEventListener("play", handlePlay);
        player.removeEventListener("pause", handlePause);
    };
}, [onFrameUpdate, onPlay, onPause, playerRef]);
```

### Giai thich

#### `frameupdate`

Moi khi Remotion Player phat frame event, file nay goi:

- `onFrameUpdate(player.getCurrentFrame())`

Tuc la:

- Player la nguon phat sinh frame render that
- parent la noi quyet dinh se lam gi voi frame do

#### `play`

Forward event len parent.

#### `pause`

Forward event len parent.

### Diem manh

- cleanup day du
- khong dua business logic vao effect nay

### Diem can note

Effect nay tin rang:

- `playerRef.current` da ton tai khi effect chay

Thong thuong se on vi `Player` duoc render trong cung component, nhung do lifecycle cua ref va effect la chi tiet de nhay cam, day la mot invariant ngam.

Neu sau nay doi cau truc mount/unmount cua `Player`, can xem lai do on dinh cua effect nay.

---

## F. JSX / HTML structure hien tai

File render:

```tsx
<div className='relative overflow-hidden' style={{ width, height }}>
    <Player ... />
    <PreviewTextOverlay ... />
</div>
```

Day la structure rat quan trong.

### 1. Wrapper root

`relative overflow-hidden`

Y nghia:

- tao containing block cho overlay
- cat bo phan du cua content/overlay neu vuot khoi stage

Day la dung.

### 2. `<Player ... />`

Day la render layer that.

Props dang su dung:

- `ref={playerRef}`
- `component={EditorPreviewComposition}`
- `inputProps={{ project }}`
- `durationInFrames={getRemotionPlayerDurationInFrames(playbackDurationInFrames)}`
- `fps={video.fps}`
- `compositionWidth={video.width}`
- `compositionHeight={video.height}`
- `controls={false}`
- `autoPlay={false}`
- `loop={isLoopEnabled}`
- `style={{ width: "100%", height: "100%" }}`
- `acknowledgeRemotionLicense`

#### `component={EditorPreviewComposition}`

File nay co mot quyet dinh ro:

Preview that cua editor duoc render boi composition that.

Day la nen tang de ve sau export co the giong preview.

#### `inputProps={{ project }}`

Day la bridge du lieu that tu editor store vao composition.

Comment cua file da note ro:

- logic cu: truyen input rong
- logic moi: truyen du lieu project that

Day la thay doi rat quan trong cho preview/export parity.

#### `durationInFrames={getRemotionPlayerDurationInFrames(...)}`

Can note ky:

Remotion Player va UI editor khong dung chung semantics duration.

UI cho phep dung o:

- end boundary

con Player phai nhan duration renderable hop le.

File nay khong tu giai bai toan do, no goi helper.

Day la dung vi semantics duration nen duoc centralize.

#### `controls={false}`

Editor dang khong dung control mac dinh cua Remotion.

Day la quyet dinh dung, vi Timeline toolbar moi la control system chinh.

#### `autoPlay={false}`

Player khong tu play theo mount.

Business flow playback thuoc parent/store.

#### `loop={isLoopEnabled}`

Loop state duoc parent dua vao, stage chi forward.

### 3. `<PreviewTextOverlay ... />`

Day la editor interaction overlay cho Text.

Props:

- `compositionWidth`
- `compositionHeight`
- `renderedWidth`
- `renderedHeight`

Y nghia:

Overlay can biet:

- he toa do goc cua composition
- kich thuoc that dang render tren man hinh

de map transform/text box dung.

Day la mot boundary rat quan trong:

- text van duoc render that trong composition
- nhung selection/edit/resize box la HTML overlay

Neu khong nam boundary nay, rat de nham rang overlay la "render source that" cua text.

---

## G. Invariant ma file nay dang giu

### Invariant 1

Remotion `Player` moi la noi render preview that cua composition.

### Invariant 2

`PreviewTextOverlay` la lop editor UI, khong phai lop render composition goc.

### Invariant 3

Stage size tren man hinh va composition size goc la 2 khai niem khac nhau.

### Invariant 4

Playback event flow la:

- Player phat event
- `PreviewStage` forward event
- parent/store quyet dinh business state

### Invariant 5

`project` la input render that cua Preview composition.

Neu `project` sai, Preview sai; stage khong co lop sua loi o giua.

---

## H. Diem manh cua file hien tai

1. File ngan, boundary ro

2. Phan tach tot giua render layer va overlay layer

3. Event bridge don gian, de ly giai

4. Khong nhoi playback business logic vao file nay

5. Dung helper duration rieng, tranh hard-code semantics Player trong component

---

## I. Code smell / risk / diem can de y

### 1. File subscribe trucc tiep vao `project`

Dieu nay la dung theo kien truc hien tai.

Nhung can note:

- moi thay doi project se chay lai render path cua `Player`

Voi du lieu media lon, can luon de mat toi so lan project object doi.

### 2. Effect dang dua vao `playerRef.current` o mount time

Neu co case Player ref chua san sang dung luc effect chay dau tien, event co the chua dang ky.

Hien tai kha nang thap, nhung day la cho can de mat neu thay doi cau truc mount.

### 3. `PreviewTextOverlay` hien tai la text-only

Kien truc file nay da mo san mo hinh overlay editor.

Neu sau nay them transform handles cho image/video/shape, file nay co the se la noi dat them overlay khac.

Can giu ky boundary de file nay khong bien thanh "dump layer cua moi overlay".

### 4. `controls={false        }`

Chi tiet nho, nhung style source code dang co spacing le.

Khong gay bug, nhung la dau hieu file da bi chinh sua nhanh o mot giai doan nao do.

### 5. File nay phu thuoc manh vao `EditorPreviewComposition`

Neu composition doi contract input, file nay bi anh huong ngay.

Boundary dung, nhung coupling la that.

---

## J. Ket luan file nay

`preview-stage.tsx` la file nho nhung rat "structural".

No quyet dinh ro rang rang:

- preview that = Remotion Player + composition
- editor text interaction = HTML overlay

Day la mot phan tach dung va nen duoc giu rat chac.

Neu sau nay editor mo rong:

- image transform handles
- video crop handles
- selection overlay cho shape

thi file nay van co the tiep tuc dong vai tro stage root,
nhung can can than de khong bien no thanh noi nhon tat ca overlay vao mot cuc.

---

## Thu tu review de xuat tiep theo

Sau `preview-stage.tsx`, thu tu hop ly tiep theo:

1. `src/features/editor/components/preview/components/preview-viewport.tsx`
2. `src/features/editor/lib/get-preview-surface-layout.ts`
3. `src/features/editor/components/preview/index.tsx` (chi revisit neu sau nay doi architecture)

Ly do:

- `preview-viewport.tsx` la wrapper geometry truc tiep cua stage
- `get-preview-surface-layout.ts` la pure math engine cua fit/fill
- `preview/index.tsx` da duoc review roi, chi can quay lai neu preview state doi lon

---

# File review 10 - `src/features/editor/components/preview/components/preview-viewport.tsx`

## A. Vai tro cua file

Day la geometry wrapper cua Preview stage.

File nay khong lo:

- playback state
- player event
- text editing
- project data

No chi lo:

1. tinh layout cua preview surface trong container
2. dat `PreviewStage` vao dung vi tri va dung kich thuoc

Noi ngan gon:

- `EditorPlayer` lo runtime
- `PreviewViewport` lo geometry
- `PreviewStage` lo render canvas + overlay

Boundary nay rat dep va dang duoc giu kha sach.

---

## B. Import va dependency

File import:

- `React`, `useMemo`
- `PlayerRef`
- `ProjectVideoConfig`
- `PreviewViewportState`
- `getPreviewSurfaceLayout`
- `PreviewStage`

Y nghia:

- file nay dung state da duoc parent gom san
- file nay dung mot pure layout helper de tinh geometry
- file nay khong doc store truc tiep

Day la diem manh.

Preview geometry dang duoc viet theo huong:

- data vao tu props
- math trong helper
- render o component

rat de maintain.

---

## C. Props cua component

```ts
type PreviewViewportProps = {
    playerRef: React.RefObject<PlayerRef | null>;
    video: ProjectVideoConfig;
    playbackDurationInFrames: number;
    viewport: PreviewViewportState;
    isLoopEnabled: boolean;
    onFrameUpdate: (frame: number) => void;
    onPlay: () => void;
    onPause: () => void;
};
```

### 1. `playerRef`

Forward xuong `PreviewStage`.

File nay khong dung truc tiep, chi chuyen tiep.

### 2. `video`

Chua composition size goc:

- `width`
- `height`

Thong tin nay can de tinh ti le fit/fill.

### 3. `playbackDurationInFrames`

Forward xuong `PreviewStage`.

Khong tham gia tinh geometry.

### 4. `viewport`

Day la prop trung tam cua file.

Nho no, file biet:

- `containerWidth`
- `containerHeight`
- `zoom`
- `mode`

Tuc la file nay co du data de tinh:

- preview dang fit hay mode khac
- preview dang zoom bao nhieu
- container hien tai rong/cao bao nhieu

### 5. `isLoopEnabled`, `onFrameUpdate`, `onPlay`, `onPause`

Cac prop nay deu duoc forward xuong `PreviewStage`.

Tuc la file nay khong "tieu thu" business playback.

Day la dung.

---

## D. Logic chinh trong file

File nay chi co 1 logic chinh:

### `layout = useMemo(...)`

```tsx
const layout = useMemo(() => {
    return getPreviewSurfaceLayout({
        containerWidth: viewport.containerWidth,
        containerHeight: viewport.containerHeight,
        compositionWidth: video.width,
        compositionHeight: video.height,
        zoom: viewport.zoom,
        mode: viewport.mode,
        padding: 24,
    });
}, [
    video.width,
    video.height,
    viewport.containerWidth,
    viewport.containerHeight,
    viewport.zoom,
    viewport.mode,
]);
```

### Y nghia cua tung input

- `containerWidth`, `containerHeight`
  - kich thuoc khung Preview dang co
- `compositionWidth`, `compositionHeight`
  - size goc cua video/project
- `zoom`
  - muc phong/thu preview
- `mode`
  - fit/fill/neu sau nay co them mode khac
- `padding: 24`
  - khoang dem quanh preview surface

### Y nghia cua `useMemo`

File nay tranh tinh lai geometry neu cac input khong doi.

Do `getPreviewSurfaceLayout(...)` la pure helper, day la cach dung rat hop ly.

### Note quan trong

`padding: 24` hien tai dang la hard-code o ngay component layer.

Tuc la:

- policy ve khoang dem preview dang nam trong component
- khong nam trong helper hay mot theme constant chung

Khong sai, nhung can note de maintainability.

---

## E. HTML / JSX structure hien tai

File render:

```tsx
<div className='relative h-full w-full min-h-0 min-w-0 overflow-hidden'>
    <div
        className='absolute'
        style={{
            left: layout.offsetX,
            top: layout.offsetY,
            width: layout.renderedWidth,
            height: layout.renderedHeight,
        }}>
        <PreviewStage ... />
    </div>
</div>
```

### 1. Outer wrapper

`relative h-full w-full min-h-0 min-w-0 overflow-hidden`

Y nghia:

- chiem toan bo khung ma parent cap
- tao containing block cho preview surface ben trong
- cat phan du neu preview surface vuot bien

### 2. Inner absolute surface

Day la "preview surface box" that su.

No duoc dat bang:

- `left: layout.offsetX`
- `top: layout.offsetY`
- `width: layout.renderedWidth`
- `height: layout.renderedHeight`

Tuc la:

- helper tinh geometry
- component ap geometry do len DOM

Day la phan tach rat ro.

### 3. `PreviewStage`

Stage duoc render ben trong box da duoc tinh geometry.

Tuc la Stage khong can biet minh dang nam giua, le trai, hay zoom bao nhieu.

No chi nhan width/height cuoi cung.

Day la coupling dung huong.

---

## F. Invariant ma file nay dang giu

### Invariant 1

Preview geometry la mot bai toan rieng biet khoi playback/runtime.

### Invariant 2

`PreviewStage` luon render ben trong mot box da duoc tinh san:

- vi tri
- width
- height

### Invariant 3

Composition size goc va rendered surface size la 2 khai niem khac nhau.

### Invariant 4

Layout phai duoc tinh tu pure helper, khong rải cong thuc geometry trong JSX.

---

## G. Diem manh cua file hien tai

1. File rat gon va ro boundary

2. Khong doc store truc tiep

3. Geometry duoc delegate cho pure helper

4. Stage khong bi nhoi logic tinh offset/fit vao ben trong

5. De test va de thay the mode/layout ve sau

---

## H. Code smell / risk / diem can de y

### 1. `padding: 24` la magic number

No co y nghia UI ro, nhung hien tai chua duoc dat ten.

Neu sau nay:

- fullscreen can padding khac
- responsive mode can padding khac

thi file nay se la noi phai sua.

### 2. File tin rang `viewport` da day du va hop le

Neu parent dua:

- width = 0
- height = 0
- mode khong hop le

thi geometry helper phai la lop xu ly tiep theo.

Tuc la file nay rat mong va tin input.

### 3. File hien tai chua can nhac `viewport.isFullscreen`

No dung `viewport.zoom` va `viewport.mode`, nhung khong doc `viewport.isFullscreen`.

Dieu nay co the chap nhan duoc neu fullscreen chi la wrapper concern o tang tren.

Nhung can note:

- type da co field nay
- component hien tai khong can no

### 4. Mọi behavior geometry hien tai deu bi gom vao `getPreviewSurfaceLayout`

Day la dung.

Nhung dieu do cung co nghia:

- neu preview bi lech
- bi fit sai
- bi scale sai

rat co the bug that su nam o helper, khong nam o file nay.

---

## I. Ket luan file nay

`preview-viewport.tsx` la mot wrapper geometry rat sach.

No lam dung mot viec:

- tinh va ap layout preview surface

No khong om them viec khac.

Day la mot file de maintain va dang o trang thai tot.

Diem can de y lon nhat cua file hien tai khong phai logic, ma la:

- `padding: 24`
- su phu thuoc vao contract cua `getPreviewSurfaceLayout`

Neu sau nay Preview them:

- zoom mode that
- fit/fill mode that
- center / top-left anchoring

thi file nay van co the giu vai tro wrapper geometry, con phan thay doi lon se tap trung o helper.

---

## Thu tu review de xuat tiep theo

Sau `preview-viewport.tsx`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/get-preview-surface-layout.ts`
2. `src/features/editor/components/preview/hooks/use-element-size.ts`
3. `src/features/editor/lib/playback-duration.ts`

Ly do:

- `get-preview-surface-layout.ts` la pure math core ngay sau file nay
- `use-element-size.ts` cap nguon geometry input cho Preview
- `playback-duration.ts` la helper cuc quan trong cho ca Preview va Timeline

---

# File review 11 - `src/features/editor/lib/get-preview-surface-layout.ts`

## A. Vai tro cua file

Day la pure math helper de tinh layout cho preview surface.

No nhan vao:

- kich thuoc container
- kich thuoc composition
- zoom
- mode
- padding

roi tra ra:

- `scale`
- `renderedWidth`
- `renderedHeight`
- `offsetX`
- `offsetY`

File nay khong render UI, khong doc store, khong biet Player hay overlay.

Day la "geometry contract" cua Preview.

Tuc la:

- `preview-viewport.tsx` dua input
- file nay tinh layout
- `preview-viewport.tsx` ap ket qua vao DOM

Boundary nay rat sach.

---

## B. Import va dependency

File import:

- `Pixels`
- `PreviewSurfaceLayout`
- `PreviewViewportMode`

Y nghia:

- file nay dung type chung cua feature preview
- khong phu thuoc React
- khong phu thuoc store

Day la helper ly tuong de test don vi.

---

## C. Input type - `GetPreviewSurfaceLayoutParams`

```ts
type GetPreviewSurfaceLayoutParams = {
    containerWidth: Pixels;
    containerHeight: Pixels;
    compositionWidth: number;
    compositionHeight: number;
    zoom?: number;
    mode?: PreviewViewportMode;
    padding?: number;
};
```

### 1. `containerWidth`, `containerHeight`

Kich thuoc khung ngoai ma preview duoc phep nam trong do.

### 2. `compositionWidth`, `compositionHeight`

Kich thuoc goc cua composition/video.

### 3. `zoom`

He so phong/thu them sau khi da co base fit/fill scale.

Default:

- `1`

### 4. `mode`

Kieu layout viewport.

Hien tai file support:

- `fit`
- `fill`

Default:

- `fit`

### 5. `padding`

Khoang dem xung quanh preview surface trong container.

Default:

- `24`

Day la mot policy UI duoc helper ho tro truc tiep.

---

## D. Contract output - `PreviewSurfaceLayout`

File tra ra:

- `scale`
- `renderedWidth`
- `renderedHeight`
- `offsetX`
- `offsetY`

Y nghia:

### 1. `scale`

Scale cuoi cung da bao gom:

- fit/fill scale co so
- zoom multiplier

### 2. `renderedWidth`, `renderedHeight`

Kich thuoc that cua preview surface sau khi scale.

### 3. `offsetX`, `offsetY`

Vi tri cua preview surface trong container.

Hien tai file dang center surface bang cach tinh offset giua container va rendered size.

---

## E. Tung buoc tinh toan ben trong ham

### Buoc 1 - Default parameter

```ts
zoom = 1,
mode = "fit",
padding = 24,
```

Day la default ro rang va hop ly.

Can note:

- helper nay co the duoc goi tu nhieu noi khac nhau ma khong can luc nao cung truyen du param

### Buoc 2 - Tinh available area

```ts
const availableWidth = Math.max(containerWidth - padding * 2, 0);
const availableHeight = Math.max(containerHeight - padding * 2, 0);
```

Y nghia:

preview surface khong duoc tinh tren toan bo container,
ma phai tru ra padding hai ben.

Dung `Math.max(..., 0)` de tranh area am.

Day la guard dung.

### Buoc 3 - Guard invalid input

```ts
if (
    availableWidth <= 0 ||
    availableHeight <= 0 ||
    compositionWidth <= 0 ||
    compositionHeight <= 0
) {
    return {
        scale: 0,
        renderedWidth: 0,
        renderedHeight: 0,
        offsetX: 0,
        offsetY: 0,
    };
}
```

File nay khong throw error.
No fail-soft bang object 0.

Day la lua chon hop ly cho UI helper.

Y nghia:

- khi container chua do xong
- hoac du lieu video chua hop le

Preview co the "im lang" render 0-size thay vi vo app.

### Buoc 4 - Tinh scale theo tung truc

```ts
const scaleX = availableWidth / compositionWidth;
const scaleY = availableHeight / compositionHeight;
```

Day la co so cua bai toan fit/fill.

### Buoc 5 - Chon `baseScale`

```ts
const baseScale =
    mode === "fill" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
```

Day la tam diem cua helper.

#### Neu `fit`

Dung `Math.min(scaleX, scaleY)`

=> composition nam tron trong available area

#### Neu `fill`

Dung `Math.max(scaleX, scaleY)`

=> composition lap day available area, co the bi crop mot chieu

Logic nay dung chuan.

### Buoc 6 - Ap them zoom

```ts
const scale = baseScale * zoom;
```

Can note ro:

zoom o day khong thay the fit/fill.
No la multiplier sau fit/fill.

Tuc la:

- zoom = 1 => fit/fill "nguyen ban"
- zoom > 1 => phong to tren nen fit/fill do
- zoom < 1 => thu nho tren nen fit/fill do

Day la semantics hop ly.

### Buoc 7 - Tinh rendered size

```ts
const renderedWidth = compositionWidth * scale;
const renderedHeight = compositionHeight * scale;
```

Khong co gi phuc tap, nhung day la source that cua size surface.

### Buoc 8 - Center trong container

```ts
const offsetX = (containerWidth - renderedWidth) / 2;
const offsetY = (containerHeight - renderedHeight) / 2;
```

Day la quyet dinh geometry quan trong:

Preview hien tai luon center.

Khong co:

- top align
- left align
- custom anchor

Can note ro vi day la policy UI, khong chi la toan hoc.

---

## F. Y nghia quan trong cua `offsetX`, `offsetY`

Can note ky diem nay.

`offsetX`/`offsetY` co the am.

Khi nao?

- `mode = "fill"`
- hoac `zoom > 1`

luc do `renderedWidth` hoac `renderedHeight` co the lon hon container.

Neu lon hon container:

- `offsetX` hoac `offsetY` se am

Dieu nay khong phai bug.
Day la behavior mong doi.

Nho no:

- preview van duoc center
- phan du bi crop boi outer `overflow-hidden`

Day la canh rat quan trong de nguoi maintain khong nham:

- offset am khong dong nghia layout sai

---

## G. Invariant ma file nay dang giu

### Invariant 1

Preview surface duoc canh giua trong container.

### Invariant 2

`fit` va `fill` duoc xac dinh theo quy tac:

- fit = min
- fill = max

### Invariant 3

`zoom` la multiplier sau base scale, khong phai replacement cho mode.

### Invariant 4

Input xau hoac container/chieu video khong hop le se tra ve layout 0-size, khong throw.

### Invariant 5

Padding duoc tru truoc khi tinh fit/fill scale.

---

## H. Diem manh cua file hien tai

1. Pure function, rat de test

2. Cong thuc ro rang, de ly giai

3. Da xu ly invalid input fail-soft

4. Semantics fit/fill dung chuan

5. Distinction giua available area va full container ro rang

---

## I. Code smell / risk / diem can de y

### 1. `padding = 24` van la policy UI trong helper

Khong sai, nhung no co nghia helper nay khong hoan toan "neutral".

No da mang mot gia tri UI mac dinh.

### 2. Khong co clamp cho `zoom`

Neu caller dua:

- `zoom = 0`
- `zoom < 0`
- `zoom = 100`

file nay van tinh binh thuong.

Dieu nay co the chap nhan duoc neu parent da dam bao contract.

Nhung can note:

helper nay dang tin caller.

### 3. Chi support center anchor

Neu sau nay can:

- top-left anchor
- top-center
- pan viewport

helper nay se phai mo rong contract.

### 4. `mode` hien tai chi re nhanh `fill` va con lai coi nhu `fit`

Dieu nay on neu `PreviewViewportMode` da rat chat.

Nhung neu sau nay them mode moi:

- "contain"
- "cover"
- "actual-size"

thi helper nay se la noi phai sua dau tien.

### 5. Layout 0-size la fail-soft, nhung cung co the che bug

Vi helper khong throw, mot so bug input co the chi hien thanh "preview khong thay gi".

Khong nhat thiet xau, nhung debug se can biet dieu nay.

---

## J. Ket luan file nay

`get-preview-surface-layout.ts` la mot helper geometry rat sach va dung huong.

No dang giu dung cac luat nen tang cua Preview:

- fit/fill
- zoom multiplier
- center alignment
- padding
- fail-soft invalid input

Day la mot file co chat luong tot.

Diem can de y lon nhat cua file hien tai la:

1. `offset` am co the la behavior dung, khong phai bug
2. `zoom` dang khong duoc clamp o helper
3. policy UI ve padding/center dang duoc ma hoa ngay trong geometry helper

---

## Thu tu review de xuat tiep theo

Sau `get-preview-surface-layout.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/components/preview/hooks/use-element-size.ts`
2. `src/features/editor/lib/playback-duration.ts`
3. `src/features/editor/lib/preview-seek.ts`

Ly do:

- `use-element-size.ts` la nguon input geometry cua Preview
- `playback-duration.ts` quyet dinh semantics duration cho Preview va Timeline
- `preview-seek.ts` la utility lien quan den scrub / preview sync

---

# File review 12 - `src/features/editor/components/preview/hooks/use-element-size.ts`

## A. Vai tro cua file

Day la hook do kich thuoc DOM element.

No tra ve:

- `ref`
- `size`

de caller co the:

1. gan `ref` vao mot element
2. nhan `width` / `height` that cua element do theo thoi gian

Trong editor hien tai, hook nay dong vai tro nguon geometry input cho Preview.

Noi cach khac:

- container thay doi size
- hook nay cap nhat `size`
- `EditorPlayer` dua `size` vao `PreviewViewport`
- Preview geometry duoc tinh lai

Day la mot hook nho nhung nam tren duong data rat quan trong.

---

## B. Import va dependency

File import:

- `useEffect`
- `useRef`
- `useState`

Khong co dependency ngoai.
Khong doc store.
Khong doc window size truc tiep.

Hook nay dua hoan toan vao:

- `ResizeObserver`

Day la lua chon dung cho bai toan do size theo element, khong theo viewport toan cuc.

---

## C. API cua hook

```ts
export const useElementSize = <T extends HTMLElement>() => {
    const ref = useRef<T | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    ...
    return { ref, size };
};
```

### 1. Generic `<T extends HTMLElement>`

Hook nay generic theo loai element.

Y nghia:

- caller co the dung voi `HTMLDivElement`, `HTMLCanvasElement`, ...
- `ref` co type ro rang hon

Day la diem tot cho TypeScript.

### 2. `ref`

`ref` la dau vao cho `ResizeObserver`.

### 3. `size`

State local luu:

- `width`
- `height`

Mac dinh:

- `0`
- `0`

Dieu nay hop ly, vi truoc khi mount/do xong thi chua co size that.

---

## D. `useEffect` duy nhat trong file

Hook nay chi co mot effect.

Code:

```tsx
useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const { width, height } = entry.contentRect;
        setSize({
            width,
            height,
        });
    });

    observer.observe(element);

    return () => {
        observer.disconnect();
    };
}, []);
```

### Buoc 1 - Lay `element` tu ref

Neu chua co element:

- return som

Day la guard co ban.

### Buoc 2 - Tao `ResizeObserver`

Observer lang nghe size thay doi cua element.

### Buoc 3 - Lay `entries[0]`

Hook nay gia dinh:

- moi observer chi observe 1 element

Dieu nay dung voi implementation hien tai.

### Buoc 4 - `setSize(...)`

Moi lan `ResizeObserver` phat event, hook set state moi voi:

- `width`
- `height`

### Buoc 5 - `observer.observe(element)`

Bat dau theo doi element.

### Buoc 6 - Cleanup

`observer.disconnect()`

Day la cleanup dung va day du.

---

## E. Y nghia implementation hien tai

Hook nay chon mo hinh:

- state driven
- observer driven

Tuc la no khong:

- poll
- nghe `window.resize` thong thuong
- do bang `getBoundingClientRect()` moi render

Day la cach dung hien dai va hop ly.

No cung co nghia:

- size chi doi khi observer phat event
- moi thay doi size se gay re-render cho component dung hook

Trong case Preview, day la mong doi dung.

---

## F. Invariant ma file nay dang giu

### Invariant 1

Hook chi theo doi mot element duy nhat thong qua `ref.current`.

### Invariant 2

`size` la `contentRect` cua element, khong phai outer box hay screen viewport.

### Invariant 3

Truoc khi observer phat event, `size` co the la `0 x 0`.

### Invariant 4

Moi resize event deu co the dan den `setState`.

### Invariant 5

Hook khong tu debounce/throttle resize update.

---

## G. Diem manh cua file hien tai

1. Rat gon va de ly giai

2. Generic, type on

3. Dung `ResizeObserver`, dung bai toan

4. Cleanup ro rang

5. Khong tron geometry policy vao hook

Hook chi cap raw size.

---

## H. Code smell / risk / diem can de y

### 1. Khong do size ngay bang read lan dau ngoai observer

Hook hien tai tin rang `ResizeObserver` se phat event som sau khi observe.

Thong thuong dung.

Nhung can note:

- hook khong co doan explicit read nhu `element.getBoundingClientRect()`

nen o mot so boi canh, component co the tra ve `0 x 0` them mot nhip dau tien.

### 2. `setSize` moi lan observer fire, khong check size co that su doi khong

Hien tai hook se set object moi cho moi callback.

Neu observer phat callback voi cung size, component van co the re-render.

Tuy nho, nhung day la diem co the optimize neu can.

### 3. Effect dependency de rong

Hook gia dinh `ref.current` se on dinh sau mount.

Neu caller doi element that su ma khong unmount remount hook, effect nay khong tu observe lai element moi.

Trong case thong thuong cua React ref tren mot element on dinh thi on.

Nhung day la assumption ngam can note.

### 4. Khong handle absence cua `ResizeObserver`

Trong moi truong hien dai thi thuong khong sao.

Nhung hook nay dang tin runtime environment co san API do.

### 5. Hook tra raw number, khong rounding

`contentRect.width/height` co the la so thuc.

Dieu nay hop ly.

Nhung neu caller can integer semantics thi phai tu xu ly.

---

## I. Ket luan file nay

`use-element-size.ts` la mot hook nho, sach va dung muc dich.

No dang lam dung mot viec:

- cap raw element size theo resize observer

Khong them policy geometry, khong them business logic.

Day la chat luong tot.

Hai diem can de y lon nhat:

1. hook dang tin `ResizeObserver` callback la du cho lan do dau tien
2. hook dang set state tren moi callback ma khong so sanh width/height cu moi

Neu sau nay can toi uu nhe, day la hai diem co the cham toi dau tien.

---

## Thu tu review de xuat tiep theo

Sau `use-element-size.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/playback-duration.ts`
2. `src/features/editor/lib/preview-seek.ts`
3. `src/features/editor/lib/timeline-math.ts`

Ly do:

- `playback-duration.ts` quyet dinh semantics duration cho ca Preview va Timeline
- `preview-seek.ts` lien quan truc tiep den scrub sync
- `timeline-math.ts` la helper core cua mapping frame <-> pixel

---

# File review 13 - `src/features/editor/lib/playback-duration.ts`

## A. Vai tro cua file

Day la file helper nho, nhung rat quan trong cho semantics duration cua editor.

No giu 2 khai niem duration khac nhau:

1. duration cua editor UI / timeline
2. duration can dua vao Remotion Player

Day la distinction cuc ky quan trong.

Neu gom chung 2 khai niem nay lai, editor se rat de gap cac bug da tung xay ra:

- project rong van co fake duration
- clip dat lech khoi `00:00` thi preview ket thuc qua som
- UI dung o end boundary nhung Player khong render frame do

File nay dang la noi centralize cho distinction do.

---

## B. Import va dependency

File import:

- `EditorProject`
- `Frames`

Khong doc store.
Khong phu thuoc React.
Khong phu thuoc Remotion API truc tiep.

Day la pure domain helper.

Rat de test va rat nen test.

---

## C. Ham 1 - `getEditorPlaybackDurationInFrames`

```ts
export const getEditorPlaybackDurationInFrames = (
    project: EditorProject,
): Frames => { ... }
```

### Muc dich

Tinh duration that cua project theo goc nhin cua editor.

Noi ro hon, day la end boundary ma:

- Timeline toolbar hien thi
- playhead UI co the dung toi
- logic seek/play/ended cua editor dang dua vao

### Logic ben trong

#### Nhanh 1 - Project rong

```ts
if (project.clips.length === 0) {
    return 0;
}
```

Comment cua file da note ro:

- cu: project rong co fake duration 10s
- moi: project rong = 0, con ruler visibility do zoom lo

Day la thay doi dung huong.

No tach 2 bai toan:

- project co noi dung hay khong
- timeline co du tick de nhin hay khong

Hai bai toan nay khong nen bi tron voi nhau.

#### Nhanh 2 - Tinh `maxClipEnd`

```ts
const maxClipEnd = project.clips.reduce((maxEnd, clip) => {
    return Math.max(maxEnd, clip.from + clip.durationInFrames);
}, 0);
```

Day la logic cot loi cua file.

Y nghia:

duration that cua project khong duoc dua tren asset length cua clip.
No phai dua tren vi tri ket thuc xa nhat tren timeline.

Neu co clip:

- bat dau tu frame 300
- dai 120 frame

thi end boundary that la:

- `420`

khong phai `120`.

Day la bug lon da tung xuat hien va file nay dang sua dung goc re cua no.

#### Nhanh 3 - Return gia tri cuoi cung

```ts
return Math.max(project.video.durationInFrames, maxClipEnd);
```

Comment cua file da note:

- logic cu tin vao `project.video.durationInFrames`
- logic moi theo real timeline end boundary

Can note ky:

file nay khong bo hẳn `project.video.durationInFrames`.
No van lay `Math.max(...)`.

Y nghia:

- neu metadata duration trong project dang lon hon max clip end, editor van giu gia tri lon hon do

Dieu nay co the hop ly hoac cung co the la policy can theo doi them, tuy vao y nghia that su cua `project.video.durationInFrames` trong model.

Trong state hien tai cua codebase, day la mot guard bao hiem hop ly.

---

## D. Y nghia cua `Math.max(project.video.durationInFrames, maxClipEnd)`

Day la diem can tach rieng vi no quan trong.

No cho thay model hien tai dang co 2 nguon duration:

1. `project.video.durationInFrames`
2. timeline-derived `maxClipEnd`

File nay chon:

- end boundary editor = gia tri lon hon trong 2 nguon

Dieu nay giai quyet duoc bug preview ket thuc som.

Nhung dong thoi cung cho thay:

- model duration cua project chua hoan toan "single source of truth"

Day khong nhat thiet la sai.
Nhung can note cho maintainability.

Neu sau nay muon model sach hon, co the se can quyet dinh ro:

- `project.video.durationInFrames` la metadata goc
hay
- `project.video.durationInFrames` la duration editor that

Hien tai file nay dang dong vai tro dung hoa hai nguon do.

---

## E. Ham 2 - `getRemotionPlayerDurationInFrames`

```ts
export const getRemotionPlayerDurationInFrames = (
    playbackDurationInFrames: Frames,
): Frames => {
    return Math.max(1, playbackDurationInFrames);
};
```

### Muc dich

Remotion Player khong nhan duration bang 0.

Trong khi editor UI co the co duration bang 0.

Nen can mot helper chuyen doi semantics:

- editor duration co the = 0
- player duration phai >= 1

Day la distinction nho nhung rat quan trong.

Neu bo helper nay:

- project rong co the lam Player vo hoac khong render dung

### Tai sao helper nay can tach rieng

Neu hard-code `Math.max(1, ...)` o moi noi dung Player:

- semantics se bi rai rac
- de sai lech ve sau

Hien tai tach helper rieng la dung huong.

---

## F. Invariant ma file nay dang giu

### Invariant 1

Editor duration va Remotion Player duration khong cung semantics.

### Invariant 2

Project rong trong editor co duration = 0.

### Invariant 3

End boundary that cua project phai tinh theo clip end xa nhat tren timeline.

### Invariant 4

Remotion Player duration luon phai >= 1.

### Invariant 5

`project.video.durationInFrames` van la mot input duoc can nhac, khong bi bo qua hoan toan.

---

## G. Diem manh cua file hien tai

1. Rat gon, de ly giai

2. Centralize dung mot distinction semantics quan trong

3. Da sua dung bug lon ve offset clip ket thuc som

4. Tach rieng editor duration va player duration ro rang

5. Pure helper, rat de test unit

---

## H. Code smell / risk / diem can de y

### 1. `project.video.durationInFrames` va `maxClipEnd` cung ton tai song song

Day la dau hieu model duration chua that su don nhat.

File nay dang xu ly dung duoc, nhung ve kien truc can de mat.

### 2. Khong co comment ro ve y nghia business cua `project.video.durationInFrames`

Nguoi moi maintain se de hoi:

- tai sao lai lay `Math.max(...)`
- tai sao khong return thang `maxClipEnd`

Comment hien tai da giai thich bug cu, nhung chua giai thich het vai tro model field nay.

### 3. Ham 1 chi nhin `project.clips`

Dieu nay la dung theo model hien tai.

Nhung neu sau nay project co nhung thanh phan khong nam trong `clips` ma van anh huong duration, helper nay se phai doi.

### 4. `getRemotionPlayerDurationInFrames` rat don gian nen de bi xem nhe

Nhung thuc te day la helper semantics, khong phai helper "thua".

Can giu cho team hieu ro dieu do.

---

## I. Ket luan file nay

`playback-duration.ts` la mot file nho nhung gia tri rat cao.

No dang giu chinh xac mot distinction cot loi cua editor:

- duration ma UI editor muon the hien
- duration ma Remotion Player co the chap nhan

No cung la noi fix dung bug lon ve clip bi ket thuc som khi dat lech khoi `00:00`.

Neu sau nay can lam sach them model duration, day la mot file chac chan phai duoc xem lai dau tien.

---

## Thu tu review de xuat tiep theo

Sau `playback-duration.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/preview-seek.ts`
2. `src/features/editor/lib/timeline-math.ts`
3. `src/features/editor/components/timeline/components/timeline-toolbar.tsx`

Ly do:

- `preview-seek.ts` la utility lien quan truc tiep den scrub sync Preview
- `timeline-math.ts` la helper core mapping frame/pixel cua Timeline
- `timeline-toolbar.tsx` la noi hien thi va dieu khien time/playback cap UI

---

# File review 14 - `src/features/editor/lib/preview-seek.ts`

## A. Vai tro cua file

Day la utility nho de phat custom DOM event cho Preview seek.

File nay khong:

- cap nhat store
- seek Player truc tiep
- biet gi ve Timeline UI

No chi lo:

1. dinh nghia type cho event
2. tao event `editor:preview-seek-frame`
3. `dispatch` event len `window`

Y nghia kien truc cua file nay rat quan trong du file ngan:

No tao mot duong imperative nhanh giua:

- Timeline scrub interaction
va
- Preview Player seek

ma khong bat buoc phai cho store -> React render -> Player sync day du.

Day chinh la ly do file nay ton tai.

---

## B. Type - `PreviewSeekEvent`

```ts
export type PreviewSeekEvent = CustomEvent<{
    frame: number;
}>;
```

### Vai tro

Dat mot type ro rang cho custom event.

Payload:

- `detail.frame`

Day la payload rat toi gian va dung muc dich.

Event nay chi can biet:

- seek den frame nao

No khong can them:

- source
- drag state
- clip id
- playback status

vi nhung thong tin do thuoc ve layer khac.

Day la thiet ke payload gon va dung.

---

## C. Ham - `dispatchPreviewSeekFrame`

```ts
export const dispatchPreviewSeekFrame = (frame: number) => {
    const event: PreviewSeekEvent = new CustomEvent(
        "editor:preview-seek-frame",
        {
            detail: { frame },
        },
    );

    window.dispatchEvent(event);
};
```

### Muc dich

Cho mot noi bat ky trong app co the noi:

- "Preview hay seek ngay toi frame nay"

ma khong can import hoac cham truc tiep vao `PlayerRef`.

### Tung buoc

#### 1. Tao `CustomEvent`

Ten event:

- `editor:preview-seek-frame`

Payload:

- `{ frame }`

Ten event dang kha ro nghia, de debug.

#### 2. `window.dispatchEvent(event)`

Event duoc phat len `window`.

Y nghia:

- broadcaster phat event
- listener nao quan tam thi nghe

Trong codebase hien tai, listener chinh la `EditorPlayer`.

---

## D. Vai tro kien truc cua file nay trong editor hien tai

Can note ro diem nay.

File nay khong tao source of truth moi.

Source of truth van la:

- `runtime.player.currentFrame` trong store

Con `preview-seek.ts` chi tao mot fast path de Preview phan ung nhanh hon khi scrub.

Noi cach khac:

- store path = state chinh thuc
- custom event path = visual response nhanh

Day la mot kien truc hop ly trong bai toan editor co media nang, vi:

- scrub ma doi full React/store pipeline thi de lag
- Preview can thay doi ngay theo chuot

Tuy nho, nhung file nay the hien rat ro quyet dinh do.

---

## E. Invariant ma file nay dang giu

### Invariant 1

Event payload chi chua `frame`.

### Invariant 2

Event name la string contract:

- `editor:preview-seek-frame`

Listener va dispatcher phai thong nhat chinh xac chuoi nay.

### Invariant 3

File nay khong tu validate `frame`.

Caller va listener phai tu xu ly clamp/guard.

### Invariant 4

File nay khong thay the store sync.

No chi la fast path phu tro.

---

## F. Diem manh cua file hien tai

1. Rat gon, rat ro muc dich

2. Tach duoc imperative seek path khoi UI/store code

3. Khong buoc Timeline phai biet ve `PlayerRef`

4. Event payload nho, de debug, de maintain

5. Giup Preview scrub co co hoi phan ung nhanh hon ma khong can phu thuoc hoan toan vao render cycle

---

## G. Code smell / risk / diem can de y

### 1. String event name la contract ngam

Neu listener sua ten event ma file nay khong sua theo, flow se hong im lang.

Day la cost quen thuoc cua event-driven pattern.

### 2. File khong clamp hoac validate `frame`

Neu caller dua frame am hay frame qua lon, listener phai xu ly.

Hien tai day la chap nhan duoc vi utility nay nen giu don gian.

### 3. Dispatch tren `window`

Day la practical va hop ly cho app editor client-side.

Nhung no cung co nghia:

- event scope la global trong page
- debugging can nho rang no khong gioi han trong mot component subtree

### 4. Event-driven path co the kho trace hon store path

Nguoi moi doc code co the thay:

- currentFrame trong store
- Preview lai seek them qua event

Neu khong nam architecture, se de hoi "tai sao can ca hai".

Can note ro:

- event path = latency optimization
- store path = state truth

### 5. Khong co cancellation / batching o utility nay

File nay chi phat tung event rieng le.

Neu can throttle theo `requestAnimationFrame`, logic do phai dat o caller hoac listener.

Trong kien truc hien tai, dieu do la dung.

---

## H. Ket luan file nay

`preview-seek.ts` la mot utility nho nhung co gia tri kien truc ro rang.

No khong phuc tap, nhung no giai quyet dung mot nhu cau that:

- Preview can seek nhanh khi scrub

ma khong nen bat buoc di qua toan bo pipeline state/render truoc.

Day la mot fast path co chu dich, khong phai mot duplicate state system.

Neu sau nay co bug scrub sync, day la mot trong nhung file can nhin lai som,
khong phai vi no phuc tap, ma vi no nam ngay tren duong event contract.

---

## Thu tu review de xuat tiep theo

Sau `preview-seek.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/timeline-math.ts`
2. `src/features/editor/components/timeline/components/timeline-toolbar.tsx`
3. `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx` (revisit neu can doi chieu voi note cu)

Ly do:

- `timeline-math.ts` la helper core mapping frame/pixel cua Timeline
- `timeline-toolbar.tsx` la UI bridge cho current time / play controls
- `timeline-playhead-viewport-layer.tsx` co the can revisit sau khi da review them math va toolbar

---

# File review 15 - `src/features/editor/lib/timeline-math.ts`

## A. Vai tro cua file

Day la file helper co ban cho toa do va kich thuoc ngang cua Timeline.

File nay chua 2 nhom noi dung:

1. constant layout co ban
2. helper math cho mapping:
   - duration -> width
   - width -> pixelsPerFrame
   - frame -> px
   - frames -> px

Noi cach khac, day la mot "foundation math" file cua Timeline.

Tuy nhien, can note rat ro:

codebase hien tai da co them mot he tinh zoom moi o:

- `timeline-zoom-engine.ts`

Nen `timeline-math.ts` hien tai khong con la noi duy nhat quyet dinh zoom/width nua.

Day la diem can danh dau ky cho maintainability.

---

## B. Import va dependency

File import:

- `Frame`
- `Frames`
- `Pixels`

Khong doc store.
Khong doc React.
Khong doc DOM.

Day la pure math utility file.

---

## C. Constant layout trong file

### 1. `TIMELINE_GUTTER_X`

```ts
export const TIMELINE_GUTTER_X: Pixels = 15;
```

Y nghia:

Khoang dem ngang mac dinh cua timeline content.

Field nay rat quan trong vi no anh huong truc tiep den:

- `frameToPx`
- `getPixelsPerFrame`
- canh ruler / clip / playhead

Neu hieu sai hoac doi field nay ma khong doi cac noi lien quan, toa do se lech ngay.

### 2. `TRACK_HEADER_WIDTH`

```ts
export const TRACK_HEADER_WIDTH: Pixels = 111;
```

Y nghia:

Do rong cot header ben trai cua Timeline.

Field nay thuoc nhom layout constant, khong phai pure math theo frame.

Nhung file nay van export no vi nhieu noi can mot moc layout chung.

### 3. `RULER_HEIGHT`

```ts
export const RULER_HEIGHT: Pixels = 28;
```

Y nghia:

Chieu cao vung ruler.

Tuong tu `TRACK_HEADER_WIDTH`, day la layout constant.

### 4. `MIN_TIMELINE_WIDTH`

```ts
export const MIN_TIMELINE_WIDTH: Pixels = 1949;
```

Comment:

- measured minimum width at 1x zoom

Day la constant policy cho he tinh width "cu" trong file nay.

Can note:

- `timeline-zoom-engine.ts` cung dung `MIN_TIMELINE_WIDTH`
- tuc la constant nay dang la mot diem giao giua hai he math

Day vua tot, vua can than:

- tot vi dung chung mot moc min width
- can than vi co 2 engine dang co kha nang cung cham vao no

---

## D. Cum constant cho measured growth

File nay co:

```ts
const SHORT_REF_DURATION_SECONDS = 31.23;
const SHORT_REF_GROWTH_PER_SECOND = 18.43;

const LONG_REF_DURATION_SECONDS = 213;
const LONG_REF_GROWTH_PER_SECOND = 16.03;
```

Comment cua file noi ro:

- growth duoc do tu sample thuc te

Y nghia:

file nay dang encode mot mo hinh noi suy tu du lieu do tay.

No khong phai cong thuc ly thuyet.
No la UX tuning dua tren sample thuc te.

Day la diem rat can note:

- nguoi maintain khong nen xem cac so nay la "chan ly toan hoc"
- chung la calibration constants

---

## E. Helper nho - `clamp`

```ts
const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));
```

Helper co ban.

Dung de gioi han `t` trong khoang `0..1`.

### `lerp`

```ts
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
```

Noi suy tuyen tinh giua hai moc.

Hai helper nay dung don gian va dung muc dich.

---

## F. Helper - `getWidthGrowthPerSecond`

```ts
const getWidthGrowthPerSecond = (durationInSeconds: number) => {
    const t = clamp(
        (durationInSeconds - SHORT_REF_DURATION_SECONDS) /
            (LONG_REF_DURATION_SECONDS - SHORT_REF_DURATION_SECONDS),
        0,
        1,
    );

    return lerp(SHORT_REF_GROWTH_PER_SECOND, LONG_REF_GROWTH_PER_SECOND, t);
};
```

### Vai tro

Noi suy "growth per second" dua tren do dai project.

Y nghia:

- project ngan zoom tang theo mot toc do khac
- project dai zoom tang theo mot toc do khac

Day la mo hinh muot hon viec switch bucket dot ngot.

Tuy nhien, can note:

he math nay khac voi he trong `timeline-zoom-engine.ts`.

`timeline-zoom-engine.ts` dang dua tren:

- duration bucket rules
- tick spacing px
- visible duration

Con file nay dang dua tren:

- measured width growth per second

Tuc la codebase hien tai dang co hai tu duy zoom ngang khac nhau.

Day la diem quan trong nhat cua review file nay.

---

## G. Ham - `getTimelineWidth`

```ts
export const getTimelineWidth = ({
    durationInFrames,
    fps,
    zoomValue,
}: {
    durationInFrames: Frames;
    fps: number;
    zoomValue: number;
}): Pixels => {
    const durationInSeconds = durationInFrames / fps;
    const growthPerSecond = getWidthGrowthPerSecond(durationInSeconds);

    return Math.max(
        MIN_TIMELINE_WIDTH,
        MIN_TIMELINE_WIDTH +
            (zoomValue - 1) * durationInSeconds * growthPerSecond,
    );
};
```

### Muc dich

Tinh tong width cua timeline dua tren:

- duration
- fps
- zoom

### Logic

#### 1. Quy doi duration sang giay

Dung semantics theo second.

#### 2. Lay `growthPerSecond`

Noi suy dua tren sample do tay.

#### 3. Width cuoi cung

```ts
MIN_TIMELINE_WIDTH +
    (zoomValue - 1) * durationInSeconds * growthPerSecond
```

roi clamp toi thieu bang `MIN_TIMELINE_WIDTH`.

Y nghia:

- 1x zoom => width toi thieu co dinh
- zoom > 1 => width tang theo duration * growthPerSecond

### Note quan trong

Ham nay khong biet gi ve:

- tick family
- visible duration
- tail padding

Tuc la no thuoc mot he quy chieu cu / don gian hon.

Neu codebase dang dan chuyen sang `computeTimelineZoom(...)`,
thi ham nay can duoc ghi nho la co the khong con la source chinh nua.

---

## H. Ham - `getPixelsPerFrame`

```ts
export const getPixelsPerFrame = (
    timelineWidth: Pixels,
    durationInFrames: Frames,
    gutterX: Pixels = TIMELINE_GUTTER_X,
): number => {
    if (durationInFrames <= 0) return 0;

    const usableWidth = Math.max(0, timelineWidth - gutterX * 2);
    return usableWidth / durationInFrames;
};
```

### Muc dich

Tinh he so px/frame dua tren width cua timeline va duration.

### Y nghia cua `gutterX * 2`

File nay gia dinh timeline co dem ca hai ben.

Do do width thuc dung de map frame khong phai toan bo `timelineWidth`.

Day la diem can note ky:

- `frameToPx` cong mot gutter ben trai
- `getPixelsPerFrame` tru hai gutter

Hai ham nay phai duoc hieu cung nhau.

### Note quan trong

Ham nay dung `durationInFrames` that, khong biet gi ve `visibleDurationInFrames`.

Day la mot diem khac biet voi `timeline-zoom-engine.ts`.

Neu trộn hai he nay vao nhau ma khong nhan ra, mapping se rat de lech.

---

## I. Ham - `frameToPx`

```ts
export const frameToPx = (
    frame: Frame,
    pixelsPerFrame: number,
    gutterX: Pixels = TIMELINE_GUTTER_X,
): Pixels => {
    return gutterX + frame * pixelsPerFrame;
};
```

### Muc dich

Map frame tren timeline sang vi tri x.

### Semantics

Frame 0 khong nam tai x = 0.

No nam tai:

- `gutterX`

Day la policy canh trai cua timeline content.

Rat nhieu bug ruler / playhead / clip alignment se quay ve dong nay neu:

- mot noi cong gutter
- mot noi khong cong

### Note maintainability

Day la mot ham cuc quan trong va nen duoc uu tien tai su dung thay vi tu viet `frame * pixelsPerFrame + ...` rải rac.

---

## J. Ham - `framesToPx`

```ts
export const framesToPx = (frames: Frames, pixelsPerFrame: number): Pixels => {
    return frames * pixelsPerFrame;
};
```

### Muc dich

Map khoang do dai frame sang do dai pixel.

Khac voi `frameToPx`:

- `framesToPx` khong cong gutter
- vi day la do dai, khong phai toa do vi tri

Day la distinction nho nhung rat quan trong.

Neu ai do dung `frameToPx(duration)` de tinh width clip thi se sai semantics.

---

## K. Invariant ma file nay dang giu

### Invariant 1

Frame 0 tren timeline bat dau tai `TIMELINE_GUTTER_X`, khong phai tai 0.

### Invariant 2

Width su dung cho mapping frame loai bo gutter hai ben.

### Invariant 3

`frameToPx` la ham cho toa do vi tri.

### Invariant 4

`framesToPx` la ham cho do dai.

### Invariant 5

`getTimelineWidth` dang theo mot he measured-growth rieng, khac voi `timeline-zoom-engine.ts`.

Day la invariant thuc te cua codebase hien tai, du no khong phai trang thai ly tuong.

---

## L. Diem manh cua file hien tai

1. Cac ham mapping nho, de tai su dung

2. Distinction giua vi tri (`frameToPx`) va do dai (`framesToPx`) la dung

3. Constant layout co mot noi dung chung

4. `gutter` semantics duoc centralize

5. Pure helper, de test

---

## M. Code smell / risk / diem can de y

### 1. Hai he zoom math song song trong codebase

Day la risk lon nhat cua file nay.

Mot he la:

- `timeline-math.ts`

Mot he la:

- `timeline-zoom-engine.ts`

Neu codebase khong chot ro file nao la source chinh, maintainability se giam.

### 2. Nhieu constant measured / tuned nhung chua co ngữ canh rong hon

Vi du:

- `1949`
- `31.23`
- `18.43`
- `213`
- `16.03`

Chung co y nghia calibration, nhung nguoi moi doc se rat kho tu hieu.

### 3. `getTimelineWidth` khong biet gi ve visible duration / tick density

Trong khi he moi da co cac concept do.

Dieu nay xac nhan day la mot he cu hon hoac mot he phu.

### 4. `getPixelsPerFrame` co the de gay nham neu caller dua nham duration semantic

Vi ham nay khong phan biet:

- duration project that
- duration visible timeline

No chi tinh theo duration duoc dua vao.

### 5. `TRACK_HEADER_WIDTH` va `RULER_HEIGHT` nam trong file "math"

Khong sai, nhung cho thay file nay dang vua la math helper, vua la layout constant holder.

Ve lau dai co the can tach ro hon.

---

## N. Ket luan file nay

`timeline-math.ts` la mot file foundation quan trong.

No dang giu dung nhieu mapping core:

- frame -> x
- frames -> width
- width -> px/frame

Nhung diem quan trong nhat cua review nay khong nam o tung ham nho,
ma nam o buc tranh lon:

codebase hien tai dang co hai lop timeline zoom math song song.

Do la:

1. lop measured-growth trong file nay
2. lop bucket/tick/visible-duration trong `timeline-zoom-engine.ts`

Neu sau nay can lam sach kien truc Timeline, day la mot trong nhung noi can duoc quyet lai dau tien.

---

## Thu tu review de xuat tiep theo

Sau `timeline-math.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/components/timeline/components/timeline-toolbar.tsx`
2. `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx` (revisit)
3. `src/features/editor/components/timeline/components/playhead.tsx` (revisit doi chieu voi toolbar + math neu can)

Ly do:

- `timeline-toolbar.tsx` la UI bridge cap cao cua playback time va controls
- `timeline-playhead-viewport-layer.tsx` nen duoc doi chieu lai sau khi da review them math foundation
- `playhead.tsx` co the revisit neu can tong hop lai playhead stack tu toolbar -> layer -> primitive

---

# File review 16 - `src/features/editor/components/timeline/components/timeline-toolbar.tsx`

## A. Vai tro cua file

Day la toolbar cap cao cua Timeline.

No la noi tap trung cac thao tac UI ma nguoi dung nhin thay va bam thuong xuyen:

- snap
- split
- undo / redo
- delete
- play / pause
- seek dau / cuoi
- loop
- mute
- fullscreen
- zoom in / out
- slider zoom
- hien thi current time / duration

Noi cach khac:

neu `editor.store.ts` la action source of truth,
thi `timeline-toolbar.tsx` la control panel cap cao de goi nhung action do.

File nay khong render timeline body, khong tinh math, khong lo preview geometry.
No la UI bridge.

---

## B. Import va dependency

File import 3 nhom lon:

### 1. UI library

- `Button`, `Slider` tu `antd`
- `SliderSingleProps`

### 2. Icon

- `AiOutlineScissor`
- `BiSolidMagnet`
- `FiMinus`, `FiPlus`
- `HiSpeakerWave`
- `PiSpeakerSlashFill`
- `IoPause`, `IoPlay`, `IoPlaySkipBack`, `IoPlaySkipForward`
- `RiFullscreenFill`, `RiLoopRightFill`
- `MdOutlineDelete`
- `GrUndo`, `GrRedo`

### 3. Editor hooks va helper

Rat nhieu selector/action hook tu `stores`
+ `formatTime`
- `getEditorPlaybackDurationInFrames`
- `clsx`

Y nghia:

- file nay doc kha nhieu state UI/runtime
- file nay goi kha nhieu action
- file nay la "integration component" ro rang, khong phai primitive component

Day la binh thuong voi toolbar.

---

## C. `stylesObject` cho Slider

```ts
const stylesObject: SliderSingleProps["styles"] = {
    track: {
        backgroundColor: "black",
    },
    rail: {
        backgroundColor: "#ababab",
    },
    handle: {
        borderColor: "black",
        backgroundColor: "black",
        boxShadow: "none",
    },
};
```

### Vai tro

Custom style cho zoom slider.

Day la style object noi tai file, khong tach ra ngoai.

Hop ly vi:

- scope nho
- chi dung cho mot slider

Nhung can note:

- toolbar dang chua ca behavior va mot chut theming local

Khong co van de lon, chi la chi tiet maintainability.

---

## D. Helper local - `dispatchTimelineBoundaryScroll`

```ts
const dispatchTimelineBoundaryScroll = (position: "start" | "end") => {
    window.dispatchEvent(
        new CustomEvent("editor:timeline-scroll-to-boundary", {
            detail: { position },
        }),
    );
};
```

### Muc dich

Khi bam:

- skip ve dau
- skip toi cuoi

toolbar khong chi seek playhead ma con yeu cau timeline viewport scroll toi boundary phu hop.

Day la event-driven pattern giong `preview-seek.ts`.

### Y nghia kien truc

Toolbar khong can biet:

- scroll viewport ref nam o dau
- scroll logic cu the ra sao

No chi phat mot y dinh UI:

- scroll den `start`
hoac
- scroll den `end`

Day la pattern hop ly cho loosely-coupled UI.

Nhung cung can note:

- them mot event string contract nua trong codebase

---

## E. Store hooks ma file dang doc

File nay doc kha nhieu state:

- `project`
- `video`
- `status`
- `currentFrame`
- `isMuted`
- `snapEnabled`
- `isLoopEnabled`
- `zoomValue`

Va nhieu action:

- `togglePlay`
- `seekToFrame`
- `toggleSnap`
- `toggleLoop`
- `togglePreviewFullscreen`
- `toggleMuted`
- `setTimelineZoomLevel`
- `zoomTimelineIn`
- `zoomTimelineOut`
- `splitSelectedClipAtPlayhead`
- `deleteSelectedClips`
- `undo`
- `redo`

### Y nghia

Toolbar dang la component integration day dac.

No khong can "sach toi muc primitive".
Toolbar ban chat la noi gom nhieu control.

Nhung cung vi ly do do, file nay la noi de:

- coupling tang
- render tang
- logic UI le bi tron vao nhau

Can review duoi goc do, khong nen doi hoi no giong mot component nho.

---

## F. Derived value trong file

### 1. `playbackDurationInFrames`

```ts
const playbackDurationInFrames =
    getEditorPlaybackDurationInFrames(project);
```

Dung helper domain thay vi doc thang `project.video.durationInFrames`.

Day la dung va nhat quan voi semantics moi cua editor.

### 2. `currentTime`

```ts
const currentTime = formatTime(currentFrame, video.fps);
```

### 3. `durationTime`

```ts
const durationTime = formatTime(playbackDurationInFrames, video.fps);
```

Comment da note:

- logic cu hien thi last renderable frame
- logic moi hien thi end boundary that

Day la chi tiet UI nho nhung rat quan trong cho trai nghiem nguoi dung.

Toolbar la noi nguoi dung nhin time ro rang nhat,
nen semantics dung o day co gia tri rat cao.

---

## G. Cau truc JSX tong the

File render 3 cum lon trong mot root:

```tsx
<div className='... flex items-center justify-between border'>
    <div className='flex-1 ...'> ... tool ben trai ... </div>
    <div className='...'> ... time + transport controls ... </div>
    <div className='flex-1 ...'> ... tool ben phai ... </div>
</div>
```

### Cum 1 - Ben trai

Chua:

- magnet snap
- split
- undo
- redo
- delete

Day la nhom thao tac chinh sua.

### Cum 2 - O giua

Chua:

- current time
- skip back
- play/pause
- skip forward
- duration time

Day la nhom transport controls.

### Cum 3 - Ben phai

Chua:

- loop
- mute
- fullscreen
- zoom out
- zoom slider
- zoom in

Day la nhom view / playback modifier controls.

Bo cuc nay kha logic va de doc.

---

## H. Tung nhom button va behavior

### 1. Snap button

```tsx
onClick={toggleSnap}
```

Icon duoc doi mau xanh khi `snapEnabled`.

Day la phan hoi UI don gian va dung.

### 2. Split button

```tsx
onClick={splitSelectedClipAtPlayhead}
```

Toolbar khong tu kiem tra selected clip.
No giao viec do cho action/store.

Day la boundary dung.

### 3. Undo / Redo

Goi thang action.

Hien tai file khong disable nut khi khong undo/redo duoc.

Day la mot note UX co the lam sau, nhung khong phai bug cua file.

### 4. Delete

```tsx
onClick={deleteSelectedClips}
```

Tuong tu split, toolbar giao invariant cho store/action.

### 5. Skip back

```tsx
onClick={() => {
    seekToFrame(0);
    dispatchTimelineBoundaryScroll("start");
}}
```

Day la mot behavior hay va can note:

nut nay khong chi set playhead,
ma con scroll viewport ve dau timeline.

Tuc la toolbar da duoc sua cho dung expectation UX.

### 6. Play / Pause

Icon doi theo `status === "playing"`.

`onClick={togglePlay}`

Toolbar khong tu xu ly ended/paused/playing phuc tap.
No de cho store action.

### 7. Skip forward

```tsx
onClick={() => {
    seekToFrame(playbackDurationInFrames);
    dispatchTimelineBoundaryScroll("end");
}}
```

Tuong tu skip back:

- seek den end boundary
- dong thoi scroll timeline toi cuoi

Day la detail UX dung.

### 8. Loop

`toggleLoop`

Icon xanh khi loop bat.

### 9. Mute

`toggleMuted`

Icon thay doi theo `isMuted`.

### 10. Fullscreen

Can note ky:

```tsx
<Button
    type='text'
    size='middle'
    icon={
        <RiFullscreenFill
            className='text-lg'
            onClick={togglePreviewFullscreen}
        />
    }
/>
```

Day la mot chi tiet can de y.

`onClick` dang gan tren icon, khong gan tren `Button`.

Dieu nay co nghia:

- click vao icon chac chan toggle
- nhung click vao vung button ngoai icon co the khong trigger dung nhu ky vong

Ve UX/component semantics, day la mot smell ro rang.

### 11. Zoom out / Zoom in

Goi:

- `zoomTimelineOut`
- `zoomTimelineIn`

### 12. Slider

```tsx
<Slider
    ...
    max={10}
    min={1}
    value={zoomValue}
    onChange={(newValue) => setTimelineZoomLevel(newValue)}
/>
```

Can note:

- range slider dang dong bo voi clamp range trong zoom math
- toolbar dang dua so raw vao action

Day la hop ly.

---

## I. Invariant ma file nay dang giu

### Invariant 1

Time hien thi trong toolbar phai theo semantics editor duration, khong theo last renderable frame cua Player.

### Invariant 2

Skip boundary controls khong chi seek ma con phai dua viewport den boundary do.

### Invariant 3

Toolbar la layer UI bridge, khong giu business logic playback/chinh sua phuc tap.

### Invariant 4

Zoom range UI hien tai la `1..10`.

### Invariant 5

Mau icon active la tin hieu state UI quan trong cho:

- snap
- loop
- mute

---

## J. Diem manh cua file hien tai

1. Bo cuc toolbar ro va de doc

2. Da dung helper duration/time formatting thay vi hard-code

3. Skip start/end da handle them timeline boundary scroll

4. Cac action duoc de o store, toolbar khong om qua nhieu business logic

5. UI phan hoi state active kha ro rang o cac nut chinh

---

## K. Code smell / risk / diem can de y

### 1. Toolbar import qua nhieu hook

Day la dac diem tu nhien cua integration component.

Nhung cung la dau hieu:

- file nay de to them
- de tang render coupling

Neu sau nay toolbar phinh them, co the can tach nho thanh subgroup components.

### 2. `dispatchTimelineBoundaryScroll` dung custom event string contract

Giong `preview-seek.ts`, day la pattern hop ly nhung can nho contract ten event.

### 3. Button fullscreen gan `onClick` vao icon thay vi vao `Button`

Day la smell ro nhat trong file hien tai.

Ve semantics va clickable area, nen de `onClick` o button root.

### 4. Nut undo/redo/delete/split khong co disabled state

Khong nhat thiet sai, nhung UX co the duoc cai thien.

### 5. Style va icon logic dang nam chung trong mot file lon

Voi toolbar thi tam chap nhan duoc.
Nhung neu them nhieu control nua, file se nhanh lon va kho scan.

### 6. `zoom` range dang hard-code `1..10` o UI

Neu source of truth zoom range nam o engine/store, UI nay nen tai su dung constant chung.

Hien tai day la mot coupling ngam.

---

## L. Ket luan file nay

`timeline-toolbar.tsx` la mot integration component dung nghia.

No khong can "qua sach" nhu primitive component,
nhung no can ro boundary, va hien tai boundary cua no kha on:

- doc state can hien thi
- goi action khi nguoi dung thao tac
- khong om business logic sau ben trong

Diem can de y lon nhat cua file hien tai:

1. fullscreen button dang gan click vao icon
2. toolbar da kha day dac va co the can tach subgroup neu tiep tuc mo rong
3. zoom range/event contracts dang co mot so hard-code can giu dong bo voi tang duoi

---

## Thu tu review de xuat tiep theo

Sau `timeline-toolbar.tsx`, thu tu hop ly tiep theo:

1. `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`
2. `src/features/editor/components/timeline/components/playhead.tsx` (revisit doi chieu)
3. `src/features/editor/components/timeline/components/timeline-track-headers/index.tsx`

Ly do:

- da co du context ve toolbar + math + playhead primitive, nen gio review layer playhead se co gia tri hon
- co the doi chieu lai primitive `playhead.tsx` neu can
- sau do nen bat dau di tiep sang cum track header controls

---

# File review 17 - `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`

## A. Vai tro cua file

Day la orchestration layer cua Playhead trong Timeline.

Can phan biet ro:

- `playhead.tsx` = visual + pointer primitive
- `timeline-playhead-viewport-layer.tsx` = runtime/controller layer cua Playhead

File nay lo cac bai toan cap cao hon:

1. dat Playhead vao he toa do viewport
2. scrub playhead bang chuot
3. sync nhanh Preview khi scrub
4. sync store theo tan so da gioi han khi scrub
5. auto-scroll timeline khi dang play
6. dua viewport ve dau/cuoi trong cac boundary case

Noi ngan gon:

day la "brain" cua Playhead layer, con `playhead.tsx` la "body".

---

## B. Import va dependency

File import:

- `useCallback`
- `useEffect`
- `useLayoutEffect`
- `useRef`
- `PointerEvent`
- `Playhead`
- `useEditorStore`
- `frameToPx`
- `TIMELINE_GUTTER_X`
- `dispatchPreviewSeekFrame`

Y nghia:

- file nay phu thuoc store truc tiep
- file nay phu thuoc timeline math
- file nay phu thuoc preview fast-path event
- file nay khong render clip/ruler, chi render Playhead layer

Boundary nay hop ly, vi day la controller layer.

---

## C. Constant trong file

### 1. `PLAYHEAD_PAGE_SCROLL_THRESHOLD = 2`

Nguong px de quyet dinh khi nao playhead da cham mep phai viewport va can scroll trang.

Day la tuning constant cho auto-scroll khi play.

### 2. `PLAYHEAD_SCRUB_STORE_SYNC_INTERVAL_MS = 33`

Nguong tan so sync store khi dang scrub.

Y nghia:

- Preview co the seek nhanh hon
- store khong bi spam moi pixel pointer move

33ms ~ 30fps.

Day la quyet dinh performance co chu dich.

---

## D. Props cua component

```ts
type TimelinePlayheadViewportLayerProps = {
    scrollViewportRef: React.RefObject<HTMLDivElement | null>;
    timelineContentRef: React.RefObject<HTMLDivElement | null>;
    pixelsPerFrame: number;
    visibleDurationInFrames: number;
    playbackDurationInFrames: number;
};
```

### 1. `scrollViewportRef`

Ref toi viewport dang scroll ngang.

File nay dung no de:

- doc `scrollLeft`
- nghe event scroll
- auto-scroll khi play
- scroll ve boundary

### 2. `timelineContentRef`

Ref toi content area cua timeline.

Dung de:

- lay `getBoundingClientRect()`
- doi `clientX` sang toa do timeline khi scrub

### 3. `pixelsPerFrame`

He so mapping frame -> px.

Rat quan trong cho ca:

- apply offset
- tinh frame tu pointer x
- auto-scroll logic

### 4. `visibleDurationInFrames`

Dung de truyen vao primitive `Playhead` cho clamp frame visual.

Can note:

day la visible duration, khong phai playback duration.

### 5. `playbackDurationInFrames`

Dung de clamp frame scrub that.

Can note distinction:

- visible duration co the dai hon playback duration
- scrub khong duoc vuot qua playback end boundary that

Day la distinction rat dung.

---

## E. Ref va store state trong file

### Ref

- `playheadRef`
- `scrubFrameRef`
- `scrollLeftRef`
- `scrubSyncTimeoutRef`
- `scrubLastSyncedAtRef`
- `scrubPreviewAnimationFrameRef`

### Y nghia tung ref

#### `playheadRef`

Ref toi DOM root cua primitive `Playhead`.

File nay update transform truc tiep len DOM qua ref nay.

Day la quyet dinh performance quan trong:

- tranh re-render toan Timeline khi frame/scroll doi

#### `scrubFrameRef`

Luu frame tam thoi khi dang scrub.

Trong luc scrub, UI khong doi hoan toan theo `currentFrame` trong store,
ma uu tien `scrubFrameRef`.

Day la pattern dung cho interactive dragging.

#### `scrollLeftRef`

Cache `scrollLeft` moi nhat cua viewport.

Muc dich:

- tinh viewport-relative x ma khong can buoc React render

#### `scrubSyncTimeoutRef`

Luu timeout pending de sync store tre.

#### `scrubLastSyncedAtRef`

Luu moc thoi gian lan sync store gan nhat.

Dung de throttle.

#### `scrubPreviewAnimationFrameRef`

Luu RAF pending de sync Preview fast-path.

---

## F. Store selector va action

File doc:

- `currentFrame`
- `playbackStatus`

Va goi:

- `seekToFrame`
- `pause`

Day la set dependency kha gon cho mot controller layer.

File nay khong doc nhieu hon muc can thiet.

---

## G. Ham chinh ben trong file

### 1. `applyPlayheadOffset`

```ts
const nextLeft =
    frameToPx(frame, pixelsPerFrame) - scrollLeftRef.current;

playhead.style.transform = `translate3d(${nextLeft}px, 0, 0)`;
```

Day la ham trung tam cua file.

Y nghia:

- vi tri that cua playhead trong content = `frameToPx(frame, pixelsPerFrame)`
- vi tri can render trong viewport = vi tri content - `scrollLeft`

Day chinh la goc re de Playhead:

- nam trong viewport layer
- nhung van bieu dien dung frame tren content dang scroll

Day la quyet dinh dung cho kien truc viewport-layer.

### 2. `syncPreviewToScrubFrame`

Doc `scrubFrameRef.current` roi:

- `dispatchPreviewSeekFrame(frame)`

Day la fast path de Preview thay doi frame ngay khi scrub.

### 3. `schedulePreviewScrubSync`

Dung `requestAnimationFrame` de gom nhieu pointer move vao mot lan seek Preview.

Day la quyet dinh performance dung.

### 4. `syncStoreToScrubFrame`

Day la ham rat quan trong.

Logic:

- neu da qua `33ms` thi seek store ngay
- neu chua qua nguong va chua co timeout pending thi dat timeout

Y nghia:

- Preview seek nhanh theo RAF
- store seek cham hon, co gioi han tan so

Day la implementation rat ro cua mo hinh:

- "visual immediacy"
- "state stability"

### 5. `getFrameFromClientX`

```ts
const rect = content.getBoundingClientRect();
const timelineX = clientX - rect.left;
const frame = Math.round(
    (timelineX - TIMELINE_GUTTER_X) / pixelsPerFrame,
);
return Math.max(0, Math.min(frame, playbackDurationInFrames));
```

Day la bai toan pointer -> frame.

Can note ky:

- ham nay dua tren `timelineContentRef`
- tru `TIMELINE_GUTTER_X`
- clamp theo `playbackDurationInFrames`

Day la semantics dung cho seek that.

### 6. `scrubToClientX`

Day la orchestration cho moi pointer move/start:

1. doi `clientX` -> `frame`
2. luu vao `scrubFrameRef`
3. tat transition cua playhead DOM
4. `applyPlayheadOffset(frame)`
5. schedule fast Preview sync
6. throttle store sync

Day la ham co gia tri nhat cua file.

No quyet dinh scrub co muot hay khong.

### 7. `handlePlayheadScrubStart`

Logic:

- `preventDefault`
- `stopPropagation`
- neu dang `playing` thi `pause()`
- scrub ngay den vi tri chuot

Day la UX dung:

- dang play ma keo playhead thi dung playback

### 8. `handlePlayheadScrubMove`

Forward vao `scrubToClientX`.

### 9. `handlePlayheadScrubEnd`

Logic:

1. commit frame cuoi vao store
2. clear timeout pending
3. cancel RAF pending
4. tra lai transition cho DOM playhead
5. reset refs scrub

Day la cleanup kha day du.

---

## H. Cac effect trong file

File nay co nhieu `useEffect` va 1 `useLayoutEffect`.

### Effect 1 - Sync voi scroll viewport

Muc dich:

- nghe scroll
- cap nhat `scrollLeftRef`
- cap nhat vi tri playhead theo viewport

Logic:

- neu dang scrub => uu tien `scrubFrameRef`
- neu khong => theo `currentFrame`

Day la mot effect rat quan trong cho smooth scroll.

### Effect 2 - Sync theo `currentFrame` khi khong scrub

```ts
if (scrubFrameRef.current !== null) return;
applyPlayheadOffset(currentFrame);
```

Day la sync thong thuong theo playback/store frame.

### `useLayoutEffect` - Lap tuc dat lai vi tri sau commit layout

No lam cung viec tuong tu effect tren:

- khi khong scrub => `applyPlayheadOffset(currentFrame)`

Can note:

File nay dang dung ca:

- `useEffect`
- `useLayoutEffect`

cho viec sync vi tri.

Y nghia co the la de giam giat nhin thay duoc giua layout va paint.

Nhung day cung la mot diem can de y, vi no tang do phuc tap nhan thuc.

### Effect 4 - Auto-scroll khi dang play

Logic:

1. neu khong `playing` => bo qua
2. tinh `playheadX` trong content
3. doi sang `playheadViewportX`
4. neu chua cham mep phai viewport tru threshold => khong scroll
5. neu da cham => scroll toi vi tri moi

Cong thuc target:

```ts
playheadX - TIMELINE_GUTTER_X
```

sau do clamp theo `scrollWidth - clientWidth`

Day la no luc de giu playhead luon tren man hinh.

### Effect 5 - Boundary scroll khi khong playing

Logic:

- neu `currentFrame <= 0` => scroll ve dau
- neu `currentFrame >= playbackDurationInFrames` => scroll toi cuoi

Muc dich:

- khi seek bang button hoac logic khac toi 0/cuoi, viewport cung ve theo

### Effect 6 - Cleanup khi unmount

Clear:

- timeout pending
- RAF pending

Day la cleanup can thiet va dung.

---

## I. JSX structure

File render:

```tsx
<div className='pointer-events-none absolute inset-y-0 left-0 right-0 z-20 overflow-hidden'>
    <Playhead ... />
</div>
```

### Y nghia

#### Root layer

- la viewport overlay
- phu theo truc doc cua timeline area
- cat overflow ngang
- cho Playhead nam trong layer rieng, khong nam trong scroll content thong thuong

#### `pointer-events-none`

Layer khong chan pointer chung.
Primitive `Playhead` ben trong se bat pointer o dung handle.

Day la pattern dung.

#### `z-20`

File nay dang tu mang z-index cap layer.

Day la dung vi day la viewport layer that, khac voi primitive `Playhead` chi nen co local baseline.

### Props truyen vao `Playhead`

Can note:

- `currentFrame={currentFrame}`
- `durationInFrames={visibleDurationInFrames}`
- `pixelsPerFrame={pixelsPerFrame}`
- `leftOffset={frameToPx(currentFrame, pixelsPerFrame)}`

Day la chi tiet dang chu y.

`leftOffset` truyen vao la content-space x, trong khi file sau do lai imperative override transform bang viewport-space x.

Hien tai dieu nay van co the on vi layer luon update ngay sau do,
nhung day la mot diem can de mat de tranh double-source ve toa do.

---

## J. Invariant ma file nay dang giu

### Invariant 1

Playhead duoc render theo viewport-space, khong theo content-space truc tiep.

### Invariant 2

Khi scrub:

- Preview duoc sync nhanh qua custom event
- store duoc sync cham hon qua throttle

### Invariant 3

Dang play ma scrub thi phai pause truoc.

### Invariant 4

Auto-scroll chi kich hoat khi playhead cham mep phai viewport.

### Invariant 5

Primitive `Playhead` khong tu biet scroll/store; layer nay moi la noi lo cac bai toan do.

---

## K. Diem manh cua file hien tai

1. Boundary primitive/controller ro rang

2. Dung imperative DOM transform de tranh keo ca Timeline re-render

3. Da tach fast Preview sync va throttled store sync

4. Auto-scroll logic duoc co lap trong mot noi

5. Cleanup timeout / RAF day du

---

## L. Code smell / risk / diem can de y

### 1. File co kha nhieu trach nhiem

No dang gom:

- scrub input
- preview sync
- store sync
- scroll sync
- auto-scroll
- boundary scroll

Tat ca deu lien quan, nen chua den muc vo ly.
Nhung day ro rang la mot orchestration file day dac.

### 2. `useEffect` + `useLayoutEffect` cung sync vi tri

Day la diem can note ky.

Hien tai co the co ly do UX/perf, nhung nguoi moi doc se de hoi:

- tai sao can ca hai

Neu sau nay co giat/flicker bug, day la noi nen xem lai som.

### 3. `leftOffset` prop va imperative transform co kha nang tao double-source visual

Primitive `Playhead` vua duoc mount voi `leftOffset`,
vua bi layer nay set `style.transform` truc tiep.

Hien tai co the chap nhan duoc.
Nhung day la diem nhay cam.

### 4. `getFrameFromClientX` phu thuoc vao `timelineContentRef.getBoundingClientRect()`

Neu DOM structure doi, mapping pointer -> frame rat de lech.

### 5. Clamp scrub theo `playbackDurationInFrames` nhung primitive clamp visual theo `visibleDurationInFrames`

Day la distinction dung ve mat semantics.

Nhung nguoi maintain phai hieu ro tai sao co hai duration khac nhau o day.

### 6. Custom event path lai xuat hien them o mot file nua

Khong sai.
Nhung cang xac nhan codebase dang co mot lop imperative event bridge song song voi store bridge.

Can giu ro ly do ton tai cua no.

---

## M. Ket luan file nay

`timeline-playhead-viewport-layer.tsx` la mot trong nhung file quan trong nhat cua trai nghiem Timeline.

No quyet dinh:

- playhead co muot khong
- scrub co muot khong
- preview co theo kip scrub khong
- timeline co tuot theo playhead luc dang play khong

Ve kien truc, file nay dang dung huong:

- primitive o file rieng
- orchestration tap trung tai day

Nhung cung vi no la file orchestration, no la diem rat de phinh to va rat de tro thanh noi chua bug UX/perf.

Neu sau nay can refactor sau hon, day la mot file xung dang duoc tách thanh cac hook nho theo trach nhiem:

- usePlayheadScrub
- usePlayheadAutoScroll
- usePlayheadViewportPosition

nhung chi nen lam khi that su can, vi hien tai logic van con lien ket chat.

---

## Thu tu review de xuat tiep theo

Sau `timeline-playhead-viewport-layer.tsx`, thu tu hop ly tiep theo:

1. `src/features/editor/components/timeline/components/timeline-track-headers/index.tsx`
2. `src/features/editor/components/timeline/components/timeline-track-headers/timeline-track-header-row.tsx`
3. `src/features/editor/components/timeline/components/timeline-item/index.tsx`

Ly do:

- sau khi xong playhead core, nen di tiep sang cum track controls
- `timeline-track-header-row.tsx` la noi mute/hide UI that su
- `timeline-item/index.tsx` la primitive quan trong cua clip tren timeline

---

# File review 18 - `src/features/editor/components/timeline/components/timeline-track-headers/index.tsx`

## A. Vai tro cua file

Day la wrapper component cho cot track headers ben trai Timeline.

No khong lo:

- mute/hide logic chi tiet
- playhead
- clip layout
- drag/drop

No chi lo 3 viec:

1. sap xep track theo thu tu hien thi
2. map track -> lane layout tuong ung
3. render danh sach `TimelineTrackHeaderRow`

Noi ngan gon:

- `build-track-lane-layouts.ts` tinh lane geometry
- file nay lay geometry do va render header column ben trai

Day la boundary dung.

---

## B. Import va dependency

File import:

- `TimelineTrackLaneLayout`
- `RULER_HEIGHT`
- `TimelineTrackHeaderRow`
- `TimelineTrack`

Y nghia:

- file nay phu thuoc vao ket qua layout lane
- file nay phu thuoc vao row primitive/component ben duoi
- file nay can biet `RULER_HEIGHT` de canh thong voi ruler ben phai

Boundary nay hop ly.

---

## C. Props cua component

```ts
type TimelineTrackHeadersProps = {
    tracks: TimelineTrack[];
    lanes: TimelineTrackLaneLayout[];
    totalHeight: number;
};
```

### 1. `tracks`

Du lieu track source.

### 2. `lanes`

Ket qua layout da tinh san.

Quan trong:

- file nay khong tu tinh lane height/top
- no tin vao layout engine

### 3. `totalHeight`

Tong chieu cao phan lane body.

Dung de dat height cho cot header.

---

## D. Logic ben trong file

### 1. `sortedTracks`

```ts
const sortedTracks = [...tracks].sort((a, b) => a.index - b.index);
```

Y nghia:

Header column phai di theo thu tu lane hien thi, khong theo thu tu raw trong array.

Day la dung.

Can note:

- file copy array roi sort, khong mutate props

### 2. `laneMap`

```ts
const laneMap = new Map(lanes.map((lane) => [lane.trackId, lane]));
```

Y nghia:

File can tra lane layout theo `track.id` nhanh va ro rang.

Dung `Map` o day la hop ly hon viec `.find(...)` trong moi row.

Day la mot chi tiet nho nhung chat luong.

---

## E. JSX / HTML structure hien tai

File render:

```tsx
<div
    id='track-headers'
    className='border-editor-starter-border sticky left-0 flex w-full min-h-full shrink-0 flex-col border-r'
    style={{
        height: totalHeight + RULER_HEIGHT,
        paddingTop: RULER_HEIGHT,
    }}>
    {sortedTracks.map(...)}
</div>
```

### Y nghia tung phan

#### `id='track-headers'`

ID nay co the duoc dung de:

- debug
- query DOM
- z-index / layering troubleshooting

#### `sticky left-0`

Cot header ben trai phai bam trai khi timeline ngang scroll.

Day la behavior UI dung.

#### `height: totalHeight + RULER_HEIGHT`

Can note ro:

Cot header nay khong chi cao bang tong lane body,
ma con cong them phan ruler top.

Ly do:

- toan bo cot ben trai phai khop tong chieu cao cua vung timeline scrollable

#### `paddingTop: RULER_HEIGHT`

Day la chi tiet canh hang rat quan trong.

No tao khoang trong phia tren de row dau tien canh dung ngay duoi ruler.

Neu bo dong nay:

- row headers se lech len tren
- khong khop voi lane body

### Mapping row

```tsx
{sortedTracks.map((track, index) => {
    const lane = laneMap.get(track.id);
    if (!lane) return null;

    return (
        <TimelineTrackHeaderRow
            key={track.id}
            track={track}
            laneHeight={lane.laneHeight}
            displayIndex={sortedTracks.length - index}
        />
    );
})}
```

Can note 2 diem:

#### 1. Neu `lane` khong ton tai => bo qua row

File nay dang fail-soft.

Neu track va lane khong dong bo, row do se bien mat thay vi throw.

#### 2. `displayIndex={sortedTracks.length - index}`

Day la policy hien thi so track:

- track tren cung co so lon hon
- track duoi cung co so nho hon

Tuc la UI dang noi:

- lane moi tren cao hon trong stack

Day khop voi visual model layering hien tai.

---

## F. Invariant ma file nay dang giu

### Invariant 1

Thu tu row header phai theo `track.index`.

### Invariant 2

Moi row header phai dung `laneHeight` cua lane tuong ung, khong dung hard-code chung.

### Invariant 3

Cot header phai tu canh them `RULER_HEIGHT` de khop layout tong the.

### Invariant 4

Display index dang hien thi theo chieu nguoc:

- track tren = index lon hon

---

## G. Diem manh cua file hien tai

1. File gon, boundary ro

2. Dung `Map` hop ly de join track va lane

3. Khong om logic mute/hide vao wrapper

4. Alignment voi ruler duoc xu ly ro rang

5. Distinction giua business `track.index` va UI `displayIndex` duoc tach ra

---

## H. Code smell / risk / diem can de y

### 1. Track-lane mismatch bi fail-soft

Neu `laneMap.get(track.id)` tra `undefined`, row se khong render.

UI co the im lang mat row.

Khong nhat thiet sai, nhung debug can de y.

### 2. `height: totalHeight + RULER_HEIGHT` va `paddingTop: RULER_HEIGHT`

Day la logic layout dung, nhung kha "manual".

Neu sau nay thay doi cau truc DOM ruler/header, file nay co the phai doi theo.

### 3. `displayIndex` la policy UI ngam

Nguoi moi co the thac mac:

- tai sao track 0 lai hien so 3, 4, ...

Can hieu day la numbering theo stack display, khong phai `track.index` that.

---

## I. Ket luan file nay

`timeline-track-headers/index.tsx` la mot wrapper file gon va dang o trang thai tot.

No lam dung vai tro:

- lay lane geometry
- sap xep track
- render danh sach row controls

Khong co complexity lon, nhung no giu mot vai tro layout alignment quan trong voi ruler va lane body.

---

# File review 19 - `src/features/editor/components/timeline/components/timeline-track-headers/timeline-track-header-row.tsx`

## A. Vai tro cua file

Day la component render mot dong track header.

No la noi nguoi dung thao tac truc tiep voi:

- hide/show track
- mute/unmute track

Va dong thoi hien:

- so thu tu track tren UI

No khong lo:

- lane layout tong the
- clip render
- selection logic phuc tap

No la row-level control component.

---

## B. Import va dependency

File import:

- `Button` tu `antd`
- `TimelineTrack`
- icon eye / eye slash
- icon speaker / speaker x
- `useEditorStore`

Y nghia:

- file nay doc action truc tiep tu store
- state visual `isHidden`, `isMuted` lay tu `track` prop

Day la boundary on:

- wrapper dua du lieu row vao
- row tu goi action store khi click

---

## C. Props cua component

```ts
type TimelineTrackHeaderRowProps = {
    track: TimelineTrack;
    laneHeight: number;
    displayIndex: number;
};
```

### 1. `track`

Nguon du lieu row:

- `isHidden`
- `isMuted`
- `id`

### 2. `laneHeight`

Dung de row cao khop voi lane body ben phai.

Rat quan trong cho alignment.

### 3. `displayIndex`

So track dang hien thi cho nguoi dung.

Khong nhat thiet giong `track.index`.

---

## D. Logic ben trong file

### 1. `isHidden`, `isMuted`

```ts
const isHidden = track.isHidden;
const isMuted = track.isMuted;
```

Don gian va ro rang.

### 2. Action tu store

```ts
const toggleTrackHidden = useEditorStore((state) => state.toggleTrackHidden);
const toggleTrackMuted = useEditorStore((state) => state.toggleTrackMuted);
```

File nay khong tu xu ly logic mute/hide.
No chi phat action.

Day la dung.

---

## E. JSX / HTML structure hien tai

File render:

```tsx
<div className='flex w-full select-none border-black/20' style={{ borderBottomWidth: 1 }}>
    <div
        className='group flex w-full shrink-0 items-center gap-2 truncate pl-4 text-xs bg-white'
        style={{ height: laneHeight - 1 }}>
        <div className='w-4 text-right text-neutral-400'>{displayIndex}</div>
        <div className='flex items-center'>
            <Button ... eye ... />
            <Button ... speaker ... />
        </div>
    </div>
</div>
```

### 1. Outer wrapper

Co border bottom de tach tung row.

### 2. Inner content

Dung:

- `height: laneHeight - 1`

Day la chi tiet can note.

Vi outer wrapper da co border bottom 1px,
nen inner row bi tru 1 de tong chieu cao nhin khop voi lane body.

Day la layout tuning nho nhung hop ly.

### 3. Track index

```tsx
<div className='w-4 text-right text-neutral-400'>
    {displayIndex}
</div>
```

Rat gon.

### 4. Action buttons

Hai nut:

- eye
- speaker

deu dung:

- `type='text'`
- `size='small'`
- `stopPropagation()`

`stopPropagation` la dung de tranh row click phat sinh interaction khac neu sau nay co them.

---

## F. Accessibility va state UI

File nay da co:

- `aria-label`
- `aria-pressed`

cho ca hai nut.

Day la diem tot.

Semantics:

### Eye button

- `aria-label={isHidden ? "Show Track" : "Hide Track"}`
- `aria-pressed={isHidden}`

### Speaker button

- `aria-label={isMuted ? "Unmute Track" : "Mute Track"}`
- `aria-pressed={isMuted}`

Can note:

`aria-pressed` o day dang dung theo state hien tai cua toggle, hop ly.

---

## G. Invariant ma file nay dang giu

### Invariant 1

Row height phai khop `laneHeight` cua lane body, tru 1px border.

### Invariant 2

Hide/mute la toggle state cua track, khong phai cua clip.

### Invariant 3

Button click khong nen noi bot len parent row.

### Invariant 4

Icon hien thi phai khop state hien tai:

- hidden -> eye slash
- muted -> speaker x

---

## H. Diem manh cua file hien tai

1. File nho, ro rang

2. Accessibility co chu y

3. Layout alignment voi lane body duoc xu ly ro

4. Store action boundary ro

5. Khong nhoi them logic thua

---

## I. Code smell / risk / diem can de y

### 1. `bg-white` dang hard-code trong row

Neu timeline co them dark/light theme dung nghia hoac style dong bo hon,
file nay co the la mot trong nhung noi phai chinh.

### 2. Icon mau hien tai khong phan biet active state manh

Ca icon hidden/muted va normal deu dang chu yeu la neutral xam,
chi doi hinh icon.

Dieu nay co the du cho ban dau, nhung neu UX can ro hon thi co the can them state color.

### 3. `height: laneHeight - 1` la tuning layout ngam

Khong sai, nhung can nho no phu thuoc vao:

- borderBottomWidth = 1

Neu border system doi, dong nay can doi theo.

### 4. Row hien tai chua co selected/focused state

Khong nhat thiet la thieu, nhung can note:

track header row hien chi la control row, chua phai mot row co selection semantics.

---

## J. Ket luan file nay

`timeline-track-header-row.tsx` la mot row component sach va thuc dung.

No lam dung viec:

- render so track
- render mute/hide controls
- giu alignment voi lane body

Khong co complexity lon va dang o trang thai tot.

Diem can de y chu yeu la cac tuning layout va style local,
khong phai business logic.

---

## Thu tu review de xuat tiep theo

Sau cum `timeline-track-headers`, thu tu hop ly tiep theo:

1. `src/features/editor/components/timeline/components/timeline-item/index.tsx`
2. `src/features/editor/components/timeline/components/timeline-body.tsx` (neu co)
3. `src/features/editor/lib/build-track-lane-layouts.ts`

Ly do:

- `timeline-item/index.tsx` la primitive clip tren timeline
- sau do nen di tiep sang body/layout builder cua lane va clip
- `build-track-lane-layouts.ts` lien ket truc tiep voi cum header vua review

---

# File review 20 - `src/features/editor/components/timeline/components/timeline-item/index.tsx`

## A. Vai tro cua file

Day la primitive component cho mot clip tren Timeline.

No nhan vao mot `clipLayout` da duoc tinh san va render ra mot item co:

- vi tri
- kich thuoc
- drag behavior
- selection behavior
- resize handles
- visual shell
- clip content ben trong

Noi cach khac:

- math/layout khong nam o file nay
- business move/resize logic chinh khong nam o file nay
- file nay la primitive render + interaction shell cho clip

Day la vai tro rat quan trong, vi gan nhu moi clip tren Timeline deu di qua file nay.

---

## B. Import va dependency

File import:

- `useDraggable` tu `@dnd-kit/core`
- `CSS` tu `@dnd-kit/utilities`
- `TimelineClipLayout`
- `TimelineItemContent`
- `TimelineItemResizeHandle`
- `TimelineItemShell`

Y nghia:

- file nay la noi noi layout data vao DnD kit
- file nay tach visual thanh 3 lop:
  - shell
  - content
  - resize handle

Day la boundary tot.

---

## C. Props cua component

```ts
type TimelineItemProps = {
    clipLayout: TimelineClipLayout;
    isSelected?: boolean;
    isDragDisabled?: boolean;
    onSelect?: (clipId: string) => void;
};
```

### 1. `clipLayout`

Prop quan trong nhat.

No chua gan nhu toan bo du lieu render ma file can:

- `clip`
- `left`
- `top`
- `width`
- `height`
- `resizeHandleWidth`
- `isTrackLocked`
- `isTrackHidden`
- `isTrackMuted`

Day cho thay mot boundary dep:

- file builder/layout engine tinh truoc
- primitive chi render va bat interaction

### 2. `isSelected`

State visual cho shell.

### 3. `isDragDisabled`

Cho parent co the khoa drag trong mot so mode/tinh huong.

### 4. `onSelect`

Callback khi clip duoc click.

Primitive khong tu chon clip trong store.
No chi thong bao nguoc len.

Day la dung.

---

## D. Data unpack tu `clipLayout`

File destructure:

- `clip`
- `left`
- `top`
- `width`
- `height`
- `resizeHandleWidth`
- `isTrackLocked`
- `isTrackHidden`
- `isTrackMuted`

Y nghia:

primitive nay khong can biet track object day du.

No dung mot shape layout da duoc "flatten" cho nhu cau render.

Day la mot pattern tot vi giam coupling.

### `isLocked`

```ts
const isLocked = isTrackLocked || clip.isLocked;
```

Can note:

clip bi khoa neu:

- track khoa
hoac
- clip tu khoa

Day la business rule duoc gom tai ngay primitive layer de quyet dinh interaction visual.

Rat hop ly.

---

## E. `useDraggable` va contract DnD

```ts
const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
        id: clip.id,
        data: {
            clipId: clip.id,
            trackId: clip.trackId,
            type: clip.type,
        },
        disabled: isDragDisabled || isLocked,
    });
```

### Vai tro

File nay dang ky clip vao he DnD kit.

### `id`

Dung `clip.id` la dung va tu nhien.

### `data`

Payload drag bao gom:

- `clipId`
- `trackId`
- `type`

Can note:

payload nay khong chua:

- from
- duration
- layerIndex

Tuc la orchestration drag/drop o tang tren phai tu lay them tu state neu can.

Day la design gon.

### `disabled`

Drag bi tat neu:

- `isDragDisabled`
hoac
- `isLocked`

Day la boundary interaction hop ly.

---

## F. JSX / HTML structure hien tai

File render:

```tsx
<div
    className='relative'
    data-hidden={isTrackHidden || clip.isHidden}
    style={{ opacity: isTrackHidden || clip.isHidden ? 0.45 : 1 }}>
    <div data-state='closed' style={{ display: "contents" }}>
        <div
            ref={setNodeRef}
            data-editor-focus-target='timeline-clip'
            {...attributes}
            {...listeners}
            onClick={...}
            style={{ ... }}>
            <TimelineItemShell ...>
                <TimelineItemContent ... />
            </TimelineItemShell>

            {!isLocked && (
                <>
                    <TimelineItemResizeHandle side='start' ... />
                    <TimelineItemResizeHandle side='end' ... />
                </>
            )}
        </div>
    </div>
</div>
```

### 1. Outer wrapper

`className='relative'`

Dong vai tro wrapper nho cho item.

Can note:

- file dat `data-hidden`
- file dat `opacity`

ngay o wrapper ngoai.

### `data-hidden`

```tsx
data-hidden={isTrackHidden || clip.isHidden}
```

Day la marker tot cho:

- debug
- styling/test ve sau

### `opacity`

```tsx
style={{ opacity: isTrackHidden || clip.isHidden ? 0.45 : 1 }}
```

Y nghia:

clip an hoac nam trong track an van duoc render trong Timeline,
nhung mo di.

Day la mot quyet dinh UI can note:

- hide o Preview khong co nghia la bien mat khoi Timeline

### 2. Wrapper trung gian `display: contents`

```tsx
<div data-state='closed' style={{ display: "contents" }}>
```

Day la chi tiet can note ky vi hoi la.

`display: contents` nghia la wrapper ton tai trong DOM,
nhung khong tao box layout rieng.

Canh nay co the lien quan den:

- preserve mot contract/structure cho state wrapper
- khong muon them lop box phu

Hien tai file khong giai thich vi sao can wrapper nay.

Day la mot diem can de mat.

### 3. Inner draggable node

Day moi la clip box that su.

Style:

- `width`
- `left`
- `top`
- `height`
- `position: "absolute"`
- `zIndex: isDragging ? 10000 : clip.layerIndex + 1`
- `transform: CSS.Translate.toString(transform)`
- `opacity: isDragging ? 0.82 : undefined`
- `touchAction: "none"`

#### `position: absolute`

Item duoc dat theo layout da tinh san.

#### `zIndex`

Can note rat ky:

```ts
zIndex: isDragging ? 10000 : clip.layerIndex + 1
```

Logic nay giu 2 behavior:

1. binh thuong:
   - stack theo `clip.layerIndex`
2. dang drag:
   - day item len rat cao de khong bi che

Day la quyet dinh dung cho UX.

#### `transform`

DnD kit dua `transform`, file nay doi no sang CSS transform string.

Day la primitive drag visual path.

#### `touchAction: "none"`

Can de pointer drag hoat dong on dinh.

Day la dung.

---

## G. Selection behavior

File co:

```tsx
onClick={(event) => {
    event.stopPropagation();
    onSelect?.(clip.id);
}}
```

Y nghia:

- click vao clip se chon clip do
- khong noi bot len timeline container

Day la behavior dung.

Can note:

File nay khong tu xu ly:

- multi-select
- modifier key
- deselect

No chi phat "clip nay duoc click".

Day la boundary dung cho primitive.

---

## H. Shell, content va resize handles

### 1. `TimelineItemShell`

Nhan:

- `isLocked`
- `isSelected`

Y nghia:

Shell la noi lo state visual cap cao cua clip box.

### 2. `TimelineItemContent`

Nhan:

- `clip`
- `isTrackMuted`

Y nghia:

Noi dung clip duoc render rieng.

Can note:

track mute co the anh huong preview icon/content cue trong Timeline item.

### 3. Resize handles

Chi render khi:

```tsx
!isLocked
```

Hai handle:

- `side='start'`
- `side='end'`

Y nghia:

clip locked khong duoc resize.

Day la business rule dung o cap primitive.

Can note:

file nay chi render handle.
No khong tu xu ly resize behavior that.

Day la boundary dung.

---

## I. Invariant ma file nay dang giu

### Invariant 1

Vi tri/kich thuoc clip tren Timeline phai den tu `clipLayout`, khong tu tinh lai trong primitive.

### Invariant 2

Clip locked hoac nam trong track locked thi khong duoc drag/resize.

### Invariant 3

Track hide / clip hide trong Timeline duoc the hien bang opacity, khong phai remove khoi DOM.

### Invariant 4

Stack binh thuong theo `clip.layerIndex`, con dang drag thi item phai duoc day len cao nhat.

### Invariant 5

Primitive chi emit selection callback, khong tu quan ly selection source of truth.

---

## J. Diem manh cua file hien tai

1. Boundary kha ro giua layout / shell / content / handle

2. DnD kit integration gon va de doc

3. Logic lock duoc gom ro rang va dung

4. `layerIndex` duoc ton trong o zIndex thuong

5. Primitive khong om qua nhieu business logic sau ben trong

---

## K. Code smell / risk / diem can de y

### 1. `display: contents` wrapper can them giai thich

Day la diem la nhat cua file hien tai.

Neu khong co ly do ro rang, nguoi moi doc se rat kho hieu tai sao no ton tai.

### 2. `zIndex: 10000` khi drag la magic number

Dung trong thuc te, nhung van la magic number.

Neu sau nay stack system cua timeline doi, con so nay co the tro thanh diem canh tranh z-index.

### 3. Hide state the hien bang opacity 0.45

Day la policy UI hop ly.

Nhung no la hard-code style local.

### 4. File khong phan biet click de chon va drag threshold

Hien tai rely vao DnD kit va browser event flow.

Neu sau nay co bug click/drag overlap, file nay se la noi can xem lai.

### 5. Payload DnD data con toi gian

Day la tot.

Nhung neu orchestration tang tren can them thong tin, se phai quay lai file nay de mo rong payload.

---

## L. Ket luan file nay

`timeline-item/index.tsx` la primitive clip quan trong va dang o trang thai kha tot.

No giu duoc boundary dep:

- layout o ngoai
- visual shell o mot lop
- content o mot lop
- resize handles o mot lop

Day la kieu component de maintain duoc khi editor lon dan.

Diem can de y lon nhat cua file hien tai:

1. wrapper `display: contents`
2. magic number `zIndex: 10000`
3. policy hide state bang opacity local

Con lai, file nay dang rat dung huong cho mot primitive timeline item.

---

## Thu tu review de xuat tiep theo

Sau `timeline-item/index.tsx`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/build-track-lane-layouts.ts`
2. `src/features/editor/lib/build-clip-layouts.ts`
3. `src/features/editor/components/timeline/components/timeline-item/timeline-item-content.tsx`

Ly do:

- can di xuong builder layer ngay sau primitive item
- `build-clip-layouts.ts` la nguon cap `clipLayout`
- sau do moi quay lai content render ben trong item

---

# File review 21 - `src/features/editor/lib/build-track-lane-layouts.ts`

## A. Vai tro cua file

Day la builder layer cho geometry cua cac lane trong Timeline.

File nay nhan:

- `tracks`
- `clips`

roi tinh ra:

- danh sach `TimelineTrackLaneLayout`
- `totalHeight`

No la file trung gian rat quan trong giua:

- model data cua track/clip
va
- UI render cua:
  - track headers
  - timeline body
  - clip item height
  - resize handle width

Noi cach khac:

neu file nay tinh sai, ca lane body va track header se lech nhau ngay.

---

## B. Type ma file dinh nghia

### 1. `TimelineTrackLaneLayout`

```ts
export type TimelineTrackLaneLayout = {
    trackId: TrackId;
    kind: TrackMediaKind;
    top: Pixels;
    laneHeight: Pixels;
    itemInsetY: Pixels;
    itemHeight: Pixels;
    resizeHandleWidth: Pixels;
};
```

Y nghia:

- `trackId`: lane nay thuoc track nao
- `kind`: kind goc cua track
- `top`: vi tri y bat dau cua lane trong stack
- `laneHeight`: chieu cao toan lane
- `itemInsetY`: inset doc cua clip item trong lane
- `itemHeight`: chieu cao that cua clip item sau khi tru inset
- `resizeHandleWidth`: do rong handle resize cho item trong lane

Day la shape layout rat thuc dung.

### 2. `BuildTrackLaneLayoutsResult`

```ts
export type BuildTrackLaneLayoutsResult = {
    layouts: TimelineTrackLaneLayout[];
    totalHeight: Pixels;
};
```

`totalHeight` cho phep parent dat tong chieu cao body/header ma khong can cong tay lan nua.

---

## C. Visual config trong file

### 1. `TimelineTrackVisualConfig`

Chua:

- `laneHeight`
- `itemInsetY`
- `resizeHandleWidth`

Day la visual policy config cho tung kind.

### 2. `DEFAULT_TIMELINE_TRACK_VISUAL_CONFIG`

```ts
{
    laneHeight: 35,
    itemInsetY: 1.5,
    resizeHandleWidth: 6,
}
```

Dùng lam fallback khi kind khong co config ro rang.

### 3. `TIMELINE_TRACK_VISUAL_CONFIG`

Config hien tai:

- `text`: 35
- `shape`: 35
- `audio`: 35
- `video`: 71
- `image`: 35

Can note:

- `video` la kind duy nhat cao hon dang ke
- cac kind con lai dang dung cung mot family visual

Day chinh la chinh sach UI cua lane height.

---

## D. Helper - `clampPositive`

```ts
const clampPositive = (value: number, fallback: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
        return fallback;
    }
    return value;
};
```

Y nghia:

ham nay dam bao mot gia tri so duong hop le.

Trong file nay, no duoc dung de sanitize `laneHeight`.

Day la guard nho nhung dung.

Can note:

ten ham de doc va dung muc dich.

---

## E. Ham chinh - `buildTrackLaneLayouts`

```ts
export const buildTrackLaneLayouts = (
    tracks: TimelineTrack[],
    clips: TimelineClip[] = [],
): BuildTrackLaneLayoutsResult => { ... }
```

### Vai tro

Tinh lane layouts cho toan bo stack track.

### Input

- `tracks`
- `clips` co default `[]`

Default nay cho phep file duoc goi trong context chi co track ma chua co clip.

---

## F. Tung buoc logic ben trong ham

### Buoc 1 - Guard dau vao rong

```ts
if (!Array.isArray(tracks) || tracks.length === 0) {
    return {
        layouts: [],
        totalHeight: 0,
    };
}
```

Fail-soft va hop ly.

Neu khong co track thi:

- khong co lane
- tong chieu cao = 0

### Buoc 2 - Sort track

```ts
const sortedTracks = [...tracks].sort((a, b) => a.index - b.index);
```

Day la source thu tu lane stack.

Rat quan trong:

- `currentTop` se di theo thu tu nay
- header/body deu phai tin vao thu tu nay

### Buoc 3 - `currentTop`

```ts
let currentTop = 0;
```

Bien tich luy de tinh vi tri y cua tung lane.

### Buoc 4 - Tinh config cho tung track

Day la phan quan trong nhat cua file.

```ts
const trackClipTypes = clips
    .filter((clip) => clip.trackId === track.id)
    .map((clip) => clip.type);
const visualKinds = [track.kind, ...trackClipTypes];
```

Y nghia:

lane visual khong chi phu thuoc vao `track.kind`,
ma con phu thuoc vao tat ca clip dang nam trong lane do.

Day la logic moi ma user da yeu cau.

Sau do file reduce:

```ts
const config = visualKinds.reduce<TimelineTrackVisualConfig>(
    (largestConfig, kind) => {
        const kindConfig =
            TIMELINE_TRACK_VISUAL_CONFIG[kind] ??
            DEFAULT_TIMELINE_TRACK_VISUAL_CONFIG;

        return kindConfig.laneHeight > largestConfig.laneHeight
            ? kindConfig
            : largestConfig;
    },
    DEFAULT_TIMELINE_TRACK_VISUAL_CONFIG,
);
```

### Y nghia cua reduce nay

File dang chon config cua kind co `laneHeight` lon nhat trong lane.

Tuc la:

- lane co image + text => 35
- lane co image + video => 71
- lane rong chi co `track.kind` => fallback theo kind goc

Day la implementation dung cho rule:

- lane cao theo item cao nhat trong lane

Day la diem quan trong nhat cua file nay.

### Buoc 5 - Tinh `laneHeight`

```ts
const laneHeight = clampPositive(config.laneHeight, track.height);
```

Comment cua file da note:

- logic cu de `track.height` override config
- logic moi cho lane follow kind cao nhat

Can note mot chi tiet:

`clampPositive(config.laneHeight, track.height)` co nghia:

- uu tien `config.laneHeight`
- chi fallback sang `track.height` neu config height khong hop le

Tuc la:

- visual config dang la source chinh
- `track.height` khong con la source override chinh nua

Day la thay doi kien truc nho nhung rat quan trong.

### Buoc 6 - Tinh inset va item height

```ts
const maxInsetY = Math.max(0, (laneHeight - 1) / 2);
const itemInsetY = Math.min(config.itemInsetY, maxInsetY);
const itemHeight = Math.max(1, laneHeight - itemInsetY * 2);
```

Day la logic safeguard cho item box.

Y nghia:

- inset khong duoc lon den muc item height am hoac 0
- item height toi thieu la 1

Day la xu ly can than va dung.

### Buoc 7 - Tao `layout`

```ts
const layout: TimelineTrackLaneLayout = {
    trackId: track.id,
    kind: track.kind,
    top: currentTop,
    laneHeight,
    itemInsetY,
    itemHeight,
    resizeHandleWidth: config.resizeHandleWidth,
};
```

### Buoc 8 - Tang `currentTop`

```ts
currentTop += laneHeight;
```

Tuc la lane stack lien nhau theo tong lane height.

Khong co gap rieng giua lane trong builder nay.

### Buoc 9 - Return

```ts
return {
    layouts,
    totalHeight: currentTop,
};
```

Tong chieu cao sau cung = tong cac laneHeight.

---

## G. Invariant ma file nay dang giu

### Invariant 1

Thu tu lane phai theo `track.index`.

### Invariant 2

Lane height phai theo visual kind cao nhat trong lane, khong chi theo `track.kind`.

### Invariant 3

Empty lane van co visual config fallback theo `track.kind`.

### Invariant 4

`itemHeight` khong duoc <= 0.

### Invariant 5

`totalHeight` = tong tat ca `laneHeight`.

---

## H. Diem manh cua file hien tai

1. Boundary builder ro rang

2. Da implement dung rule lane cao theo clip cao nhat

3. Co safeguard cho item height/inset

4. Tra ve du layout data cho ca header va body

5. Logic tong the de doc va de test

---

## I. Code smell / risk / diem can de y

### 1. `clips.filter(...).map(...)` trong moi track

Voi so luong track/clip lon, day la O(tracks * clips).

Hien tai co the van on.

Nhung neu editor scale lon hon, file nay co the can pre-group clips theo `trackId`.

### 2. `track.height` van con ton tai trong model nhung gan nhu khong con la source chinh

Day la dau hieu model dang chua that su sach hoan toan.

Nguoi moi doc co the hoi:

- vay `track.height` con de lam gi

### 3. `kind` trong layout van giu `track.kind`, khong phai dominant kind cua lane

Dieu nay khong sai.

Nhung can note:

- laneHeight co the theo `video`
- nhung `layout.kind` van la kind goc cua track

Neu ve sau UI nao do dua vao `layout.kind` de quyet visual height, de sai.

### 4. Visual config hard-code trong file

Khong sai, nhung file nay dang mang policy UI truc tiep.

Neu sau nay can theme hoac mode compact, file nay se la noi phai sua.

---

## J. Ket luan file nay

`build-track-lane-layouts.ts` la mot builder quan trong va hien tai dang o trang thai kha tot.

No da giu dung rule UI ma editor dang can:

- lane cao theo item cao nhat trong lane
- lane stack theo `track.index`
- item height an toan trong lane

Day la file ma header, body va clip primitive deu phu thuoc.

Diem can de y lon nhat cua file hien tai:

1. `track.height` trong model da bi giam vai tro
2. complexity O(tracks * clips) co the can toi uu ve sau
3. `layout.kind` va `laneHeight source kind` khong nhat thiet giong nhau

---

## Thu tu review de xuat tiep theo

Sau `build-track-lane-layouts.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/build-clip-layouts.ts`
2. `src/features/editor/components/timeline/components/timeline-item/timeline-item-content.tsx`
3. `src/features/editor/components/timeline/components/timeline-item/timeline-item-shell.tsx`

Ly do:

- `build-clip-layouts.ts` la builder song song va cap du lieu truc tiep cho `timeline-item`
- sau do moi di vao visual shell/content cua clip item

---

# File review 22 - `src/features/editor/lib/build-clip-layouts.ts`

## A. Vai tro cua file

Day la builder layer cho geometry va state render can thiet cua tung clip tren Timeline.

No nhan vao:

- `clips`
- `tracks`
- `trackLaneLayouts`
- `pixelsPerFrame`

roi tra ra:

- danh sach `TimelineClipLayout`

Day la file cau noi truc tiep giua:

- model clip/track/lane
va
- primitive `timeline-item/index.tsx`

Neu `build-track-lane-layouts.ts` lo geometry cap lane,
thi file nay lo geometry cap clip.

---

## B. Type - `TimelineClipLayout`

```ts
export type TimelineClipLayout = {
    clip: TimelineClip;
    left: Pixels;
    top: Pixels;
    width: Pixels;
    height: Pixels;
    resizeHandleWidth: Pixels;
    isTrackLocked: boolean;
    isTrackMuted: boolean;
    isTrackHidden: boolean;
};
```

Y nghia:

### 1. `clip`

giu reference den model clip goc.

### 2. `left`

toa do x cua clip tren Timeline.

### 3. `top`

toa do y cua clip trong stack lane.

### 4. `width`

do rong visual cua clip.

### 5. `height`

chieu cao visual cua clip.

### 6. `resizeHandleWidth`

do rong handle resize ma primitive can render.

### 7. `isTrackLocked`, `isTrackMuted`, `isTrackHidden`

day la state da duoc flatten tu track xuong clip layout.

Day la pattern tot, vi primitive clip khong can tu query track nua.

---

## C. Import va dependency

File import:

- `Pixels`
- `frameToPx`
- `framesToPx`
- `TimelineTrackLaneLayout`
- `TimelineClip`
- `TimelineTrack`

Y nghia:

- file nay dung lane builder o tang duoi
- file nay dung timeline math de doi frame sang px
- file nay khong doc store, khong doc React

Day la pure builder utility.

---

## D. Ham chinh - `buildClipLayouts`

```ts
export const buildClipLayouts = (
    clips: TimelineClip[],
    tracks: TimelineTrack[],
    trackLaneLayouts: TimelineTrackLaneLayout[],
    pixelsPerFrame: number,
): TimelineClipLayout[] => { ... }
```

### Vai tro

Sinh ra layout du clip de render Timeline items.

---

## E. Tung buoc logic ben trong ham

### Buoc 1 - `trackMap`

```ts
const trackMap = new Map(tracks.map((track) => [track.id, track]));
```

Map track theo `track.id` de lookup nhanh.

### Buoc 2 - `laneMap`

```ts
const laneMap = new Map(
    trackLaneLayouts.map((layout) => [layout.trackId, layout]),
);
```

Map lane layout theo `trackId`.

Day la pattern giong file headers:

- join bang `Map`
- tranh `.find(...)` lap lai

Day la chi tiet chat luong va dong bo voi cac builder khac.

### Buoc 3 - `clips.flatMap(...)`

```ts
return clips.flatMap((clip) => {
    const track = trackMap.get(clip.trackId);
    const lane = laneMap.get(clip.trackId);

    if (!track || !lane) {
        return [];
    }

    return [
        {
            ...
        },
    ];
});
```

Day la pattern fail-soft.

Neu clip tro toi:

- track khong ton tai
hoac
- lane khong ton tai

thi clip do bi bo qua.

Khong throw error.

Day la practical cho UI builder, nhung can note de debug.

### Buoc 4 - Tinh geometry

#### `left`

```ts
left: frameToPx(clip.from, pixelsPerFrame),
```

Y nghia:

toa do x cua clip dua tren:

- frame bat dau
- pixels per frame
- gutter semantics nam ben trong `frameToPx`

Day la dung.

#### `top`

```ts
top: lane.top + lane.itemInsetY,
```

Clip khong nam sat top lane.
No nam cach tren mot khoang inset.

Day la bridge dung giua lane geometry va clip geometry.

#### `width`

```ts
width: framesToPx(clip.durationInFrames, pixelsPerFrame),
```

Dung `framesToPx`, khong dung `frameToPx`.

Day la distinction semantics quan trong va file nay dang dung.

#### `height`

```ts
height: lane.itemHeight,
```

Clip cao theo `itemHeight` da duoc lane builder tinh san.

#### `resizeHandleWidth`

Lay thang tu lane layout.

### Buoc 5 - Flatten state tu track

```ts
isTrackLocked: track.isLocked,
isTrackMuted: track.isMuted,
isTrackHidden: track.isHidden,
```

Day la quyet dinh rat hop ly.

Primitive `timeline-item` chi can nhin vao `clipLayout`,
khong can quay nguoc lai track model de hoi:

- track co bi lock khong
- track co mute khong
- track co hide khong

Day giup render layer de maintain hon.

---

## F. Invariant ma file nay dang giu

### Invariant 1

Clip geometry phai dua tren lane layout da tinh san, khong duoc tu tinh top/height rieng.

### Invariant 2

`left` dung `frameToPx`, con `width` dung `framesToPx`.

### Invariant 3

Clip khong duoc render neu track hoac lane reference bi hong.

### Invariant 4

Track-level state can thiet duoc flatten vao clip layout.

### Invariant 5

`pixelsPerFrame` la input geometry duy nhat theo truc ngang.

---

## G. Diem manh cua file hien tai

1. Rat gon va de doc

2. Boundary builder ro rang

3. Tai su dung dung helper math (`frameToPx`, `framesToPx`)

4. Flatten track state xuong clip layout la quyet dinh tot

5. Join bang `Map` de hieu qua va ro nghia

---

## H. Code smell / risk / diem can de y

### 1. Fail-soft khi track/lane missing

Clip se bien mat khoi Timeline ma khong bao loi.

Practical, nhung debug can de y.

### 2. File khong sort clip

Builder nay giu nguyen thu tu `clips` input.

Dieu nay khong sai.

Nhung can note:

- neu caller can order on dinh theo lane/from/layerIndex, caller hoac tang tren phai dam bao

### 3. `isTrackLocked`, `isTrackMuted`, `isTrackHidden` duoc flatten,
nhung khong flatten `layerIndex`

Khong sai vi `layerIndex` dang nam trong `clip`.

Nhung can hieu:

- mot phan state render la trong `clip`
- mot phan state render la tu `track`

`TimelineClipLayout` la shape lai giua hai nguon nay.

### 4. File nay tin rang `pixelsPerFrame` hop le

Neu `pixelsPerFrame = 0`, width/left se ra 0 hoac chi theo gutter.

Khong sai ve toan hoc, nhung day la assumption ngam.

---

## I. Ket luan file nay

`build-clip-layouts.ts` la mot builder nho, sach va rat dung vai tro.

No dang la file bien:

- clip model
- lane geometry
- track state

thanh mot shape render gon cho primitive `timeline-item`.

Day la pattern tot va de scale.

Diem can de y lon nhat cua file hien tai:

1. fail-soft khi missing reference
2. file khong tu quan ly ordering
3. `TimelineClipLayout` la shape hop nhat tu clip + track + lane, nen nguoi moi doc can nam ro nguon cua tung field

---

## Thu tu review de xuat tiep theo

Sau `build-clip-layouts.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/components/timeline/components/timeline-item/timeline-item-content.tsx`
2. `src/features/editor/components/timeline/components/timeline-item/timeline-item-shell.tsx`
3. `src/features/editor/components/timeline/components/timeline-item/timeline-item-resize-handle.tsx`

Ly do:

- da co du context builder -> primitive, gio nen di het cum timeline item visual
- 3 file nay la 3 manh con lai cua primitive clip

---

# File review 23 - `src/features/editor/components/timeline/components/timeline-item/timeline-item-content.tsx`

## A. Vai tro cua file

Day la component render noi dung ben trong clip box cua Timeline item.

No khong lo:

- position
- selection border
- drag transform
- resize interaction

No chi lo:

1. hien icon theo loai clip
2. hien label/text
3. hien body visual cue theo tung loai media

Noi cach khac:

- `timeline-item/index.tsx` la primitive box
- file nay la "inside visual content" cua box do

---

## B. Import va dependency

File import:

- icon speaker wave / speaker x
- icon type
- icon shape
- icon image
- icon movie
- `TimelineClip`

Khong doc store.
Khong doc layout.

Day la presentational component dung nghia.

---

## C. Props cua component

```ts
type TimelineItemContentProps = {
    clip: TimelineClip;
    isTrackMuted?: boolean;
};
```

### 1. `clip`

Nguon du lieu render chinh:

- `type`
- `label`
- `text`
- `color`
- `isMuted`

### 2. `isTrackMuted`

State flatten tu track.

Can note:

audio content can biet track mute de hien icon dung.

Default:

- `false`

---

## D. Helper local - `getKindIcon`

Switch theo `clip.type`:

- `text` -> `BsType`
- `shape` -> `LuRectangleHorizontal`
- `audio` -> `HiSpeakerWave`
- `video` -> `RiMovie2Line`
- `image` -> `FiImage`

Default:

- `null`

Y nghia:

File nay centralize icon mapping trong mot helper nho.

Day la dung.

Neu sau nay them clip kind moi, day la mot diem can sua dau tien.

---

## E. Logic render theo tung `clip.type`

File nay render theo 4 nhanh:

1. `audio`
2. `video` / `image`
3. `text`
4. fallback con lai

Day la pattern ro rang va de doc.

### 1. Nhanh `audio`

```tsx
if (clip.type === "audio") {
    const muted = isTrackMuted || clip.isMuted;
    ...
}
```

#### Y nghia

Audio clip co state muted hien thi theo:

- track mute
hoac
- clip mute

Day la business rule dung.

#### UI hien tai

- icon speaker hoac speaker-x
- label
- mot thanh visual o day duoi giong waveform line don gian

Can note:

Phan waveform nay khong phai waveform that.
No la visual cue toi gian.

Day la acceptable cho timeline editor ban dau.

### 2. Nhanh `video` / `image`

Render:

- icon
- label
- mot strip duoi cung gom 12 cot nho

Y nghia:

Day la visual cue giong thumbnail strip / segment strip,
nhung van la placeholder pattern, khong phai thumbnail media that.

Can note:

`video` va `image` dang dung chung mot visual treatment.

Day la policy UI hien tai.

### 3. Nhanh `text`

Render:

- icon text
- `clip.text || clip.label`

Day la detail dung:

text clip uu tien noi dung that cua text,
khong chi label.

### 4. Fallback con lai

Hien tai se ap dung cho:

- `shape`
hoac
- bat ky type nao sau nay chua co branch rieng

UI:

- icon
- label

---

## F. Background color

File co:

```ts
const background = clip.color;
```

va dung `style={{ background }}` cho tung branch.

Y nghia:

Mau clip box duoc quyet dinh boi `clip.color`, khong boi type map hard-code o file nay.

Day la quyet dinh tot vi:

- visual policy clip color da nam trong model/data tang tren
- component content khong phai biet cach chon mau

---

## G. JSX structure tong quat

Tat ca branch deu co mot wrapper:

```tsx
<div className='absolute h-full w-full'>
    ...
</div>
```

Y nghia:

Content luon lap day shell box.

Ben trong moi branch lai co:

- body chinh
- icon + text line
- co the co mot strip visual phia duoi

Can note:

File nay dang co kha nhieu JSX lap lai giua cac branch:

- wrapper `absolute h-full w-full`
- body flex gap-1 p-1 text-xs text-white

Hien tai van de doc duoc.
Nhung neu media kind tang them, co the can tach common sub-structure.

---

## H. Invariant ma file nay dang giu

### Invariant 1

Noi dung clip trong Timeline duoc render theo `clip.type`.

### Invariant 2

Audio mute state visual = `isTrackMuted || clip.isMuted`.

### Invariant 3

Text clip uu tien hien `clip.text` neu co.

### Invariant 4

`clip.color` la source chinh cua background color.

### Invariant 5

Video/image waveform/thumbnail strip hien tai chi la visual cue placeholder, khong phai thumbnail/audio waveform that.

---

## I. Diem manh cua file hien tai

1. Presentational boundary ro

2. Switch theo type de doc

3. Text clip hien noi dung dung hon label

4. Audio mute state da ton trong ca clip-level va track-level

5. Mau clip khong bi hard-code theo type trong file nay

---

## J. Code smell / risk / diem can de y

### 1. Kha nhieu JSX lap lai giua cac branch

Hien tai chua den muc xau, nhung co dau hieu duplication.

### 2. `video` va `image` dang dung visual cue gia lap

Neu nguoi moi nhin nhanh co the tuong day la thumbnail that.

Can note ro day chi la placeholder visual.

### 3. Fallback branch khong explicit cho `shape`

Van dung duoc.
Nhung neu `shape` sau nay can visual rieng, file nay can tach nhanh rieng.

### 4. Style local hard-code kha nhieu

Vi du:

- `text-xs`
- `p-1`
- `h-5`
- `12` cot strip

Tat ca la policy UI local.

### 5. Khong co handling rieng cho label/text qua dai ngoai `truncate`

Khong sai.
Nhung day la choice UI hien tai.

---

## K. Ket luan file nay

`timeline-item-content.tsx` la presentational component kha sach va dung huong.

No giu boundary tot:

- khong can biet layout
- khong can biet drag/select
- chi can biet clip type va mot chut state flatten tu track

Diem can de y lon nhat cua file hien tai:

1. duplication JSX nhe
2. visual cue cho video/image/audio hien van la placeholder
3. `shape` dang song trong fallback branch

---

# File review 24 - `src/features/editor/components/timeline/components/timeline-item/timeline-item-shell.tsx`

## A. Vai tro cua file

Day la shell visual cua Timeline item.

No lo:

- border
- radius
- overflow
- cursor
- state selected/locked

No khong lo:

- content
- position
- drag
- resize

Day la mot presentational shell component rat gon.

---

## B. Props cua component

```ts
type TimelineItemShellProps = {
    children?: React.ReactNode;
    isLocked?: boolean;
    isSelected?: boolean;
};
```

### `children`

Noi dung clip duoc dat ben trong shell.

### `isLocked`

Dung de doi cursor.

### `isSelected`

Dung de doi border width va color.

---

## C. JSX va style hien tai

File render:

```tsx
<div
    className='absolute box-border h-full w-full overflow-hidden rounded-md select-none'
    style={{
        borderWidth: isSelected ? 2 : 1.5,
        borderColor: isSelected ? "#0440c2" : "black",
        cursor: isLocked ? "not-allowed" : "pointer",
    }}>
    {children}
</div>
```

### Y nghia

#### `absolute h-full w-full`

Shell lap day toan bo clip box.

#### `box-border`

Quan trong vi border width thay doi theo selected state.

Neu khong `box-border`, border co the lam doi outer size cam nhan duoc.

#### `overflow-hidden`

Cat content ben trong theo rounded border.

#### `rounded-md`

Clip item co bo goc mem.

#### Border logic

- selected => `2`
- normal => `1.5`

Color:

- selected => `#0440c2`
- normal => `black`

Cursor:

- locked => `not-allowed`
- normal => `pointer`

Day la shell rat straightforward.

---

## D. Invariant ma file nay dang giu

### Invariant 1

Selected state chi anh huong style shell, khong anh huong layout data.

### Invariant 2

Locked state o shell hien tai chi doi cursor, khong khoa interaction logic.

Logic khoa interaction that nam o primitive cha.

### Invariant 3

Shell phai lap day clip box va cat content theo border radius.

---

## E. Diem manh cua file hien tai

1. Rat gon

2. Boundary ro

3. `box-border` la chi tiet dung va can thiet

4. Khong nhoi them logic thua

---

## F. Code smell / risk / diem can de y

### 1. Border width selected va normal khac nhau

Nho `box-border` thi outer size khong phinh ra ro rang,
nhung visual canh trong van thay doi nhe.

Khong sai, nhung can note vi day la policy UI.

### 2. Mau border hard-code

`#0440c2` va `black` dang nam truc tiep trong file.

Neu design system doi, file nay phai sua.

### 3. `isLocked` chi doi cursor

Nguoi moi co the nham rang shell da xu ly lock.

Thuc te:

- interaction lock nam o primitive cha
- shell chi lo cue thi giac

Can nho distinction nay.

---

## G. Ket luan file nay

`timeline-item-shell.tsx` la shell component rat nho va dung muc dich.

No giu dung state visual co ban cho clip box.

Khong co van de kien truc dang ke.

---

# File review 25 - `src/features/editor/components/timeline/components/timeline-item/timeline-item-resize-handle.tsx`

## A. Vai tro cua file

Day la component render vung bat resize o hai dau clip.

No khong tu xu ly:

- resize logic
- pointer event
- clip duration update

No chi lo:

1. vi tri handle o dau hay cuoi
2. do rong handle
3. cursor resize phu hop

Day la primitive visual/interaction surface nho.

---

## B. Props cua component

```ts
type TimelineItemResizeHandleProps = {
    side: "start" | "end";
    width?: number;
};
```

### 1. `side`

Quyet dinh handle nam ben trai hay ben phai.

### 2. `width`

Do rong handle.

Default:

- `6`

Dong bo voi lane visual config.

---

## C. Logic ben trong file

```ts
const isStart = side === "start";
```

Rat don gian.

Sau do render:

```tsx
<div
    className={`group absolute top-0 bottom-0 flex items-center justify-center ${
        isStart ? "cursor-e-resize" : "cursor-w-resize"
    }`}
    style={{
        width,
        [isStart ? "left" : "right"]: -1,
    }}
/>
```

### Vi tri

- `start` => `left: -1`
- `end` => `right: -1`

Handle duoc day ra ngoai 1px.

Day la tuning nho de bat resize de hon o mep clip.

### Cursor

Can note:

- `start` dang dung `cursor-e-resize`
- `end` dang dung `cursor-w-resize`

Ve mat semantics huong resize, day co the co chu y theo huong keo vao trong/ra ngoai,
nhung nguoi maintain can de y vi de nham.

Neu theo cam nhan UI thong thuong, nhieu codebase se chon:

- ben trai = `w-resize`
- ben phai = `e-resize`

Nen day la chi tiet can de mat.

---

## D. Invariant ma file nay dang giu

### Invariant 1

Handle chi la vung bat resize, khong chua resize business logic.

### Invariant 2

Handle duoc dat sat mep clip va lech ra ngoai 1px.

### Invariant 3

Do rong handle phai theo visual config/lane config tu tang tren.

---

## E. Diem manh cua file hien tai

1. Rat gon

2. Boundary primitive ro

3. Width configurable

4. Khong nhoi them logic thua

---

## F. Code smell / risk / diem can de y

### 1. Cursor direction can de mat

Nhu da note, `start -> e-resize`, `end -> w-resize` co the gay tranh luan semantically.

Can test voi trai nghiem that.

### 2. Handle hien tai khong co visual cue rieng

No chi la vung bat chuot.

Khong sai, nhung UX co the kho thay neu khong re vao dung mep.

### 3. `left/right: -1` la tuning hard-code

Khong sai, nhung van la magic number layout nho.

---

## G. Ket luan file nay

`timeline-item-resize-handle.tsx` la primitive rat nho va dung boundary.

No khong co complexity lon.

Diem can de y lon nhat cua file nay la semantics cursor direction va việc handle hien chi la hit area, chua co cue thi giac ro rang.

---

## Thu tu review de xuat tiep theo

Sau cum `timeline-item`, thu tu hop ly tiep theo:

1. `src/features/editor/components/timeline/components/timeline-body.tsx` (neu ton tai)
2. `src/features/editor/components/timeline/components/timeline-ruler.tsx` (revisit neu can)
3. `src/features/editor/lib/format-time.ts`

Ly do:

- nen tiep tuc di het cum timeline render truoc neu co `timeline-body`
- `timeline-ruler.tsx` da review roi, co the revisit sau them context item/body
- `format-time.ts` la helper nho nhung duoc toolbar/ruler/time UI dung rat nhieu

---

# File review 26 - `src/features/editor/components/timeline/components/timeline-body/index.tsx`

## A. Vai tro cua file

Day la root component cua phan body ben phai trong Timeline.

No khong lo:

- ruler
- playhead
- track headers
- toolbar

No chi lo:

1. tao khung body co width/height dung
2. render lane backgrounds
3. render items layer o tren backgrounds

Noi cach khac:

day la body container cho vung clip/lane that su.

---

## B. Props cua component

```ts
type TimelineBodyProps = {
    timelineWidth: number;
    lanes: TimelineTrackLaneLayout[];
    totalHeight: number;
    children?: React.ReactNode;
};
```

### `timelineWidth`

Do rong toan bo content body.

### `lanes`

Danh sach lane layout da tinh san.

### `totalHeight`

Tong chieu cao body.

### `children`

Thong thuong la:

- clip items
- drop preview
- cac overlay khac cua body

---

## C. JSX va logic hien tai

```tsx
<div
    className='relative min-w-full'
    style={{
        width: timelineWidth,
        height: totalHeight,
    }}>
    <TimelineLaneBackgrounds width={timelineWidth} lanes={lanes} />
    <TimelineItemsLayer>{children}</TimelineItemsLayer>
</div>
```

### Y nghia

#### `relative`

Tao containing block cho:

- lane backgrounds absolute
- items absolute ben trong children

#### `min-w-full`

Body it nhat phai day ngang viewport,
ke ca khi `timelineWidth` nho.

#### `width` va `height`

Su dung geometry da duoc tinh san tu tang tren.

File nay khong tu tinh lai.

### Comment quan trong trong file

File da note:

- logic cu: body con tu cong them horizontal gutter padding
- logic moi: gutter da thuoc ve `frameToPx` / ruler / playhead

Day la detail rat quan trong.

No giai quyet mot class bug de gap:

- clip bi doi ngang vi body padding + math gutter cong hai lan

Boundary hien tai dung hon:

- geometry x do math helper quyet
- body khong tu them padding ngang nua

---

## D. Invariant ma file nay dang giu

### Invariant 1

Timeline body khong duoc tu cong them gutter ngang nua.

### Invariant 2

Lane backgrounds nam duoi, items nam tren.

### Invariant 3

Body width/height phai den tu tang tren, khong duoc tinh lai o day.

---

## E. Diem manh cua file hien tai

1. Rat gon

2. Boundary ro

3. Da sua dung bai toan double-gutter

4. Tach lane background va item layer ro rang

---

## F. Code smell / risk / diem can de y

### 1. File rat mong nen de bi xem nhe

Nhung thuc te day la cho chot layering co ban cua body.

### 2. `children` la slot mo

Rat linh hoat.
Nhung ve sau neu chen qua nhieu loai overlay vao body, can giu trat tu layering ro rang.

---

## G. Ket luan file nay

`timeline-body/index.tsx` la mot root render component gon va dung boundary.

Nho nhat cua no la:

- khong tu them gutter ngang nua

Day la chi tiet nho nhung co gia tri lon cho do dung toa do.

---

# File review 27 - `src/features/editor/components/timeline/components/timeline-body/timeline-items-layer.tsx`

## A. Vai tro cua file

Day la layer wrapper cho tat ca item/overlay trong body.

Hien tai no chi lam:

- render `children` ben trong mot `div.relative`

Day la file rat nho.

---

## B. JSX hien tai

```tsx
return <div className='relative'>{children}</div>;
```

### Y nghia

Items layer can la containing block de:

- clip items absolute
- drop preview absolute

co moc toa do ro rang.

Day la chuc nang duy nhat cua file nay.

---

## C. Invariant ma file nay dang giu

### Invariant 1

Children cua items layer co the dung absolute positioning dua tren body root.

### Invariant 2

Layer nay hien tai khong them style hay policy nao khac ngoai `relative`.

---

## D. Diem manh cua file hien tai

1. Rat nho

2. Boundary cuc ro

3. De mo rong neu sau nay can tach them item overlays

---

## E. Code smell / risk / diem can de y

### 1. File qua nho

Day khong phai van de ngay.

Nhung nguoi maintain co the hoi:

- co can file rieng khong

Hien tai ly do hop ly la:

- giu body layering ro rang
- de tang tren doc cau truc de hon

---

## F. Ket luan file nay

`timeline-items-layer.tsx` la mot abstraction nho nhung hop ly.

Nó giup cau truc body de doc hon du file rat ngan.

---

# File review 28 - `src/features/editor/components/timeline/components/timeline-body/timeline-lane-backgrounds.tsx`

## A. Vai tro cua file

Day la component render cac background rows cua lane.

No khong render clip.
No chi render:

- tung dong lane
- border bottom

de nguoi dung nhin thay cac lane tach biet nhau.

---

## B. Props cua component

```ts
type TimelineLaneBackgroundsProps = {
    width: number;
    lanes: TimelineTrackLaneLayout[];
};
```

### `width`

Do rong body content.

### `lanes`

Danh sach lane da co geometry.

---

## C. JSX va logic hien tai

File render:

```tsx
<div
    className='absolute min-w-full'
    style={{
        width,
    }}>
    {lanes.map((lane) => (
        <div
            key={lane.trackId}
            className='min-w-full pointer-events-none flex border-b border-black/20'
            style={{
                height: lane.laneHeight,
                width,
            }}
        />
    ))}
</div>
```

### Y nghia

#### Root absolute

Backgrounds nam duoi item layer va lap day body.

#### Map tung lane

Moi lane duoc render thanh mot `div` co:

- height = `lane.laneHeight`
- border bottom

Can note:

file nay khong dung `lane.top`.

No rely vao natural document flow:

- lane nao render truoc thi nam tren
- lane nao render sau thi nam duoi

Dieu nay dung vi `lanes` da duoc sort va tong height da chuan.

### Comment trong file

Dang co comment da comment-out:

```ts
// import { TIMELINE_GUTTER_X } ...
// marginLeft: -TIMELINE_GUTTER_X,
```

Day la dau vet cua logic cu lien quan gutter ngang.

Can note:

file nay hien tai da khong dung offset ngang nua.

Day la dong bo voi body va math semantics moi.

---

## D. Invariant ma file nay dang giu

### Invariant 1

Lane backgrounds duoc stack theo thu tu `lanes` input.

### Invariant 2

File khong tu dung `lane.top`; no rely vao flow tu nhien.

### Invariant 3

Background rows khong duoc bat pointer.

### Invariant 4

Khong co gutter ngang local trong lane backgrounds.

---

## E. Diem manh cua file hien tai

1. Rat de doc

2. Boundary presentational ro

3. Dong bo voi body trong viec bo local gutter

4. Khong them complexity khong can thiet

---

## F. Code smell / risk / diem can de y

### 1. File rely vao thu tu `lanes` input thay vi `top`

Hien tai on.

Nhung neu sau nay `lanes` co the khong duoc sort chac chan, background rows se lech.

### 2. Dau vet comment logic cu van con

Khong gay bug.

Nhung la dau hieu file da qua mot dot chuyen doi math/gutter.

### 3. Chi co border bottom, khong co visual distinction khac

Co the du cho hien tai.

Nhung neu can lane shading / alternating rows, file nay la noi se mo rong.

---

## G. Ket luan file nay

`timeline-lane-backgrounds.tsx` la presentational component nho va dung muc dich.

Nó la manh nen cua body render, va dang dong bo dung voi math semantics hien tai:

- khong tu them gutter
- khong chen offset ngang rieng

---

## Thu tu review de xuat tiep theo

Sau cum `timeline-body`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/format-time.ts`
2. `src/features/editor/lib/timeline-zoom-spec.ts`
3. `src/features/editor/stores/editor.selectors.ts`

Ly do:

- `format-time.ts` la helper nho nhung duoc toolbar/ruler/time UI dung rat nhieu
- `timeline-zoom-spec.ts` la policy file quan trong cho zoom system
- `editor.selectors.ts` la lop nho nhung anh huong truc tiep toi coupling render

---

# File review 29 - `src/features/editor/lib/format-time.ts`

## A. Vai tro cua file

Day la helper format frame thanh chuoi time de hien thi trong UI.

Hien tai no duoc dung o cac noi ma nguoi dung thay time truc tiep,
vi du:

- timeline toolbar
- ruler labels
- cac noi hien thi current time / duration

No khong lo:

- parsing nguoc time -> frame
- drop-frame timecode
- SMPTE timecode dung nghia

No chi lo:

- format time UI de doc nhanh

---

## B. Comment dau file

File tu note ro contract hien tai:

- `< 60 minutes => MM:SS:CS`
- `>= 60 minutes => HH:MM:SS:CS`
- `CS = centiseconds (00-99)`

Day la comment rat co ich.

No dat dung ky vong ngay tu dau:

- day khong phai frame counter
- day khong phai timecode SMPTE theo frame
- day la display theo centisecond

---

## C. Ham `formatTime`

```ts
export const formatTime = (frame: number, fps: number) => {
    ...
};
```

Input:

- `frame`
- `fps`

Output:

- string da format

---

## D. Tung buoc logic ben trong ham

### Buoc 1 - Clamp frame khong am

```ts
const safeFrame = Math.max(0, frame);
```

Y nghia:

UI khong hien thi time am.

Day la policy dung va practical.

### Buoc 2 - Doi frame sang milliseconds

```ts
const totalMilliseconds = Math.floor((safeFrame / fps) * 1000);
```

Can note ky:

- file dang chon convert qua milliseconds truoc
- va dung `Math.floor`

Y nghia:

UI luon lam tron xuong, khong lam tron gan nhat.

Dieu nay giup display on dinh hon va tranh nhay som sang moc tiep theo.

### Buoc 3 - Tinh tong seconds, minutes, hours

```ts
const totalSeconds = Math.floor(totalMilliseconds / 1000);
const minutes = Math.floor(totalSeconds / 60);
const hours = Math.floor(totalSeconds / 3600);
```

Can note:

- `minutes` o day la tong so phut
- ve sau file se quyet dinh co dung no hay `displayMinutes`

### Buoc 4 - Tinh phan hien thi

```ts
const displayMinutes = Math.floor((totalSeconds % 3600) / 60);
const displaySeconds = totalSeconds % 60;
const centiseconds = Math.floor((totalMilliseconds % 1000) / 10);
```

Y nghia:

- neu da qua 1 gio, `displayMinutes` chi la phan phut trong gio hien tai
- `centiseconds` la 0..99

### Buoc 5 - `pad2`

```ts
const pad2 = (value: number) => String(value).padStart(2, "0");
```

Helper local de giu format 2 chu so.

Gon va dung.

### Buoc 6 - Chon format theo gio

```ts
if (hours > 0) {
    return `${pad2(hours)}:${pad2(displayMinutes)}:${pad2(displaySeconds)}:${pad2(centiseconds)}`;
}

return `${pad2(minutes)}:${pad2(displaySeconds)}:${pad2(centiseconds)}`;
```

Y nghia:

#### Neu co gio

Format:

- `HH:MM:SS:CS`

Dung `displayMinutes`, khong dung tong minutes.

#### Neu chua co gio

Format:

- `MM:SS:CS`

Dung tong `minutes`.

Logic nay dung voi comment dau file.

---

## E. Invariant ma file nay dang giu

### Invariant 1

Time UI khong bao gio am.

### Invariant 2

Display dang theo centiseconds, khong theo frame count.

### Invariant 3

Time duoc `floor`, khong phai `round`.

### Invariant 4

Chua toi 1 gio => `MM:SS:CS`

### Invariant 5

Tu 1 gio tro len => `HH:MM:SS:CS`

---

## F. Diem manh cua file hien tai

1. Rat gon

2. Comment contract ro rang

3. Format de doc, hop voi editor UI

4. Dung `floor` de display on dinh

5. Khong tron them logic phuc tap khong can thiet

---

## G. Code smell / risk / diem can de y

### 1. File tin rang `fps` hop le

Neu `fps = 0` hoac NaN, ket qua se hong.

Hien tai day la assumption ngam.

Co the chap nhan duoc vi helper noi bo, nhung can note.

### 2. Day khong phai SMPTE timecode dung nghia

Neu sau nay project can export/display timecode chuyen nghiep theo frame,
helper nay se khong du.

Can tranh de team nham.

### 3. `Math.floor` la choice semantics quan trong

Khong sai.

Nhung neu nguoi dung mong "time display gan nhat",
ho co the thay so bi cham hon 1 chut.

Hien tai choice nay hop ly cho scrub/playback UI.

### 4. Ham khong support locale hay format option

Hoan toan binh thuong o giai doan nay.

Nhung can note day la helper co format co dinh.

---

## H. Ket luan file nay

`format-time.ts` la helper nho nhung gia tri cao vi no quyet dinh cach nguoi dung nhin thoi gian trong editor.

No dang dung mot contract ro rang va practical:

- de doc
- on dinh
- khong qua phuc tap

Diem can nho lon nhat:

- day la UI time display helper, khong phai timecode engine chuyen nghiep.

---

## Thu tu review de xuat tiep theo

Sau `format-time.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/lib/timeline-zoom-spec.ts`
2. `src/features/editor/stores/editor.selectors.ts`
3. `src/features/editor/stores/editor.initial-state.ts`

Ly do:

- `timeline-zoom-spec.ts` la policy file quan trong cua he zoom moi
- `editor.selectors.ts` anh huong truc tiep toi render coupling
- `editor.initial-state.ts` la noi luu cac default runtime/project semantics

---

# File review 30 - `src/features/editor/lib/timeline-zoom-spec.ts`

## A. Vai tro cua file

Day la policy/spec file cua he zoom Timeline moi.

Can phan biet ro:

- `timeline-zoom-spec.ts` = noi dinh nghia luat
- `timeline-zoom-engine.ts` = noi thi hanh luat do thanh so cu the

File nay khong tinh:

- `pixelsPerFrame`
- `timelineWidth`
- `visibleDurationInFrames`

No chi cung cap:

1. cac don vi tick hop le
2. bucket rules theo duration
3. min timeline width chung
4. helper doi `TickUnit` thanh so frame

Day la file rat quan trong ve mat maintainability, vi moi thay doi "cam giac zoom" cap chinh sach se thuong bat dau tu day.

---

## B. Type trong file

### 1. `TickUnit`

```ts
export type TickUnit = "15f" | "1s" | "5s" | "10s" | "30s" | "1m" | "5m";
```

Y nghia:

He zoom hien tai chi cho phep 7 family tick lon nay.

Can note:

- co 1 don vi theo frame: `15f`
- con lai la theo second/minute

Day la diem hay.

No cho phep zoom rat sau o project ngan van co moc chi tiet hon 1 giay.

### 2. `DurationBucketRule`

```ts
export type DurationBucketRule = {
    maxDurationSeconds: number;
    zoomMap: Record<number, TickUnit>;
    tailPaddingSeconds: number;
};
```

Y nghia:

Moi bucket dinh nghia:

- toi da duration nao thi bucket nay ap dung
- o moi zoom level 1..10 se dung tick unit nao
- can them bao nhieu tail padding giay

Day la shape config ro rang va practical.

---

## C. Constant - `MIN_TIMELINE_WIDTH`

```ts
export const MIN_TIMELINE_WIDTH = 1949;
```

Day la moc min width chung cua timeline.

Can note:

- constant nay cung xuat hien trong `timeline-math.ts`
- tuc la day la mot diem giao giua he zoom cu va he zoom moi

Ve policy, day la gia tri nen rat quan trong.

Ve maintainability, can giu nho:

- neu sua o day ma he cu van con dung ban rieng, codebase co the bat dau lech

Hien tai may man la dang dung chung.

---

## D. `TIMELINE_DURATION_BUCKET_RULES`

Day la trung tam cua file.

```ts
export const TIMELINE_DURATION_BUCKET_RULES: DurationBucketRule[] = [ ... ]
```

File hien tai dinh nghia 12 bucket.

Bucket theo `maxDurationSeconds`:

1. `8.99`
2. `12`
3. `15.99`
4. `19.99`
5. `24.99`
6. `59.99`
7. `119.99`
8. `299.99`
9. `359.99`
10. `719.99`
11. `1319.99`
12. `Infinity`

Y nghia:

Timeline dang co behavior zoom khac nhau theo nhom do dai project.

Day la quyet dinh UX ro rang:

- project rat ngan can zoom chi tiet hon
- project dai can moc tick thua hon de ruler de doc

---

## E. Pattern policy trong cac bucket

Can note xu huong tong quat cua file nay.

### 1. Project rat ngan

Vi du bucket:

- `8.99`
- `12`
- `15.99`

Zoom cao nhanh chuyen sang:

- `15f`

Y nghia:

nguoi dung co the zoom toi muc du chi tiet de chinh o cap frame/sub-second.

### 2. Project trung binh

Vi du:

- `24.99`
- `59.99`
- `119.99`

Zoom thap dung:

- `5s`
hoac
- `10s`

Zoom cao moi gan dan ve:

- `1s`

### 3. Project dai

Vi du:

- `299.99`
- `719.99`
- `1319.99`
- `Infinity`

Zoom thap dung:

- `30s`
- `1m`
- `5m`

Zoom cao nhat cung chi xuong toi:

- `5s`
hoac
- `1s` tuy bucket

Y nghia:

He zoom nay co chu truong tranh de project dai zoom qua chi tiet qua som.

Day la hop ly cho editor timeline thuc te.

---

## F. `zoomMap` la contract cuc ky quan trong

Moi bucket deu co:

```ts
zoomMap: {
    1: ...
    2: ...
    ...
    10: ...
}
```

Can note:

- file dang hard-code du 10 muc zoom
- engine dang tin rang moi bucket deu co du key 1..10

Y nghia maintainability:

neu sau nay doi range zoom system:

- them 11, 12
hoac
- giam xuong 1..8

thi file nay la noi buoc phai cap nhat dong bo.

Day la mot contract ngam rat manh giua:

- UI slider
- zoom engine
- spec file

---

## G. `tailPaddingSeconds`

Moi bucket con co:

- `tailPaddingSeconds`

Y nghia:

Timeline khong ket thuc sat mep noi dung that.

Nho field nay:

- project ngan co it tail hon
- project dai co nhieu tail hon

Day la quyet dinh UX dung.

Can note mot xu huong:

- duration cang dai => tail padding cang lon

Vi du:

- `1`
- `3`
- `4`
- `5`
- `6`
- `20`
- `30`
- `45`
- `90`
- `120`
- `180`

Day la policy rat ro va co y.

---

## H. Helper - `getTickUnitFrames`

```ts
export const getTickUnitFrames = (tickUnit: TickUnit, fps: number): Frames => {
    switch (tickUnit) {
        case "15f":
            return 15;
        case "1s":
            return fps;
        case "5s":
            return fps * 5;
        case "10s":
            return fps * 10;
        case "30s":
            return fps * 30;
        case "1m":
            return fps * 60;
        case "5m":
            return fps * 300;
    }
};
```

### Vai tro

Bridge tu spec semantic sang frame count that.

Can note:

- `15f` khong phu thuoc vao `fps`
- cac tick theo second/minute phu thuoc truc tiep vao `fps`

Day la logic dung.

### Code smell nho

Ham nay khong co `default`.

Voi TypeScript union hien tai, dieu nay van on.

Nhung no la exhaustive logic dua tren contract type.

Neu sau nay them `TickUnit` moi ma quen sua switch, day se la noi vo ngay.

Thuc ra day cung la diem tot:

- no ep nguoi maintain cap nhat helper khi them tick unit moi

---

## I. Invariant ma file nay dang giu

### Invariant 1

Moi project duration se map vao dung mot bucket dau tien co `maxDurationSeconds` phu hop.

### Invariant 2

Moi bucket phai co day du `zoomMap` cho toan bo range zoom duoc ho tro.

### Invariant 3

Tail padding la mot phan cua policy zoom, khong phai detail rieng cua engine.

### Invariant 4

`TickUnit` la tap gia tri dong; muon them unit moi phai doi ca spec va engine/helper.

### Invariant 5

Thu tu mang `TIMELINE_DURATION_BUCKET_RULES` phai tang dan theo `maxDurationSeconds`.

Day la invariant ngam rat quan trong.

---

## J. Diem manh cua file hien tai

1. Policy zoom duoc tach khoi engine

2. Config doc duoc va de tinh chinh

3. Bucket rules the hien ro chu truong UX cho project ngan / dai

4. `tailPaddingSeconds` duoc dat trong cung rule, hop logic

5. `getTickUnitFrames` la bridge nho va ro

---

## K. Code smell / risk / diem can de y

### 1. Config hard-code kha dai

Day la ban chat cua spec file.

Khong sai, nhung can ky luat khi chinh sua.

### 2. Nhieu moc duration khong tron

Vi du:

- `8.99`
- `15.99`
- `24.99`
- `59.99`

Day la policy hop ly de tranh overlap bucket,
nhung nguoi moi doc se can thoi gian de quen.

### 3. Zoom range `1..10` dang la contract ngam

Spec, engine, toolbar slider deu dang dua vao range nay.

Can centralize hon neu sau nay doi system.

### 4. `MIN_TIMELINE_WIDTH` song song voi he math cu

Day la diem can de mat de tranh drift.

### 5. File nay khong co metadata giai thich tai sao lai chon cac bucket/map nay

Hien tai co the suy ra duoc qua code.

Nhung neu sau nay can tuning lai, nguoi maintain co the se hoi:

- cac moc nay duoc do tu sample nao
- tai sao zoom 4 o bucket nay la `1s` ma bucket kia la `5s`

File nay co the co loi tu mo ta hon nua neu can.

---

## L. Ket luan file nay

`timeline-zoom-spec.ts` la policy file rat quan trong cua he zoom moi.

No khong tinh toan gi phuc tap,
nhung no quyet dinh "tinh cach" cua Timeline khi zoom:

- moc tick nao duoc dung
- tail pad bao nhieu
- project ngan va dai phan ung khac nhau ra sao

Day la file ma team nen coi la "product/UX policy encoded in code",
khong chi la config ky thuat thong thuong.

---

## Thu tu review de xuat tiep theo

Sau `timeline-zoom-spec.ts`, thu tu hop ly tiep theo:

1. `src/features/editor/stores/editor.selectors.ts`
2. `src/features/editor/stores/editor.initial-state.ts`
3. `src/features/editor/stores/editor.types.ts`

Ly do:

- nen di tiep vao lop store support files truoc khi quay lai nhung file UI phu
- `editor.selectors.ts` anh huong truc tiep toi coupling render
- `editor.initial-state.ts` va `editor.types.ts` giu semantics runtime/model

---

# File review 31 - `src/features/editor/stores/editor.selectors.ts`

## A. Vai tro cua file

Day la file facade selectors/hooks cho Zustand store.

No khong chua logic business.
No khong sua state.

No chi lam mot viec:

- dong goi cac selector/action accessor thanh nhung hook co ten ro nghia

Vi du:

- `usePlaybackStatus()`
- `useCurrentFrame()`
- `useTogglePlay()`

Y nghia:

component UI khong can luc nao cung viet:

```ts
useEditorStore((state) => state.runtime.player.status)
```

ma co the dung hook muc dich ro hon.

Day la file co gia tri maintainability cao du rat don gian.

---

## B. Cac nhom selector/action trong file

File duoc chia comment theo nhom:

1. `Project`
2. `Player`
3. `Preview`
4. `Timeline`
5. `Selection`
6. `Text Editing`
7. `Actions`

Day la cach to chuc ro rang va dung.

Nguoi moi co the scan file rat nhanh.

---

## C. Nhom `Project`

### `useEditorProject`

Tra ve toan bo `state.project`.

Can note:

hook nay rat tien, nhung cung co blast radius render rong nhat.

### `useEditorVideo`

Tra ve `state.project.video`.

Hẹp hon `useEditorProject`.

Day la pattern tot:

- co hook rong khi can
- co hook hep hon cho case pho bien

---

## D. Nhom `Player`

Bao gom:

- `usePlayerState`
- `usePlaybackStatus`
- `useCurrentFrame`
- `useIsMuted`
- `usePlaybackRate`

Y nghia:

file nay cho phep component chon muc do granularity:

- can ca player object
hoac
- can mot field cu the

Day la tac dung tot cho render coupling neu nguoi dung hook chon dung muc.

---

## E. Nhom `Preview`

Bao gom:

- `usePreviewState`
- `usePreviewFullscreen`
- `useTogglePreviewFullscreen`

Can note:

preview selectors hien tai van con kha it.

Trong khi state preview trong store da co:

- container size
- zoom
- mode
- fullscreen

Tuc la file nay chua expose het moi field preview thanh hook rieng.

Khong sai, nhung la mot dau hieu file nay dang phat trien theo nhu cau thuc te.

---

## F. Nhom `Timeline`

Bao gom:

- `useTimelineState`
- `useTimelineZoom`
- `useTimelineZoomLevel`
- `useTimelinePixelsPerFrame`
- `useTimelineViewport`
- `useTimelineToolbarState`
- `useSnapEnabled`
- `useLoopEnabled`
- `useShowRuler`
- `useShowWaveforms`
- `useShowThumbnails`

Day la nhom quan trong cho render performance.

Can note:

file da co mot so selector hep:

- `useTimelineZoomLevel`
- `useSnapEnabled`
- `useLoopEnabled`

Day la dung huong.

Nho no, toolbar/component co the subscribe hep hon thay vi giat ca `runtime.timeline`.

---

## G. Nhom `Selection` va `Text Editing`

### Selection

- `useSelectionState`
- `useSelectedClipIds`

### Text Editing

- `useTextEditingState`

Can note:

selection/text editing hien tai chua co nhieu selector hep.

Vi du:

- chua co `useEditingClipId`
- chua co `useIsTextEditing`

Khong sai.

Nhung ve sau neu Preview Text layer can toi uu render sau hon,
co the file nay se la noi can them selector hep.

---

## H. Nhom `Actions`

File expose rat nhieu action hook, vi du:

- player actions
- preview actions
- timeline zoom/scroll actions
- selection actions
- clip actions
- text editing actions
- undo/redo

Y nghia:

file nay dong vai tro API surface cho UI layer.

Thay vi de component import truc tiep `useEditorStore` moi noi,
co the import hook da dat ten ro nghia.

Day la mot kieu adapter layer nho va co gia tri.

---

## I. Invariant ma file nay dang giu

### Invariant 1

Selectors/action hooks trong file nay khong chua them logic business.

### Invariant 2

Ten hook phai dien ta dung field/action ma no expose.

### Invariant 3

Component co the chon subscribe rong hoac hep tuy nhu cau.

### Invariant 4

Neu thay doi shape cua store, day la mot trong nhung file can sua dong bo dau tien.

---

## J. Diem manh cua file hien tai

1. Rat de scan

2. To chuc theo nhom ro rang

3. Giam duplication cua `useEditorStore((state) => ...)` trong UI

4. Tao API surface de doc hon cho component layer

5. Ho tro toi uu render neu dung selector hep dung cach

---

## K. Code smell / risk / diem can de y

### 1. Co ca selector rong va selector hep song song

Khong sai.

Nhung can ky luat khi dung:

- dung hook rong de nhanh tay se tang render coupling

### 2. File chua co selector memoized phuc tap

Hien tai toan la selector don gian.

Day la on.

Nhung neu ve sau can derived selector phuc tap, co the can them lop selector co memo ro hon.

### 3. Chua expose het moi field thanh hook hep

Khong bat buoc.

Nhung la dau hieu API layer nay phat trien theo nhu cau, khong phai thiet ke xong tu dau.

### 4. Action hooks rat nhieu

Day la mat trai tu nhien cua file facade.

Neu editor mo rong tiep, file nay co the dai nhanh.

---

## L. Ket luan file nay

`editor.selectors.ts` la mot file support co gia tri maintainability cao.

No lam code UI de doc hon va cho phep giam coupling render neu dung dung cach.

File nay khong phuc tap,
nhung la mot lop "API cho component" kha quan trong trong codebase hien tai.

---

# File review 32 - `src/features/editor/stores/editor.initial-state.ts`

## A. Vai tro cua file

Day la file dinh nghia initial state cho toan bo editor.

No khong chua action hay reducer logic.

No chua:

- project default
- runtime default
- track group / track / clip seed data
- helper tinh project duration ban dau

Day la file rat quan trong ve semantics:

- app bat dau o trang thai nao
- project rong nghia la gi
- preview/timeline/player defaults la gi

---

## B. Seed data o dau file

### 1. `TRACK_GROUPS`

Hien tai co 2 group:

- `group-text`
- `group-media`

Nhung can note:

Day la seed data lich su.

Hien tai `TRACKS` va `CLIPS` deu dang comment-out toan bo.

Tuc la editor mac dinh khoi dong voi:

- co trackGroups seed
- nhung khong co track
- nhung khong co clip

Day la mot chi tiet model can note.

### 2. `TRACKS`

Mang rong, nhung con giu comment cua cac track mau cu.

### 3. `CLIPS`

Mang rong, nhung con giu comment cua cac clip mau cu.

Y nghia chung:

File nay da di tu mot trang thai "demo seeded editor"
sang "empty editor by default",
nhung van giu comment de doi chieu/lich su.

Day khop voi user preference da noi truoc do.

---

## C. Helper local - `getProjectDurationInFrames`

```ts
const getProjectDurationInFrames = (clips: TimelineClip[]) => {
    if (clips.length === 0) return 0;

    const maxClipEnd = clips.reduce((maxEnd, clip) => {
        return Math.max(maxEnd, clip.from + clip.durationInFrames);
    }, 0);

    return Math.max(1, maxClipEnd);
};
```

### Muc dich

Tinh duration ban dau cua project tu seed clips.

### Y nghia

Comment trong file da note:

- logic cu: project rong bat dau 60 frame
- logic moi: project rong = 0

Day dong bo voi `playback-duration.ts` va cac sua doi gan day cua editor.

### `Math.max(1, maxClipEnd)`

Can note:

Khi co clip thi duration toi thieu la 1.

Policy nay co ve hop ly cho model ban dau, du ve mat semantics Player/UI thi sau do van con helper rieng de chuyen doi.

---

## D. `INITIAL_EDITOR_STATE.project`

### 1. Project metadata

- `id: "project-1"`
- `name: "Untitled Project"`

### 2. `video`

Mac dinh:

- `fps: 60`
- `width: 1920`
- `height: 1080`
- `durationInFrames: getProjectDurationInFrames(CLIPS)`
- `backgroundColor: "#000000"`
- `aspectRatioPreset: "16:9"`

Can note:

- app dang bat dau voi project 1080p60
- `durationInFrames` ban dau phu thuoc vao `CLIPS`
- vi `CLIPS` rong nen hien tai bat dau = 0

### 3. `trackGroups`

Van co 2 group seed.

### 4. `tracks`

Dang rong.

### 5. `clips`

Dang rong.

### 6. `mediaAssets`

Dang rong.

---

## E. `INITIAL_EDITOR_STATE.runtime.player`

Mac dinh:

- `currentFrame: 0`
- `status: "idle"`
- `isMuted: false`
- `playbackRate: 1`

Can note:

- status ban dau la `"idle"`, khong phai `"paused"`

Day la semantics runtime quan trong.

---

## F. `INITIAL_EDITOR_STATE.runtime.preview`

Mac dinh:

- `containerWidth: 0`
- `containerHeight: 0`
- `zoom: 1`
- `mode: "fit"`
- `isFullscreen: false`

Y nghia:

Preview geometry ban dau chua duoc do, nen width/height = 0 la dung.

---

## G. `INITIAL_EDITOR_STATE.runtime.timeline`

### `zoom`

- `zoomLevel: 1`
- `minZoomLevel: 1`
- `maxZoomLevel: 10`
- `pixelsPerFrame: 10`

Can note:

- `pixelsPerFrame: 10` la initial placeholder/runtime value
- ve sau se bi compute/update lai

### `viewport`

- `scrollLeft: 0`
- `scrollTop: 0`
- `viewportWidth: 0`
- `viewportHeight: 0`

### `toolbar`

- `snapEnabled: true`
- `showRuler: true`
- `showWaveforms: true`
- `showThumbnails: true`
- `isLoopEnabled: false`

### `panelHeight`

- `null`

Day la semantics da duoc sua gan day:

- `null` = chua resize panel bang tay

Can note ky vi day la contract UI/layout quan trong.

---

## H. `INITIAL_EDITOR_STATE.runtime.selection`

- `selectedClipIds: []`
- `selectedTrackId: null`
- `selectedGroupId: null`

Trang thai selection rong mac dinh.

---

## I. `INITIAL_EDITOR_STATE.runtime.interaction`

```ts
interaction: {
    type: "idle",
},
```

Can note:

interaction state hien tai ton tai trong model,
nhung chua thay duoc su dung nhieu trong nhung file core vua review.

Day la field can de mat:

- hoac se duoc mo rong ve sau
- hoac dang la dau vet cua architecture mong muon

---

## J. `INITIAL_EDITOR_STATE.runtime.textEditing`

- `editingClipId: null`
- `draftText: ""`
- `isEditing: false`

Trang thai text editing ban dau ro rang va hop ly.

---

## K. Invariant ma file nay dang giu

### Invariant 1

Editor khoi dong voi project rong that, khong co clip/track seed active.

### Invariant 2

Project rong bat dau `durationInFrames = 0`.

### Invariant 3

Timeline panel height ban dau = `null`, nghia la chua bi user resize.

### Invariant 4

Preview/timeline viewport size ban dau = 0 cho toi khi DOM do xong.

### Invariant 5

Runtime player bat dau o status `"idle"`.

---

## L. Diem manh cua file hien tai

1. Initial semantics kha ro

2. Da dong bo voi quyet dinh "project rong that su = 0 duration"

3. Giữ duoc comment lich su cua seed track/clip cu de doi chieu

4. Runtime defaults phan tach ro theo:

- player
- preview
- timeline
- selection
- interaction
- textEditing

---

## M. Code smell / risk / diem can de y

### 1. Con nhieu seed data comment-out

Day co gia tri lich su.

Nhung file se dai va on ao hon theo thoi gian.

Ve sau co the can chuyen sang file note/history neu khong con can doi chieu thuong xuyen.

### 2. `trackGroups` co seed nhung `tracks` rong

Khong sai.

Nhung do la mot model state hoi lech:

- group ton tai truoc khi co track

Can chac rang code khac trong app chiu duoc semantics nay.

### 3. `pixelsPerFrame: 10` la placeholder semantics

Nguoi moi doc co the nham rang day la gia tri that cua he zoom.

Can nho rang no chi la initial runtime value.

### 4. `interaction.type = "idle"` hien tai chua thay su dung nhieu

Co the la field cho future architecture.
Can de mat de tranh state song ma khong co nguoi dung.

---

## N. Ket luan file nay

`editor.initial-state.ts` la file semantics rat quan trong.

No khong co logic phuc tap,
nhung no quyet dinh editor "mo mat ra" trong trang thai nao.

Hien tai file nay da duoc canh lai tot hon nhieu theo huong:

- project rong that
- duration = 0 that
- panel height auto cho toi khi user chu dong resize

Day la nhung quyet dinh dung cho editor hien tai.

---

## Thu tu review de xuat tiep theo

Sau cum store support nay, thu tu hop ly tiep theo:

1. `src/features/editor/stores/editor.types.ts`
2. `src/features/editor/types/editor.ts`
3. `src/features/editor/stores/index.ts`

Ly do:

- nen chot tiep lop type/store support truoc
- `editor.types.ts` va `types/editor.ts` la nen tang cho store state/actions
- `stores/index.ts` la public export surface cua store layer

---

# File review 33 - `src/features/editor/types/editor.ts`

## A. Vai tro cua file

Day la file type foundation cho state cua editor.

No khong chua logic, khong chua action, khong chua implementation store.

No chi dinh nghia:

- `EditorRuntimeState`
- `EditorState`

Day la file "shape contract" cua editor state.

Moi tang con lai deu duoc xay tren shape nay:

- `editor.initial-state.ts`
- `editor.types.ts`
- `editor.store.ts`
- selectors
- UI components

---

## B. Import va dependency

File import:

- `TimelineInteractionState`
- `TextEditingState`
- `PlayerState`
- `PreviewViewportState`
- `EditorProject`
- `SelectionState`
- `TimelineUIState`

Y nghia:

File nay la noi hop nhat state types tu nhieu module con:

- player
- preview
- timeline
- interaction
- project

Day la layering tot.

---

## C. `EditorRuntimeState`

```ts
export type EditorRuntimeState = {
    player: PlayerState;
    preview: PreviewViewportState;
    timeline: TimelineUIState;
    selection: SelectionState;
    interaction: TimelineInteractionState;
    textEditing: TextEditingState;
};
```

### Y nghia

Runtime state duoc tach rieng khoi project data.

Day la quyet dinh kien truc dung.

No cho phep phan biet ro:

- `project`
  - du lieu editor/content
- `runtime`
  - state giao dien, playback, viewport, selection, text editing

### Tung nhom con

#### `player`

State runtime cua playback.

#### `preview`

State geometry / mode / fullscreen cua Preview.

#### `timeline`

State zoom / viewport / toolbar / panel cua Timeline.

#### `selection`

State selected entities.

#### `interaction`

State mode interaction tong quat.

#### `textEditing`

State edit text tạm thoi.

Day la decomposition ro rang va de maintain.

---

## D. `EditorState`

```ts
export type EditorState = {
    project: EditorProject;
    runtime: EditorRuntimeState;
};
```

Y nghia:

Toan bo editor state duoc chia thanh 2 cuc lon:

1. `project`
2. `runtime`

Day la mot shape dep va co gia tri cao.

No giup khi doc store/state:

- thay cai nao la data that cua project
- thay cai nao la state tam thoi cua UI/runtime

---

## E. Invariant ma file nay dang giu

### Invariant 1

Editor state luon co 2 cuc lon:

- `project`
- `runtime`

### Invariant 2

Selection/text editing/preview/timeline/player deu thuoc runtime,
khong duoc tron vao project data.

### Invariant 3

Muoi thay doi shape tong the cua editor state, day la file can doi dau tien.

---

## F. Diem manh cua file hien tai

1. Rat gon

2. Shape state tong the ro rang

3. Boundary `project` vs `runtime` dung huong

4. De lam nen tang cho store va selectors

---

## G. Code smell / risk / diem can de y

### 1. `interaction` hien tai ton tai nhung chua thay duoc su dung manh

Khong phai van de cua file nay, nhung file nay phan anh su ton tai do.

### 2. File nay phu thuoc vao nhieu type con

Khong sai.

Nhung no co nghia:

- neu mot type con doi lon, shape tong the cua editor cung doi theo

---

## H. Ket luan file nay

`types/editor.ts` la file type foundation rat quan trong du rat ngan.

No chot ro editor state la:

- project data
- runtime data

Day la mot boundary kien truc dung va dang giu cho codebase kha on.

---

# File review 34 - `src/features/editor/stores/editor.types.ts`

## A. Vai tro cua file

Day la file dinh nghia type surface cua store.

No noi:

- store state la gi
- store actions la gi
- type hop nhat cuoi cung cua store la gi

No khong chua implementation action.
No khong chua initial state.

Day la "API contract" cua Zustand store layer.

---

## B. Import va dependency

File import:

- `ClipTransform`
- `Frame`
- `Frames`
- `MediaAsset`
- `Pixels`
- `PlaybackStatus`
- `EditorState`

Y nghia:

File nay dung:

- `EditorState` lam state surface
- type primitives/domain de dinh nghia action payload

Boundary nay dung.

---

## C. `EditorStoreState`

```ts
export type EditorStoreState = EditorState;
```

Rat don gian.

Y nghia:

state surface cua store bang dung `EditorState`.

Day la cach tot vi tranh tao them mot state type trung gian khong can thiet.

---

## D. `EditorStoreActions`

Day la phan lon nhat cua file.

No duoc chia theo nhom:

1. Player
2. Preview
3. Timeline Zoom
4. Timeline Viewport
5. Timeline Toolbar
6. Selection
7. Track Controls
8. Clip Creation
9. Text Editing
10. Toolbar command stubs

Day la to chuc rat ro.

### 1. Nhom Player

Bao gom:

- set current frame / status
- play / pause / toggle
- seek
- mute
- playback rate

Day la action surface day du cho playback layer.

### 2. Nhom Preview

Bao gom:

- container size
- zoom
- mode
- fullscreen

Can note:

preview state da co du action surface tuong doi day du.

### 3. Nhom Timeline Zoom / Viewport / Toolbar

Chia nho thanh 3 nhom la hop ly vi:

- zoom logic
- viewport scroll/size
- toolbar toggles

la 3 concern khac nhau du cung nam trong `runtime.timeline`.

Can note:

`setTimelinePanelHeight: (panelHeight: Pixels) => void`

Type nay khong cho thay `null`,
du trong initial state `panelHeight` co the la `null`.

Day la hop ly neu action nay chi dung de set gia tri cu the sau khi user resize,
nhung can nho distinction:

- state co the `null`
- action nay khong dung de reset ve `null`

### 4. Nhom Selection

Tach rieng selection clip / track / group.

Day cho thay model selection hien tai da du tru nhieu cap entity.

### 5. Nhom Track Controls

- `toggleTrackHidden`
- `toggleTrackMuted`

Gon va dung.

### 6. Nhom Clip Creation

Bao gom:

- `addTextClipAtPlayhead`
- `addMediaAssetAsClip`
- `moveClip`

Can note:

`moveClip` dang la action lon va quan trong.

Type payload hien cho thay file store dang support:

- move trong cung track
- move sang track khac
- tao track moi tren/duoi
- relative track insert

chi nhin type da thay action nay kha nang nang.

### 7. Nhom Text Editing

Bao gom:

- `updateClipTransform`
- `startTextEditing`
- `updateTextDraft`
- `stopTextEditing`

Can note:

`updateClipTransform` dat trong nhom Text Editing,
du ve mat ten thi no co the tro nen dung chung cho media sau nay.

Day la chi tiet kien truc can de y.

### 8. Toolbar command stubs

- `splitSelectedClipAtPlayhead`
- `deleteSelectedClips`
- `undo`
- `redo`

Comment "stubs" cho thay:

- o thoi diem viet type, nhung command nay duoc xem nhu toolbar-facing commands

Khong co nghia implementation nhat thiet van la stub.

---

## E. `EditorStore`

```ts
export type EditorStore = EditorStoreState & EditorStoreActions;
```

Day la type hop nhat cuoi cung cho Zustand store object.

Don gian va dung.

---

## F. Invariant ma file nay dang giu

### Invariant 1

Store surface = `EditorState` + `EditorStoreActions`.

### Invariant 2

Action names la public API contract cua UI layer.

### Invariant 3

Action payload types phai phan anh dung semantics thuc te cua editor.

### Invariant 4

Neu implementation store doi ma file nay khong doi theo, type surface se lech ngay.

---

## G. Diem manh cua file hien tai

1. To chuc action groups ro rang

2. State va action surface tach ro

3. Action payload types kha cu the

4. De dung lam hop dong giua UI va store implementation

---

## H. Code smell / risk / diem can de y

### 1. `updateClipTransform` nam trong nhom Text Editing

Hien tai van chap nhan duoc vi flow chinh dang la Text.

Nhung neu sau nay transform mo rong cho image/video/shape, nhom nay se tro nen hoi sai ten.

### 2. `setTimelinePanelHeight` khong co action reset ve `null`

Dieu nay co the la co y.

Nhung neu sau nay can "reset auto height", API surface nay se can mo rong.

### 3. File chi cho thay action surface, khong cho thay derived selectors hay command objects

Khong sai.

Nhung ve sau neu store surface lon hon, co the can chia file action types nho hon theo concern.

---

## I. Ket luan file nay

`editor.types.ts` la file hop dong cua store.

No dang lam tot vai tro:

- chot state surface
- chot action surface
- giu API contract ro rang cho UI

Day la file can duoc giu dong bo sat voi implementation.

---

# File review 35 - `src/features/editor/stores/index.ts`

## A. Vai tro cua file

Day la public export surface cua store layer.

No chi co:

```ts
export * from "./editor.types";
export * from "./editor.initial-state";
export * from "./editor.store";
export * from "./editor.selectors";
```

Y nghia:

nhung file ben ngoai co the import store layer tu mot diem vao chung.

Day la barrel file thong thuong.

---

## B. Diem manh

1. Giam import path dai

2. Public surface cua store ro hon

3. De doi internal file structure hon mot chut neu barrel duoc giu on dinh

---

## C. Code smell / risk / diem can de y

### 1. `export *`

Tien.

Nhung khi public surface lon dan, barrel file co the che di viec module nao dang bi keo vao dau.

### 2. Export ca `editor.initial-state`

Khong sai.

Nhung can note:

initial state dang tro thanh mot phan public surface cua store layer.

Neu sau nay muon gioi han consumer, co the can xem lai.

---

## D. Ket luan file nay

`stores/index.ts` la barrel file don gian va dung muc dich.

Khong co complexity lon.

---

## Thu tu review de xuat tiep theo

Sau lop type/store support nay, thu tu hop ly tiep theo:

1. `src/features/editor/types/timeline.ts`
2. `src/features/editor/types/preview.ts`
3. `src/features/editor/types/interaction.ts`

Ly do:

- nen di tiep lop types con lai truoc khi sang cac file UI phu khac
- 3 file nay gan sat voi nhung phan core da review nhat

---

# File review 36 - `src/features/editor/types/timeline.ts`

## A. Vai tro cua file

Day la contract type cho timeline runtime state va mot so UI helper types lien quan.

No khong chua logic.
No khong chua component.

No dinh nghia:

- selection state
- zoom state
- viewport state
- toolbar state
- ruler marker
- snap guide
- timeline UI state tong

Day la file type core cua runtime.timeline.

---

## B. `SelectionState`

```ts
export type SelectionState = {
    selectedClipIds: ClipId[];
    selectedTrackId: TrackId | null;
    selectedGroupId: TrackGroupId | null;
};
```

Y nghia:

Selection model hien tai da du tru 3 cap:

- clip
- track
- group

Can note:

UI hien tai chu yeu thay `selectedClipIds`,
nhung model da mo san cho track/group selection.

Day la type di truoc implementation mot chut.

---

## C. `TimelineZoomState`

```ts
export type TimelineZoomState = {
    zoomLevel: number;
    minZoomLevel: number;
    maxZoomLevel: number;
    pixelsPerFrame: number;
};
```

Y nghia:

Runtime zoom state hien tai gom ca:

- muc zoom logic
- range zoom
- ket qua compute (`pixelsPerFrame`)

Can note:

`pixelsPerFrame` la derived runtime value,
khong chi la config input.

Tuc la type nay dang chua ca:

- control state
- computed state

Khong sai, nhung can nho distinction nay.

---

## D. `TimelineViewportState`

```ts
export type TimelineViewportState = {
    scrollLeft: Pixels;
    scrollTop: Pixels;
    viewportWidth: Pixels;
    viewportHeight: Pixels;
};
```

Rat ro nghia.

Day la runtime geometry state cua viewport.

Can note:

file type nay cho thay Timeline quan tam ca:

- scroll ngang
- scroll doc

chu khong chi mot truc.

---

## E. `TimelineToolbarState`

```ts
export type TimelineToolbarState = {
    snapEnabled: boolean;
    showRuler: boolean;
    showWaveforms: boolean;
    showThumbnails: boolean;
    isLoopEnabled: boolean;
};
```

Y nghia:

Toolbar state da du tru mot so toggle UI ma implementation hien tai chua tan dung het manh,
vi du:

- `showWaveforms`
- `showThumbnails`

Day la another case type/model di truoc implementation.

---

## F. `TimelineRulerMarker`

```ts
export type TimelineRulerMarker = {
    frame: Frame;
    x: Pixels;
    label: string;
    isMajor: boolean;
};
```

Y nghia:

Day la shape render cua marker tren ruler.

Can note:

- `x` da la toa do duoc tinh san
- `label` da la text cuoi cung

Tuc la type nay thich hop voi tang render hon la tang domain thuan.

### `TimelineSnapGuide`

```ts
export type TimelineSnapGuide = {
    frame: Frame;
    x: Pixels;
    visible: boolean;
};
```

Type nay cho thay app da co mo hinh snap guide tuy implementation hien tai chua thay noi bat trong cac file vua review.

---

## G. `TimelineUIState`

```ts
export type TimelineUIState = {
    zoom: TimelineZoomState;
    viewport: TimelineViewportState;
    toolbar: TimelineToolbarState;
    panelHeight: Pixels | null;
};
```

Y nghia:

Runtime timeline state tong duoc gom thanh 4 nhom:

- zoom
- viewport
- toolbar
- panel height

Can note ky:

`panelHeight: Pixels | null`

Day la contract type da phan anh dung semantics moi:

- `null` = chua resize bang tay

---

## H. Invariant ma file nay dang giu

### Invariant 1

Timeline runtime state la UI/runtime state, khong phai project data.

### Invariant 2

Selection model du tru clip/track/group.

### Invariant 3

`panelHeight` co the `null`.

### Invariant 4

Mot so state toolbar/marker/snap da ton tai o level type du implementation co the chua dung het.

---

## I. Ket luan file nay

`types/timeline.ts` la file contract tot va kha ro.

No phan anh mot timeline runtime model da du tru kha nhieu cho mo rong ve sau.

Diem can de y lon nhat:

- mot so field/types dang di truoc implementation hien tai

---

# File review 37 - `src/features/editor/types/preview.ts`

## A. Vai tro cua file

Day la contract type cho preview runtime state va geometry output.

No dinh nghia:

- `PreviewViewportMode`
- `PreviewViewportState`
- `PreviewSurfaceLayout`

Day la file type core cho cum preview geometry.

---

## B. `PreviewViewportMode`

```ts
export type PreviewViewportMode = "fit" | "fill" | "custom";
```

Can note rat ky:

Implementation hien tai moi review chu yeu dung:

- `fit`
- `fill`

Con `custom` da co trong type,
nhung chua thay duoc support ro rang trong helper geometry va UI bridge.

Day la another case type di truoc implementation.

### `PreviewViewportState`

```ts
export type PreviewViewportState = {
    containerWidth: Pixels;
    containerHeight: Pixels;
    zoom: number;
    mode: PreviewViewportMode;
    isFullscreen: boolean;
};
```

Y nghia:

State nay chua ca:

- geometry input
- zoom/mode policy
- fullscreen semantic

Can note:

mot so component hien tai chua doc het moi field nay, nhat la `isFullscreen`.

### `PreviewSurfaceLayout`

```ts
export type PreviewSurfaceLayout = {
    scale: number;
    renderedWidth: Pixels;
    renderedHeight: Pixels;
    offsetX: Pixels;
    offsetY: Pixels;
};
```

Day la shape output cua geometry helper.

Rat ro va dung muc dich.

---

## C. Invariant ma file nay dang giu

### Invariant 1

Preview viewport mode da support type-level `custom`.

### Invariant 2

Preview layout output luon xoay quanh:

- scale
- rendered size
- offset

### Invariant 3

Fullscreen la mot semantic runtime state cua preview.

---

## D. Ket luan file nay

`types/preview.ts` rat gon va ro.

Diem can de y lon nhat cua file nay la:

- `custom` mode da co trong type, nhung implementation hien tai chua thay support day du

---

# File review 38 - `src/features/editor/types/interaction.ts`

## A. Vai tro cua file

Day la contract type cho interaction runtime state va snap-related types.

No dinh nghia:

- resize handle type
- snap point / snap result
- interaction union cho playhead drag, clip move, clip resize
- text editing state

Day la file type quan trong cho bai toan editor interaction.

---

## B. Type nho o dau file

### `ClipResizeHandle`

```ts
export type ClipResizeHandle = "start" | "end";
```

Dong bo voi primitive resize handle.

### `SnapPointType`

```ts
export type SnapPointType =
    | "playhead"
    | "clip-start"
    | "clip-end"
    | "ruler-mark";
```

Y nghia:

Model snap system da du tru 4 loai moc snap.

### `SnapPoint`

```ts
export type SnapPoint = {
    frame: Frame;
    type: SnapPointType;
    sourceId?: string;
};
```

### `SnapResult`

```ts
export type SnapResult = {
    snappedFrame: Frame;
    didSnap: boolean;
    snappedTo?: SnapPoint;
};
```

Day la shape kha dep cho mot snap system.

No tach:

- target frame sau snap
- co snap hay khong
- snap vao cai gi

---

## C. Interaction unions

### `DragPlayheadInteraction`

Chua:

- `startFrame`
- `pointerStartX`
- `pointerCurrentX`

### `MoveClipInteraction`

Chua:

- `clipId`
- origin/current track + frame
- pointer start/current theo x va y
- `deltaFrames`
- `snapResult?`

### `ResizeClipInteraction`

Chua:

- `clipId`
- `handle`
- origin/current from + duration
- pointer start/current theo x va y
- `deltaFrames`
- `snapResult?`

Can note:

Model interaction nay kha day du.

Nó cho thay architecture du tinh la:

- store/runtime co the giu interaction state giau thong tin

Tuy nhien trong implementation core da review, interaction state nay chua xuat hien manh.

Day la mot type layer di truoc implementation kha ro.

### `TimelineInteractionState`

```ts
export type TimelineInteractionState =
    | { type: "idle" }
    | DragPlayheadInteraction
    | MoveClipInteraction
    | ResizeClipInteraction;
```

Union nay kha dep va de mo rong.

---

## D. `TextEditingState`

```ts
export type TextEditingState = {
    editingClipId: ClipId | null;
    draftText: string;
    isEditing: boolean;
};
```

Day la state thuc su dang duoc dung manh trong implementation hien tai.

Can note:

- type nay dat chung trong `interaction.ts`
- trong khi `editor.types.ts` va `types/editor.ts` treat no thanh mot runtime slice rieng

Khong sai, nhung la mot grouping choice can de y.

---

## E. Invariant ma file nay dang giu

### Invariant 1

Interaction model da du tru playhead drag, clip move, clip resize.

### Invariant 2

Snap system co type contract ro rang.

### Invariant 3

`TextEditingState` dang duoc xem nhu mot phan cua interaction-related domain.

### Invariant 4

Nhieu interaction types hien tai co the dang di truoc implementation store/runtime that.

---

## F. Diem manh cua file hien tai

1. Type design kha ro va de mo rong

2. Snap model dep

3. Interaction union ro nghia

4. De support refactor interaction ve sau neu can

---

## G. Code smell / risk / diem can de y

### 1. Type layer di truoc implementation kha nhieu

Khong sai.

Nhung can de mat:

- co giu duoc huong nay khong
- hay se co field/type tro thanh "mo hinh treo"

### 2. `TextEditingState` nam trong `interaction.ts`

Hop ly ve mat nghia rong.

Nhung cung co the tranh luan:

- nen nam trong file interaction
hay
- nen nam trong file text/editor rieng

### 3. Pointer fields kha chi tiet

Dieu nay tot neu dung interaction runtime that.

Nhung neu khong dung den, type se nhin hoi nang.

---

## H. Ket luan file nay

`types/interaction.ts` la file contract kha tot va cho thay tam nhin interaction model ro hon implementation hien tai.

Day la mot file co gia tri "kien truc tuong lai" kha ro.

Can giu mat de xem implementation co bat kip model nay hay khong.

---

## Thu tu review de xuat tiep theo

Sau cum types nay, thu tu hop ly tiep theo:

1. `src/features/editor/types/player.ts`
2. `src/features/editor/types/projects.ts`
3. `src/features/editor/types/primitives.ts`

Ly do:

- nen dong tiep lop types core truoc
- `player.ts`, `projects.ts`, `primitives.ts` la foundation cho nhieu file da review

---

# File review 39 - `src/features/editor/types/player.ts`

## A. Vai tro cua file

Day la contract type cho player domain.

No dinh nghia:

- `PlaybackStatus`
- `PlayerState`
- `PlayerActions`
- `PlayerSyncPayload`

Day la file type nho nhung quan trong vi playback la mot truc lon cua editor.

---

## B. `PlaybackStatus`

```ts
export type PlaybackStatus = "idle" | "playing" | "paused" | "ended";
```

Can note ky:

player state hien tai khong chi co binary play/pause.

No co 4 status:

- `idle`
- `playing`
- `paused`
- `ended`

Day la semantics dung va da phan anh ro trong nhieu file da review.

### Y nghia

- `idle`: trang thai khoi dong chua play
- `playing`: dang chay
- `paused`: tam dung giua chung
- `ended`: da den end boundary

`ended` la status quan trong vi editor dang phan biet no khoi `paused`.

---

## C. `PlayerState`

```ts
export type PlayerState = {
    currentFrame: Frame;
    status: PlaybackStatus;
    isMuted: boolean;
    playbackRate: number;
};
```

Rat ro.

Can note:

state nay la runtime player UI/editor state,
khong phai full state cua Remotion Player.

---

## D. `PlayerActions`

Bao gom:

- `play`
- `pause`
- `togglePlay`
- `seekToFrame`
- `seekByFrames`
- `setPlaybackRate`
- `setMuted`

Can note:

`toggleMuted` khong nam trong file nay du co trong store action surface rong hon.

Dieu nay cho thay:

- file nay la player-domain action base
- store surface co the bo sung adapter actions khac

---

## E. `PlayerSyncPayload`

```ts
export type PlayerSyncPayload = {
    currentFrame: Frame;
    status: PlaybackStatus;
};
```

Type nay cho thay da co y tuong sync player state theo payload nho.

Chua thay no xuat hien ro trong cac file core vua review,
nen day la mot type co the dang du tru cho luong sync khac.

---

## F. Invariant ma file nay dang giu

### Invariant 1

Playback semantics co 4 trang thai, khong phai 2.

### Invariant 2

Player state chi giu runtime fields can thiet, khong luu geometry hay UI khac.

### Invariant 3

Domain action player base nho hon full store action surface.

---

## G. Ket luan file nay

`types/player.ts` nho, ro va dung boundary.

Diem can nho lon nhat:

- `ended` la mot state hang nhat trong model, khong phai chi la mot case UI.

---

# File review 40 - `src/features/editor/types/projects.ts`

## A. Vai tro cua file

Day la file type domain quan trong nhat cua project/content model.

No dinh nghia:

- media/track kinds
- project video config
- track groups
- tracks
- clip transform
- tung loai clip
- media asset
- editor project

Neu `types/editor.ts` dinh nghia shape state tong,
thi `types/projects.ts` dinh nghia phan domain/content that cua editor.

Day la file co gia tri rat cao.

---

## B. Media kind va preset types

### `TrackMediaKind`

```ts
export type TrackMediaKind = "text" | "video" | "audio" | "image" | "shape";
```

Can note:

Track kind va clip type hien tai dang dung cung family gia tri.

Day la practical, nhung cung co the dan den nham lan neu ve sau track va clip semantics tach xa nhau hon.

### `MediaAssetKind`

```ts
export type MediaAssetKind = "video" | "audio" | "image";
```

Asset library hien tai chua co:

- text asset
- shape asset

Day la hop ly.

### `AspectRatioPreset`

```ts
export type AspectRatioPreset = "16:9" | "9:16" | "1:1" | "4:5" | "custom";
```

Cho thay model video/project da du tru preset va custom mode.

---

## C. `ProjectVideoConfig`

```ts
export type ProjectVideoConfig = {
    fps: number;
    width: number;
    height: number;
    durationInFrames: Frames;
    backgroundColor?: HexColor;
    aspectRatioPreset?: AspectRatioPreset;
};
```

Can note:

`durationInFrames` nam trong video config.

Day la mot quyet dinh model co tac dong lon,
vi no la ly do sau nay phai can bang giua:

- `project.video.durationInFrames`
- max end boundary cua clips

Noi cach khac, file type nay phan anh mot model ma duration dang la metadata cua project video config,
khong hoan toan derived 100% tu clips.

---

## D. `TimelineTrackGroup`

Fields:

- `id`
- `label`
- `kind`
- `trackIds`
- `isCollapsed`
- `isLocked`
- `isMuted`
- `isHidden`

Can note:

Track group model kha day du.

Nhung trong implementation da review, group layer chua xuat hien manh.

Day la them mot case model di truoc implementation.

---

## E. `TimelineTrack`

Fields quan trong:

- `id`
- `groupId`
- `label`
- `kind`
- `index`
- `height`
- `isLocked`
- `isMuted`
- `isHidden`

Can note 2 diem:

### 1. `height`

Field nay van con trong model,
nhung o lane builder hien tai no da mat vai tro source chinh.

Day la diem can nho khi maintain.

### 2. Track co `groupId`

Model group-track relation da co that.

---

## F. `ClipTransform`

```ts
export type ClipTransform = {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    opacity: number;

    width?: number;
    height?: number;
    anchorX?: number;
    anchorY?: number;
};
```

Day la mot type rat quan trong.

Can note:

### 1. Phan currently-used

Implementation hien tai dung manh:

- `x`
- `y`
- `scaleX`
- `scaleY`
- `rotation`
- `opacity`

### 2. Phan future-ready

- `width?`
- `height?`
- `anchorX?`
- `anchorY?`

Cho thay model transform da du tru cho:

- resize theo width/height that
- anchor system

trong khi implementation hien tai van nghiêng ve resize bang scale.

Day la file type di truoc implementation rat ro.

---

## G. `TimelineClipBase`

Fields cot loi:

- identity: `id`, `trackId`, `type`
- timing: `from`, `durationInFrames`, `sourceStartFrame`
- display: `label`, `color`, `layerIndex`
- transform: `transform?`
- lock/hide: `isLocked`, `isHidden`

Can note:

`layerIndex` nam o clip level,
day la co so cho stacking trong Preview va Timeline item z-index thuong.

### `sourceStartFrame`

Field nay cho thay model da du tru trim/start offset theo source time.

Rat quan trong cho video/audio editor ve sau.

---

## H. Cac clip variants

### `TextClip`

- `text`
- `style`

### `VideoClip`

- `src`
- `sourceDurationInFrames`
- `volume`
- `playbackRate?`
- `isMuted?`
- `fadeInDurationInFrames?`
- `fadeOutDurationInFrames?`

### `AudioClip`

Tuong tu video clip ve media timing/audio params.

### `ImageClip`

- `src`
- `objectFit?`

### `ShapeClip`

- `shapeType`
- `fill`
- `stroke?`
- `strokeWidth?`

Can note:

Model clip nay kha giau va da du tru kha nhieu cho editor mo rong.

Nhung implementation hien tai chua khai thac het.

---

## I. `TimelineClip` union

```ts
export type TimelineClip =
    | TextClip
    | VideoClip
    | AudioClip
    | ImageClip
    | ShapeClip;
```

Day la union trung tam cua project domain.

Gan nhu moi file render/layout/build deu phu thuoc vao union nay.

---

## J. `MediaAsset`

Fields:

- `id`
- `kind`
- `src`
- `name`
- `mimeType`
- `duration?`
- `durationInFrames?`
- `width?`
- `height?`

Can note:

Asset model luu metadata tuong doi practical cho upload/import flow.

`duration` va `durationInFrames` cung ton tai song song,
cho thay app dang muon giu ca metadata thuan va metadata quy doi theo fps.

---

## K. `EditorProject`

```ts
export type EditorProject = {
    id: ProjectId;
    name: string;
    video: ProjectVideoConfig;

    trackGroups: TimelineTrackGroup[];
    tracks: TimelineTrack[];
    clips: TimelineClip[];
    mediaAssets: MediaAsset[];
};
```

Day la root domain object cua editor.

Can note:

Project gom ca:

- project video config
- track structure
- clip content
- media asset library

Day la model hop ly cho editor hien tai.

---

## L. Invariant ma file nay dang giu

### Invariant 1

Project domain duoc tach ro giua:

- track/group structure
- clip content
- asset library

### Invariant 2

Clip la discriminated union theo `type`.

### Invariant 3

Transform model da du tru nhieu hon implementation hien tai.

### Invariant 4

Track va clip deu co lock/hide semantics rieng.

### Invariant 5

`layerIndex` la clip-level concern.

---

## M. Diem manh cua file hien tai

1. Domain model kha day du

2. Union clip ro rang

3. Da du tru nhieu kha nang mo rong hop ly

4. Root `EditorProject` de doc

---

## N. Code smell / risk / diem can de y

### 1. Model di truoc implementation kha nhieu

Vi du:

- group features
- custom aspect ratio flow
- transform width/height/anchor
- fade in/out media

Khong sai.

Nhung can de mat de tranh type tro thanh mo hinh ly tuong qua xa implementation that.

### 2. `durationInFrames` nam trong `ProjectVideoConfig`

Day la quyet dinh model rat quan trong va la nguon cua mot so distinction phuc tap da thay.

### 3. `TrackMediaKind` va `TimelineClip["type"]` dang rat gan nhau

Tien, nhung cung co the la coupling ngam ve sau.

### 4. `TimelineTrack.height` van con ton tai trong model

Trong khi lane builder moi da giam vai tro field nay.

---

## O. Ket luan file nay

`types/projects.ts` la file domain core rat quan trong.

No dang cho thay editor co mot model du kha nang de mo rong,
nhung cung can ky luat de implementation that khong bi bo qua xa so voi type layer.

Day la mot trong nhung file nen duoc nhin lai moi khi mo rong editor capability lon.

---

# File review 41 - `src/features/editor/types/primitives.ts`

## A. Vai tro cua file

Day la file type primitives/coi nhu aliases nen tang.

No dinh nghia:

- so hoc/coor:
  - `Frame`
  - `Frames`
  - `Pixels`
  - `Seconds`
- identifiers:
  - `ProjectId`
  - `TrackGroupId`
  - `TrackId`
  - `ClipId`
  - `AssetId`
- strings:
  - `HexColor`
  - `MediaSrc`

File nay rat nho nhung xuat hien khap codebase.

---

## B. Y nghia cua alias primitives hien tai

Tat ca dang la alias cua:

- `number`
hoac
- `string`

Vi du:

```ts
export type Frame = number;
export type Pixels = number;
export type ClipId = string;
```

Y nghia:

File nay khong tao strong nominal typing that.

No chi tao semantic aliases de:

- de doc hon
- truyen dat y nghia domain ro hon

Day la practical va nhe.

---

## C. Diem manh

1. Code doc de hon rat nhieu

2. Tao ngon ngu chung cho codebase

3. De doi sang branded types sau nay neu can

---

## D. Code smell / risk / diem can de y

### 1. Khong co strong type separation that

TypeScript van xem `Frame` va `Pixels` deu la `number`.

Nen ve runtime/type-check, van co the truyen nham.

Day la tradeoff da biet.

### 2. Vi alias rat nhe, nguoi maintain de chu quan

Can nho:

- y nghia semantic van quan trong

---

## E. Ket luan file nay

`types/primitives.ts` la file nho nhung la tu dien ngon ngu cua codebase.

No co gia tri lon ve readability, du khong tao nominal typing that.

---

# File review 42 - `src/features/editor/types/index.ts`

## A. Vai tro cua file

Day la barrel file cho types layer.

No export:

- `interaction`
- `player`
- `primitives`
- `projects`
- `timeline`

Can note:

file nay hien tai chua export `preview.ts` va `editor.ts`.

Day la chi tiet rat dang chu y.

---

## B. Y nghia cua viec khong export `preview.ts` va `editor.ts`

Co 2 kha nang:

1. co y, de giu public type surface hep hon
2. do lich su / chua cap nhat barrel

Hien tai chi doc file thi chua ket luan duoc.

Nhung day chac chan la mot diem nguoi maintain nen de mat.

---

## C. Ket luan file nay

`types/index.ts` la barrel file nho.

Diem can de y lon nhat:

- public surface cua types layer hien tai khong bao gom `preview` va `editor`

---

## Thu tu review de xuat tiep theo

Sau lop types foundation nay, thu tu hop ly tiep theo:

1. `src/features/editor/components/editor-toolbar.tsx`
2. `src/features/editor/components/inspector/index.tsx`
3. `src/features/editor/lib/media-assets.ts`

Ly do:

- lop core timeline/preview/store/types da duoc cover kha sau roi
- con lai nen di sang public UI modules va helper upload/media

---

# File review 43 - `src/features/editor/components/editor-toolbar.tsx`

## A. Vai tro cua file

Day la toolbar tren cung cua editor.

No la noi nguoi dung thao tac voi cac tool cap cao nhu:

- pointer/select
- shape
- text
- import media
- export

Khac voi `timeline-toolbar.tsx`:

- `editor-toolbar.tsx` lo tool/canvas/editor-level actions
- `timeline-toolbar.tsx` lo playback/timeline-level actions

Day la distinction quan trong.

---

## B. Import va dependency

File import:

- `useRef`
- `useState`
- `ChangeEvent`
- `Button` tu `antd`
- nhieu icon toolbar
- store hooks:
  - `useAddMediaAssetAsClip`
  - `useAddTextClipAtPlayhead`
  - `useEditorVideo`
- helper:
  - `createMediaAssetFromFile`

Y nghia:

Toolbar nay khong chi la UI shell.
No co mot luong async import media that su.

---

## C. State va ref local

### `fileInputRef`

Tro vao hidden `<input type="file" />`.

Dung de mo media picker bang code.

### `isImporting`

State UI de hien loading tren button media import.

Day la state local hop ly.

---

## D. Store data/action dang dung

- `video = useEditorVideo()`
- `addTextClipAtPlayhead`
- `addMediaAssetAsClip`

Can note:

Toolbar can `video.fps` de helper media asset convert metadata duration -> frames.

Day la coupling hop ly.

---

## E. Ham local trong file

### 1. `openMediaPicker`

```ts
const openMediaPicker = () => {
    fileInputRef.current?.click();
};
```

Don gian va dung.

### 2. `handleMediaFilesChange`

```ts
const handleMediaFilesChange = async (
    event: ChangeEvent<HTMLInputElement>,
) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    setIsImporting(true);

    try {
        for (const file of files) {
            const asset = await createMediaAssetFromFile(file, video.fps);

            if (asset) {
                addMediaAssetAsClip({ asset });
            }
        }
    } finally {
        event.target.value = "";
        setIsImporting(false);
    }
};
```

Day la logic quan trong nhat cua file.

### Y nghia

1. lay danh sach file da chon
2. bo qua neu rong
3. bat loading
4. xu ly tung file lan luot
5. tao `MediaAsset`
6. add asset vao editor duoi dang clip
7. reset input de co the chon lai cung file lan sau
8. tat loading

### Can note

#### Xu ly tuan tu

File dang import tung file theo thu tu `for ... of` + `await`.

Day la practical va de debug.

Khong toi uu toi da, nhung co the chap nhan duoc o giai doan nay.

#### `finally`

Rat dung.

Neu mot file fail, input van duoc reset va loading van tat.

### Dieu file nay chua lam

- khong co error UI
- khong co progress theo file
- khong co parallel import

Khong phai bug, nhung can note ro hien trang.

---

## F. JSX / HTML structure hien tai

File render:

```tsx
<div className='h-fit w-full bg-white p-3 border flex items-center gap-x-4'>
    <input ... hidden ... />

    <div className='flex items-center'>
        <Button ... pointer />
        <Button ... square />
        <Button ... text />
        <Button ... media-import />
    </div>
    <Button ... export />
</div>
```

### 1. Hidden file input

```tsx
<input
    ref={fileInputRef}
    type='file'
    accept='image/*,video/*,audio/*'
    multiple
    className='hidden'
    onChange={handleMediaFilesChange}
/>
```

Can note:

- accept dung cho image/video/audio
- cho chon nhieu file

### 2. Pointer button

Hien chi render icon.
Khong co action.

Tuc la button nay hien tai la placeholder UI.

### 3. Square button

Tuong tu, hien la placeholder UI.

### 4. Text button

Day la button co action that:

```tsx
onClick={() => addTextClipAtPlayhead()}
```

Comment da note ro:

- logic moi: tao text clip tai playhead hien tai

Day la behavior dang duoc dung that.

### 5. Media import button

La button co action that.

Can note:

File nay dang dung:

```tsx
icon={null}
loading={isImporting}
```

nhung children la 3 icon:

- image
- video
- music

Y nghia:

button nay dai dien cho ca 3 loai import media.

### 6. Export button

Hien chi render icon.
Chua co action.

Placeholder UI.

---

## G. Invariant ma file nay dang giu

### Invariant 1

Text button tao clip moi tai playhead hien tai.

### Invariant 2

Media import hien tai convert file thanh `MediaAsset` roi add vao editor duoi dang clip.

### Invariant 3

Toolbar top-level nay khong dieu khien playback/timeline; viec do thuoc `timeline-toolbar.tsx`.

### Invariant 4

Pointer/shape/export hien tai moi la placeholder UI.

---

## H. Diem manh cua file hien tai

1. File gon va de scan

2. Import flow co try/finally ro rang

3. Reset file input dung cach

4. Distinction giua button that va placeholder button kha ro khi doc code

---

## I. Code smell / risk / diem can de y

### 1. Toolbar UI dang co placeholder buttons khong action

Khong sai.

Nhung nguoi maintain can biet day la UI chua hoan chinh.

### 2. Khong co error handling UI cho import media

Neu `createMediaAssetFromFile` fail mot file, file nay hien tai khong thong bao gi cho nguoi dung.

### 3. Import theo tuan tu

Thuc dung, nhung voi nhieu file lon co the cham.

### 4. Button media import gom 3 icon trong mot button

Hop ly ve mat compact UI.

Nhung semantics co the hoi mo ho ve accessibility neu khong co label bo sung.

---

## J. Ket luan file nay

`editor-toolbar.tsx` la mot file UI shell + import flow nho.

Hien tai no dang o trang thai "mot phan hoan chinh":

- text add da co that
- media import da co that
- nhung mot so tool khac moi la placeholder

Day la hien trang dung va can duoc note ro de tranh ngộ nhan rang toolbar da full feature.

---

# File review 44 - `src/features/editor/components/inspector/index.tsx`

## A. Vai tro cua file

Hien tai day la placeholder component cho panel Inspector.

Code:

```tsx
const Inspector = () => {
    return (
        <div className='max-h-full w-full min-h-0 overflow-y-auto flex flex-col'>
            <h1>Inspector</h1>
            ...
        </div>
    );
};
```

Y nghia:

Panel Inspector da co cho dung trong layout,
nhung chua co feature/editor controls that su.

---

## B. Hien trang that cua file

File dang render rat nhieu:

- `<h1>Inspector</h1>`

lap di lap lai.

Day ro rang la filler content de:

- tao scroll
- test panel layout
hoac
- tam giu cho inspector area khong rong

Can note thang:

day khong phai implementation Inspector that.

---

## C. Diem can de y

1. File nay hien tai gan nhu chua co gia tri product logic

2. Moi review/maintain ve Inspector thuc te sau nay gan nhu se bat dau lai tu file nay

3. `overflow-y-auto` va `min-h-0` cho thay panel shell layout da duoc dat san

---

## D. Ket luan file nay

`inspector/index.tsx` hien tai la placeholder shell, chua phai feature component.

---

# File review 45 - `src/features/editor/components/inspector/components/inspector-section.tsx`

## A. Vai tro cua file

Hien tai day la placeholder component cho section ben trong Inspector.

Code:

```tsx
const InspectorSection = () => {
    return <div>Inspector section</div>;
};
```

Khong co props.
Khong co layout logic.
Khong co state.

---

## B. Hien trang

File nay chua co vai tro that trong implementation hien tai.

No chi la mot stub/placeholder de danh dau huong component structure ve sau.

---

## C. Ket luan file nay

`inspector-section.tsx` hien tai la stub.

---

## Thu tu review de xuat tiep theo

Con lai gan nhu chi con:

1. `src/features/editor/lib/media-assets.ts`

Sau do neu muon khép het `src/features/editor`, co the revisit:

2. `src/features/editor/compositions/editor-composition.tsx` (chi neu muon bo sung them cho cac helper con ben trong)

Nhung ve mat dem file, file core cuoi cung chua review la `media-assets.ts`.

---

# File review 46 - `src/features/editor/lib/media-assets.ts`

## A. Vai tro cua file

Day la helper import media tu `File` browser object thanh `MediaAsset` cua editor.

No la cua vao cua flow upload/import hien tai.

File nay lo:

1. xac dinh file la image/video/audio
2. tao `objectURL`
3. doc metadata tu file
4. quy doi duration sang frames neu can
5. tra ve `MediaAsset`

No khong:

- them asset vao store
- tao clip tren timeline
- render preview

No chi lo conversion `File -> MediaAsset`.

---

## B. Import va dependency

File import:

- `MediaAsset`
- `MediaAssetKind`

Khong doc store.
Khong doc React.

Nhung no phu thuoc runtime browser APIs:

- `File`
- `URL.createObjectURL`
- `Image`
- `document.createElement("video")`
- `document.createElement("audio")`

Day la utility browser-side dung nghia.

---

## C. Helper - `getMediaAssetKind`

```ts
const getMediaAssetKind = (file: File): MediaAssetKind | null => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("image/")) return "image";

    return null;
};
```

### Vai tro

Xac dinh asset kind dua tren MIME type.

Can note:

- chi support 3 kind:
  - video
  - audio
  - image
- file MIME type khong hop le => `null`

Day la gatekeeper dau tien cua import flow.

---

## D. Helper - `createAssetId`

```ts
const createAssetId = (kind: MediaAssetKind) => {
    return `asset-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};
```

### Vai tro

Tao id asset tam theo:

- kind
- timestamp
- random suffix

Day la practical.

Khong phai UUID chinh thong,
nhung du dung cho local editor state hien tai.

Can note:

- ID nay phu thuoc vao runtime thoi diem tao
- khong co tinh on dinh giua sessions

Hop ly cho local asset import.

---

## E. Helper - `getDurationInFrames`

```ts
const getDurationInFrames = (duration: number, fps: number) => {
    if (!Number.isFinite(duration) || duration <= 0) return undefined;

    return Math.max(1, Math.ceil(duration * fps));
};
```

### Vai tro

Quy doi duration giay sang frames.

Can note:

- dung `Math.ceil`
- toi thieu `1`

Y nghia:

Asset media co duration hop le se khong bao gio cho ra 0 frame.

Day la choice dung cho media timeline/editor.

---

## F. Metadata readers

File co 3 helper reader:

1. `readImageMetadata`
2. `readVideoMetadata`
3. `readAudioMetadata`

### 1. `readImageMetadata`

Tao `new Image()`, gan `src`, doc:

- `naturalWidth`
- `naturalHeight`

Reject neu load loi.

### 2. `readVideoMetadata`

Tao `document.createElement("video")`, `preload = "metadata"`, doc:

- `duration`
- `videoWidth`
- `videoHeight`

Reject neu loi.

### 3. `readAudioMetadata`

Tao `document.createElement("audio")`, `preload = "metadata"`, doc:

- `duration`

Reject neu loi.

### Nhan xet chung

Ba helper nay rat practical va dung browser API.

Day la flow phu hop cho client-side editor.

Can note:

file nay khong can server roundtrip de doc metadata.

---

## G. Ham chinh - `createMediaAssetFromFile`

```ts
export const createMediaAssetFromFile = async (
    file: File,
    fps: number,
): Promise<MediaAsset | null> => { ... }
```

### Buoc 1 - Xac dinh `kind`

```ts
const kind = getMediaAssetKind(file);
if (!kind) return null;
```

File MIME khong duoc support thi bo qua.

### Buoc 2 - Tao `src`

```ts
const src = URL.createObjectURL(file);
```

Day la local object URL cho Preview / asset use ve sau.

### Buoc 3 - Xu ly theo kind

#### Image

Doc:

- width
- height

Return asset:

- `id`
- `kind`
- `src`
- `name`
- `mimeType`
- `width`
- `height`

#### Video

Doc:

- `duration`
- `width`
- `height`

Return asset:

- metadata co duration ca theo second va theo frames
- width/height

#### Audio

Doc:

- `duration`

Return asset:

- duration
- durationInFrames

### Buoc 4 - Error path

```ts
} catch (error) {
    URL.revokeObjectURL(src);
    throw error;
}
```

Can note ky:

Neu doc metadata loi:

- object URL duoc revoke
- loi duoc throw lai

Day la cleanup dung cho error path.

---

## H. Invariant ma file nay dang giu

### Invariant 1

Chi image/video/audio moi duoc import thanh `MediaAsset`.

### Invariant 2

Image asset khong co duration.

### Invariant 3

Video/audio asset co `durationInFrames` neu doc duoc duration hop le.

### Invariant 4

`objectURL` duoc tao cho moi asset import.

### Invariant 5

Error path se revoke `objectURL`.

---

## I. Diem manh cua file hien tai

1. Flow ro rang

2. Tach rieng metadata readers theo media kind

3. Browser-only implementation practical

4. Co quy doi duration -> frames ngay tai cua vao

5. Error path co cleanup `objectURL`

---

## J. Code smell / risk / diem can de y

### 1. `objectURL` chi revoke khi loi

Day la diem can note rat ky.

Neu import thanh cong, `src` duoc giu lai trong asset va khong revoke ngay.

Dieu nay co the la co y,
vi editor can tiep tuc dung URL do de preview/media playback.

Nhung no cung co nghia:

- se can co lifecycle cleanup o mot tang khac neu asset bi xoa / app dong

Neu khong, co nguy co ro ri resource theo session dai.

### 2. Khong co timeout/abort cho metadata loading

Neu browser/media co van de, promise se phu thuoc vao event APIs.

### 3. `createAssetId` la practical id, khong phai stable id

Hop ly cho local state,
nhung khong nen xem no la persistent asset identity chuyen nghiep.

### 4. File tin `fps` hop le

Neu `fps` sai, `durationInFrames` sai theo.

### 5. Image asset khong luu them thong tin nhu objectFit mac dinh

Khong sai.

Nhung cho thay file nay dang giu metadata toi thieu, khong them policy render.

Day la boundary tot.

---

## K. Ket luan file nay

`media-assets.ts` la helper import thuc dung va quan trong.

No dang giu dung boundary:

- browser file vao
- media asset model ra

Khong lan sang store hay UI render.

Diem can de y lon nhat cua file hien tai:

1. `objectURL` lifecycle sau khi import thanh cong chua nam trong file nay
2. ID la local/practical, khong phai persistent identity
3. helper nay dang giu metadata toi thieu va dung muc dich

---

## Tong ket nho

Toi da review het toan bo cac file hien co trong `src/features/editor`.

Neu sau nay co file moi them vao hoac user muon dao sau hon,
co the tiep tuc theo 3 huong:

1. revisit cac file quan trong nhat de bo sung section "refactor de xuat"
2. review lan 2 theo concern thay vi theo file
   - playback
   - timeline math
   - text editing
   - upload/media
3. chuyen tu review sang lap tai lieu kien truc tong the

---

# Top Risks And Refactor Priorities

Phan nay khong review them file moi.
No tong hop nhung diem lon nhat da lap lai trong cac review ben tren,
de khi can bat dau cleanup/refactor thi khong phai doc lai toan bo file note.

## 1. Timeline math dang co 2 he song song

File lien quan:

- `src/features/editor/lib/timeline-math.ts`
- `src/features/editor/lib/timeline-zoom-spec.ts`
- `src/features/editor/lib/timeline-zoom-engine.ts`

### Van de

Codebase hien tai dang co 2 cach tu duy ve zoom/width ngang:

1. he cu:
   - `getTimelineWidth`
   - `getPixelsPerFrame`
   - measured growth per second
2. he moi:
   - duration bucket rules
   - tick unit
   - visible duration
   - tail padding

### Tai sao no quan trong

Day la nguon bug rat de xuat hien neu:

- mot component dung helper cu
- component khac dung helper moi

Khi do cac thu sau se lech nhau:

- ruler
- clip width
- seek mapping
- playhead x
- scroll range

### Uu tien

Rat cao.

### Huong refactor

- chot ro file nao la source of truth cho zoom ngang
- neu he moi la huong dung, danh dau he cu la legacy/replace
- bo sung test cho:
  - project rong
  - project ngan
  - project dai
  - zoom min/max

---

## 2. Timeline orchestration dang phinh o 2 diem nong

File lien quan:

- `src/features/editor/components/timeline/index.tsx`
- `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`

### Van de

2 file nay dang om kha nhieu concern cung luc:

- layout compose
- drag/drop
- drop preview
- panel resize
- scroll sync
- keyboard shortcut
- boundary scroll
- playhead scrub
- preview fast seek
- store sync throttle
- auto-scroll khi play

### Tai sao no quan trong

Day la nhung file de:

- bug UX/perf xuat hien nhieu nhat
- thay doi nho nhung co blast radius lon

### Uu tien

Rat cao.

### Huong refactor

Khong nen tach vo toi va.
Nhung khi thuc su can cleanup, co the tach theo concern:

- `useTimelineDropPreview`
- `useTimelinePanelResize`
- `useTimelineScrollSync`
- `usePlayheadScrub`
- `usePlayheadAutoScroll`

Muc tieu:

- giam kich thuoc file
- de test logic
- de khoanh vung bug

---

## 3. Playhead visual primitive van co debt ro rang

File lien quan:

- `src/features/editor/components/timeline/components/playhead.tsx`

### Van de

Than Playhead dang duoc hard-code trong SVG path,
thay vi tach:

- marker head
- vertical line

### Tai sao no quan trong

Day la nguon truc tiep cua nhung van de da gap:

- khong full height theo timeline
- resize max bi lo thieu height
- kho thay doi style marker/line doc lap

### Uu tien

Cao, nhung sau `timeline math` va `playhead orchestration`.

### Huong refactor

- tach marker head thanh SVG rieng
- tach than doc thanh `div`/pseudo element
- de than doc bam theo height that cua layer cha

---

## 4. Text editing da on hon, nhung van la mot cum nhay cam

File lien quan:

- `src/features/editor/components/preview/components/preview-text-overlay.tsx`

### Van de

File nay dang giai quyet cung luc:

- visible text filtering
- selection/focus policy
- click outside
- edit mode
- contentEditable sync
- move
- resize
- DOM measure

### Tai sao no quan trong

Day la file da tung gay loi `removeChild`,
va ve ban chat van la noi nhay cam nhat cua text feature.

### Uu tien

Cao.

### Huong refactor

Khi can:

- tach them section "selection policy"
- tach style helpers
- tach move/resize hooks ro hon nua neu complexity tang tiep

Quan trong hon ca refactor la:

- giu boundary display/edit DOM tach rieng
- khong quay lai cach sync contentEditable pha DOM cua React

---

## 5. Model type dang di truoc implementation o kha nhieu cho

File lien quan:

- `src/features/editor/types/projects.ts`
- `src/features/editor/types/interaction.ts`
- `src/features/editor/types/preview.ts`
- `src/features/editor/types/timeline.ts`

### Van de

Model hien tai da du tru kha nhieu:

- custom preview mode
- interaction state phong phu
- track groups
- transform width/height/anchor
- fades
- timeline snap guide / ruler marker

Trong khi implementation thuc te chua dung het.

### Tai sao no quan trong

Khong phai bug ngay lap tuc.

Nhung neu de lau:

- type layer va implementation that co the tro nen lech nhau
- nguoi moi doc code se kho phan biet cai gi dang that su chay, cai gi moi la du tinh

### Uu tien

Trung binh-cao.

### Huong xu ly

Moi khi them feature moi:

- uu tien tai dung field/type da du tru neu con phu hop
- neu mot type treo lau va sai huong, can manh tay cat bo hoac doi ten ro hon

---

## 6. Project duration semantics van la diem can giu rat chac

File lien quan:

- `src/features/editor/lib/playback-duration.ts`
- `src/features/editor/types/projects.ts`
- `src/features/editor/components/preview/index.tsx`
- `src/features/editor/compositions/editor-composition.tsx`

### Van de

Codebase dang can bang giua:

- `project.video.durationInFrames`
- max clip end boundary
- Remotion Player duration >= 1
- editor duration co the = 0

### Tai sao no quan trong

Day la nguon cua cac bug da gap:

- project rong ma van co duration ao
- clip dat lech `00:00` thi preview ket thuc som
- UI duration khac Player duration

### Uu tien

Cao.

### Huong xu ly

- giu helper duration centralize
- tranh hard-code duration logic o UI/components
- neu sau nay lam JSON/export contract, can chot ro source of truth cua project duration

---

## 7. Upload/media import can co plan cleanup resource

File lien quan:

- `src/features/editor/lib/media-assets.ts`
- `src/features/editor/components/editor-toolbar.tsx`

### Van de

Import media dang tao `objectURL`.

Error path da revoke.
Success path thi chua revoke trong file import.

### Tai sao no quan trong

Neu session dai va import nhieu media,
co the dan toi leak resource neu khong co lifecycle cleanup o tang khac.

### Uu tien

Trung binh-cao.

### Huong xu ly

- xac dinh ro object URL se duoc cleanup khi nao
  - xoa asset
  - dong project
  - dispose editor
- note ro lifecycle do trong code

---

## 8. Store/selector layer da tot, nhung can giu ky luat subscribe hep

File lien quan:

- `src/features/editor/stores/editor.store.ts`
- `src/features/editor/stores/editor.selectors.ts`

### Van de

Da co selector hep.
Nhung van co nhieu cho de tay dung selector rong.

### Tai sao no quan trong

Timeline/Preview la noi rat nhay cam voi render cost.

Chi can subscribe qua rong o nhung file nong,
perf se di xau nhanh.

### Uu tien

Cao ve mat ky luat, khong nhat thiet cao ve mat refactor code ngay.

### Huong xu ly

- component nang uu tien selector hep
- neu them UI moi, xem truoc co hook selector hep chua
- can thiet thi bo sung selector moi thay vi keo ca object lon

---

## 9. Inspector va mot so top-level UI con la placeholder

File lien quan:

- `src/features/editor/components/inspector/index.tsx`
- `src/features/editor/components/inspector/components/inspector-section.tsx`
- mot phan trong `src/features/editor/components/editor-toolbar.tsx`

### Van de

Day khong phai bug core.
Nhung can note ro:

- inspector chua co product logic that
- pointer/shape/export tren toolbar top-level con la placeholder

### Uu tien

Thap hon nhom timeline/preview/store core.

### Huong xu ly

Chi nen dau tu sau khi:

- timeline/playhead/text/upload core da on
- hoac khi user quyet dinh bat dau feature cua Inspector/toolbar tool thuc su

---

## De xuat thu tu cleanup neu phai lam that

Neu can bat dau cleanup/refactor co kiem soat, toi de xuat uu tien:

1. Chot mot he timeline math/zoom source of truth
2. Giam complexity cua `timeline/index.tsx`
3. Giam complexity cua `timeline-playhead-viewport-layer.tsx`
4. Bao toan va don gian hoa boundary cua `preview-text-overlay.tsx`
5. Chot ro duration semantics / export semantics
6. Dat lifecycle cleanup ro cho imported media `objectURL`

---

# Architecture Summary

Phan nay tom tat editor theo tang, khong di lai tung file chi tiet.
Muc tieu la de lan sau khi quay lai project, chi can doc mot lan la nho editor dang duoc chia nhu the nao.

## 1. Domain layer

File chinh:

- `src/features/editor/types/projects.ts`
- `src/features/editor/types/primitives.ts`
- `src/features/editor/types/player.ts`
- `src/features/editor/types/timeline.ts`
- `src/features/editor/types/preview.ts`
- `src/features/editor/types/interaction.ts`
- `src/features/editor/types/editor.ts`

### Vai tro

Day la tang mo ta:

- project la gi
- clip/track/group la gi
- runtime state la gi
- interaction state la gi

### Hien trang

Tang nay kha day du va di truoc implementation o mot so cho.

### Dieu can nho

- `EditorState = project + runtime`
- `TimelineClip` la discriminated union trung tam
- `ClipTransform` va `TimelineInteractionState` da du tru nhieu hon implementation hien tai

---

## 2. Store layer

File chinh:

- `src/features/editor/stores/editor.store.ts`
- `src/features/editor/stores/editor.types.ts`
- `src/features/editor/stores/editor.initial-state.ts`
- `src/features/editor/stores/editor.selectors.ts`

### Vai tro

Day la source of truth chinh cua editor runtime + project data trong client.

### Hien trang

- `editor.store.ts` la implementation trung tam
- `editor.types.ts` la contract cua store
- `editor.initial-state.ts` chot semantics khoi dong
- `editor.selectors.ts` la facade hook cho UI

### Dieu can nho

- store dang giu kha nhieu business logic that
- selector hep co vai tro quan trong cho performance
- project rong hien tai co `durationInFrames = 0`

---

## 3. Timeline math and layout layer

File chinh:

- `src/features/editor/lib/timeline-math.ts`
- `src/features/editor/lib/timeline-zoom-spec.ts`
- `src/features/editor/lib/timeline-zoom-engine.ts`
- `src/features/editor/lib/build-track-lane-layouts.ts`
- `src/features/editor/lib/build-clip-layouts.ts`
- `src/features/editor/lib/format-time.ts`

### Vai tro

Tang nay lo:

- zoom policy
- frame <-> pixel mapping
- lane geometry
- clip geometry
- time display format

### Hien trang

Day la tang co debt lon nhat ve math architecture,
vi dang co 2 he timeline zoom/mapping song song.

### Dieu can nho

- lane height hien tai theo clip cao nhat trong lane
- body khong con tu them gutter ngang nua
- `visibleDurationInFrames` va `playbackDurationInFrames` la hai khai niem khac nhau

---

## 4. Timeline render layer

File chinh:

- `src/features/editor/components/timeline/index.tsx`
- `src/features/editor/components/timeline/components/timeline-toolbar.tsx`
- `src/features/editor/components/timeline/components/timeline-ruler.tsx`
- `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`
- `src/features/editor/components/timeline/components/playhead.tsx`
- `src/features/editor/components/timeline/components/timeline-body/*`
- `src/features/editor/components/timeline/components/timeline-track-headers/*`
- `src/features/editor/components/timeline/components/timeline-item/*`

### Vai tro

Tang nay lo:

- render Timeline that
- toolbar playback/timeline controls
- playhead viewport layer
- drag/drop clips
- lane backgrounds
- item primitives
- track header controls

### Hien trang

Timeline la cum da phat trien manh nhat.

### Dieu can nho

- `timeline/index.tsx` la container/orchestrator lon nhat
- `timeline-playhead-viewport-layer.tsx` la controller layer cua playhead
- `playhead.tsx` chi nen duoc xem la primitive visual/pointer

---

## 5. Preview render layer

File chinh:

- `src/features/editor/components/preview/index.tsx`
- `src/features/editor/components/preview/components/preview-viewport.tsx`
- `src/features/editor/components/preview/components/preview-stage.tsx`
- `src/features/editor/compositions/editor-composition.tsx`
- `src/features/editor/lib/get-preview-surface-layout.ts`
- `src/features/editor/components/preview/hooks/use-element-size.ts`

### Vai tro

Tang nay lo:

- runtime bridge toi Remotion Player
- geometry cua preview surface
- mount composition that
- text overlay HTML tren preview

### Hien trang

Boundary trong cum nay kha on:

- Player/composition render that
- overlay editor nam o lop khac

### Dieu can nho

- `Sequence` dang la nen tang cho preview/export parity
- `preview/index.tsx` dang giu runtime sync giua store va Player

---

## 6. Text editing layer

File chinh:

- `src/features/editor/components/preview/components/preview-text-overlay.tsx`

### Vai tro

Tang nay lo toan bo text interaction tren preview:

- select
- focus
- click outside
- edit
- move
- resize

### Hien trang

Da on hon rat nhieu sau khi tach display/edit DOM,
nhung van la cum nhay cam nhat cua text feature.

### Dieu can nho

- khong duoc quay lai kieu can thiep DOM contentEditable pha React tree

---

## 7. Media import layer

File chinh:

- `src/features/editor/lib/media-assets.ts`
- `src/features/editor/components/editor-toolbar.tsx`

### Vai tro

Tang nay lo:

- nhan `File`
- doc metadata
- tao `MediaAsset`
- add vao editor tu toolbar

### Hien trang

Flow import co that va practical.

### Dieu can nho

- `objectURL` lifecycle sau khi import thanh cong chua duoc xu ly o file import

---

## 8. Shell / placeholder UI layer

File chinh:

- `src/features/editor/components/editor-toolbar.tsx`
- `src/features/editor/components/inspector/index.tsx`
- `src/features/editor/components/inspector/components/inspector-section.tsx`

### Vai tro

Day la lop shell UI bao quanh core editor.

### Hien trang

- toolbar top-level moi hoan chinh mot phan
- inspector hien tai van la placeholder

### Dieu can nho

- khong nen uu tien cleanup o lop nay truoc khi timeline/preview core on dinh hon

---

## 9. Nguon su that hien tai

De tranh nham lan, day la cach nen nho source of truth:

### Project/content source of truth

- `project` trong store

### Runtime source of truth

- `runtime` trong store

### Preview render that

- Remotion composition + Player

### Preview interaction text

- HTML overlay ben tren Player

### Timeline geometry

- builder + math helpers

### Clip render trong Timeline

- `TimelineClipLayout` -> `timeline-item` primitives

---

## 10. Chuoi data flow can nho

### Upload media

`File` -> `createMediaAssetFromFile` -> `MediaAsset` -> store action -> project clips/assets -> Preview/Timeline render

### Add text

Toolbar -> store action -> text clip moi trong project -> Timeline item + Preview composition + Preview text overlay

### Scrub playhead

Pointer -> playhead layer -> DOM transform ngay + preview fast seek event + store sync throttled -> Player/store/UI dong bo

### Playback

Store status/frame -> Preview bridge -> Remotion Player -> frame events -> store/ui sync nguoc lai

---

## 11. Ket luan kien truc hien tai

Kien truc hien tai nhin chung la hop ly cho mot editor dang lon dan:

- domain/store/timeline/preview duoc tach thanh nhung cum kha ro
- cac debt lon nhat tap trung o:
  - timeline math
  - timeline orchestration
  - playhead primitive
  - text overlay complexity

Neu giu dung huong nay, cac buoc tiep theo nen la:

1. don gian hoa tang core
2. giu boundary render that vs overlay interaction
3. tranh de shell UI/phần placeholder chiem uu tien som hon core editor

---

# Suggested Refactor Plan

Phan nay khong phai "phai lam ngay".
No la de xep thu tu cleanup/refactor sao cho:

- it vo nhat
- de verify nhat
- giam risk som nhat

## Phase 1 - Chot mot source of truth cho Timeline math

### Muc tieu

Loai bo tinh trang 2 he math song song cho zoom ngang.

### File chinh lien quan

- `src/features/editor/lib/timeline-math.ts`
- `src/features/editor/lib/timeline-zoom-spec.ts`
- `src/features/editor/lib/timeline-zoom-engine.ts`
- cac file caller cua 3 file nay

### Viec can lam

1. Liet ke cho nao con dung:
   - `getTimelineWidth`
   - `getPixelsPerFrame`
   - `computeTimelineZoom`
2. Chot ro:
   - he moi (`timeline-zoom-spec` + `timeline-zoom-engine`) co phai source chinh khong
3. Neu co:
   - danh dau helper legacy
   - doi caller ve mot he duy nhat
4. Bo sung test cases cho:
   - project rong
   - project ngan
   - project dai
   - zoom 1
   - zoom max

### Ket qua mong muon

- ruler
- clip width
- playhead x
- scroll range
- visible duration

deu di tu cung mot he tinh.

---

## Phase 2 - Tach nhe `timeline/index.tsx`

### Muc tieu

Giam do phinh va blast radius cua container Timeline.

### File chinh lien quan

- `src/features/editor/components/timeline/index.tsx`

### Viec can lam

Tach dan theo concern, uu tien:

1. `useTimelinePanelResize`
2. `useTimelineKeyboardDelete`
3. `useTimelineBoundaryScroll`
4. `useClipDropPreview`

### Nguyen tac

- chi tach khi boundary ro
- khong refactor hinh thuc
- khong doi behavior neu khong can

### Ket qua mong muon

`timeline/index.tsx` chi con la:

- compose layout
- noi cac hook orchestration
- render tree

---

## Phase 3 - Tach `timeline-playhead-viewport-layer.tsx` theo trach nhiem

### Muc tieu

Giam complexity cua playhead controller layer ma khong mat do muot.

### File chinh lien quan

- `src/features/editor/components/timeline/components/timeline-playhead-viewport-layer.tsx`

### Viec can lam

Tach dan thanh hook theo concern:

1. `usePlayheadViewportPosition`
2. `usePlayheadScrub`
3. `usePlayheadAutoScroll`

### Dieu can giu nguyen

- Preview fast seek path
- store sync throttled
- pause khi scrub trong luc playing
- boundary scroll behavior

### Ket qua mong muon

File layer nay van la orchestration layer,
nhung de doc va de khoanh bug hon.

---

## Phase 4 - Sua debt cua `playhead.tsx`

### Muc tieu

Bo hard-coded SVG line height.

### File chinh lien quan

- `src/features/editor/components/timeline/components/playhead.tsx`

### Viec can lam

1. Tach marker head thanh SVG rieng
2. Tach than doc thanh `div`
3. De than doc bam theo height that cua layer cha
4. Giu nguyen pointer capture va primitive boundary hien tai

### Ket qua mong muon

- khong con bug thieu height
- de doi style head/line doc lap
- de maintain hon

---

## Phase 5 - Hardening cho Text overlay

### Muc tieu

Giu text editing on dinh khi feature tang them.

### File chinh lien quan

- `src/features/editor/components/preview/components/preview-text-overlay.tsx`

### Viec can lam

1. Tach them helper/style logic neu file tiep tuc lon
2. Bổ sung them test scenario thu cong ro rang cho:
   - add text
   - edit
   - click outside
   - seek khi dang edit
   - hide track/clip khi dang edit
   - add media trong luc text dang selected/edit
3. Giữ nguyên boundary:
   - display DOM
   - edit DOM

### Ket qua mong muon

Text overlay van la cum nhay cam,
nhung khong tro lai bug DOM/React nhu truoc.

---

## Phase 6 - Chot ro duration/export semantics

### Muc tieu

Tranh de project duration, playback duration va export duration lech nhau.

### File chinh lien quan

- `src/features/editor/lib/playback-duration.ts`
- `src/features/editor/types/projects.ts`
- `src/features/editor/compositions/editor-composition.tsx`
- `src/features/editor/components/preview/index.tsx`

### Viec can lam

1. Chot ro trong note/code:
   - `project.video.durationInFrames` la gi
   - `editor playback duration` la gi
   - `Remotion player duration` la gi
2. Neu can:
   - them mapper ro rang cho JSON/export contract
3. Tranh logic duration bi duplicate o UI files

### Ket qua mong muon

- Preview
- Timeline
- Export

co cung mot logic boundary ro rang.

---

## Phase 7 - Dat lifecycle cleanup ro cho imported media

### Muc tieu

Tranh leak `objectURL` theo session dai.

### File chinh lien quan

- `src/features/editor/lib/media-assets.ts`
- store/actions asset delete neu co

### Viec can lam

1. Quyet dinh object URL se duoc cleanup khi nao
2. Ghi ro lifecycle do vao code/note
3. Neu can:
   - them helper dispose asset

### Ket qua mong muon

Import media co lifecycle ro rang, khong chi co create path.

---

## Phase 8 - Cleanup type/model drift

### Muc tieu

Giam khoang cach giua type layer va implementation that.

### File chinh lien quan

- `src/features/editor/types/projects.ts`
- `src/features/editor/types/interaction.ts`
- `src/features/editor/types/preview.ts`
- `src/features/editor/types/timeline.ts`

### Viec can lam

1. Danh dau field/type nao dang active that
2. Field/type nao la future-ready nhung van dung huong thi giu
3. Field/type nao da lech huong thi:
   - doi ten
   - chuyen cho
   - hoac bo

### Ket qua mong muon

Nguoi moi doc code phan biet de hon:

- cai dang chay that
- cai la du tru cho feature sau

---

## Phase 9 - Sau cung moi dau tu vao shell UI chua hoan chinh

### File chinh lien quan

- `src/features/editor/components/editor-toolbar.tsx`
- `src/features/editor/components/inspector/*`

### Ly do dat sau cung

Day khong phai diem nong cua:

- perf
- sync
- math
- playback
- upload core

Nen neu cleanup som hon timeline/preview core thi khong toi uu.

---

## Nguyen tac khi thuc hien refactor

1. Mỗi phase chi dong vao mot concern chinh
2. Sau moi phase, verify lai:
   - playhead
   - ruler seek
   - preview sync
   - text editing
   - drag/drop
3. Khong refactor rong + them feature trong cung mot dot
4. Uu tien tach helper/hook truoc, tranh doi behavior som

---

## Thu tu neu chi duoc lam 3 viec

Neu chi co thoi gian lam 3 viec cleanup co gia tri nhat, toi de xuat:

1. Chot mot he timeline math/zoom duy nhat
2. Giam complexity cua `timeline/index.tsx`
3. Giam complexity cua `timeline-playhead-viewport-layer.tsx`

Day la 3 viec co kha nang giam risk tong the cao nhat cho editor hien tai.

---

# Glossary / Terminology

Phan nay chot nghia cac tu de gap lai trong code va note.
Muc tieu la tranh nham lan cung mot tu nhung dang chi 2 y khac nhau.

## 1. Project duration

Thuong dang chi:

- `project.video.durationInFrames`

Day la duration nam trong project model.

Can note:

- no khong nhat thiet luc nao cung bang end boundary that cua clips

---

## 2. Playback duration

Thuong dang chi:

- `getEditorPlaybackDurationInFrames(project)`

Day la duration ma editor UI dung de:

- seek
- hien duration
- xac dinh end boundary

No duoc tinh theo content that tren timeline, khong chi theo asset length.

---

## 3. Remotion Player duration

Thuong dang chi:

- `getRemotionPlayerDurationInFrames(playbackDurationInFrames)`

Day la duration dua vao `Player`.

Can note:

- Remotion Player can duration >= 1
- editor UI co the co duration = 0

---

## 4. End boundary

Day la diem cuoi ma UI editor coi la "het project".

Can note:

- UI playhead co the dung o end boundary
- Remotion render frame that thuong chi toi `duration - 1`

Day la ly do codebase phai phan biet UI boundary va last renderable frame.

---

## 5. Last renderable frame

Day la frame cuoi ma Remotion Player/composition co the render that.

Neu duration la `N`, thi last renderable frame thuong la:

- `N - 1`

Khong nen nham no voi end boundary cua UI.

---

## 6. Visible duration

Thuong dang chi:

- `visibleDurationInFrames`

Day la do dai Timeline can hien thi de:

- du tick
- co tail padding
- scroll/ruler dep

Can note:

- visible duration co the lon hon playback duration

---

## 7. Timeline width

Day la do rong content ngang cua Timeline.

No quyet dinh:

- scroll range
- ruler width
- clip x/width mapping

Can note:

- width nay phai di cung cung he math voi `pixelsPerFrame`

---

## 8. Pixels per frame

Thuong dang chi:

- `pixelsPerFrame`

Day la he so map:

- frame -> x
- frames -> width

Day la mot trong nhung gia tri nhay cam nhat cua Timeline.

---

## 9. Gutter

Thuong dang chi:

- `TIMELINE_GUTTER_X`

Day la khoang dem ngang cua timeline content.

Can note:

- `frameToPx` co cong gutter
- `framesToPx` khong cong gutter
- body/ruler/playhead khong nen moi noi tu them gutter lan nua

---

## 10. Lane

Day la mot dong trong Timeline stack.

Lane co:

- `top`
- `laneHeight`
- `itemInsetY`
- `itemHeight`

Can note:

- lane la khung chua clip
- lane height hien tai theo item cao nhat trong lane

---

## 11. Track

Day la entity trong project model.

Track co:

- `id`
- `kind`
- `index`
- `height`
- lock/mute/hide state

Can note:

- UI lane va track lien quan chat,
  nhung khong phai luc nao cung 1-1 ve visual semantics

---

## 12. Clip

Day la entity content tren timeline.

Clip co:

- timing
- type
- layerIndex
- transform
- lock/hide

Clip la don vi render chinh trong Preview va Timeline.

---

## 13. Layer / layerIndex

`layerIndex` la thu tu stack cua clip.

Can note:

- clip tren lane/layer cao hon se che clip duoi trong Preview
- timeline item binh thuong cung ton trong `layerIndex` cho z-index
- dang drag thi item co the duoc day len z-index rat cao tam thoi

---

## 14. Playhead primitive

Thuong dang chi:

- `playhead.tsx`

Day la component visual/pointer primitive.

No khong nen bi nham la noi lo:

- scroll sync
- preview sync
- auto-scroll

Nhung viec do thuoc playhead controller layer.

---

## 15. Playhead controller layer

Thuong dang chi:

- `timeline-playhead-viewport-layer.tsx`

Day la noi lo:

- scrub
- preview fast seek
- store sync throttle
- auto-scroll
- viewport-space position

---

## 16. Preview fast seek path

Thuong dang chi:

- `dispatchPreviewSeekFrame(...)`
- event `editor:preview-seek-frame`

Day la duong imperative phu de Preview cap nhat nhanh khi scrub.

Can note:

- day khong phai source of truth moi
- source of truth van la store

---

## 17. Store sync path

Day la duong sync chinh thuc qua Zustand store.

Can note:

- no on dinh hon
- nhung co the cham hon fast event path

Editor hien tai dang dung ca 2:

- event path cho latency
- store path cho state truth

---

## 18. Preview render layer

Thuong dang chi:

- Remotion `Player`
- `EditorPreviewComposition`

Day la noi render that cua frame/media/text/effects.

Khong nen nham voi overlay interaction HTML.

---

## 19. Preview overlay layer

Thuong dang chi:

- `PreviewTextOverlay`

Day la HTML overlay tren Player de:

- select
- edit
- move
- resize

Khong phai la source render that cua composition.

---

## 20. Display mode vs edit mode cua Text

Display mode:

- text duoc chon/move/resize nhu object

Edit mode:

- text vao `contentEditable` de go chu

Can note:

- hai mode nay hien tai da duoc tach DOM rieng
- day la dieu can giu de tranh bug `removeChild`

---

## 21. Placeholder visual cue

Thuong dang chi cac visual trong Timeline item nhu:

- waveform line gia lap
- strip cot nho cho video/image

Can note:

- day khong phai waveform/thumbnail that
- day la visual cue de doc timeline nhanh hon

---

## 22. Placeholder UI

Thuong dang chi cac component/nut da co cho trong layout nhung chua co feature that,
vi du:

- mot so button trong `editor-toolbar.tsx`
- `inspector/index.tsx`
- `inspector-section.tsx`

Can phan biet ro:

- placeholder UI khac voi bug
- no chi la phan chua duoc implement

---

## 23. Object URL lifecycle

Thuong dang chi URL tao boi:

- `URL.createObjectURL(file)`

Can note:

- editor can URL do de preview/play media
- nhung ve lau dai phai co cleanup lifecycle ro rang

Day la concept quan trong khi lam upload/import media.

---

## 24. Fail-soft

Trong note nay, "fail-soft" thuong dang chi pattern:

- thay vi throw error
- function/component return rong / 0-size / bo qua item loi

Vi du:

- project rong -> duration 0
- invalid layout input -> layout 0-size
- missing track/lane -> bo qua clip row

Day la pattern xuat hien kha nhieu trong editor hien tai.

---

## 25. Placeholder runtime value

Thuong dang chi field co gia tri ban dau de state hop le,
nhung se duoc compute/update lai sau.

Vi du:

- `runtime.timeline.zoom.pixelsPerFrame = 10`

Can tranh nham no voi final computed value that.

---

# Verification Checklist

Phan nay de dung moi khi:

- sua core logic
- refactor
- toi uu perf
- sua bug

Muc tieu la co mot checklist ngan nhung trung diem,
khong de sua mot noi roi vo cho khac.

## 1. Timeline math / zoom checklist

Dung khi sua:

- `timeline-math.ts`
- `timeline-zoom-spec.ts`
- `timeline-zoom-engine.ts`
- cac file goi `pixelsPerFrame` / `timelineWidth`

### Can verify

1. Project rong:
   - timeline van co ruler/ticks hop ly
   - khong tu sinh duration ao

2. Project ngan:
   - zoom 1, 2, 3 thay doi that
   - clip width thay doi dung

3. Project dai:
   - ruler labels van de doc
   - scroll range hop ly

4. `frameToPx` va `framesToPx`:
   - clip start canh dung ruler/playhead
   - width clip khong bi lech do gutter

5. `visibleDurationInFrames`:
   - co tail pad
   - khong cat ruler som

---

## 2. Playhead checklist

Dung khi sua:

- `playhead.tsx`
- `timeline-playhead-viewport-layer.tsx`
- ruler seek logic
- toolbar seek buttons

### Can verify

1. Click ruler:
   - playhead nhay dung frame
   - preview cap nhat ngay

2. Drag playhead:
   - khong lag qua muc
   - preview thay doi theo
   - time display thay doi dung

3. Dang play ma drag playhead:
   - playback dung lai
   - scrub van muot

4. Dang play:
   - playhead khong mat khoi man hinh
   - timeline auto-scroll dung luc

5. Seek ve dau/cuoi bang button:
   - playhead den dung boundary
   - viewport cung ve dau/cuoi

6. Khong de playhead de len:
   - scrollbar
   - track headers

---

## 3. Timeline drag/drop checklist

Dung khi sua:

- `timeline/index.tsx`
- DnD logic
- `moveClip`
- lane insert logic

### Can verify

1. Drag clip trong cung lane:
   - khong overlap
   - neu drop de len clip khac thi clip nhay ra sau dung logic

2. Drag clip len lane tren / xuong lane duoi:
   - drop duoc theo ca 2 chieu
   - preview drop dung vi tri

3. Drag giua 2 lane:
   - hien insert preview
   - tao lane moi chen dung vi tri

4. Drag ra tren cung / duoi cung:
   - tao lane moi tren/dưới dung

5. Move clip ra khoi lane:
   - lane rong bi remove

6. Layer order:
   - lane tren che lane duoi trong Preview
   - drag/drop doi lane xong thi Preview update lai layer dung

---

## 4. Track / lane checklist

Dung khi sua:

- `build-track-lane-layouts.ts`
- track headers
- track controls

### Can verify

1. Lane height:
   - image/audio/text = 35
   - video lane = 71
   - lane co video + item khac => theo video

2. Header height:
   - track header row cao khop lane body

3. Hide track:
   - Preview an
   - Timeline item mo di/phan ung dung

4. Mute track:
   - audio/video respect mute state

5. Xoa clip cuoi cung trong lane:
   - track controls/lane empty khong con "mo coi"

---

## 5. Preview / composition checklist

Dung khi sua:

- `preview/index.tsx`
- `preview-stage.tsx`
- `editor-composition.tsx`
- `playback-duration.ts`

### Can verify

1. Project rong:
   - Preview khong vo
   - play/pause/seek van on dinh

2. Clip dat lech `00:00`:
   - Preview bat dau dung luc
   - Preview khong ket thuc som theo asset length

3. Clip dang o cuoi timeline:
   - duration UI dung
   - Player duration va UI duration khong danh nhau

4. Layering:
   - lane tren de len lane duoi trong Preview

5. Hide/mute:
   - Preview ton trong track state

---

## 6. Text feature checklist

Dung khi sua:

- `preview-text-overlay.tsx`
- text transform / text editing actions

### Can verify

1. Add text:
   - vao edit mode ngay
   - text mac dinh duoc select toan bo

2. Typing:
   - caret khong nhay ve dau
   - text khong bi dao nguoc

3. Display mode:
   - click chon duoc
   - double click moi vao edit mode

4. Click ngoai:
   - bo focus / stop editing

5. Drag move:
   - vi tri thay doi dung

6. Resize 4 goc:
   - x/y/scale thay doi dung huong

7. Seek/hide/xoa khi dang edit:
   - khong crash
   - khong con `removeChild` error

8. Add media / add text tiep khi dang co text:
   - khong vo overlay

---

## 7. Upload / media asset checklist

Dung khi sua:

- `media-assets.ts`
- `editor-toolbar.tsx`
- add media clip flow

### Can verify

1. Upload image:
   - doc duoc width/height
   - tao clip duoc

2. Upload video:
   - doc duoc duration/width/height
   - durationInFrames hop ly

3. Upload audio:
   - doc duoc duration
   - durationInFrames hop ly

4. Upload nhieu file:
   - loading state dung
   - file input duoc reset sau khi xong

5. File MIME khong support:
   - khong crash

6. Error metadata:
   - khong treo loading

---

## 8. Toolbar / top-level UI checklist

Dung khi sua:

- `timeline-toolbar.tsx`
- `editor-toolbar.tsx`

### Can verify

1. Current time va duration display:
   - format dung
   - end boundary dung

2. Play/pause:
   - icon dung state

3. Loop/mute/snap:
   - toggle dung
   - state active hien thi dung

4. Zoom slider:
   - keo co tac dung
   - button +/- dong bo slider

5. Editor toolbar:
   - add text dung
   - import media dung

---

## 9. Perf checklist

Dung khi sua:

- playhead
- preview sync
- scroll sync
- timeline selectors

### Can verify

1. Scroll X:
   - khong giat manh

2. Scroll Y:
   - khong giat manh

3. Dang play:
   - playhead chay deu
   - time display khong nhay lung tung

4. Dang play + scroll:
   - khong treo UI

5. Drag playhead:
   - preview van theo kip

6. Components nong:
   - khong subscribe ca object store qua rong neu khong can

---

## 10. Regression checklist neu sua store/type model

Dung khi sua:

- `editor.store.ts`
- `editor.types.ts`
- `types/*.ts`
- `playback-duration.ts`

### Can verify

1. App boot voi project rong
2. Add text duoc
3. Upload media duoc
4. Timeline van render lane/item
5. Preview van render composition
6. Selection van dong bo Timeline <-> Preview
7. Play/pause/seek van chay

---

## 11. Cach dung checklist nay

Khong can luc nao cung test tat ca 10 nhom.

Nen dung theo rule:

### Sua concern nao -> test concern do + 2 concern lan can

Vi du:

- sua `timeline math`
  - test:
    - timeline math
    - playhead
    - preview/composition

- sua `text overlay`
  - test:
    - text feature
    - preview/composition
    - selection/focus basics

- sua `media import`
  - test:
    - upload/media asset
    - preview/composition
    - timeline item render basics

Day la cach de test co trong tam ma van giam regression.

Thu tu nay hop ly hon viec lao vao Inspector hay toolbar placeholder som.
