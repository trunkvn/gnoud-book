import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

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
