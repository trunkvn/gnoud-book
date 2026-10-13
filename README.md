# Gnoud Book

**Nền tảng đặt lịch cho cơ sở nhỏ** (salon, spa, phòng khám, gia sư...): chủ cơ sở tạo dịch vụ và giờ làm việc; khách chọn một khung giờ còn trống, nhận email xác nhận và email nhắc lịch; hai bên cùng đúng giờ, ở bất kỳ múi giờ nào.

> **English summary.** A full-stack booking platform (Next.js 16 + NestJS 12 + PostgreSQL/Prisma, in a Turborepo monorepo). Business owners manage services, weekly working hours and a week calendar; customers pick an open slot in *their own* timezone, get a confirmation email and a reminder 24 hours before, and can cancel or reschedule from an email link, no account needed. The interesting engineering is in the details: UTC storage with per-viewer display, a pure DST-aware slot algorithm, double-booking prevented by a Postgres exclusion constraint (proven with forced-race tests), and background jobs on Postgres (pg-boss). The UI is a custom editorial design system (Vietnamese-first).

![Trang chủ](docs/screenshots/landing.png)

| Khách đặt lịch | Trang lịch của chủ cơ sở |
|---|---|
| ![Đặt lịch](docs/screenshots/booking.png) | ![Lịch tuần](docs/screenshots/dashboard.png) |

| Chế độ tối | Điện thoại | Email xác nhận |
|---|---|---|
| ![Chế độ tối](docs/screenshots/dashboard-dark.png) | ![Đặt lịch trên điện thoại](docs/screenshots/booking-mobile.png) | ![Email](docs/screenshots/email.png) |

## Tính năng

**Chủ cơ sở** (đăng nhập)
- Đăng ký, đăng nhập (JWT trong cookie `httpOnly`)
- Dịch vụ: tên, thời lượng, giá, bật/tắt bán, thêm/sửa/xoá
- Giờ làm việc theo tuần, nhiều khung mỗi ngày (nghỉ trưa), múi giờ riêng của cơ sở
- **Lịch tuần**: lịch chồng giờ xếp cạnh nhau, giờ đóng cửa tô gạch chéo, vạch "bây giờ"; huỷ hoặc đánh dấu hoàn thành; danh sách theo ngày trên điện thoại
- Checklist cho người mới, đường dẫn đặt lịch có nút sao chép

**Khách** (không cần tài khoản)
- Trang đặt lịch `/book/<slug>`: chọn dịch vụ, chọn ngày/giờ **theo múi giờ của mình** (đổi được ngay trên trang), nhập tên và email
- Email xác nhận; email nhắc **trước 24 giờ** do job nền gửi
- Huỷ hoặc đổi lịch qua đường dẫn trong email (`/manage/<token>`), đến trước giờ hẹn 2 giờ

## Kiến trúc

```mermaid
flowchart LR
    B[Trình duyệt] --> W["Next.js (apps/web)"]
    W -- "/api/* chuyển tiếp (rewrite)" --> A["NestJS API (apps/api)"]
    W -- "server component gọi API kèm cookie" --> A
    A --> P[(PostgreSQL)]
    A -- "pg-boss: hàng đợi nằm trong chính Postgres" --> J["Worker: email xác nhận, quét và gửi nhắc lịch"]
    J -- SMTP --> M["Mailpit / nhà cung cấp email"]
    J --> P
```

- **Next.js chỉ lo giao diện.** Mọi dữ liệu, xác thực và job nằm ở NestJS. Trình duyệt gọi `/api/...` trên cùng địa chỉ với web và Next chuyển tiếp sang API (rewrite), nên không cần CORS và cookie `httpOnly` đi lại tự nhiên.
- **Một database cho mọi thứ**, kể cả hàng đợi job (pg-boss), nên không cần Redis.

## Những quyết định kỹ thuật đáng nói

**1. Múi giờ làm đúng.** Mọi thời điểm lưu dạng `timestamptz` (UTC). Giờ làm việc được hiểu theo múi giờ của *cơ sở*; mỗi người xem thấy giờ theo múi giờ của *họ*. Cùng một lịch hẹn là 09:00 Thứ Hai ở Hà Nội, 11:00 ở Tokyo và 18:00 **Chủ Nhật** ở Los Angeles.
Thuật toán tính slot trống là một **hàm thuần** ([`slots.ts`](apps/api/src/public-booking/slots.ts)) nên test được chính xác, kể cả ngày nhảy giờ mùa hè (giờ "không tồn tại" bị bỏ qua, giờ đóng cửa rơi vào đó không làm crash).
Một bài học: adapter Postgres của Prisma ghi và đọc `timestamptz` lệch đúng bằng múi giờ của server database nếu kết nối không dùng UTC. Mọi thứ chỉ đi qua Prisma vẫn "nhất quán" nên rất khó thấy. Cách sửa nằm ở [`prisma.service.ts`](apps/api/src/prisma/prisma.service.ts) và có [test hỏi thẳng Postgres bằng SQL](apps/api/test/timezone.e2e-spec.ts).

**2. Không bao giờ đặt trùng giờ.** Kiểm tra trong code không đủ (hai request cùng vượt qua bước kiểm tra). Một [exclusion constraint của Postgres](apps/api/prisma/migrations/20261013050000_appointment_no_overlap/migration.sql) (`btree_gist` + `tstzrange`) từ chối hai lịch đã xác nhận chồng thời gian của cùng một cơ sở. Các test ép tạo cuộc đua thật (giữ mọi request lại sau bước kiểm tra rồi thả cùng lúc) và chứng minh đúng một bên thắng, kể cả khi một khách đặt còn khách khác đổi vào đúng giờ đó (Postgres lúc đó báo deadlock, API chuyển thành 409).

**3. Job nền trên Postgres.** [pg-boss](https://github.com/timgit/pg-boss): email xác nhận đi qua hàng đợi (API trả lời ngay); một job cron quét mỗi 5 phút các lịch sắp diễn ra trong 24 giờ và xếp mỗi lịch một job nhắc. Thiết kế để chạy lại an toàn: mỗi lịch hẹn tối đa một job đang chờ, worker đọc lại trạng thái trước khi gửi, `reminderSentAt` chỉ ghi sau khi gửi thành công, job lỗi được thử lại với thời gian chờ tăng dần.

**4. Khách không cần tài khoản nhưng vẫn an toàn.** Mỗi lịch hẹn có một `manageToken` không đoán được. Token sai hay sai định dạng đều trả 404 (không tiết lộ gì), trang quản lý có `noindex` và `no-referrer`, và API cho chủ cơ sở không bao giờ trả token này.

**5. Mọi truy vấn của chủ cơ sở đều gắn `businessId` của chính họ**: id của người khác trả 404, không phải 403, để không lộ việc id đó có tồn tại. Có test cách ly giữa hai chủ cơ sở cho dịch vụ, giờ làm việc và lịch hẹn.

**6. Cách kiểm thử.** Test không chỉ để "xanh": các hành vi quan trọng được kiểm chứng bằng cách **cố tình phá code rồi xem test có đỏ không** (đột biến thủ công). Ví dụ: bỏ ràng buộc ở database thì bài test đặt đồng thời phải thấy cả 8 lịch cùng thành công và đỏ. Các e2e chạy trên PostgreSQL thật, không mock.

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Giao diện | Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4, TypeScript |
| API | NestJS 12 (ESM), class-validator, Swagger/OpenAPI |
| Dữ liệu | PostgreSQL 17, Prisma 7 |
| Job nền | pg-boss 12 |
| Email | Nodemailer (Mailpit khi phát triển) |
| Thời gian | Luxon |
| Kiểm thử | Vitest, Supertest |
| Monorepo | Turborepo + pnpm workspaces |

## Chạy trên máy

Cần: **Node ≥ 22.12**, **pnpm 10**, PostgreSQL 17 và một nơi bắt email (Mailpit).

**Cách A: macOS + Homebrew**
```bash
brew install postgresql@17 mailpit
brew services start postgresql@17
brew services start mailpit
createdb gnoud_book
createdb gnoud_book_test        # cho e2e test
```

**Cách B: Docker** (có sẵn `docker-compose.yml`; cấu hình này chưa được chạy thử, nếu gặp lỗi hãy dùng Cách A)
```bash
docker compose up -d            # Postgres (gnoud_book + gnoud_book_test) và Mailpit
```
Khi đó dùng `DATABASE_URL="postgresql://gnoud:gnoud@localhost:5432/gnoud_book"` ở bước sau.

**Cài đặt và chạy**
```bash
pnpm install

cp apps/api/.env.example apps/api/.env       # sửa DATABASE_URL và JWT_SECRET (openssl rand -base64 48)
cp apps/web/.env.example apps/web/.env.local

pnpm --filter @gnoud-book/api exec prisma migrate deploy   # tạo bảng
pnpm --filter @gnoud-book/api db:seed                      # dữ liệu demo (tuỳ chọn)

pnpm dev
```

| Địa chỉ | Là gì |
|---|---|
| http://localhost:3000 | Ứng dụng web |
| http://localhost:4000/docs | Tài liệu API (Swagger), thử trực tiếp được |
| http://localhost:8025 | Hộp thư giả (Mailpit): xem email xác nhận, nhắc lịch |

**Dữ liệu demo.** `db:seed` tạo một cơ sở `salon-demo` với dịch vụ, giờ làm việc và 30 lịch hẹn rải trong hai tuần. Đăng nhập: `demo@gnoud.dev` / `demo-password-123`; trang đặt lịch của khách: `/book/salon-demo`. Muốn trang chủ có liên kết "Xem thử trang đặt lịch mẫu", đặt `NEXT_PUBLIC_DEMO_SLUG=salon-demo` trong `apps/web/.env.local`. Script từ chối chạy khi `NODE_ENV=production`.

**Thấy email nhắc lịch mà không phải chờ.** Đặt `REMINDER_SWEEP_CRON="* * * * *"` trong `apps/api/.env` (quét mỗi phút) rồi tạo một lịch hẹn trong vòng 24 giờ tới, đặt từ hơn 24 giờ trước (dữ liệu demo đã có sẵn loại này).

## Gửi email thật

Mặc định email đi tới **Mailpit** (hộp thư giả ở http://localhost:8025): thư không ra Internet, nên đặt lịch xong sẽ không có thư nào trong Gmail của bạn. Để gửi thật, điền thông tin SMTP vào `apps/api/.env` (ví dụ có sẵn ở cuối `.env.example`), khởi động lại `pnpm dev`, rồi thử:

```bash
pnpm --filter @gnoud-book/api mail:test ban@gmail.com
```

- **Gmail**: bật xác minh 2 bước rồi tạo "Mật khẩu ứng dụng" (`SMTP_PASS`), không dùng mật khẩu Gmail thường. Địa chỉ gửi đi luôn là chính tài khoản Gmail, và giới hạn khoảng 500 thư mỗi ngày.
- **Khi triển khai thật**: dùng dịch vụ email giao dịch (Resend, Brevo, Amazon SES...) với tên miền riêng đã khai báo SPF/DKIM, nếu không thư dễ vào mục spam.
- **Dữ liệu demo** dùng địa chỉ `@example.com` (không có hộp thư thật). Chỉ nên nạp demo khi đang dùng Mailpit, vì job nhắc lịch sẽ cố gửi thư tới các địa chỉ đó.

## Kiểm thử và chất lượng

```bash
pnpm lint
pnpm typecheck
pnpm test                                       # unit test (api + web)
pnpm --filter @gnoud-book/api test:e2e          # e2e trên PostgreSQL thật
```
E2E dùng database `gnoud_book_test` (mặc định `postgresql://gnoud@localhost:5432/gnoud_book_test`; đặt biến `DATABASE_URL_TEST` nếu máy bạn khác). CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) chạy toàn bộ các lệnh trên cùng `pnpm build` với Postgres dạng service.

## Cấu trúc

```
apps/
├── api/                       NestJS
│   ├── prisma/                schema + migration (có một migration viết tay cho ràng buộc chống trùng)
│   ├── src/
│   │   ├── auth/              đăng ký, đăng nhập, guard JWT
│   │   ├── businesses|services|working-hours/   CRUD của chủ cơ sở
│   │   ├── appointments/      chủ cơ sở xem, huỷ, hoàn thành lịch hẹn
│   │   ├── public-booking/    slot trống, đặt lịch, khách huỷ/đổi lịch (API công khai)
│   │   ├── jobs|notifications|mail/   hàng đợi pg-boss, logic gửi email, mẫu email
│   │   └── seed/              dữ liệu demo (hàm thuần, có test)
│   └── test/                  e2e
└── web/                       Next.js
    ├── app/                   trang: /, /login, /register, /book/[slug], /manage/[token], /dashboard/*
    ├── components/            ui/ (hệ thiết kế), dashboard/, landing/
    └── lib/                   hàm thuần (ngày tuần, bố cục lịch, giờ làm việc, múi giờ...) có test
```

## Hệ thiết kế

Phong cách "biên tập": giấy xanh nhạt có hạt, chữ tiêu đề serif rất lớn (Fraunces), nội dung bằng Be Vietnam Pro (thiết kế riêng cho tiếng Việt), màu ngọc bích và vàng cúc, họa tiết lưới tam giác, biểu tượng mặt đồng hồ mặt trời, tấm vé hẹn. Nút "in offset" có bóng cứng, tôn trọng `prefers-reduced-motion`, có chế độ tối. Token màu nằm ở [`globals.css`](apps/web/app/globals.css), component ở [`components/ui`](apps/web/components/ui).

## Hạn chế đã biết và hướng phát triển

- Chưa giới hạn tần suất (rate limiting) cho endpoint công khai: có thể bị lợi dụng để gửi email rác tới địa chỉ người khác nhập.
- Một cơ sở = một lịch chung (chưa có nhiều nhân viên, mỗi người một lịch).
- Chủ cơ sở huỷ được lịch nhưng chưa tự đổi giờ giúp khách.
- Khách đặt cách giờ hẹn dưới 2 giờ thì không tự đổi/huỷ được trên mạng (giờ đặt tối thiểu là 60 phút, hạn chót đổi/huỷ là 2 giờ).
- Chưa có thanh toán, chưa đa ngôn ngữ, `/docs` (Swagger) nên được bảo vệ khi triển khai thật.
- Kiểm thử giao diện hiện làm thủ công bằng Playwright, chưa nằm trong repo.
