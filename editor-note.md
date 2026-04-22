Rất tốt, bộ types này đã đủ “xương sống” rồi. Tôi sẽ bám đúng bộ này từ đây, không tạo thêm model song song nếu không thật sự cần.

Tôi chia làm 2 phần:

1. Những gì tôi đã ghi nhớ và sẽ coi là luật nền
2. Những component/file trước đó đang **chưa sync đúng** với types của Editor

---

# 1. Những luật nền tôi chốt theo bộ types của bạn

## A. Source of truth

`EditorState` là root state:

```ts
type EditorState = {
    project: EditorProject;
    runtime: EditorRuntimeState;
};
```

Tức là từ đây về sau:

- **project** chứa dữ liệu thật
- **runtime** chứa trạng thái tương tác / hiển thị

---

## B. Những gì thuộc `project`

```ts
project.video;
project.trackGroups;
project.tracks;
project.clips;
```

Tức là:

- timeline phải render track từ `project.tracks`
- item/clip phải render từ `project.clips`
- không nên tự nghĩ ra `items[]` độc lập lâu dài nữa

---

## C. Những gì thuộc `runtime`

```ts
runtime.player;
runtime.preview;
runtime.timeline;
runtime.selection;
runtime.interaction;
runtime.textEditing;
```

Tức là:

- playhead lấy từ `runtime.player.currentFrame`
- zoom lấy từ `runtime.timeline.zoom`
- viewport lấy từ `runtime.timeline.viewport`
- selection lấy từ `runtime.selection`
- drag/resize lấy từ `runtime.interaction`

---

## D. Time model

Bạn đã chốt rất đúng:

- `Frame`
- `Frames`
- `Pixels`

Nên từ đây:

- clip source data dùng `from`, `durationInFrames`
- pixel chỉ là layout output
- `pixelsPerFrame` nằm trong `TimelineZoomState`

Đây là cực kỳ quan trọng.

---

## E. Clip model

Bạn đã có:

```ts
export type TimelineClip =
    | TextClip
    | VideoClip
    | AudioClip
    | ImageClip
    | ShapeClip;
```

Tức là từ đây về sau `TimelineItem` không nên dựa vào một `TimelineItemData` tự chế nữa, mà nên dựa trực tiếp hoặc gián tiếp vào `TimelineClip`.

---

# 2. Những chỗ trước đó đang chưa sync đúng với Editor types

Đây là phần quan trọng nhất.

---

## Chỗ lệch 1: `build-item-layouts.ts` đang dùng `TimelineItemData`

Trước đó tôi đã đề xuất kiểu:

```ts
type TimelineItemData = {
    id: string;
    trackId: string;
    label: string;
    left: number;
    width: number;
    background?: string;
    src?: string;
};
```

### Chỗ này hiện tại **không còn phù hợp**

Vì trong bộ types thật của bạn đã có:

```ts
TimelineClipBase {
  id
  trackId
  from
  durationInFrames
  label
  color
}
```

Nên `TimelineItemData` là dư thừa.

### Phải sửa thành gì?

`build-item-layouts` nên nhận:

```ts
clips: TimelineClip[]
tracks: TimelineTrack[]
trackLaneLayouts: TimelineTrackLaneLayout[]
pixelsPerFrame: number
```

và build thẳng từ `TimelineClip`.

---

## Chỗ lệch 2: item source đang dùng `left/width` thay vì `from/durationInFrames`

Trước đó các demo item dùng:

```ts
left;
width;
```

### Cái này chỉ ổn cho prototype UI

Nhưng với types thật của bạn, source đúng phải là:

```ts
clip.from;
clip.durationInFrames;
```

Rồi derive:

```ts
left = frameToPx(clip.from);
width = framesToPx(clip.durationInFrames);
```

Nên toàn bộ chỗ nào đang khởi tạo item theo `left/width` thì cần thay dần.

---

## Chỗ lệch 3: `TimelineItem` props chưa bám `TimelineClip`

Bản `TimelineItem` trước đó đang nhận:

- `kind`
- `label`
- `background`
- `src`
- `isMuted`
- ...

Điều này không sai hẳn, nhưng vẫn là props “phẳng” tự chế.

### Hướng đúng hơn

`TimelineItem` nên nhận một `clipLayout` hoặc ít nhất nhận props được build từ `TimelineClip`.

Ví dụ:

```ts
type TimelineClipLayout = {
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

Rồi `TimelineItem` render từ đó.

Như vậy nó sẽ đồng bộ hơn với types hiện tại.

---

## Chỗ lệch 4: `build-track-lane-layouts.ts` chưa dùng hết `TimelineTrack`

Hiện tại nó mới dùng:

- `track.id`
- `track.kind`
- `track.index`
- `track.height`

Điều đó ổn cho layout, nhưng về sau nó cũng nên cho phép lane layout mang theo track state để tiện render.

Ví dụ lane layout có thể giữ thêm:

- `isLocked`
- `isMuted`
- `isHidden`

Không bắt buộc ngay, nhưng hữu ích.

---

## Chỗ lệch 5: `TimelineTrackHeaders` đang nhận `tracks` + `lanes` riêng

Điều này **vẫn chấp nhận được**, nhưng nếu muốn sạch hơn nữa, nó nên nhận:

- `tracks`
- `trackLaneLayouts`
- có thể thêm `selection`

Để sau này:

- row selected
- track selected
- lock/mute/hide state

đều bám đúng vào `runtime.selection` và `project.tracks`.

---

## Chỗ lệch 6: `TimelineRuler` chưa dùng `runtime.timeline.zoom.pixelsPerFrame`

Bạn đã có type rất rõ:

```ts
export type TimelineZoomState = {
    zoomLevel: number;
    minZoomLevel: number;
    maxZoomLevel: number;
    pixelsPerFrame: number;
};
```

Điều này cực tốt.

### Nghĩa là từ đây:

Ruler không nên tự bịa `191.9`, `width` hay logic song song nữa.

Nó nên dùng:

- `runtime.timeline.zoom.pixelsPerFrame`
- `project.video.fps`
- `project.video.durationInFrames`

để render markers.

Tức là `pixelsPerFrame` đã là state runtime chính thức rồi.

---

## Chỗ lệch 7: `Playhead` cũng phải dùng `pixelsPerFrame`

Tương tự ruler, `Playhead` nên dùng:

- `runtime.player.currentFrame`
- `runtime.timeline.zoom.pixelsPerFrame`

để tính:

```ts
left = gutterX + currentFrame * pixelsPerFrame;
```

Không nên có công thức zoom riêng trong component playhead.

---

## Chỗ lệch 8: `TimelineBody` width hiện đang truyền cứng

Bạn đang có:

```tsx
<TimelineBody width={1949} ... />
```

Đây là ổn cho giai đoạn dựng UI, nhưng theo types hiện tại thì về lâu dài:

- width nên derive từ `project.video.durationInFrames`
- và `runtime.timeline.zoom.pixelsPerFrame`

Ví dụ:

```ts
timelineBodyWidth =
    project.video.durationInFrames * runtime.timeline.zoom.pixelsPerFrame +
    gutterX * 2;
```

Nghĩa là width body cũng phải sync với frame/zoom.

---

## Chỗ lệch 9: `SelectionState` chưa được dùng trong các component timeline

Bạn đã có:

```ts
type SelectionState = {
    selectedClipIds: ClipId[];
    selectedTrackId: TrackId | null;
    selectedGroupId: TrackGroupId | null;
};
```

Nhưng các component trước đó chưa dùng nó.

### Sau này cần sync:

- `TimelineItem` biết selected hay không qua `selectedClipIds`
- `TimelineTrackHeaderRow` biết selected hay không qua `selectedTrackId`

---

## Chỗ lệch 10: `TimelineInteractionState` chưa được gắn vào item/playhead

Bạn đã có types rất tốt cho:

- `drag-playhead`
- `move-clip`
- `resize-clip`

Nên sau này:

- `Playhead` sẽ dùng `DragPlayheadInteraction`
- `TimelineItemResizeHandle` sẽ dùng `ResizeClipInteraction`
- item move sẽ dùng `MoveClipInteraction`

Tức là interaction layer đã có sẵn type rất ổn, chỉ là UI hiện tại chưa nối vào thôi.

---

# 3. Tôi khuyên refactor tên/shape nào để bám hoàn toàn types hiện tại?

Tôi khuyên chốt các helper/layout types phụ trợ như sau.

---

## A. Giữ `TimelineTrackLaneLayout`

Cái này vẫn hợp lý, vì nó là **layout output**, không đụng vào domain model.

```ts
type TimelineTrackLaneLayout = {
    trackId: TrackId;
    top: Pixels;
    laneHeight: Pixels;
    itemInsetY: Pixels;
    itemHeight: Pixels;
    resizeHandleWidth: Pixels;
};
```

Nó không xung đột với Editor types.

---

## B. Thay `TimelineItemData` bằng `TimelineClipLayout`

Không dùng `TimelineItemData` nữa.

Nên chuyển thành:

```ts
type TimelineClipLayout = {
    clipId: ClipId;
    trackId: TrackId;
    left: Pixels;
    top: Pixels;
    width: Pixels;
    height: Pixels;
    resizeHandleWidth: Pixels;
};
```

Hoặc tốt hơn:

```ts
type TimelineClipLayout = {
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

Đây là output layout, không phải source data mới.

---

## C. `build-item-layouts` nên đổi thành `build-clip-layouts`

Tên này sẽ đúng hơn nhiều.

Vì source thật là `project.clips`, không phải `items`.

---

# 4. Các component nào đang chưa dùng đúng Editor types?

Tôi chốt ngắn gọn:

## Chưa sync đúng hoàn toàn

- `TimelineRuler`
- `Playhead`
- `TimelineItem`
- `build-item-layouts` (nên đổi thành `build-clip-layouts`)
- `TimelineBody width`
- mọi mock `items` đang dùng `left/width`

## Tạm ổn / gần đúng

- `build-track-lane-layouts`
- `TimelineTrackHeaders`
- `TimelineLaneBackgrounds`
- `TimelineItemsLayer`

---

# 5. Direction chuẩn từ đây

Từ đây về sau, ta nên theo rule:

## Source data

- `project.tracks`
- `project.clips`
- `project.video`

## Runtime data

- `runtime.player`
- `runtime.timeline`
- `runtime.selection`
- `runtime.interaction`

## Layout helpers

- `buildTrackLaneLayouts(project.tracks)`
- `buildClipLayouts(project.clips, project.tracks, laneLayouts, runtime.timeline.zoom.pixelsPerFrame)`

## Render

- `TimelineTrackHeaders`
- `TimelineLaneBackgrounds`
- `TimelineItem`
- `Playhead`
- `TimelineRuler`

---

# 6. Kết luận

Tôi đã ghi nhớ bộ types này là bộ chuẩn để đi xuyên suốt.

Và câu trả lời trực tiếp cho bạn là:

> Có, một số component/helper trước đó **chưa dùng đúng hoàn toàn** types của Editor.

Những chỗ cần sửa nhất là:

- bỏ `TimelineItemData`
- bỏ source `left/width`
- dùng `project.clips`
- dùng `runtime.timeline.zoom.pixelsPerFrame`
- đổi `build-item-layouts` thành helper build từ `TimelineClip`

---

Lượt tiếp theo, tôi nên làm việc rất cụ thể cho bạn:
**liệt kê danh sách file nào cần refactor để sync 100% với bộ Editor types này, và viết lại đúng các type signature mới cho từng file**.
