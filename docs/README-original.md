# Thiệp cưới online

Website thiệp cưới tĩnh, không cần cài đặt thư viện hay chạy máy chủ. Mở `index.html` để chọn một trong hai thiệp mời riêng:

- `nha-gai.html`: tiệc nhà gái, ngày 06.12.2026.
- `nha-trai.html`: lễ thành hôn và tiệc nhà trai, ngày 13.12.2026.

Tên đầy đủ hiển thị trên cả hai thiệp: Bùi Quốc Trọng và Nguyễn Thị Phương Hồng Thắm.

## Cá nhân hóa trước khi đăng

- Thông tin tên, ngày, giờ và địa chỉ được lấy từ thiệp mời nhà gái và nhà trai trong `Asset/Invitation`.
- Ảnh album trong `images/pre-wedding` được chọn từ `Asset/pre-wedding`, xoay theo chiều ảnh gốc và nén để tải nhanh hơn.
- Trong `app.js`, chỉnh `mapUrls` nếu muốn ghim các điểm đón hoặc địa điểm tổ chức chính xác hơn. Nếu muốn nhận RSVP bằng email, hãy điền địa chỉ nhận vào `rsvpEmail`.
- Nghi thức tại nhà thờ nhà gái không có giờ trên thiệp, nên trang không tự thêm giờ.
- Xe 30–50 chỗ và hai điểm đón chỉ được ghi trên thiệp nhà gái ngày 06.12.2026. Gia đình chưa cung cấp giờ đón; giờ đón sẽ được xác nhận sau.
- Khu vực “Thêm ảnh xem trước” chỉ hiển thị ảnh được chọn trên trình duyệt hiện tại; ảnh không tự tải lên hosting hoặc chia sẻ với khách.
- Nút thả tim và số lượt tim chỉ chạy trong phiên truy cập hiện tại; không được gom vào bộ đếm chung.
- Lời chúc và gợi ý bài hát có thể gửi qua bảng chia sẻ của điện thoại hoặc sao chép để gửi bằng ứng dụng nhắn tin. Website hiện không lưu, nhận hoặc hiển thị lời chúc của khách cho người khác.
- RSVP mở ứng dụng email của khách để gửi câu trả lời; điền email nhận thư vào `rsvpEmail` trong `app.js`. Nếu cần lưu RSVP, lời chúc, gợi ý nhạc hoặc tổng lượt tim tập trung, cần kết nối thêm dịch vụ lưu trữ/backend.
- Timeline ghi lại lịch trình ngày cưới; giờ nghi thức nhà thờ và giờ xe đón được để nguyên trạng “chưa có giờ” thay vì tự suy đoán.

## Ảnh quê hương và giấy phép

- Ảnh Chợ nổi Cái Răng: Vyacheslav Argenberg, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Can_Tho,_Vietnam,_Floating_Market,_Boats_2.jpg), CC BY 4.0.
- Ảnh Thác Giang Điền: Chuhien, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ThacGiangDien_TrangBom.jpg), CC BY-SA 3.0.
- Hai ảnh trong `images/hometown` đã được thu nhỏ/chuyển mã JPEG để dùng trên website; giữ tên tác giả, liên kết nguồn và giấy phép khi tái sử dụng.

## Đưa lên hosting

Tải `index.html`, `nha-gai.html`, `nha-trai.html`, `styles.css`, `app.js` và các thư mục `images/pre-wedding`, `images/hometown` lên dịch vụ hosting trang tĩnh (ví dụ GitHub Pages, Netlify hoặc Cloudflare Pages). Khi chia sẻ thiệp, gửi riêng đường dẫn `.../nha-gai.html` hoặc `.../nha-trai.html`. Không cần build; không cần tải thư mục `Asset/pre-wedding` ảnh gốc dung lượng lớn lên hosting.