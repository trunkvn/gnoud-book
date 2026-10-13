import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { createTestApp, fakeJobs, fakeMail, registerOwner } from './helpers.js';

const EMAIL_DOMAIN = '@owner-appointments-e2e.test';
const HOUR = 3_600_000;
const UNKNOWN_ID = '01a1333d-ae2f-71bb-9fc5-e9973236642b';

describe('Owner appointment management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let alice: Awaited<ReturnType<typeof registerOwner>>;
  let bob: Awaited<ReturnType<typeof registerOwner>>;
  let aliceBusinessId: string;
  let aliceServiceId: string;

  const cleanup = () =>
    prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });

  /** Ghi thẳng một lịch hẹn vào cơ sở của Alice (khách đặt qua API đã có test riêng) */
  const appointment = (
    startsAt: Date,
    overrides: {
      status?: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
      customerName?: string;
    } = {},
  ) =>
    prisma.appointment.create({
      data: {
        businessId: aliceBusinessId,
        serviceId: aliceServiceId,
        customerName: overrides.customerName ?? 'Minh',
        customerEmail: 'minh@example.com',
        customerTimezone: 'Asia/Tokyo',
        status: overrides.status,
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR),
      },
    });

  const list = (agent: typeof alice, query: Record<string, string>) =>
    agent.get('/appointments').query(query);

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanup();
    fakeMail(app).sent = [];
    fakeJobs(app).queued = [];
    alice = await registerOwner(app, `alice${EMAIL_DOMAIN}`, 'Tiệm Alice');
    bob = await registerOwner(app, `bob${EMAIL_DOMAIN}`, 'Tiệm Bob');
    aliceBusinessId = (await alice.get('/business').expect(200)).body.id;
    aliceServiceId = (
      await alice
        .post('/services')
        .send({ name: 'Cắt tóc', durationMinutes: 60, price: 100000 })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it.each([
    ['get', '/appointments?from=2030-01-07&to=2030-01-13'],
    ['post', `/appointments/${UNKNOWN_ID}/cancel`],
    ['post', `/appointments/${UNKNOWN_ID}/complete`],
  ] as const)('%s %s requires login', async (method, url) => {
    await request(app.getHttpServer())[method](url).expect(401);
  });

  describe('listing', () => {
    it('returns appointments in the range, soonest first, with every status', async () => {
      await appointment(new Date('2030-01-08T03:00:00Z'), {
        customerName: 'Sau',
      });
      await appointment(new Date('2030-01-07T02:00:00Z'), {
        customerName: 'Trước',
      });
      await appointment(new Date('2030-01-09T02:00:00Z'), {
        status: 'CANCELLED',
        customerName: 'Đã huỷ',
      });
      await appointment(new Date('2030-02-20T02:00:00Z'), {
        customerName: 'Ngoài khoảng',
      });

      const res = await list(alice, {
        from: '2030-01-07',
        to: '2030-01-13',
      }).expect(200);

      expect(res.body.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(
        res.body.appointments.map(
          (a: { customer: { name: string } }) => a.customer.name,
        ),
      ).toEqual(['Trước', 'Sau', 'Đã huỷ']);
      expect(res.body.appointments[0]).toEqual({
        id: expect.any(String),
        status: 'CONFIRMED',
        startsAt: '2030-01-07T02:00:00.000Z',
        endsAt: '2030-01-07T03:00:00.000Z',
        cancelledAt: null,
        customer: {
          name: 'Trước',
          email: 'minh@example.com',
          timezone: 'Asia/Tokyo',
        },
        service: { id: aliceServiceId, name: 'Cắt tóc', durationMinutes: 60 },
      });
    });

    it("splits days at midnight in the business's timezone, not UTC", async () => {
      // 00:30 ngày 07/01 giờ VN = 17:30 UTC ngày 06/01
      await appointment(new Date('2030-01-06T17:30:00Z'), {
        customerName: 'Nửa đêm',
      });

      const onThe7th = await list(alice, {
        from: '2030-01-07',
        to: '2030-01-07',
      }).expect(200);
      const onThe6th = await list(alice, {
        from: '2030-01-06',
        to: '2030-01-06',
      }).expect(200);

      expect(onThe7th.body.appointments).toHaveLength(1);
      expect(onThe6th.body.appointments).toHaveLength(0);
    });

    it('never exposes the customer-only manage token', async () => {
      await appointment(new Date('2030-01-07T02:00:00Z'));
      const res = await list(alice, { from: '2030-01-07', to: '2030-01-07' });
      expect(JSON.stringify(res.body)).not.toContain('manageToken');
    });

    it("does not show another owner's appointments", async () => {
      await appointment(new Date('2030-01-07T02:00:00Z'));

      const res = await list(bob, {
        from: '2030-01-07',
        to: '2030-01-13',
      }).expect(200);
      expect(res.body.appointments).toEqual([]);
    });

    it('rejects a missing, malformed, inverted or oversized range', async () => {
      const bad = (query: Record<string, string>) =>
        list(alice, query).expect(400);

      await bad({});
      await bad({ from: '2030-01-07' });
      await bad({ from: '07/01/2030', to: '2030-01-13' });
      await bad({ from: '2030-02-30', to: '2030-03-05' }); // đúng dạng nhưng không có ngày này
      await bad({ from: '2030-01-13', to: '2030-01-07' });
      await bad({ from: '2030-01-01', to: '2030-04-01' }); // quá 62 ngày
    });
  });

  describe('cancelling', () => {
    it('cancels, tells the customer, and frees the slot for others', async () => {
      const { id } = await appointment(new Date('2030-01-07T02:00:00Z'));

      const res = await alice.post(`/appointments/${id}/cancel`).expect(200);

      expect(res.body).toMatchObject({ id, status: 'CANCELLED' });
      expect(res.body.cancelledAt).toEqual(expect.any(String));
      await fakeJobs(app).drain();
      expect(fakeMail(app).sent).toHaveLength(1);
      expect(fakeMail(app).sent[0].subject).toContain('Đã huỷ lịch hẹn');
      expect(fakeMail(app).sent[0].to).toBe('minh@example.com');

      // Slot được trả lại: có thể ghi một lịch CONFIRMED khác vào đúng giờ đó
      await expect(
        appointment(new Date('2030-01-07T02:00:00Z')),
      ).resolves.toBeDefined();
    });

    it('works even when the appointment is about to start (no customer deadline for the owner)', async () => {
      const { id } = await appointment(new Date(Date.now() + 30 * 60_000));
      await alice.post(`/appointments/${id}/cancel`).expect(200);
    });

    it('is idempotent and sends only one email', async () => {
      const { id } = await appointment(new Date('2030-01-07T02:00:00Z'));

      await alice.post(`/appointments/${id}/cancel`).expect(200);
      await alice.post(`/appointments/${id}/cancel`).expect(200);

      await fakeJobs(app).drain();
      expect(fakeMail(app).sent).toHaveLength(1);
    });

    it('refuses to cancel a completed appointment', async () => {
      const { id } = await appointment(new Date(Date.now() - 3 * HOUR), {
        status: 'COMPLETED',
      });
      await alice.post(`/appointments/${id}/cancel`).expect(409);
    });

    it("returns 404 for another owner's appointment and for unknown ids", async () => {
      const { id } = await appointment(new Date('2030-01-07T02:00:00Z'));

      await bob.post(`/appointments/${id}/cancel`).expect(404);
      await alice.post(`/appointments/${UNKNOWN_ID}/cancel`).expect(404);
      await alice.post('/appointments/not-a-uuid/cancel').expect(400);

      const still = await prisma.appointment.findUniqueOrThrow({
        where: { id },
      });
      expect(still.status).toBe('CONFIRMED');
    });
  });

  describe('completing', () => {
    it('marks an appointment that already started as completed', async () => {
      const { id } = await appointment(new Date(Date.now() - 3 * HOUR));

      const res = await alice.post(`/appointments/${id}/complete`).expect(200);

      expect(res.body.status).toBe('COMPLETED');
    });

    it('is idempotent', async () => {
      const { id } = await appointment(new Date(Date.now() - 3 * HOUR));
      await alice.post(`/appointments/${id}/complete`).expect(200);
      await alice.post(`/appointments/${id}/complete`).expect(200);
    });

    it('refuses an appointment that has not started yet or was cancelled', async () => {
      const future = await appointment(new Date('2030-01-07T02:00:00Z'));
      const cancelled = await appointment(new Date(Date.now() - 5 * HOUR), {
        status: 'CANCELLED',
      });

      await alice.post(`/appointments/${future.id}/complete`).expect(409);
      await alice.post(`/appointments/${cancelled.id}/complete`).expect(409);
    });

    it("returns 404 for another owner's appointment", async () => {
      const { id } = await appointment(new Date(Date.now() - 3 * HOUR));
      await bob.post(`/appointments/${id}/complete`).expect(404);
    });
  });
});
