# Triển khai lên mạng

Ba phần chạy ở ba nơi:

```
Trình duyệt ──► Vercel (web Next.js) ──/api/* và gọi từ server──► Railway (API NestJS + job nền) ──► Railway Postgres
                                                                         │
                                                                         └──► SMTP (Gmail / Resend...) ──► hộp thư của khách
```

- **Vì sao API không nằm trên Vercel:** job nền (email nhắc lịch 24 giờ) cần một tiến trình luôn sống để quét mỗi 5 phút. Serverless chỉ chạy khi có request nên sẽ không bao giờ gửi nhắc lịch.
- **Vì sao API và database cùng một nơi:** gần nhau thì nhanh, và Postgres của Railway là kết nối trực tiếp. Một số dịch vụ có cổng "pooled" từ chối tham số kết nối `options` mà API dùng để ép múi giờ UTC (xem README), nên đừng dùng cổng pooled.

> **Đã kiểm chứng và chưa kiểm chứng.** Mọi thứ bên dưới về *ứng dụng* đã được chạy thử bằng bản build production trên máy (đăng ký, đăng nhập, đặt lịch, chống đặt trùng, email do job nền gửi, huỷ lịch, giới hạn tốc độ theo từng khách). Phần *giao diện của Railway và Vercel* mình viết theo hiểu biết hiện có và **chưa chạy thử trên tài khoản thật**; nếu tên nút hay ô nhập khác đi, hãy làm theo ý nghĩa của bước. Giá và gói miễn phí của các dịch vụ này thay đổi, hãy xem lại trên trang của họ.

## 0. Chuẩn bị
- Code đã ở GitHub (`trunkvn/gnoud-book`).
- Một tài khoản [Railway](https://railway.com) và một tài khoản [Vercel](https://vercel.com), đều đăng nhập bằng GitHub.
- Một **Mật khẩu ứng dụng Gmail** (`SMTP_PASS`) nếu dùng Gmail để gửi thư, xem mục "Gửi email thật" trong README.
- Chuỗi bí mật cho `JWT_SECRET`: chạy `openssl rand -base64 48` và giữ lại.

## 1. Railway: database và API

1. **New Project → Deploy from GitHub repo →** chọn `gnoud-book`. Railway sẽ tạo một service từ repo.
2. **Thêm database:** trong project chọn **+ New → Database → PostgreSQL**. Service này mặc định tên `Postgres`.
3. Mở service API (service từ repo) → **Settings**:
   - **Root Directory:** để trống (cần cả repo vì dùng pnpm workspace).
   - **Build Command:** `pnpm --filter @gnoud-book/api build`
   - **Start Command:** `pnpm --filter @gnoud-book/api start:deploy`
     (script này chạy `prisma migrate deploy` rồi mới bật API, nên bảng trong database luôn đúng phiên bản mới nhất, kể cả ràng buộc chống đặt trùng).
   - **Healthcheck Path:** `/health`
   - Cần **Node ≥ 22.12**. Repo có file `.node-version` để Railway chọn đúng; hãy xem log build xác nhận phiên bản.
4. Tab **Variables** của service API, thêm:

   | Biến | Giá trị |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway tự điền từ service Postgres) |
   | `JWT_SECRET` | chuỗi bí mật ở bước 0 |
   | `WEB_URL` | tạm thời `https://chua-co.example.com`, **sẽ sửa ở bước 3** |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_SECURE` | `true` |
   | `SMTP_USER` | địa chỉ Gmail của bạn |
   | `SMTP_PASS` | Mật khẩu ứng dụng 16 ký tự |
   | `MAIL_FROM` | `Gnoud Book <địa chỉ Gmail của bạn>` |
   | `TRUST_PROXY` | `2` (xem mục "Kiểm tra giới hạn tốc độ" bên dưới) |

   API **cố ý từ chối khởi động** nếu `JWT_SECRET` yếu, `WEB_URL` hoặc `SMTP_HOST` còn là localhost. Đây là bảo vệ, không phải lỗi: log sẽ liệt kê chính xác biến nào sai.
5. **Settings → Networking → Generate Domain** để có địa chỉ công khai dạng `https://xxxx.up.railway.app`. Mở `https://xxxx.up.railway.app/health`, phải thấy `{"status":"ok","database":"up"}`. Chép địa chỉ này lại.

## 2. Vercel: web

1. **Add New → Project →** chọn `gnoud-book`.
2. **Root Directory:** `apps/web`. Framework tự nhận là Next.js.
3. **Environment Variables:**

   | Biến | Giá trị |
   |---|---|
   | `API_URL` | địa chỉ Railway ở bước 1.5, **không có dấu `/` ở cuối** |
   | `NEXT_PUBLIC_DEMO_SLUG` | (tuỳ chọn) `salon-demo`, để trang chủ có nút xem thử trang đặt lịch |

4. **Deploy.** Chép địa chỉ web Vercel cấp (vd `https://gnoud-book.vercel.app`).

> `API_URL` được dùng cả lúc **build** (để dựng đường chuyển tiếp `/api/*`) lẫn lúc chạy. Đổi nó thì phải **Redeploy**.

## 3. Nối hai bên lại
1. Quay lại Railway, sửa `WEB_URL` thành địa chỉ Vercel thật (vd `https://gnoud-book.vercel.app`, không có `/` cuối). Email dùng nó để tạo liên kết quản lý lịch cho khách.
2. API tự khởi động lại. Kiểm tra `/health` lần nữa.

## 4. Thử như người dùng thật
1. Mở trang Vercel → **Đăng ký** → tạo cơ sở.
2. Vào **Dịch vụ**, tạo một dịch vụ; vào **Giờ làm việc**, đặt giờ.
3. Mở trang đặt lịch (`/book/<slug>`, có nút sao chép liên kết trong dashboard) bằng **một cửa sổ ẩn danh**, đặt một lịch bằng email thật của bạn.
4. Kiểm tra: email xác nhận đến hộp thư (xem cả mục Spam), bấm liên kết trong email để huỷ/đổi, dashboard hiện lịch.

## Dữ liệu demo (tuỳ chọn, cho portfolio)
Trang trống trông kém hấp dẫn. Để có sẵn một cơ sở demo:
1. Ở Railway, service Postgres → tab **Variables** → chép `DATABASE_PUBLIC_URL`.
2. Trên máy bạn:
   ```bash
   DATABASE_URL="<DATABASE_PUBLIC_URL>" NODE_ENV=production \
     pnpm --filter @gnoud-book/api exec tsx prisma/seed.ts --force --no-emails
   ```
   `--force` vì script từ chối chạy ở production theo mặc định. `--no-emails` đánh dấu các lịch demo là "đã nhắc rồi" để job nhắc lịch **không** gửi thư tới các địa chỉ `@example.com` giả.
3. Đăng nhập demo: `demo@gnoud.dev` / `demo-password-123`. **Đổi mật khẩu này hoặc xoá tài khoản demo** nếu bạn không muốn người lạ vào xem được dashboard; trang web công khai thì ai cũng thấy, nên đừng để dữ liệu thật trong đó.

## Kiểm tra giới hạn tốc độ (quan trọng, làm một lần)
API giới hạn 10 lần đăng nhập/phút cho mỗi IP. Sau proxy, nó cần biết IP thật của khách, tính từ `X-Forwarded-For` và số lớp proxy (`TRUST_PROXY`). Số đúng phụ thuộc vào cách Vercel và Railway nối với nhau nên **cần thử ở môi trường thật**:

1. Trên máy tính, ở trang đăng nhập, cố ý đăng nhập sai khoảng 11 lần liền. Phải thấy bị chặn ("Too Many Requests").
2. Ngay sau đó, trên **điện thoại dùng 4G** (IP khác), đăng nhập bình thường. Phải vào được.
   - Điện thoại cũng bị chặn → API đang thấy mọi người cùng một IP: **tăng** `TRUST_PROXY` (thử `3`).
   - Máy tính không bao giờ bị chặn dù thử 30 lần → API đang tin một IP do client tự khai: **giảm** `TRUST_PROXY` (thử `1`).
3. Sửa biến ở Railway, chờ API khởi động lại, thử lại.

## Khi có sự cố
| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Railway báo build/start thất bại, log có "Cấu hình production chưa đúng" | biến môi trường sai hoặc thiếu, làm theo đúng dòng log |
| Web Vercel hiện "đã có lỗi" ở dashboard / trang đặt lịch | `API_URL` sai hoặc API chưa chạy; kiểm tra `/health` của API |
| Đăng nhập xong vẫn bị đưa về `/login` | cookie không được lưu: thường do `API_URL` có dấu `/` cuối hoặc trỏ nhầm tên miền |
| Đặt lịch được nhưng không có email | xem log Railway: lỗi `EAUTH` là sai mật khẩu ứng dụng; không có lỗi mà vẫn không thấy thư thì kiểm tra Spam |
| Email xác nhận có link dẫn tới trang lạ/localhost | `WEB_URL` ở Railway chưa sửa (bước 3) |
| Không có email nhắc 24 giờ | service API bị tạm dừng/ngủ (gói miễn phí); job nhắc lịch cần API chạy liên tục |

## Giới hạn còn lại khi triển khai
- Nếu chạy **nhiều instance API**, bộ đếm giới hạn tốc độ nằm trong bộ nhớ từng instance (cần Redis để dùng chung). Một instance thì không sao.
- Gmail SMTP giới hạn khoảng 500 thư/ngày và thư gửi từ Gmail cá nhân dễ vào Spam. Muốn dùng lâu dài thì chuyển sang Resend/Brevo/SES với tên miền riêng (chỉ cần đổi các biến `SMTP_*`, không đổi code).
