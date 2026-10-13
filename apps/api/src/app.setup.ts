import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// Dùng chung cho main.ts và e2e test để hai nơi chạy giống nhau.
export function configureApp(app: INestApplication) {
  // Thêm các header bảo mật chuẩn (nosniff, chặn nhúng iframe, HSTS…)
  app.use(
    helmet({
      // API chỉ trả JSON; riêng trang /docs của Swagger cần chạy script/style inline
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // bỏ các field không khai báo trong DTO
      forbidNonWhitelisted: true, // và báo lỗi nếu client gửi field lạ
      transform: true,
    }),
  );
}
