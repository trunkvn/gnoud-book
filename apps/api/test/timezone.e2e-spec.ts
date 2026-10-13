import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { createTestApp, registerOwner } from './helpers.js';

const EMAIL_DOMAIN = '@timezone-e2e.test';

// Ứng dụng đặt lịch sống chết nhờ thời gian. Các test ở đây KHÔNG đọc dữ liệu qua Prisma mà hỏi
// thẳng bằng SQL, vì Prisma có thể ghi lệch rồi đọc lệch ngược lại, khiến mọi thứ nhìn có vẻ đúng.
describe('Timestamps are stored as the exact UTC instant (e2e)', () => {
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

  it('talks to Postgres in the UTC timezone, whatever the server default is', async () => {
    const [row] = await prisma.$queryRaw<
      { tz: string }[]
    >`SELECT current_setting('TimeZone') AS tz`;
    expect(row.tz).toBe('UTC');
  });

  it('writes a known instant to the database without shifting it', async () => {
    const owner = await registerOwner(app, `owner${EMAIL_DOMAIN}`);
    const business = (await owner.get('/business').expect(200)).body;
    const service = (
      await owner
        .post('/services')
        .send({ name: 'Cắt', durationMinutes: 30, price: 1 })
        .expect(201)
    ).body;

    await prisma.appointment.create({
      data: {
        businessId: business.id,
        serviceId: service.id,
        customerName: 'Khách',
        customerEmail: 'khach@example.com',
        startsAt: new Date('2030-01-07T02:00:00.000Z'),
        endsAt: new Date('2030-01-07T03:00:00.000Z'),
      },
    });

    // Hỏi Postgres: "thời điểm này tính theo UTC là mấy giờ?"
    const [row] = await prisma.$queryRaw<{ starts: string }[]>`
      SELECT to_char("startsAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI') AS starts
      FROM "Appointment" WHERE "businessId" = ${business.id}`;
    expect(row.starts).toBe('2030-01-07T02:00');
  });
});
