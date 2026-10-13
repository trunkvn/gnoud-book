import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { type MailMessage, MailService } from './../src/mail/mail.service.js';

/** Hộp thư giả: ghi lại email thay vì gửi thật, để test kiểm tra được nội dung. */
export class FakeMailService {
  sent: MailMessage[] = [];
  failNext = false;

  async send(message: MailMessage) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SMTP down');
    }
    this.sent.push(message);
  }
}

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailService)
    .useValue(new FakeMailService())
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export const fakeMail = (app: INestApplication) =>
  app.get(MailService) as unknown as FakeMailService;

/** Đăng ký một chủ cơ sở mới và trả về "agent" đã giữ sẵn cookie đăng nhập. */
export async function registerOwner(
  app: INestApplication,
  email: string,
  businessName = 'Tiệm Test',
) {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/auth/register')
    .send({
      email,
      password: 'correct-horse-battery',
      name: 'Chủ Tiệm',
      businessName,
    })
    .expect(201);
  return agent;
}
