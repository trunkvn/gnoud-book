import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { AvailabilityService } from './../src/public-booking/availability.service.js';
import { createTestApp, fakeMail, registerOwner } from './helpers.js';

const EMAIL_DOMAIN = '@booking-e2e.test';
const SLUG = 'tiem-dat-lich';
// 2030-01-07 là Thứ hai. Cơ sở ở Asia/Ho_Chi_Minh (UTC+7): 09:00 giờ VN = 02:00 UTC.
// Giờ làm việc Thứ hai: 09:00–12:00 và 13:00–17:00. Dịch vụ 60 phút, lưới 30 phút.
const NINE = '2030-01-07T02:00:00.000Z'; // 09:00 VN
const TEN = '2030-01-07T03:00:00.000Z'; // 10:00 VN

describe('Booking an appointment (e2e)', () => {
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

  const book = (body: Record<string, unknown>, slug = SLUG) =>
    request(app.getHttpServer())
      .post(`/public/businesses/${slug}/appointments`)
      .send(body);

  const bookSlot = (startsAt: string, extra: Record<string, unknown> = {}) =>
    book({ serviceId, startsAt, ...customer, ...extra });

  const appointments = () =>
    prisma.appointment.findMany({ where: { businessId } });

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanup();
    fakeMail(app).sent = [];
    const owner = await registerOwner(
      app,
      `owner${EMAIL_DOMAIN}`,
      'Tiệm Đặt Lịch',
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

  describe('happy path', () => {
    it('books an open slot and stores it in UTC', async () => {
      const res = await bookSlot(NINE).expect(201);

      expect(res.body).toMatchObject({
        status: 'CONFIRMED',
        startsAt: NINE,
        endsAt: TEN,
        customer: {
          name: 'Minh',
          email: 'minh@example.com',
          timezone: 'Asia/Tokyo',
        },
        service: {
          id: serviceId,
          name: 'Cắt tóc',
          durationMinutes: 60,
          price: 100000,
        },
        business: { slug: SLUG, timezone: 'Asia/Ho_Chi_Minh' },
      });
      expect(res.body.manageToken).toEqual(expect.any(String));

      const [saved] = await appointments();
      expect(saved.startsAt.toISOString()).toBe(NINE);
      expect(saved.endsAt.toISOString()).toBe(TEN);
      expect(saved.status).toBe('CONFIRMED');
    });

    it('normalises the customer email and defaults the timezone to UTC', async () => {
      const res = await book({
        serviceId,
        startsAt: NINE,
        customerName: '  Minh  ',
        customerEmail: '  Minh@Example.COM ',
      }).expect(201);

      expect(res.body.customer).toEqual({
        name: 'Minh',
        email: 'minh@example.com',
        timezone: 'UTC',
      });
    });

    it('makes the slot (and any slot overlapping it) disappear from the slots API', async () => {
      await bookSlot(NINE).expect(201); // 09:00–10:00 VN

      const res = await request(app.getHttpServer())
        .get(`/public/businesses/${SLUG}/slots`)
        .query({ serviceId, from: '2030-01-07', to: '2030-01-07' })
        .expect(200);
      const times = res.body.days[0].slots.map((s: { time: string }) => s.time);

      expect(times.slice(0, 4)).toEqual(['10:00', '10:30', '11:00', '13:00']);
      expect(times).not.toContain('09:00');
      expect(times).not.toContain('09:30'); // 09:30–10:30 đè lên lịch vừa đặt
    });

    it('allows back-to-back bookings that only touch', async () => {
      await bookSlot(NINE).expect(201); // 09:00–10:00
      await bookSlot(TEN).expect(201); // 10:00–11:00
      expect(await appointments()).toHaveLength(2);
    });

    it('lets a cancelled slot be booked again', async () => {
      await prisma.appointment.create({
        data: {
          businessId,
          serviceId,
          status: 'CANCELLED',
          customerName: 'Khách cũ',
          customerEmail: 'cu@example.com',
          startsAt: new Date(NINE),
          endsAt: new Date(TEN),
        },
      });
      await bookSlot(NINE).expect(201);
    });
  });

  describe('confirmation email', () => {
    it('is sent to the customer with the time in their timezone and a manage link', async () => {
      const res = await bookSlot(NINE).expect(201);

      const { sent } = fakeMail(app);
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe('minh@example.com');
      expect(sent[0].subject).toContain('Cắt tóc');
      expect(sent[0].text).toMatch(/11:00.*\(Asia\/Tokyo\)/); // 09:00 VN = 11:00 Tokyo
      expect(sent[0].text).toMatch(/Giờ tại cơ sở: 09:00/);
      expect(sent[0].text).toContain(`/manage/${res.body.manageToken}`);
    });

    it('escapes HTML in the customer name', async () => {
      await bookSlot(NINE, {
        customerName: '<img src=x onerror=alert(1)>',
      }).expect(201);
      expect(fakeMail(app).sent[0].html).not.toContain('<img');
    });

    it('does not fail the booking when the email cannot be sent, but logs the problem', async () => {
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      fakeMail(app).failNext = true;

      await bookSlot(NINE).expect(201);

      expect(await appointments()).toHaveLength(1);
      expect(logError).toHaveBeenCalledWith(
        expect.stringContaining('minh@example.com'),
        expect.any(Error),
      );
      logError.mockRestore();
    });

    it('is not sent when the booking is rejected', async () => {
      await bookSlot(NINE).expect(201);
      fakeMail(app).sent = [];
      await bookSlot(NINE).expect(409);
      expect(fakeMail(app).sent).toHaveLength(0);
    });
  });

  describe('slots that cannot be booked', () => {
    it('rejects a slot that is already taken, including partial overlaps', async () => {
      await bookSlot(NINE).expect(201); // 09:00–10:00
      await bookSlot(NINE).expect(409);
      await bookSlot('2030-01-07T02:30:00.000Z').expect(409); // 09:30–10:30
      expect(await appointments()).toHaveLength(1);
    });

    it.each([
      ['off the 30-minute grid (09:15)', '2030-01-07T02:15:00.000Z'],
      ['during the lunch break (12:00)', '2030-01-07T05:00:00.000Z'],
      [
        'too late to finish before closing (11:30 + 60 min)',
        '2030-01-07T04:30:00.000Z',
      ],
      ['on a day the business is closed (Tuesday)', '2030-01-08T02:00:00.000Z'],
      ['in the past', '2020-01-06T02:00:00.000Z'],
    ])('rejects a slot %s', async (_label, startsAt) => {
      await bookSlot(startsAt).expect(409);
      expect(await appointments()).toHaveLength(0);
    });
  });

  describe('two customers booking the same slot at the same moment', () => {
    it('lets exactly one win and tells everyone else it is taken', async () => {
      const REQUESTS = 8;

      // Ép tạo ra cuộc đua thật: giữ mọi request lại sau bước "kiểm tra slot còn trống",
      // chỉ thả ra khi cả 8 đã kiểm tra xong. Lúc đó cả 8 đều thấy slot trống và cùng lao vào ghi DB.
      const availability = app.get(AvailabilityService);
      const findOpenSlots = availability.findOpenSlots.bind(availability);
      let arrived = 0;
      let openGate!: () => void;
      const gate = new Promise<void>((resolve) => (openGate = resolve));
      const spy = vi
        .spyOn(availability, 'findOpenSlots')
        .mockImplementation(async (...args) => {
          const slots = await findOpenSlots(...args);
          if (++arrived === REQUESTS) openGate();
          await gate;
          return slots;
        });

      const responses = await Promise.all(
        Array.from({ length: REQUESTS }, (_, i) =>
          bookSlot(NINE, { customerEmail: `khach${i}@example.com` }),
        ),
      );
      spy.mockRestore();

      // Không có ràng buộc ở DB thì cả 8 đều thành công; có ràng buộc thì chỉ một.
      const statuses = responses.map((r) => r.status).sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
      expect(await appointments()).toHaveLength(1);
      expect(fakeMail(app).sent).toHaveLength(1); // chỉ người thắng nhận email
    });
  });

  describe('the database itself refuses double bookings', () => {
    // Phòng khi code có lỗi hoặc có đường ghi dữ liệu khác không đi qua API.
    const insert = (
      startsAt: string,
      endsAt: string,
      status: 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED',
    ) =>
      prisma.appointment.create({
        data: {
          businessId,
          serviceId,
          status,
          customerName: 'Khách',
          customerEmail: 'khach@example.com',
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        },
      });

    it('rejects overlapping confirmed appointments but allows touching ones', async () => {
      await insert(NINE, TEN);
      await expect(
        insert('2030-01-07T02:30:00.000Z', '2030-01-07T03:30:00.000Z'),
      ).rejects.toThrow(/Appointment_no_overlap/);
      await expect(
        insert(TEN, '2030-01-07T04:00:00.000Z'),
      ).resolves.toBeDefined();
    });

    it('does not let cancelled appointments block anyone', async () => {
      await insert(NINE, TEN, 'CANCELLED');
      await expect(insert(NINE, TEN)).resolves.toBeDefined();
    });

    it('rejects an appointment that ends before it starts', async () => {
      await expect(insert(TEN, NINE)).rejects.toThrow(
        /Appointment_ends_after_starts/,
      );
    });
  });

  describe('bad input', () => {
    it('is rejected with 400', async () => {
      const valid = { serviceId, startsAt: NINE, ...customer };
      const bad = (override: Record<string, unknown>) =>
        book({ ...valid, ...override }).expect(400);

      await bad({ serviceId: 'not-a-uuid' });
      await bad({ startsAt: '2030-01-07T09:00:00' }); // thiếu múi giờ nên mơ hồ
      await bad({ startsAt: 'tomorrow morning' });
      await bad({ customerName: '   ' });
      await bad({ customerEmail: 'not-an-email' });
      await bad({ customerTimezone: 'Mars/Olympus' });
      await bad({ status: 'CANCELLED' }); // field lạ (mass assignment) bị từ chối
      await book({}).expect(400);
      expect(await appointments()).toHaveLength(0);
    });

    it('returns 404 for an unknown business or a service that is not on sale there', async () => {
      await bookSlot(NINE).expect(201);
      await book(
        { serviceId, startsAt: TEN, ...customer },
        'khong-ton-tai',
      ).expect(404);

      const other = await registerOwner(
        app,
        `other${EMAIL_DOMAIN}`,
        'Tiệm Khác',
      );
      const foreign = (
        await other
          .post('/services')
          .send({ name: 'Khác', durationMinutes: 30, price: 1 })
          .expect(201)
      ).body;
      await bookSlot(TEN, { serviceId: foreign.id }).expect(404); // dịch vụ của cơ sở khác

      const owner = await registerOwner(
        app,
        `owner2${EMAIL_DOMAIN}`,
        'Tiệm Hai',
      );
      const inactive = (
        await owner
          .post('/services')
          .send({ name: 'Tắt', durationMinutes: 30, price: 1 })
          .expect(201)
      ).body;
      await owner
        .patch(`/services/${inactive.id}`)
        .send({ active: false })
        .expect(200);
      await book(
        { serviceId: inactive.id, startsAt: TEN, ...customer },
        'tiem-hai',
      ).expect(404);
    });
  });
});
