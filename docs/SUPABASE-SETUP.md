# Kết nối sổ xác nhận và lời chúc

Website tiếp tục chạy trên GitHub Pages. Supabase lưu câu trả lời và lời chúc qua HTTPS, không cần chạy server Node.js trên GitHub. Bạn không cần bật đăng nhập cho khách.

## Tạo và kết nối

1. Đăng nhập [Supabase](https://supabase.com/dashboard), chọn New project, gói Free và khu vực gần Việt Nam. Tự đặt mật khẩu database; giữ mật khẩu riêng, không gửi vào chat và không đưa lên GitHub.
2. Mở SQL Editor → New query, dán toàn bộ nội dung `database/supabase.sql` rồi Run. Script tạo hai bảng và quyền truy cập; không chứa dữ liệu khách.
3. Trong phần Connect hoặc Project Settings → API/Data API, lấy **Project URL** dạng `https://xxxxx.supabase.co`. Trong API Keys lấy **Publishable key** dạng `sb_publishable_...`. Legacy `anon` key cũng được hỗ trợ. Không dùng `service_role`, `sb_secret_...`, mật khẩu hay chuỗi kết nối database.
4. Sửa `src/scripts/site-config.js`:

   ```js
   window.WEDDING_CONFIG = Object.freeze({
     supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
     supabasePublishableKey: 'sb_publishable_YOUR_PUBLIC_KEY',
   });
   ```

5. Chạy lại `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1`, cập nhật mã nguồn lên nhánh `master`. GitHub Actions tự dựng và triển khai.
6. Thử từ điện thoại: nhập tên thử, chọn mỗi nhóm khách và mỗi phương tiện. Màn hình cuối phải báo **Đã gửi câu trả lời cho gia đình**. Mở Supabase → Table Editor → `guest_responses` để kiểm tra bản ghi. Thử gửi một lời chúc và kiểm tra trên trình duyệt khác.

Bạn cũng có thể gửi Project URL và **publishable key** để tôi cấu hình tiếp. Đây là hai thông tin công khai của ứng dụng; quyền bảo vệ dữ liệu nằm trong SQL/RLS.

## Dữ liệu và quyền truy cập

`guest_responses` lưu tên, ngôn ngữ, nhóm cô dâu/chú rể, tự đi/xe chung, điểm đón, ngày cưới và thời gian gửi do database tạo. Người truy cập chỉ được gửi qua hàm `submit_guest_response`, không có quyền truy cập trực tiếp bảng, không được đọc, sửa hoặc xóa câu trả lời của bất kỳ ai. Hàm chỉ thêm bản ghi và bỏ qua UUID đã tồn tại; mọi trường vẫn được kiểm tra bằng ràng buộc trong bảng. Gia đình đọc và xuất CSV bằng tài khoản quản trị Supabase. Không bật public SELECT cho bảng này.

`wedding_wishes` là sổ lời chúc công khai: chỉ tên, nội dung và thời gian được tải lên trang. Khách được gửi và đọc lời chúc, không được sửa/xóa. Nếu cần gỡ nội dung, gia đình thao tác trong Table Editor. Tên và lời chúc của khách được hiển thị bằng text, không chạy HTML.

Các lần gửi lại sau lỗi mạng dùng cùng UUID nên không tạo bản trùng. Khi khách đổi lựa chọn, một bản xác nhận mới được thêm để giữ lịch sử. `session_id` chỉ nhận diện trong phiên trình duyệt, không xác minh danh tính và không gộp khách giữa các thiết bị.

Để tổng hợp lựa chọn mới nhất mỗi phiên, chạy truy vấn sau trong SQL Editor, rồi Export CSV:

```sql
select distinct on (session_id)
  name, language, guest_group, transport, pickup_point, event_date, created_at
from public.guest_responses
order by session_id, created_at desc;
```

Trước màn hình cuối, lựa chọn chỉ được giữ tạm trong sessionStorage của tab hiện tại. Khi chưa cấu hình Supabase hoặc gửi lỗi, website luôn báo **chưa gửi**, không giả lập xác nhận thành công. Nếu đóng tab trước khi gửi thành công, gia đình chưa nhận được thông tin.

## Chi phí và vận hành

Theo [gói Free](https://supabase.com/pricing), Supabase có 500 MB database, phù hợp cho các bản ghi văn bản của thiệp cưới. Ảnh vẫn nằm trên GitHub Pages, không chiếm dung lượng database. Gói Free có thể [tạm dừng khi ít hoạt động trong 7 ngày](https://supabase.com/docs/guides/platform/free-project-pausing); nếu bị dừng, mở dashboard để khôi phục và thử lại trước khi gửi thiệp. Chủ động xuất CSV để sao lưu vì gói Free không cung cấp bản sao lưu tự động tải xuống.

Biểu mẫu không yêu cầu đăng nhập, nên người biết URL có thể gửi dữ liệu; schema giới hạn độ dài nhưng không có chống spam theo IP. Nếu có spam thực tế, thêm Edge Function và CAPTCHA trước khi mở rộng phạm vi chia sẻ. RLS giữ riêng dữ liệu trả lời; không đưa dữ liệu xuất, thông tin khách hoặc bản sao lưu lên kho công khai.

Hai trang thiệp cũ `nha-gai.html` / `nha-trai.html` vẫn dùng API Node.js cũ. Luồng mới dùng `index.html` → `details.html`, kết nối trực tiếp Supabase cho xác nhận và lời chúc. Dữ liệu cũ chưa được tự động chuyển sang Supabase.

Nguồn: [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [bảo vệ dữ liệu](https://supabase.com/docs/guides/database/secure-data).