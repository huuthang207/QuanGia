# QuanGia - Discord Bot Hỗ Trợ Điểm Danh Bang Hội

Bot Discord (discord.js gateway) dùng để **điểm danh tham gia Bang Chiến** trong 1 server duy nhất.  
Admin mở/đóng đợt điểm danh, thành viên bấm tham gia/không tham gia. Bot lưu dữ liệu vào JSON và tự render danh sách công khai theo **môn phái**.

## Tính năng

- **Mở/đóng điểm danh Bang Chiến** theo từng đợt:
  - `/diemdanhbangchien open` (kèm text tùy chỉnh)
  - `/diemdanhbangchien close`
  - `/diemdanhbangchien refresh` (render lại message từ dữ liệu hiện tại)
- **Vote GO / NOGO** bằng button trong kênh cố định.
- **Link nhân vật lần đầu**:
  - Nhập `Ingame Name` (Modal)
  - Chọn **môn phái** (Select menu)
  - Tự động ghi nhận vote vừa bấm
- **Không cho phép trùng Ingame Name**.
- **Danh sách công khai**:
  - Hiển thị tổng số vote
  - Hiển thị danh sách **Tham gia (GO)** và **Không tham gia (NOGO)**
  - Nhóm theo phái dạng: `Thiết Y (5)`, rồi liệt kê 5 người
  - Sắp xếp theo **thời gian vote**
- **Chặn người INACTIVE** không được điểm danh.
- **Cập nhật nhân vật** (cho Bang Viên):
  - `/capnhatnhanvat` (modal nhập lại ingame name + các bước chọn phái tùy theo implementation)
- Tự đồng bộ `ACTIVE/INACTIVE` dựa trên việc có/không có role **Bang Viên** (qua `guildMemberUpdate`).

## Yêu cầu

- Node.js 18+ (khuyến nghị)
- Discord bot đã tạo trên Discord Developer Portal
- Bot được invite vào server với scope:
  - `bot`
  - `applications.commands`

## Cài đặt

```bash
npm install
```
