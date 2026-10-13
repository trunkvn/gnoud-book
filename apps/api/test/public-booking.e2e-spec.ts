import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { createTestApp, registerOwner } from './helpers.js';

const EMAIL_DOMAIN = '@public-e2e.test';
const SLUG = 'tiem-slot-test';
// 2030-01-07 là Thứ hai. Cơ sở ở Asia/Ho_Chi_Minh (UTC+7): 09:00 giờ VN = 02:00 UTC.
const MONDAY = '2030-01-07';

describe('Public booking: business info & slots (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let businessId: string;
  let serviceId: string;

  const cleanup = () =>
    prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });

  const slots = (query: Record<string, string>, slug = SLUG) =>
    request(app.getHttpServer())
      .get(`/public/businesses/${slug}/slots`)
      .query(query);

  const times = (day: { slots: { time: string }[] }) =>
    day.slots.map((s) => s.time);

  /** Đặt lịch trực tiếp vào DB (Step 6 mới làm API đặt lịch) */
  const book = (
    startsAt: string,
    endsAt: string,
    overrides: {
      status?: 'CONFIRMED' | 'CANCELLED';
      businessId?: string;
      serviceId?: string;
    } = {},
  ) =>
    prisma.appointment.create({
      data: {
        businessId: overrides.businessId ?? businessId,
        serviceId: overrides.serviceId ?? serviceId,
        status: overrides.status ?? 'CONFIRMED',
        customerName: 'Khách',
        customerEmail: 'khach@example.com',
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
      },
    });

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanup();
    const owner = await registerOwner(
      app,
      `owner${EMAIL_DOMAIN}`,
      'Tiệm Slot Test',
    );
    // slug được sinh từ tên; ép về slug cố định cho dễ viết test
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

  describe('GET /public/businesses/:slug', () => {
    it('shows public info without logging in, hiding inactive services and private fields', async () => {
      const owner = await registerOwner(
        app,
        `owner2${EMAIL_DOMAIN}`,
        'Tiệm Hai',
      );
      const hidden = (
        await owner
          .post('/services')
          .send({ name: 'Đã ngừng', durationMinutes: 30, price: 1 })
          .expect(201)
      ).body;
      await owner
        .patch(`/services/${hidden.id}`)
        .send({ active: false })
        .expect(200);
      await owner
        .post('/services')
        .send({ name: 'Gội đầu', durationMinutes: 20, price: 50000 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/public/businesses/tiem-hai')
        .expect(200);

      expect(res.body.name).toBe('Tiệm Hai');
      expect(res.body.services.map((s: { name: string }) => s.name)).toEqual([
        'Gội đầu',
      ]);
      expect(res.body.ownerId).toBeUndefined();
      expect(res.body.id).toBeUndefined();
    });

    it('returns 404 for an unknown slug', async () => {
      await request(app.getHttpServer())
        .get('/public/businesses/khong-ton-tai')
        .expect(404);
    });
  });

  describe('GET /public/businesses/:slug/slots', () => {
    it('lists open slots in the business timezone by default', async () => {
      const res = await slots({ serviceId, from: MONDAY, to: MONDAY }).expect(
        200,
      );

      expect(res.body.viewerTimezone).toBe('Asia/Ho_Chi_Minh');
      expect(res.body.service).toMatchObject({
        id: serviceId,
        durationMinutes: 60,
      });
      expect(res.body.days).toHaveLength(1);
      // 60 phút: sáng 09:00–11:00 (5 slot), chiều 13:00–16:00 (7 slot)
      expect(times(res.body.days[0])).toEqual([
        '09:00',
        '09:30',
        '10:00',
        '10:30',
        '11:00',
        '13:00',
        '13:30',
        '14:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00',
      ]);
      // thời điểm trả về là UTC: 09:00 giờ VN = 02:00Z
      expect(res.body.days[0].slots[0]).toEqual({
        startsAt: '2030-01-07T02:00:00.000Z',
        endsAt: '2030-01-07T03:00:00.000Z',
        time: '09:00',
      });
    });

    it('shows the same slots shifted into the viewer timezone', async () => {
      const res = await slots({
        serviceId,
        from: MONDAY,
        to: MONDAY,
        timezone: 'Asia/Tokyo', // sớm hơn VN 2 giờ
      }).expect(200);

      expect(res.body.viewerTimezone).toBe('Asia/Tokyo');
      expect(times(res.body.days[0])[0]).toBe('11:00'); // 09:00 VN
      expect(res.body.days[0].slots[0].startsAt).toBe(
        '2030-01-07T02:00:00.000Z',
      ); // cùng thời điểm
    });

    it("groups slots by the viewer's calendar day, which can differ from the business day", async () => {
      // Los Angeles (UTC-8) chậm hơn VN 15 giờ: Thứ hai ở VN trải dài qua Chủ nhật và Thứ hai ở LA
      const res = await slots({
        serviceId,
        from: '2030-01-06',
        to: '2030-01-07',
        timezone: 'America/Los_Angeles',
      }).expect(200);

      const [sunday, monday] = res.body.days;
      expect(sunday.date).toBe('2030-01-06');
      expect(times(sunday)).toEqual([
        '18:00',
        '18:30',
        '19:00',
        '19:30',
        '20:00', // 09:00–11:00 VN
        '22:00',
        '22:30',
        '23:00',
        '23:30', // 13:00–14:30 VN
      ]);
      expect(monday.date).toBe('2030-01-07');
      expect(times(monday)).toEqual(['00:00', '00:30', '01:00']); // 15:00–16:00 VN
    });

    it('returns every day in the range, empty when the business is closed', async () => {
      const res = await slots({
        serviceId,
        from: '2030-01-07',
        to: '2030-01-09',
      }).expect(200);
      expect(res.body.days.map((d: { date: string }) => d.date)).toEqual([
        '2030-01-07',
        '2030-01-08',
        '2030-01-09',
      ]);
      expect(res.body.days[1].slots).toEqual([]);
      expect(res.body.days[2].slots).toEqual([]);
    });

    it('offers nothing in the past', async () => {
      const res = await slots({
        serviceId,
        from: '2020-01-06',
        to: '2020-01-06',
      }).expect(200);
      expect(res.body.days[0].slots).toEqual([]);
    });

    it('removes slots overlapping a confirmed appointment', async () => {
      await book('2030-01-07T03:00:00Z', '2030-01-07T04:00:00Z'); // 10:00–11:00 VN

      const res = await slots({ serviceId, from: MONDAY, to: MONDAY }).expect(
        200,
      );
      expect(times(res.body.days[0]).slice(0, 3)).toEqual([
        '09:00',
        '11:00',
        '13:00',
      ]);
    });

    it("ignores cancelled appointments and other businesses' appointments", async () => {
      await book('2030-01-07T03:00:00Z', '2030-01-07T04:00:00Z', {
        status: 'CANCELLED',
      });

      const other = await registerOwner(
        app,
        `other${EMAIL_DOMAIN}`,
        'Tiệm Khác',
      );
      const otherBusiness = (await other.get('/business').expect(200)).body;
      const otherService = (
        await other
          .post('/services')
          .send({ name: 'Dịch vụ', durationMinutes: 60, price: 1 })
          .expect(201)
      ).body;
      await book('2030-01-07T03:00:00Z', '2030-01-07T04:00:00Z', {
        businessId: otherBusiness.id,
        serviceId: otherService.id,
      });

      const res = await slots({ serviceId, from: MONDAY, to: MONDAY }).expect(
        200,
      );
      expect(res.body.days[0].slots).toHaveLength(12);
    });

    it('accounts for an appointment that starts right after the requested range', async () => {
      // Khoảng tìm: chỉ Chủ nhật 06/01 theo giờ LA, kết thúc lúc 15:00 giờ VN Thứ hai.
      // Lịch hẹn 15:00–16:00 VN bắt đầu đúng sau biên đó, nhưng vẫn đè lên slot 14:30–15:30.
      await book('2030-01-07T08:00:00Z', '2030-01-07T09:00:00Z');

      const res = await slots({
        serviceId,
        from: '2030-01-06',
        to: '2030-01-06',
        timezone: 'America/Los_Angeles',
      }).expect(200);

      const sunday = times(res.body.days[0]);
      expect(sunday).toContain('23:00'); // 14:00–15:00 VN: chạm đầu, vẫn đặt được
      expect(sunday).not.toContain('23:30'); // 14:30–15:30 VN: đè lên lịch hẹn
    });

    it('rejects bad input', async () => {
      const bad = (query: Record<string, string>) => slots(query).expect(400);

      await bad({}); // thiếu serviceId
      await bad({ serviceId: 'not-a-uuid' });
      await bad({ serviceId, from: '07/01/2030' }); // sai định dạng
      await bad({ serviceId, from: '2030-02-30' }); // đúng định dạng nhưng không có ngày này
      await bad({ serviceId, from: '2030-01-09', to: '2030-01-07' }); // to trước from
      await bad({ serviceId, from: '2030-01-01', to: '2030-03-01' }); // quá 31 ngày
      await bad({ serviceId, timezone: 'Mars/Olympus' });
    });

    it("returns 404 for an unknown business, unknown service, inactive service or another business's service", async () => {
      await slots({ serviceId }, 'khong-ton-tai').expect(404);
      await slots({ serviceId: '01a1333d-ae2f-71bb-9fc5-e9973236642b' }).expect(
        404,
      );

      const owner = await registerOwner(
        app,
        `owner3${EMAIL_DOMAIN}`,
        'Tiệm Ba',
      );
      const foreign = (
        await owner
          .post('/services')
          .send({ name: 'Của tiệm khác', durationMinutes: 30, price: 1 })
          .expect(201)
      ).body;
      await slots({ serviceId: foreign.id }).expect(404); // dịch vụ thuộc cơ sở khác

      const ownerAgent = await registerOwner(
        app,
        `owner4${EMAIL_DOMAIN}`,
        'Tiệm Bốn',
      );
      const inactive = (
        await ownerAgent
          .post('/services')
          .send({ name: 'Tắt', durationMinutes: 30, price: 1 })
          .expect(201)
      ).body;
      await ownerAgent
        .patch(`/services/${inactive.id}`)
        .send({ active: false })
        .expect(200);
      await slots({ serviceId: inactive.id }, 'tiem-bon').expect(404);
    });
  });
});
