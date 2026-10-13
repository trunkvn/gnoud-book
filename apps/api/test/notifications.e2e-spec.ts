import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import { NotificationsService } from './../src/notifications/notifications.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { createTestApp, fakeJobs, fakeMail, registerOwner } from './helpers.js';

const EMAIL_DOMAIN = '@notifications-e2e.test';
const HOUR = 3_600_000;
const NOW = new Date('2030-01-06T12:00:00.000Z');
const hoursFromNow = (hours: number, from = NOW) =>
  new Date(from.getTime() + hours * HOUR);

describe('Appointment reminders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let businessId: string;
  let serviceId: string;

  const cleanup = () =>
    prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });

  /** Tạo lịch hẹn kéo dài 30 phút. Mặc định: đặt từ 5 ngày trước, nên chắc chắn đủ điều kiện nhắc. */
  const appointment = (
    startsAt: Date,
    overrides: {
      createdAt?: Date;
      status?: 'CONFIRMED' | 'CANCELLED';
      reminderSentAt?: Date;
      customerEmail?: string;
    } = {},
  ) =>
    prisma.appointment.create({
      data: {
        businessId,
        serviceId,
        customerName: 'Minh',
        customerEmail: overrides.customerEmail ?? 'minh@example.com',
        customerTimezone: 'Asia/Tokyo',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60_000),
        status: overrides.status,
        reminderSentAt: overrides.reminderSentAt,
        createdAt: overrides.createdAt ?? hoursFromNow(-5 * 24),
      },
    });

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);
  });

  beforeEach(async () => {
    await cleanup();
    fakeMail(app).sent = [];
    fakeJobs(app).queued = [];

    const owner = await registerOwner(
      app,
      `owner${EMAIL_DOMAIN}`,
      'Tiệm Nhắc Lịch',
    );
    businessId = (await owner.get('/business').expect(200)).body.id;
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

  describe('the sweep that finds appointments needing a reminder', () => {
    const queuedAppointmentIds = () =>
      fakeJobs(app).queued.map((job) => job.data.appointmentId);

    it('queues one job for each confirmed appointment starting within the next 24 hours', async () => {
      const soon = await appointment(hoursFromNow(20));
      const sooner = await appointment(hoursFromNow(3));

      expect(await notifications.enqueueDueReminders(NOW)).toBe(2);
      expect(queuedAppointmentIds()).toEqual([sooner.id, soon.id]); // gần nhất trước
      expect(fakeJobs(app).queued[0]).toMatchObject({
        queue: 'appointment-reminder',
        singletonKey: sooner.id,
      });
    });

    it('treats the 24-hour window as (now, now + 24h]', async () => {
      const exactly24h = await appointment(hoursFromNow(24));
      await appointment(hoursFromNow(24.5)); // chưa tới lúc
      await appointment(NOW); // đang bắt đầu đúng lúc này: quá muộn để nhắc

      expect(await notifications.enqueueDueReminders(NOW)).toBe(1);
      expect(queuedAppointmentIds()).toEqual([exactly24h.id]);
    });

    it('skips appointments that are cancelled, already reminded, or in the past', async () => {
      await appointment(hoursFromNow(5), { status: 'CANCELLED' });
      await appointment(hoursFromNow(6), { reminderSentAt: hoursFromNow(-1) });
      await appointment(hoursFromNow(-3)); // đã diễn ra

      expect(await notifications.enqueueDueReminders(NOW)).toBe(0);
    });

    it('skips appointments booked less than 24 hours ahead (the customer just got a confirmation)', async () => {
      await appointment(hoursFromNow(20), { createdAt: hoursFromNow(-1) });
      const bookedLongAgo = await appointment(hoursFromNow(22), {
        createdAt: hoursFromNow(-3 * 24),
      });

      expect(await notifications.enqueueDueReminders(NOW)).toBe(1);
      expect(queuedAppointmentIds()).toEqual([bookedLongAgo.id]);
    });

    it('does not queue a second job while the first is still waiting', async () => {
      await appointment(hoursFromNow(10));

      expect(await notifications.enqueueDueReminders(NOW)).toBe(1);
      expect(await notifications.enqueueDueReminders(NOW)).toBe(0); // lượt quét kế tiếp
      expect(fakeJobs(app).queued).toHaveLength(1);
    });
  });

  describe('sending one reminder', () => {
    it('emails the customer in their timezone and records that it was sent', async () => {
      const { id } = await appointment(hoursFromNow(20));

      expect(await notifications.sendReminder(id, NOW)).toBe(true);

      const { sent } = fakeMail(app);
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe('minh@example.com');
      expect(sent[0].subject).toContain('Nhắc lịch hẹn');
      expect(sent[0].text).toMatch(/\(Asia\/Tokyo\)/);
      const saved = await prisma.appointment.findUniqueOrThrow({
        where: { id },
      });
      expect(saved.reminderSentAt).toEqual(NOW);
    });

    it('never sends twice for the same appointment', async () => {
      const { id } = await appointment(hoursFromNow(20));

      expect(await notifications.sendReminder(id, NOW)).toBe(true);
      expect(await notifications.sendReminder(id, NOW)).toBe(false);
      expect(fakeMail(app).sent).toHaveLength(1);
    });

    it('does nothing when the appointment was cancelled, already took place, or does not exist', async () => {
      const cancelled = await appointment(hoursFromNow(5), {
        status: 'CANCELLED',
      });
      const past = await appointment(hoursFromNow(-2));

      expect(await notifications.sendReminder(cancelled.id, NOW)).toBe(false);
      expect(await notifications.sendReminder(past.id, NOW)).toBe(false);
      expect(
        await notifications.sendReminder(
          '01a1333d-ae2f-71bb-9fc5-e9973236642b',
          NOW,
        ),
      ).toBe(false);
      expect(fakeMail(app).sent).toHaveLength(0);
    });

    it('stays unsent when the email fails, so the queue can retry it', async () => {
      const { id } = await appointment(hoursFromNow(20));
      fakeMail(app).failNext = true;

      await expect(notifications.sendReminder(id, NOW)).rejects.toThrow(
        'SMTP down',
      );
      const saved = await prisma.appointment.findUniqueOrThrow({
        where: { id },
      });
      expect(saved.reminderSentAt).toBeNull(); // chưa đánh dấu => lần thử lại vẫn gửi được

      expect(await notifications.sendReminder(id, NOW)).toBe(true);
      expect(fakeMail(app).sent).toHaveLength(1);
    });
  });

  describe('wiring', () => {
    it('schedules the sweep and runs the whole chain: sweep job -> reminder job -> email', async () => {
      expect(fakeJobs(app).schedules.get('reminder-sweep')).toBe('*/5 * * * *');

      const real = new Date();
      await appointment(hoursFromNow(20, real), {
        createdAt: hoursFromNow(-48, real),
      });

      // Mô phỏng đến giờ quét: xếp job quét rồi để "worker" chạy mọi thứ
      await fakeJobs(app).send('reminder-sweep', {});
      await fakeJobs(app).drain();

      expect(fakeMail(app).sent).toHaveLength(1);
      expect(fakeMail(app).sent[0].subject).toContain('Nhắc lịch hẹn');

      // Lượt quét kế tiếp không nhắc lại
      await fakeJobs(app).send('reminder-sweep', {});
      await fakeJobs(app).drain();
      expect(fakeMail(app).sent).toHaveLength(1);
    });
  });
});
