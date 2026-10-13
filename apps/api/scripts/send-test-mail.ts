// Gửi thử một email bằng ĐÚNG cấu hình SMTP trong .env, để biết cấu hình đã chạy chưa
// mà không phải đặt lịch thật.
// Chạy: pnpm --filter @gnoud-book/api mail:test ban@gmail.com
import 'dotenv/config';
import type { ConfigService } from '@nestjs/config';
import { MailService } from '../src/mail/mail.service.js';

const to = process.argv[2];
if (!to) {
  console.error('Thiếu địa chỉ nhận. Dùng: pnpm --filter @gnoud-book/api mail:test ban@gmail.com');
  process.exit(1);
}

const host = process.env.SMTP_HOST ?? 'localhost';
const port = process.env.SMTP_PORT ?? '1025';
const config = { get: (key: string) => process.env[key] } as ConfigService;

try {
  await new MailService(config).send({
    to,
    subject: 'Thử gửi email từ Gnoud Book',
    text: 'Nếu bạn đọc được email này thì cấu hình SMTP đã hoạt động.',
    html: '<p>Nếu bạn đọc được email này thì cấu hình SMTP đã <strong>hoạt động</strong>.</p>',
  });
  console.log(`Đã gửi tới ${to} qua ${host}:${port}.`);
  if (host === 'localhost') {
    console.log('Lưu ý: localhost:1025 là Mailpit (hộp thư giả). Xem thư ở http://localhost:8025, sẽ không có thư nào tới hộp thư thật.');
  }
} catch (error) {
  // Lỗi kết nối thường có message rỗng (nodemailer gộp nhiều lần thử), nên in cả mã lỗi.
  const code = (error as { code?: string }).code;
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`Không gửi được qua ${host}:${port}: ${[code, detail].filter(Boolean).join(' - ') || 'không rõ lỗi'}`);
  if (code === 'ECONNREFUSED' || code === 'ESOCKET') console.error('Không có gì đang lắng nghe ở địa chỉ đó: kiểm tra SMTP_HOST và SMTP_PORT.');
  if (code === 'EAUTH') console.error('Sai tên đăng nhập hoặc mật khẩu. Với Gmail phải dùng "Mật khẩu ứng dụng", không phải mật khẩu Gmail.');
  process.exit(1);
}
