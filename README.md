# LỊCH MỔ KHOA CHẤN THƯƠNG CHỈNH HÌNH

Phần mềm web quản lý lịch mổ, giao diện tiếng Việt. Code tĩnh có thể đưa lên GitHub Pages. Có **chế độ demo** dùng localStorage và **chế độ cộng tác** qua Supabase (đăng nhập email/mật khẩu, PostgreSQL với RLS).

## Tính năng

- Tiêu đề khoa bên trái, lịch ngày/tháng/năm bên phải **trên cùng một hàng** ở màn hình rộng.
- 12 PTV theo thứ tự ưu tiên: Dũng A, Minh, Việt, Nhật Anh, Dũng B, Thanh, Quyết, Khánh, Túc, Hải, Khương, Trường.
- Ô PTV có **nền trắng**, chỉ tên PTV là **chip bo tròn có màu**.
- Ca mổ cùng PTV tự động đứng cạnh nhau, đánh STT từ 1 trong từng nhóm; đường viền đậm ở đầu nhóm.
- Cột Dụng cụ dự trù cùng màu với chip PTV.
- Đổi thứ tự: **Bàn mổ** đặt trước **PTV phụ**.
- Hàng rộng, cao ~47px; vùng bảng cuộn dọc/ngang. Cột PTV cố định khi kéo ngang.
- Các cột: PTV, STT, Tên/Mã ca, Tuổi, Chẩn đoán, Dụng cụ, Mổ yêu cầu (3tr/5tr/7tr/9tr), Bàn mổ, PTV phụ, BS gây mê – kíp mê, Giờ mổ, Lưu ý.
- Lưu ý nhiều lựa chọn, nhãn bo tròn: siêu âm tim vàng, khám tim mạch cam, dự trù máu đỏ, ghi chú khác xám.
- Thêm/sửa/xóa, lọc, CSV, chốt lịch thủ công, lịch sử theo tháng.
- Lưu chung qua Supabase khi bật chế độ cloud; không phụ thuộc Google Sheets.

## Chạy thử trên máy tính

1. Giải nén dự án.
2. Mở file `index.html` trong trình duyệt hoặc chạy `python -m http.server 8000` trong thư mục này rồi mở `http://localhost:8000`.
3. `config.js` mặc định `DEMO_MODE: true`. Dữ liệu thử chỉ lưu trong localStorage trình duyệt đang dùng, **không** đồng bộ/không tự động chạy lúc tắt trình duyệt.
4. **Chỉ nhập dữ liệu hư cấu khi đang ở chế độ demo.**

## Đưa lên GitHub Pages

1. Tạo repository mới tên `lich-mo-ctch` trong GitHub, upload tất cả file ở thư mục này, commit lên nhánh `main`.
2. Vào **Settings → Pages → Build and deployment → Deploy from a branch**, chọn `main` và `/ (root)`.
3. Địa chỉ thường có dạng `https://TEN-TAI-KHOAN.github.io/lich-mo-ctch/`.
4. GitHub Pages phục vụ file tĩnh, **không lưu dữ liệu chung giữa các bác sĩ**. Cần Supabase hoặc backend riêng.
5. GitHub Pages có thể dùng repository public; **tuyệt đối không commit thông tin bệnh nhân, mật khẩu, service_role key, khóa bí mật**, hay dữ liệu thật vào repository.

## Kết nối Supabase (dữ liệu chung)

1. Tạo dự án Supabase riêng. Trong **SQL Editor**, chạy nội dung `supabase-schema.sql`.
2. Supabase Authentication → Providers → Email; **tắt cho người dùng tự đăng ký công khai** và chỉ cấp tài khoản cho nhân viên được phép.
3. Điền `SUPABASE_URL` và `SUPABASE_ANON_KEY` (publishable / anon key) vào `config.js`, đặt `DEMO_MODE: false`. Đừng đặt service_role/secret key trong code frontend.
4. Push thay đổi lên GitHub; triển khai GitHub Pages. Đăng nhập bằng tài khoản đã cấp.
5. Người dùng đã đăng nhập có thể xem/sửa lịch và lưu lịch sử chung. Bản này **chưa có phân quyền chi tiết** theo người dùng (quản trị, điều phối, chỉ xem), chưa có nhật ký thay đổi đầy đủ, kiểm tra xung đột bàn mổ và xác nhận vận hành thực tế. Không dùng cho bệnh nhân thật cho đến khi các yêu cầu này được kiểm tra.

## Chốt lịch 14:00

- Nút **Chốt lịch** lưu bản chụp lịch của ngày đang hiển thị vào lịch sử; xóa ca ở lịch hiện tại của ngày đó; chuyển giao diện sang ngày kế tiếp.
- Trong cloud, có thể bật `pg_cron` theo ví dụ **được comment** trong `supabase-schema.sql`, chạy `07:00 UTC` (14:00 tại Việt Nam). Không thể bảo đảm thời điểm chính xác nếu sử dụng trình duyệt/localStorage.
- **Cần xác nhận ngày cần chốt**: bản mẫu đang chốt ca của **ngày hiện tại**, không tự hiểu lịch chuẩn bị cho hôm sau. Chỉ bật cron khi quy tắc vận hành này đã được xác nhận.
- Công việc cron chạy trên máy chủ nhưng không tự đổi ngày đang mở trên mọi tab; cần mở lại hoặc chọn ngày mới. Bản cloud cũng chưa có cập nhật realtime giữa các màn hình (có thể tải lại trang).

## Kiểm tra

- Chọn PTV Minh, sau đó Dũng A → Dũng A đứng trước Minh.
- Tạo hai ca cùng PTV → đánh STT 1 và 2; khi thêm PTV khác xuất hiện viền đậm.
- Chọn PTV Việt → chip tên và ô dụng cụ có cùng nền màu.
- Chọn nhiều lưu ý → nhãn màu hiện cùng một ô.
- Chốt lịch → bản chốt vào tab Lịch sử, lịch chuyển ngày.
- Truy cập điện thoại, kéo ngang bảng để xem cột sau.

## Giới hạn về an toàn

Đây là nguyên mẫu phần mềm, **không phải hệ thống hồ sơ bệnh án đạt chuẩn vận hành**. Để sử dụng trong bệnh viện cần kiểm tra kiểm soát truy cập/ủy quyền, RLS theo vai trò, mã hóa, sao lưu & khôi phục, nhật ký sửa đổi, cơ chế chống trùng phòng mổ, an toàn dữ liệu cá nhân và quy trình phê duyệt của bệnh viện. Nếu các yêu cầu này chưa hoàn tất, chỉ sử dụng thông tin giả lập.
