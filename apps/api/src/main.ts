import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import {
  findProductionConfigProblems,
  parseTrustProxy,
  swaggerEnabled,
} from './config/production-config.js';

async function bootstrap() {
  // Ở production, từ chối khởi động nếu cấu hình sẽ khiến hệ thống chạy sai một cách âm thầm
  // (Giá trị trong file .env đã nằm sẵn trong process.env: ConfigModule.forRoot() nạp nó ngay khi app.module được import.)
  const problems = findProductionConfigProblems(process.env);
  if (problems.length > 0) {
    console.error(
      `Cấu hình production chưa đúng:\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);

  if (swaggerEnabled(process.env)) {
    const config = new DocumentBuilder()
      .setTitle('Gnoud Book API')
      .setDescription('API đặt lịch cho cơ sở kinh doanh')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    // Giao diện: /docs – file mô tả (để import vào Postman): /docs-json
    SwaggerModule.setup('docs', app, document);
  }

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
