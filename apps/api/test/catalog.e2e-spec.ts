import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { createTestApp, registerOwner } from './helpers.js';

const EMAIL_DOMAIN = '@catalog-e2e.test';
const haircut = { name: 'Cắt tóc', durationMinutes: 30, price: 100000 };

describe('Services & working hours (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const cleanup = () =>
    prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    prisma = app.get(PrismaService);
  });
  beforeEach(cleanup);
  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('authentication', () => {
    it.each([
      ['get', '/services'],
      ['post', '/services'],
      ['get', '/working-hours'],
      ['put', '/working-hours'],
      ['get', '/business'],
    ] as const)('%s %s requires login', async (method, url) => {
      await request(app.getHttpServer())[method](url).expect(401);
    });
  });

  describe('services', () => {
    it('creates, lists, updates and deletes a service', async () => {
      const owner = await registerOwner(app, `a${EMAIL_DOMAIN}`);

      const created = await owner.post('/services').send(haircut).expect(201);
      expect(created.body).toMatchObject({
        ...haircut,
        currency: 'VND',
        active: true,
      });

      const list = await owner.get('/services').expect(200);
      expect(list.body).toHaveLength(1);

      const updated = await owner
        .patch(`/services/${created.body.id}`)
        .send({ price: 120000, active: false })
        .expect(200);
      expect(updated.body).toMatchObject({ price: 120000, active: false });
      expect(updated.body.name).toBe('Cắt tóc'); // field không gửi thì giữ nguyên

      await owner.delete(`/services/${created.body.id}`).expect(204);
      expect((await owner.get('/services')).body).toHaveLength(0);
    });

    it('validates input', async () => {
      const owner = await registerOwner(app, `a${EMAIL_DOMAIN}`);
      const bad = (body: object) =>
        owner.post('/services').send(body).expect(400);

      await bad({ ...haircut, name: '   ' });
      await bad({ ...haircut, durationMinutes: 3 });
      await bad({ ...haircut, durationMinutes: 30.5 });
      await bad({ ...haircut, price: -1 });
      await bad({ ...haircut, currency: 'vnd' });
      await bad({ ...haircut, businessId: 'someone-elses' }); // field lạ bị từ chối
      await owner.patch('/services/not-a-uuid').send({}).expect(400);
    });

    it("never lets one owner see or change another owner's services", async () => {
      const alice = await registerOwner(
        app,
        `alice${EMAIL_DOMAIN}`,
        'Tiệm Alice',
      );
      const bob = await registerOwner(app, `bob${EMAIL_DOMAIN}`, 'Tiệm Bob');

      const aliceService = (
        await alice.post('/services').send(haircut).expect(201)
      ).body;

      expect((await bob.get('/services').expect(200)).body).toEqual([]);
      await bob
        .patch(`/services/${aliceService.id}`)
        .send({ price: 1 })
        .expect(404);
      await bob.delete(`/services/${aliceService.id}`).expect(404);

      // và dịch vụ của Alice vẫn nguyên vẹn
      const after = await alice.get('/services').expect(200);
      expect(after.body[0]).toMatchObject({
        id: aliceService.id,
        price: 100000,
      });
    });

    it('refuses to delete a service that already has appointments', async () => {
      const owner = await registerOwner(app, `a${EMAIL_DOMAIN}`);
      const service = (await owner.post('/services').send(haircut).expect(201))
        .body;
      const business = (await owner.get('/business').expect(200)).body;

      await prisma.appointment.create({
        data: {
          businessId: business.id,
          serviceId: service.id,
          customerName: 'Khách',
          customerEmail: 'khach@example.com',
          startsAt: new Date('2030-01-01T02:00:00Z'),
          endsAt: new Date('2030-01-01T02:30:00Z'),
        },
      });

      await owner.delete(`/services/${service.id}`).expect(409);
      // thay vào đó có thể tắt dịch vụ
      await owner
        .patch(`/services/${service.id}`)
        .send({ active: false })
        .expect(200);
    });
  });

  describe('working hours', () => {
    it('starts empty, then stores a weekly schedule with a lunch break', async () => {
      const owner = await registerOwner(app, `a${EMAIL_DOMAIN}`);

      const empty = await owner.get('/working-hours').expect(200);
      expect(empty.body).toEqual({
        timezone: 'Asia/Ho_Chi_Minh',
        intervals: [],
      });

      const intervals = [
        { dayOfWeek: 1, start: '13:00', end: '17:30' },
        { dayOfWeek: 1, start: '09:00', end: '12:00' },
        { dayOfWeek: 2, start: '09:00', end: '24:00' },
      ];
      const saved = await owner
        .put('/working-hours')
        .send({ intervals })
        .expect(200);

      // trả về đã sắp xếp theo ngày rồi giờ
      expect(saved.body.intervals).toEqual([
        { dayOfWeek: 1, start: '09:00', end: '12:00' },
        { dayOfWeek: 1, start: '13:00', end: '17:30' },
        { dayOfWeek: 2, start: '09:00', end: '24:00' },
      ]);
    });

    it('replaces the previous schedule instead of adding to it', async () => {
      const owner = await registerOwner(app, `a${EMAIL_DOMAIN}`);
      await owner
        .put('/working-hours')
        .send({ intervals: [{ dayOfWeek: 1, start: '09:00', end: '17:00' }] })
        .expect(200);
      const second = await owner
        .put('/working-hours')
        .send({ intervals: [{ dayOfWeek: 3, start: '10:00', end: '16:00' }] })
        .expect(200);

      expect(second.body.intervals).toEqual([
        { dayOfWeek: 3, start: '10:00', end: '16:00' },
      ]);
    });

    it('rejects invalid schedules and leaves the old one untouched', async () => {
      const owner = await registerOwner(app, `a${EMAIL_DOMAIN}`);
      const valid = [{ dayOfWeek: 1, start: '09:00', end: '17:00' }];
      await owner.put('/working-hours').send({ intervals: valid }).expect(200);

      const bad = (intervals: object[]) =>
        owner.put('/working-hours').send({ intervals }).expect(400);

      await bad([{ dayOfWeek: 7, start: '09:00', end: '17:00' }]); // ngày không tồn tại
      await bad([{ dayOfWeek: 1, start: '9:00', end: '17:00' }]); // sai định dạng
      await bad([{ dayOfWeek: 1, start: '24:00', end: '24:00' }]); // 24:00 không được là giờ bắt đầu
      await bad([{ dayOfWeek: 1, start: '17:00', end: '09:00' }]); // kết thúc trước bắt đầu
      await bad([
        { dayOfWeek: 1, start: '09:00', end: '12:00' },
        { dayOfWeek: 1, start: '11:00', end: '15:00' },
      ]); // chồng lấn

      const after = await owner.get('/working-hours').expect(200);
      expect(after.body.intervals).toEqual(valid);
    });

    it("keeps each owner's schedule separate", async () => {
      const alice = await registerOwner(
        app,
        `alice${EMAIL_DOMAIN}`,
        'Tiệm Alice',
      );
      const bob = await registerOwner(app, `bob${EMAIL_DOMAIN}`, 'Tiệm Bob');
      await alice
        .put('/working-hours')
        .send({ intervals: [{ dayOfWeek: 1, start: '09:00', end: '17:00' }] })
        .expect(200);

      expect(
        (await bob.get('/working-hours').expect(200)).body.intervals,
      ).toEqual([]);
    });
  });

  describe('business settings', () => {
    it('updates the name and timezone', async () => {
      const owner = await registerOwner(app, `a${EMAIL_DOMAIN}`);
      const res = await owner
        .patch('/business')
        .send({ name: 'Tiệm Mới', timezone: 'America/Los_Angeles' })
        .expect(200);
      expect(res.body).toMatchObject({
        name: 'Tiệm Mới',
        timezone: 'America/Los_Angeles',
      });
      expect(res.body.slug).toBe('tiem-test'); // slug không đổi theo tên
    });

    it('rejects an unknown timezone', async () => {
      const owner = await registerOwner(app, `a${EMAIL_DOMAIN}`);
      await owner
        .patch('/business')
        .send({ timezone: 'Mars/Olympus' })
        .expect(400);
    });
  });
});
