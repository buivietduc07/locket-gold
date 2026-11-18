# Deploy Vercel

1. Upload toàn bộ nội dung bên trong thư mục này vào `locket/` trên GitHub, bao gồm `api/index.js`, `server.js`, `package.json`, `public/*`, `vercel.json`.
2. Vercel > Settings > Build and Deployment: Root Directory = `locket`; Framework Preset = `Other`; không ép Output Directory là `dist`.
3. Vercel > Settings > Environment Variables: thêm `SESSION_SECRET` là chuỗi bí mật ngẫu nhiên dài ít nhất 32 ký tự. Nếu API key không còn đúng, đặt `FIREBASE_API_KEY` theo cấu hình hợp lệ của tài khoản/dự án mà bạn có quyền sử dụng. Không commit secret lên GitHub.
4. Redeploy. Kiểm tra `https://your-domain/api/me` phải trả JSON 401 `Bạn chưa đăng nhập`, không được 404.
5. Mở `https://your-domain/` và thử đăng nhập. Không đưa mật khẩu vào chat hay mã nguồn GitHub.

Lưu ý: Private API không chính thức; đăng nhập và đăng ảnh phụ thuộc vào dịch vụ bên ngoài. Cookie phiên đăng nhập được mã hóa AES-GCM ở máy khách (HttpOnly, Secure khi production). Bảo vệ SESSION_SECRET và dùng HTTPS. Nếu có lỗi 500, xem Vercel Functions logs.
