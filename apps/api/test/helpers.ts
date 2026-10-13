import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { JobsService } from './../src/jobs/jobs.service.js';
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

type QueuedJob = {
  queue: string;
  data: Record<string, unknown>;
  singletonKey?: string;
};

/**
 * Hàng đợi giả: không chạm database, không tự chạy job. Test chủ động gọi `drain()` để
 * chạy các job đang chờ (giống worker thật nhưng xảy ra đúng lúc test muốn).
 */
export class FakeJobsService {
  queued: QueuedJob[] = [];
  schedules = new Map<string, string>();
  private handlers = new Map<
    string,
    (data: Record<string, unknown>) => Promise<void>
  >();

  async send(
    queue: string,
    data: Record<string, unknown>,
    options?: { singletonKey?: string },
  ) {
    const singletonKey = options?.singletonKey;
    // Giống policy "exclusive": đã có job cùng queue + cùng khoá đang chờ thì bỏ qua
    if (
      singletonKey &&
      this.queued.some(
        (job) => job.queue === queue && job.singletonKey === singletonKey,
      )
    ) {
      return null;
    }
    this.queued.push({ queue, data, singletonKey });
    return `fake-job-${this.queued.length}`;
  }

  async work(
    queue: string,
    handler: (data: Record<string, unknown>) => Promise<void>,
  ) {
    this.handlers.set(queue, handler);
  }

  async schedule(queue: string, cron: string) {
    this.schedules.set(queue, cron);
  }

  /** Chạy hết các job đang chờ (kể cả job mới sinh ra trong lúc chạy). Job lỗi thì ném lỗi ra ngoài. */
  async drain() {
    while (this.queued.length > 0) {
      const job = this.queued.shift()!;
      const handler = this.handlers.get(job.queue);
      if (!handler) throw new Error(`No worker registered for ${job.queue}`);
      await handler(job.data);
    }
  }
}

/**
 * Mặc định dùng hàng đợi giả cho nhanh và chắc chắn. Truyền `realJobs: true` để chạy pg-boss thật
 * (chỉ dùng trong test kiểm tra việc nối với hàng đợi).
 */
export async function createTestApp(options: { realJobs?: boolean } = {}) {
  const builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailService)
    .useValue(new FakeMailService());
  if (!options.realJobs) {
    builder.overrideProvider(JobsService).useValue(new FakeJobsService());
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export const fakeMail = (app: INestApplication) =>
  app.get(MailService) as unknown as FakeMailService;

export const fakeJobs = (app: INestApplication) =>
  app.get(JobsService) as unknown as FakeJobsService;

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

/** Chờ (tối đa `timeoutMs`) cho tới khi điều kiện đúng. Dùng với job nền chạy thật. */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 20_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() > deadline) {
      throw new Error(`Condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
