import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { AvailabilityService } from './../src/public-booking/availability.service.js';
import { NotificationsService } from './../src/notifications/notifications.service.js';
import { ManageAppointmentService } from './../src/public-booking/manage-appointment.service.js';
import { createTestApp, fakeJobs, fakeMail, registerOwner } from './helpers.js';

const EMAIL_DOMAIN = '@manage-e2e.test';
const SLUG = 'tiem-quan-ly';
// 2030-01-07 là Thứ hai. Cơ sở ở Asia/Ho_Chi_Minh (UTC+7). Giờ làm việc Thứ hai: 09:00–12:00 và 13:00–17:00.
// Dịch vụ 60 phút, lưới 30 phút.
const NINE = '2030-01-07T02:00:00.000Z'; // 09:00 VN
const NINE_THIRTY = '2030-01-07T02:30:00.000Z'; // 09:30 VN
const TEN = '2030-01-07T03:00:00.000Z'; // 10:00 VN
const ONE_PM = '2030-01-07T06:00:00.000Z'; // 13:00 VN
const LUNCH = '2030-01-07T05:00:00.000Z'; // 12:00 VN: nghỉ trưa
const UNKNOWN_TOKEN = '01a1333d-ae2f-4bb5-9fc5-e9973236642b';

describe('Customers cancelling and rescheduling (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let businessId: string;
  let serviceId: string;

  const cleanup = () =>
    prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });

  const customer = {
    customerName: 'Minh',
    customerEmail: 'minh@example.com',
    customerTimezone: 'Asia/Tokyo',
  };

  const http = () => request(app.getHttpServer());

  /** Khách đặt lịch qua API công khai, trả về manageToken như trong email */
  const book = async (
    startsAt: string,
    extra: Record<string, unknown> = {},
  ) => {
    const res = await http()
      .post(`/public/businesses/${SLUG}/appointments`)
      .send({ serviceId, startsAt, ...customer, ...extra })
      .expect(201);
    return res.body as { manageToken: string; id: string };
  };

  const url = (token: string, action = '') =>
    `/public/appointments/${token}${action}`;
  const appointments = () =>
    prisma.appointment.findMany({ where: { businessId } });
  const times = (day: { slots: { time: string }[] }) =>
    day.slots.map((s) => s.time);

  const publicSlots = () =>
    http()
      .get(`/public/businesses/${SLUG}/slots`)
      .query({ serviceId, from: '2030-01-07', to: '2030-01-07' })
      .expect(200);

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanup();
    fakeMail(app).sent = [];
    fakeJobs(app).queued = [];
    const owner = await registerOwner(
      app,
      `owner${EMAIL_DOMAIN}`,
      'Tiệm Quản Lý',
    );
    const business = (await owner.get('/business').expect(200)).body;
    await prisma.business.update({
      where: { id: business.id },
      data: { slug: SLUG },
    });
    businessId = business.id;
    await owner
      .put('/working-hours')
      .send({
        intervals: [
          { dayOfWeek: 1, start: '09:00', end: '12:00' },
          { dayOfWeek: 1, start: '13:00', end: '17:00' },
        ],
      })
      .expect(200);
    serviceId = (
      await owner
        .post('/services')
        .send({ name: 'Cắt tóc', durationMinutes: 60, price: 100000 })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('viewing an appointment', () => {
    it('shows what the manage page needs, without private details', async () => {
      const { manageToken } = await book(NINE);

      const res = await http().get(url(manageToken)).expect(200);

      expect(res.body).toEqual({
        status: 'CONFIRMED',
        startsAt: NINE,
        endsAt: TEN,
        canChange: true,
        changeDeadline: '2030-01-07T00:00:00.000Z', // 2 giờ trước giờ hẹn
        customer: { name: 'Minh', timezone: 'Asia/Tokyo' },
        service: {
          id: serviceId,
          name: 'Cắt tóc',
          durationMinutes: 60,
          price: 100000,
          currency: 'VND',
        },
        business: {
          name: 'Tiệm Quản Lý',
          slug: SLUG,
          timezone: 'Asia/Ho_Chi_Minh',
        },
      });
      expect(JSON.stringify(res.body)).not.toContain('minh@example.com');
    });

    it('answers 404 for an unknown or malformed token, on every endpoint', async () => {
      for (const token of [UNKNOWN_TOKEN, 'not-a-token']) {
        await http().get(url(token)).expect(404);
        await http().get(url(token, '/slots')).expect(404);
        await http().post(url(token, '/cancel')).expect(404);
        await http()
          .post(url(token, '/reschedule'))
          .send({ startsAt: NINE })
          .expect(404);
      }
    });

    it('says the appointment can no longer be changed once it is too close', async () => {
      const soon = new Date(Date.now() + 60 * 60_000); // 1 giờ nữa: trong hạn chót 2 giờ
      const { manageToken } = await prisma.appointment.create({
        data: {
          businessId,
          serviceId,
          customerName: 'Minh',
          customerEmail: 'minh@example.com',
          startsAt: soon,
          endsAt: new Date(soon.getTime() + 60 * 60_000),
        },
      });

      const res = await http().get(url(manageToken)).expect(200);
      expect(res.body.canChange).toBe(false);

      await http().post(url(manageToken, '/cancel')).expect(409);
      await http()
        .post(url(manageToken, '/reschedule'))
        .send({ startsAt: NINE })
        .expect(409);
      await http().get(url(manageToken, '/slots')).expect(409);
      expect((await appointments())[0].status).toBe('CONFIRMED');
    });
  });

  describe('cancelling', () => {
    it('cancels the appointment and records when', async () => {
      const { manageToken } = await book(NINE);

      const res = await http().post(url(manageToken, '/cancel')).expect(200);

      expect(res.body).toMatchObject({ status: 'CANCELLED', canChange: false });
      const [saved] = await appointments();
      expect(saved.status).toBe('CANCELLED');
      expect(saved.cancelledAt).toBeInstanceOf(Date);
    });

    it('frees the slot so someone else can book it', async () => {
      const { manageToken } = await book(NINE);
      expect(times((await publicSlots()).body.days[0])).not.toContain('09:00');

      await http().post(url(manageToken, '/cancel')).expect(200);

      expect(times((await publicSlots()).body.days[0])).toContain('09:00');
      await book(NINE, { customerEmail: 'khac@example.com' });
    });

    it('emails the customer once, and the earlier confirmation is dropped', async () => {
      const { manageToken } = await book(NINE);
      await http().post(url(manageToken, '/cancel')).expect(200);

      await fakeJobs(app).drain();

      // Job "xác nhận" chạy sau khi đã huỷ nên bị bỏ qua; chỉ còn email báo huỷ
      const { sent } = fakeMail(app);
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe('minh@example.com');
      expect(sent[0].subject).toContain('Đã huỷ lịch hẹn');
      expect(sent[0].text).toMatch(/11:00.*\(Asia\/Tokyo\)/);
    });

    it('is idempotent: cancelling again is fine and sends nothing more', async () => {
      const { manageToken } = await book(NINE);
      await http().post(url(manageToken, '/cancel')).expect(200);
      await fakeJobs(app).drain();
      fakeMail(app).sent = [];

      const again = await http().post(url(manageToken, '/cancel')).expect(200);

      expect(again.body.status).toBe('CANCELLED');
      await fakeJobs(app).drain();
      expect(fakeMail(app).sent).toHaveLength(0);
    });

    it('sends exactly one cancellation email when requests arrive at the same moment', async () => {
      const { manageToken } = await book(NINE);
      fakeJobs(app).queued = [];

      // Ép cuộc đua thật: giữ cả 6 yêu cầu sau bước "đọc lịch hẹn", rồi thả cùng lúc.
      const REQUESTS = 6;
      const service = app.get(ManageAppointmentService);
      const findByToken = (
        service as unknown as { findByToken: (t: string) => Promise<unknown> }
      ).findByToken.bind(service);
      let arrived = 0;
      let openGate!: () => void;
      const gate = new Promise<void>((resolve) => (openGate = resolve));
      const spy = vi
        .spyOn(
          service as unknown as {
            findByToken: (t: string) => Promise<unknown>;
          },
          'findByToken',
        )
        .mockImplementation(async (token) => {
          const found = await findByToken(token);
          if (++arrived <= REQUESTS) {
            if (arrived === REQUESTS) openGate();
            await gate; // chỉ lần đọc đầu tiên của mỗi yêu cầu phải chờ
          }
          return found;
        });

      const queueCancellation = vi.spyOn(
        app.get(NotificationsService),
        'queueCancellation',
      );
      const responses = await Promise.all(
        Array.from({ length: REQUESTS }, () =>
          http().post(url(manageToken, '/cancel')),
        ),
      );
      spy.mockRestore();

      expect(responses.map((r) => r.status)).toEqual(Array(REQUESTS).fill(200));
      // Chỉ MỘT yêu cầu thực sự huỷ được lịch hẹn (nhờ điều kiện status trong WHERE),
      // nên chỉ một lần xếp email huỷ. (Đếm lời gọi chứ không đếm job trong hàng đợi, vì hàng đợi
      // cũng tự loại job trùng nên sẽ che mất lỗi.)
      expect(queueCancellation).toHaveBeenCalledTimes(1);
      queueCancellation.mockRestore();
    });
  });

  describe('rescheduling', () => {
    it('moves the appointment, frees the old slot and emails the customer', async () => {
      const { manageToken } = await book(NINE);
      fakeJobs(app).queued = [];

      const res = await http()
        .post(url(manageToken, '/reschedule'))
        .send({ startsAt: ONE_PM })
        .expect(200);

      expect(res.body).toMatchObject({
        status: 'CONFIRMED',
        startsAt: ONE_PM,
        endsAt: '2030-01-07T07:00:00.000Z',
        canChange: true,
      });
      const all = await appointments();
      expect(all).toHaveLength(1); // đổi lịch, không tạo lịch mới
      expect(all[0].startsAt.toISOString()).toBe(ONE_PM);

      const morning = times((await publicSlots()).body.days[0]);
      expect(morning).toContain('09:00'); // giờ cũ được trả lại
      expect(morning).not.toContain('13:00'); // giờ mới đã bị chiếm

      expect(fakeJobs(app).queued).toEqual([
        {
          queue: 'booking-confirmation',
          data: { appointmentId: all[0].id, rescheduled: true },
          singletonKey: all[0].id,
        },
      ]);
      await fakeJobs(app).drain();
      const [email] = fakeMail(app).sent;
      expect(email.subject).toContain('Đã đổi lịch hẹn');
      expect(email.text).toMatch(/15:00.*\(Asia\/Tokyo\)/); // 13:00 VN = 15:00 Tokyo
    });

    it('can shift to a time that overlaps its own current slot', async () => {
      const { manageToken } = await book(NINE); // 09:00–10:00

      // Tra cứu công khai coi 09:30 là đã bị chiếm, nhưng trang đổi lịch phải cho chọn
      expect(times((await publicSlots()).body.days[0])).not.toContain('09:30');
      const own = await http()
        .get(url(manageToken, '/slots'))
        .query({ from: '2030-01-07', to: '2030-01-07' })
        .expect(200);
      expect(times(own.body.days[0])).toContain('09:30');

      const res = await http()
        .post(url(manageToken, '/reschedule'))
        .send({ startsAt: NINE_THIRTY })
        .expect(200);
      expect(res.body.startsAt).toBe(NINE_THIRTY);
    });

    it('does not offer slots taken by other customers', async () => {
      const { manageToken } = await book(NINE);
      await book(ONE_PM, { customerEmail: 'khac@example.com' });

      const own = await http()
        .get(url(manageToken, '/slots'))
        .query({ from: '2030-01-07', to: '2030-01-07' })
        .expect(200);

      expect(times(own.body.days[0])).not.toContain('13:00');
      expect(own.body.service.id).toBe(serviceId);
    });

    it('refuses a slot someone else holds and leaves the appointment where it was', async () => {
      const { manageToken } = await book(NINE);
      await book(ONE_PM, { customerEmail: 'khac@example.com' });

      await http()
        .post(url(manageToken, '/reschedule'))
        .send({ startsAt: ONE_PM })
        .expect(409);

      const mine = (await appointments()).find(
        (a) => a.manageToken === manageToken,
      );
      expect(mine?.startsAt.toISOString()).toBe(NINE);
    });

    it.each([
      ['during the lunch break', LUNCH],
      ['off the 30-minute grid', '2030-01-07T02:15:00.000Z'],
      ['in the past', '2020-01-06T02:00:00.000Z'],
      ['on a day the business is closed', '2030-01-08T02:00:00.000Z'],
    ])('refuses a new time %s', async (_label, startsAt) => {
      const { manageToken } = await book(NINE);
      await http()
        .post(url(manageToken, '/reschedule'))
        .send({ startsAt })
        .expect(409);
    });

    it('rejects a malformed request with 400', async () => {
      const { manageToken } = await book(NINE);
      const bad = (body: Record<string, unknown>) =>
        http().post(url(manageToken, '/reschedule')).send(body).expect(400);

      await bad({});
      await bad({ startsAt: '2030-01-07T13:00:00' }); // thiếu múi giờ nên mơ hồ
      await bad({ startsAt: ONE_PM, status: 'CANCELLED' }); // field lạ bị từ chối
    });

    it('refuses to move a cancelled appointment', async () => {
      const { manageToken } = await book(NINE);
      await http().post(url(manageToken, '/cancel')).expect(200);

      await http()
        .post(url(manageToken, '/reschedule'))
        .send({ startsAt: ONE_PM })
        .expect(409);
    });

    it('makes the appointment eligible for a reminder again at its new time', async () => {
      const { manageToken } = await book(NINE);
      await prisma.appointment.updateMany({
        where: { manageToken },
        data: { reminderSentAt: new Date() }, // đã được nhắc cho giờ cũ
      });

      await http()
        .post(url(manageToken, '/reschedule'))
        .send({ startsAt: ONE_PM })
        .expect(200);

      const [saved] = await appointments();
      expect(saved.reminderSentAt).toBeNull();
    });

    it('lets exactly one win when a customer moves into a slot another customer is booking', async () => {
      const { manageToken } = await book(NINE);
      fakeJobs(app).queued = [];

      // Ép cuộc đua thật: cả hai bên cùng thấy 13:00 còn trống rồi cùng ghi vào database.
      const availability = app.get(AvailabilityService);
      const findOpenSlots = availability.findOpenSlots.bind(availability);
      let arrived = 0;
      let openGate!: () => void;
      const gate = new Promise<void>((resolve) => (openGate = resolve));
      const spy = vi
        .spyOn(availability, 'findOpenSlots')
        .mockImplementation(async (...args) => {
          const slots = await findOpenSlots(...args);
          if (++arrived === 2) openGate();
          await gate;
          return slots;
        });

      const [moved, booked] = await Promise.all([
        http().post(url(manageToken, '/reschedule')).send({ startsAt: ONE_PM }),
        http()
          .post(`/public/businesses/${SLUG}/appointments`)
          .send({
            serviceId,
            startsAt: ONE_PM,
            ...customer,
            customerEmail: 'khac@example.com',
          }),
      ]);
      spy.mockRestore();

      // Một bên thắng (200 hoặc 201), bên kia nhận 409, và không bao giờ có hai lịch cùng giờ.
      expect([moved.status, booked.status].sort((a, b) => a - b)).toEqual(
        moved.status === 200 ? [200, 409] : [201, 409],
      );
      const atOnePm = (await appointments()).filter(
        (a) => a.status === 'CONFIRMED' && a.startsAt.toISOString() === ONE_PM,
      );
      expect(atOnePm).toHaveLength(1);
    });
  });
});
