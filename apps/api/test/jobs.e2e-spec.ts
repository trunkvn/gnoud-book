import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { JobsService } from './../src/jobs/jobs.service.js';
import { QUEUES } from './../src/jobs/queues.js';
import { NotificationsService } from './../src/notifications/notifications.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { createTestApp, fakeMail, registerOwner, waitFor } from './helpers.js';

// Các test khác dùng hàng đợi giả. File này chạy pg-boss THẬT để chứng minh phần nối với
// hàng đợi hoạt động: job được lưu vào Postgres, worker nhận và xử lý, job lỗi được thử lại.
const EMAIL_DOMAIN = '@jobs-e2e.test';
const SLUG = 'tiem-job-test';
const HOUR = 3_600_000;
const TIMEOUT = 40_000;

describe('Background jobs on a real pg-boss queue (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let businessId: string;
  let serviceId: string;
  let owner: Awaited<ReturnType<typeof registerOwner>>;

  const cleanup = () =>
    prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });

  /** Lịch hẹn sẽ diễn ra sau 20 giờ nữa, đặt từ 2 ngày trước: đủ điều kiện để nhắc. */
  const upcomingAppointment = () =>
    prisma.appointment.create({
      data: {
        businessId,
        serviceId,
        customerName: 'Minh',
        customerEmail: 'minh@example.com',
        customerTimezone: 'Asia/Tokyo',
        startsAt: new Date(Date.now() + 20 * HOUR),
        endsAt: new Date(Date.now() + 20.5 * HOUR),
        createdAt: new Date(Date.now() - 48 * HOUR),
      },
    });

  beforeAll(async () => {
    app = (await createTestApp({ realJobs: true })) as INestApplication<App>;
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);
  });

  beforeEach(async () => {
    await cleanup();
    fakeMail(app).sent = [];
    owner = await registerOwner(app, `owner${EMAIL_DOMAIN}`, 'Tiệm Job Test');
    const business = (await owner.get('/business').expect(200)).body;
    await prisma.business.update({
      where: { id: business.id },
      data: { slug: SLUG },
    });
    businessId = business.id;
    serviceId = (
      await owner
        .post('/services')
        .send({ name: 'Cắt tóc', durationMinutes: 30, price: 100000 })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it(
    'sends the booking confirmation in the background after the API has already answered',
    async () => {
      await owner
        .put('/working-hours')
        .send({ intervals: [{ dayOfWeek: 1, start: '09:00', end: '12:00' }] })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/public/businesses/${SLUG}/appointments`)
        .send({
          serviceId,
          startsAt: '2030-01-07T02:00:00.000Z', // 09:00 giờ VN, Thứ hai
          customerName: 'Minh',
          customerEmail: 'minh@example.com',
          customerTimezone: 'Asia/Tokyo',
        })
        .expect(201);

      await waitFor(() => fakeMail(app).sent.length === 1);
      expect(fakeMail(app).sent[0].to).toBe('minh@example.com');
      expect(fakeMail(app).sent[0].subject).toContain('Xác nhận lịch hẹn');
    },
    TIMEOUT,
  );

  it(
    'delivers a reminder through the queue exactly once',
    async () => {
      const { id } = await upcomingAppointment();

      expect(await notifications.enqueueDueReminders()).toBe(1);

      await waitFor(() => fakeMail(app).sent.length === 1);
      await waitFor(async () => {
        const saved = await prisma.appointment.findUniqueOrThrow({
          where: { id },
        });
        return saved.reminderSentAt !== null;
      });
      expect(fakeMail(app).sent[0].subject).toContain('Nhắc lịch hẹn');

      // Lượt quét kế tiếp: đã nhắc rồi nên không xếp thêm job
      expect(await notifications.enqueueDueReminders()).toBe(0);
    },
    TIMEOUT,
  );

  it(
    'retries a job whose email failed, then sends it once',
    async () => {
      await upcomingAppointment();
      fakeMail(app).failNext = true; // lần gửi đầu tiên thất bại

      expect(await notifications.enqueueDueReminders()).toBe(1);

      // Job lỗi được pg-boss xếp lại và chạy lần nữa sau khoảng chờ (~1-2 giây trong test)
      await waitFor(() => fakeMail(app).sent.length === 1);
      expect(fakeMail(app).failNext).toBe(false); // lỗi đã xảy ra thật
    },
    TIMEOUT,
  );

  it('refuses a second job with the same singleton key while one is still waiting', async () => {
    const jobs = app.get(JobsService);
    const key = 'dedup-check-appointment';
    const inOneHour = { singletonKey: key, startAfter: 3600 }; // giữ job nằm chờ

    const first = await jobs.send(
      QUEUES.appointmentReminder,
      { appointmentId: key },
      inOneHour,
    );
    const second = await jobs.send(
      QUEUES.appointmentReminder,
      { appointmentId: key },
      inOneHour,
    );

    expect(first).toEqual(expect.any(String));
    expect(second).toBeNull();

    await prisma.$executeRaw`DELETE FROM pgboss.job WHERE singleton_key = ${key}`;
  });
});
