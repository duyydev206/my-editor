Dưới đây là nội dung Roadmap của bạn đã được chuyển đổi sang định dạng Markdown (`.md`) với cấu trúc rõ ràng, chuyên nghiệp, sẵn sàng để đưa vào tài liệu dự án hoặc các công cụ quản lý như GitHub/Notion.

---

# 🚀 Roadmap Tổng Thể: Demo Studio

Lộ trình phát triển hệ thống Editor chuyên nghiệp, tập trung vào tính ổn định của dữ liệu và trải nghiệm người dùng (UX).

---

## Giai đoạn 1: Nền móng dữ liệu và Render

**Mục tiêu:** Đảm bảo mọi thành phần cùng đọc và đồng bộ từ một nguồn Single Source of Truth (SSOT).

- [ ] Chuẩn hóa `EditorState` trong Store (Redux/Zustand).
- [ ] Sử dụng `EditorProject` thực tế cho Timeline, Preview và Player.
- [ ] Hoàn thiện Zoom Engine + Ruler Engine.
- [ ] Hoàn thiện Clip Layout Engine và Lane Layout Engine (quản lý track).
- [ ] Đồng bộ các thông số: `timelineWidth`, `pixelsPerFrame`, `tickFrames`, `visibleDurationInFrames`.

**🎯 Kết quả:** Timeline render ổn định, Zoom không bị vỡ giao diện, Ruler/Playhead/Clip hoạt động cùng một hệ quy chiếu.

---

## Giai đoạn 2: Selection và Basic UX

**Mục tiêu:** Mang lại "cảm giác sống" cho trình chỉnh sửa.

- [ ] Tính năng chọn Clip (Select Clip).
- [ ] Tính năng chọn Track.
- [ ] Xử lý bỏ chọn (Deselect) khi click vào vùng trống.
- [ ] Hiệu ứng Highlight cho Clip/Track đang được chọn.
- [ ] Kết nối Selection với Inspector để hiển thị thuộc tính.

**🎯 Kết quả:** Người dùng biết mình đang thao tác trên đối tượng nào; Inspector hiển thị đúng ngữ cảnh.

---

## Giai đoạn 3: Playhead và Seek

**Mục tiêu:** Đồng bộ hóa thời gian thực giữa Timeline và Player.

- [ ] Click vào Ruler để nhảy đến vị trí thời gian (Seek).
- [ ] Kéo thả Playhead (Drag Playhead).
- [ ] Playhead đồng bộ chính xác với `currentFrame`.
- [ ] Player (Play/Pause/Seek) gửi tín hiệu ngược lại cho Timeline.
- [ ] Hiển thị thời gian hiện tại (Current Time Display) chính xác.

**🎯 Kết quả:** Timeline và Player "nói cùng một ngôn ngữ" về thời gian.

---

## Giai đoạn 4: Clip Interactions cơ bản

**Mục tiêu:** Clip có thể chỉnh sửa trực tiếp thông qua thao tác chuột.

- [ ] Kéo thả Clip theo trục X (Thay đổi thời gian bắt đầu).
- [ ] Resize điểm đầu (Start) và điểm cuối (End) của Clip.
- [ ] Di chuyển Clip giữa các Track khác nhau.
- [ ] Cập nhật State thực tế vào Store sau khi thao tác.
- [ ] Tính toán lại tổng độ dài Project khi Clip thay đổi.

**🎯 Kết quả:** Clip không còn là khối tĩnh; Timeline bắt đầu hoạt động như một Editor thực thụ.

---

## Giai đoạn 5: Snap System

**Mục tiêu:** Thao tác chính xác cao và tạo cảm giác "đã tay".

- [ ] Hít (Snap) vào Playhead.
- [ ] Snap vào điểm đầu/cuối của các Clip khác.
- [ ] Snap vào các vạch thước (Ruler marks).
- [ ] Hiển thị đường kẻ hướng dẫn (Snap Guide) khi hít.
- [ ] Cấu hình khoảng cách nhạy (Threshold Snap).

**🎯 Kết quả:** Thao tác kéo/resize mượt mà và chính xác; nâng tầm UX chuyên nghiệp.

---

## Giai đoạn 6: Toolbar Actions

**Mục tiêu:** Biến các nút bấm trên Toolbar thành chức năng thật.

- [ ] Nút Zoom In / Zoom Out.
- [ ] Bật/Tắt chế độ Snap.
- [ ] Chế độ lặp lại (Loop).
- [ ] Tắt tiếng Preview (Mute).
- [ ] Công cụ cắt Clip (Split Clip).
- [ ] Xóa Clip (Delete).

**🎯 Kết quả:** Người dùng có thể điều khiển trình chỉnh sửa qua các công cụ hỗ trợ.

---

## Giai đoạn 7: Text Editing

**Mục tiêu:** Cho phép chỉnh sửa nội dung văn bản trực quan.

- [ ] Double click vào Text Clip để bắt đầu sửa.
- [ ] Hiển thị Input Overlay ngay trên màn hình Preview.
- [ ] Cơ chế Commit (Lưu) hoặc Cancel khi sửa xong.
- [ ] Đồng bộ nội dung Text tức thời với Preview.
- [ ] Kết nối Inspector để điều chỉnh Style (Font, màu sắc, cỡ chữ).

**🎯 Kết quả:** Text Clip có khả năng tương tác đầy đủ.

---

## Giai đoạn 8: Media Visualization

**Mục tiêu:** Trực quan hóa dữ liệu trên Timeline.

- [ ] Hiển thị dạng sóng âm thanh (Audio Waveform).
- [ ] Hiển thị hình ảnh thu nhỏ (Video Thumbnails).
- [ ] Dải xem trước hình ảnh (Image preview strip).
- [ ] Tùy biến màu sắc/icon Clip dựa theo định dạng tệp.

**🎯 Kết quả:** Timeline nhìn chuyên nghiệp và dễ dàng phân biệt các loại media.

---

## Giai đoạn 9: Advanced Editor Actions

**Mục tiêu:** Tối ưu hóa luồng công việc (Workflow).

- [ ] Nhân bản Clip (Duplicate).
- [ ] Copy / Paste.
- [ ] Chọn nhiều đối tượng cùng lúc (Multi-select).
- [ ] Hệ thống phím tắt (Keyboard Shortcuts).
- [ ] Tính năng Hoàn tác / Làm lại (Undo / Redo).

**🎯 Kết quả:** Editor có khả năng sử dụng thực tế cho các dự án phức tạp.

---

## Giai đoạn 10: Performance và Polish

**Mục tiêu:** Tối ưu hiệu năng và tinh chỉnh chi tiết.

- [ ] Áp dụng Memoization / Selectors để tối ưu Store.
- [ ] Ảo hóa Timeline (Virtualization) cho các Project dài.
- [ ] Tự động cuộn (Auto scroll) khi kéo Clip sát mép màn hình.
- [ ] Playhead tự động chạy theo màn hình khi đang Play.
- [ ] Tinh chỉnh hiệu ứng chuyển động nhỏ và phản hồi người dùng.

**🎯 Kết quả:** Editor ổn định, mượt mà và dễ bảo trì.

---

## 📌 Thứ tự ưu tiên khuyến nghị

Để đảm bảo dự án phát triển bền vững, nên đi theo thứ tự sau:

1.  **Nền móng:** Dữ liệu + Zoom/Ruler chuẩn.
2.  **Tương tác cơ bản:** Selection $\rightarrow$ Playhead & Seek.
3.  **Thao tác Clip:** Drag Clip $\rightarrow$ Resize Clip $\rightarrow$ Snap.
4.  **Tính năng phụ trợ:** Toolbar $\rightarrow$ Text Editing.
5.  **Hoàn thiện:** Media Visuals $\rightarrow$ Advanced Actions $\rightarrow$ Performance.
