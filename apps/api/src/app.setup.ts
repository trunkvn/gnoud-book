import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

// Dùng chung cho main.ts và e2e test để hai nơi chạy giống nhau.
export function configureApp(app: INestApplication) {
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // bỏ các field không khai báo trong DTO
      forbidNonWhitelisted: true, // và báo lỗi nếu client gửi field lạ
      transform: true,
    }),
  );
}
