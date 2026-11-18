# Locket Studio: website cá nhân dựa trên tài liệu Private API

## Chạy trên máy

Cần Node.js 20+.

```bash
npm install
cp .env.example .env
npm start
```

Mở http://localhost:3000.

Trên Windows có thể sao chép `.env.example` thành `.env` thủ công.

## Chức năng

- Đăng nhập email/mật khẩu qua Firebase Identity Toolkit theo tài liệu nghiên cứu.
- Giữ token trong bộ nhớ RAM của backend bằng session cookie HTTP-only. Không ghi mật khẩu/token ra file hay gửi về trình duyệt.
- Refresh token sau khi ID token hết hạn.
- Chọn ảnh JPG/PNG/WebP, xem trước, crop 1080×1080 WebP qua Sharp.
- Upload lên Firebase Storage resumable và gọi `postMomentV2`.
- Caption tối đa 250 ký tự; xác nhận trước khi gửi tới tất cả bạn bè (`recipients: []`).
- Không có chức năng nâng Gold. Không phải sản phẩm chính thức của Locket.

## Cảnh báo quan trọng

Đây là **bản triển khai theo tài liệu người dùng cung cấp**, chưa có thử nghiệm đăng nhập/upload/đăng bài thành công trên máy chủ Locket thật. API private có thể thay đổi, chặn request, hoặc có các quy định sử dụng riêng. Một số tài khoản chỉ hỗ trợ đăng nhập số điện thoại và không thể đăng nhập bằng email.

**Không triển khai công khai dạng dịch vụ cho người khác đăng nhập** mà chưa bổ sung cơ chế bảo mật và quản lý dữ liệu phù hợp. Session đang lưu trong RAM, sẽ mất khi khởi động lại hoặc chạy nhiều instance. Dùng HTTPS khi deploy; chỉ đăng nhập qua máy chủ do chính bạn kiểm soát.

## Cấu trúc

```
server.js          Backend Express, API auth và upload
public/index.html  UI
public/style.css   CSS responsive
public/app.js      JavaScript frontend
.env.example       Biến môi trường
```

Nếu upload thất bại ở bước X-Goog-Upload-URL, cần đối chiếu protocol thực tế của phiên bản API mới; code tuân theo mô tả của tài liệu nghiên cứu và không tự đoán bước bổ sung.
