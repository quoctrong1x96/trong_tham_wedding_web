# Website thiệp cưới

Nhập thông tin thiệp bằng CSV, xuất HTML bằng PowerShell, chạy server Node.js để lưu xác nhận và tương tác vào file.

## Chạy bản đầy đủ

Cài Node.js 22 trở lên nếu lệnh `node --version` chưa chạy được. Mở lại terminal sau khi cài. Không cần cài package hoặc cơ sở dữ liệu.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1
npm start
```

Mở **http://localhost:3000**. Khi thay đổi CSV, HTML, CSS hoặc JavaScript, chạy lại lệnh build và tải lại trang.

Website vẫn xem được bằng cách mở `dist/index.html`, nhưng gửi lời chúc, xác nhận, bình luận và lượt thích cần truy cập qua server. Bản xem HTML sẽ thông báo rõ nếu chưa kết nối, không báo đã lưu khi chưa gửi thành công.

## Bố cục và chức năng

- Trang chọn thiệp nhà gái / nhà trai.
- Lời mời, ngày giờ, địa điểm, mở bản đồ, đếm ngược và tải lịch.
- QR và liên kết nhóm Zalo, thông tin điểm đón, phiếu xác nhận tham dự và số người đi xe.
- Album xem lớn; thích/bỏ thích ảnh và bình luận từng ảnh.
- Bốn cảm xúc, sổ lời chúc công khai, lựa chọn gửi lời nhắn riêng.
- Bố cục tự co giãn trên điện thoại, thanh truy cập nhanh phía dưới.

Nhóm nhà gái dùng link `6qsuwuaomsnzeyiscsdw`. Link `spnhpr68ysg5heplhna7` được tạm gán cho thiệp nhà trai; sửa `groom_zalo_url` nếu nhóm này có mục đích khác. Vào nhóm Zalo là thao tác của khách trong Zalo, website không tự kiểm tra ai đã tham gia nhóm.

## Cấu trúc

```text
data/wedding.csv          Thông tin tên, ngày giờ, địa điểm, nhóm Zalo
src/pages/               Mẫu HTML của trang chủ và hai thiệp
src/styles/              CSS dùng chung
src/scripts/             JavaScript tương tác
server/index.mjs         Server phục vụ HTML và API lưu dữ liệu
server/storage/          Dữ liệu riêng, tự tạo khi chạy server
public/assets/images/    Ảnh tối ưu dùng trên website
Asset/                   Ảnh gốc và thiệp tham khảo, không đưa lên hosting
scripts/build.ps1        Đọc CSV, kiểm tra dữ liệu, xuất website
scripts/generate-qr.mjs  Xuất ảnh SVG của hai mã QR
scripts/export-data.mjs  Xuất bản sao lưu JSON dễ đọc
tests/server.test.mjs    Kiểm tra API và dữ liệu sau khi khởi động lại
docs/README-original.md  Ghi chú tính năng và nguồn giấy phép ảnh
dist/                    Website hoàn chỉnh để xem hoặc đưa lên hosting
```

## Nhập CSV và xuất trang

1. Mở `data/wedding.csv` trong Excel hoặc trình sửa văn bản. Giữ hai cột `key,value`, mỗi khóa xuất hiện một lần.
2. Sửa cột `value`, lưu dạng CSV UTF-8 phân cách bằng dấu phẩy. Giá trị chứa dấu phẩy phải nằm trong dấu ngoặc kép; dấu ngoặc kép bên trong ghi thành `""`. Excel tự xử lý khi lưu CSV.
3. Tại thư mục dự án, chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1
```

4. Chạy `npm start` rồi mở `http://localhost:3000`. Khi chia sẻ thiệp, dùng đường dẫn `/nha-gai.html` hoặc `/nha-trai.html` trên server.

Có thể dùng CSV khác:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1 -CsvPath data/my-wedding.csv
```

## Các trường CSV

| Khóa | Ý nghĩa / định dạng |
| --- | --- |
| `groom_name`, `bride_name` | Họ tên chú rể, cô dâu |
| `bride_date`, `groom_date` | Ngày tiệc nhà gái, ngày cưới nhà trai, `yyyy-MM-dd` |
| `bride_start`, `bride_end` | Giờ bắt đầu/kết thúc tiệc nhà gái, `HH:mm` |
| `groom_start` | Giờ lễ thành hôn, `HH:mm` |
| `groom_reception`, `groom_end` | Giờ bắt đầu/kết thúc tiệc nhà trai, `HH:mm` |
| `bride_address`, `groom_address` | Địa chỉ tổ chức, đồng bộ nội dung thiệp, bản đồ và lịch |
| `church_address` | Tên và địa chỉ nhà thờ |
| `pickup_one`, `pickup_two` | Hai điểm đón xe |
| `rsvp_email` | Trường tương thích bản cũ; bản mới lưu RSVP trên server |
| `bride_zalo_url`, `groom_zalo_url` | Link nhóm Zalo cho từng thiệp, dạng `https://zalo.me/g/...` |
| `bride_zalo_qr`, `groom_zalo_qr` | Đường dẫn ảnh QR SVG trong `public/`, dùng dự phòng |

Thứ trong tuần và các cách hiển thị ngày được tính từ ngày CSV. Giờ dùng múi giờ Việt Nam UTC+7. Giờ kết thúc dùng cho lịch tải xuống; phải sau giờ bắt đầu trong cùng ngày.

CSV chỉ chứa thông tin thiệp, không phải danh sách khách. Lời mời và ảnh được biên tập trong `src/pages/` và `public/assets/images/`. Hai nhãn địa phương Cần Thơ/Đồng Nai và nhãn năm trong phần trang trí hiện được viết trong HTML, hãy chỉnh khi đổi đám cưới.

QR trên website được tạo ngay tại trình duyệt từ link CSV, không gửi link qua dịch vụ QR bên ngoài. Để xuất lại ảnh QR riêng sau khi đổi link:

```powershell
node scripts/generate-qr.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1
```

Không sửa trực tiếp `dist/`: chạy lại lệnh xuất sẽ cập nhật các tệp được sinh. `src/scripts/app.js` và `docs/README-original.md` giữ lại mã/ghi chú bản cũ để tham khảo; giao diện mới dùng `src/scripts/invitation.js`.

## Lưu file và sao lưu

Mỗi lần gửi thành công, server ghi thêm một dòng JSON vào **`server/storage/interactions.jsonl`** rồi mới trả xác nhận. Dữ liệu không nằm trong thư mục public. Khởi động lại server hoặc build lại HTML không xóa dữ liệu.

Các loại bản ghi: `wish` (lời chúc công khai), `comment` (bình luận ảnh), `reaction` (cảm xúc), `message` (lời nhắn riêng), `rsvp` (xác nhận và nhu cầu đi xe). Public API chỉ trả lời chúc, bình luận và tổng cảm xúc; không trả số điện thoại, lời nhắn riêng, RSVP hoặc mã trình duyệt. Tối đa 200 lời chúc/bình luận gần nhất được tải lên giao diện, toàn bộ lịch sử vẫn nằm trong file.

Mỗi trình duyệt có mã ẩn danh lưu trong localStorage. Tim và cảm xúc bật/tắt theo trình duyệt; đây không phải hệ thống đăng nhập hay xác minh danh tính. Cùng ảnh trên thiệp nhà trai/nhà gái có bộ tương tác riêng. RSVP gửi lại được giữ trong lịch sử; bản xuất lấy bản mới nhất theo mã trình duyệt và thiệp.

Xuất bản sao lưu có định dạng dễ đọc (chọn tên file mới mỗi lần):

```powershell
node scripts/export-data.mjs wedding-backup-01.json
```

File xuất chứa cả thông tin riêng của khách. Giữ file này và thư mục `server/storage/` trên server hoặc máy của gia đình, không đưa vào `dist/` hay kho mã công khai. Có thể sao lưu nguyên thư mục storage để chuyển server; nên dừng server trong lúc sao chép để có bản nhất quán.

## Host HTML hay chạy server?

| Cách host | Chức năng |
| --- | --- |
| Chỉ host nội dung `dist/` | Xem thiệp, bản đồ, QR Zalo, tải lịch. Không ghi tương tác chung. |
| Node.js phục vụ `dist/` và `/api/` | Đầy đủ lời chúc, cảm xúc, bình luận, lời nhắn riêng và xác nhận lưu file. |

Để có đầy đủ chức năng, đưa `dist/`, `server/`, `package.json` lên hosting hỗ trợ Node.js hoặc VPS. Không đưa ảnh gốc `Asset/` lên. Chạy **một tiến trình** `node server/index.mjs`; không dùng nhiều worker/replica cùng ghi file. File lưu cần ổ đĩa bền vững; hosting tự xóa filesystem sau deploy phải gắn persistent volume.

Mặc định server nghe `127.0.0.1:3000`. Đặt reverse proxy HTTPS trước server khi dùng tên miền. Hosting container có thể yêu cầu `HOST=0.0.0.0`, `PORT` do nhà cung cấp cấp. Đặt `STORAGE_DIR` thành đường dẫn tuyệt đối ngoài `dist/` để giữ dữ liệu qua mỗi lần triển khai. Không cấu hình thư mục gốc dự án hoặc storage thành thư mục phục vụ tệp công khai.

Hosting chỉ hỗ trợ HTML không thể tự ghi file chung bằng JavaScript trình duyệt. Nếu muốn giữ hosting tĩnh, cần thêm API riêng và cấu hình kết nối; bản hiện tại phục vụ cả hai cùng một nguồn bằng Node.js.

## Kiểm tra

```powershell
npm test
```

Kiểm tra lưu dữ liệu sau restart, ghi đồng thời, thích/bỏ thích, tách dữ liệu riêng/công khai, dữ liệu đầu vào, yêu cầu khác nguồn và đường dẫn tệp. Dữ liệu kiểm tra được tạo trong thư mục tạm, không ghi vào sổ cưới thật.

Thư viện QR: [qrcode-generator của Kazuhiko Arase](https://github.com/kazuhikoarase/qrcode-generator), MIT; giấy phép giữ trong `scripts/vendor/LICENSE-qrcode.txt`. Ảnh có sẵn và giấy phép ảnh quê hương được ghi trong `docs/README-original.md`.
