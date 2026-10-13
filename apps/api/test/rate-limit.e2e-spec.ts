import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers.js';

describe('Rate limiting and security headers (e2e)', () => {
  let app: INestApplication;
  let previous: string | undefined;

  beforeAll(async () => {
    // Các test khác tắt rate limit; riêng file này bật lại để kiểm tra nó thật sự chạy
    previous = process.env.RATE_LIMIT_DISABLED;
    process.env.RATE_LIMIT_DISABLED = 'false';
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    process.env.RATE_LIMIT_DISABLED = previous;
  });

  const login = (ip?: string) => {
    const req = request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });
    return ip ? req.set('X-Forwarded-For', ip) : req;
  };

  it('stops password guessing after 10 attempts in a minute', async () => {
    for (let i = 0; i < 10; i++) {
      await login().expect(401);
    }
    const blocked = await login().expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('cannot be dodged by faking X-Forwarded-For, because the API does not trust it by default', async () => {
    // Giới hạn của IP này đã dùng hết ở test trên; đổi header cũng không được làm mới
    await login('203.0.113.7').expect(429);
    await login('198.51.100.9').expect(429);
  });

  it('does not let the login limit leak onto other routes', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer())
      .get('/public/businesses/does-not-exist')
      .expect(404);
  });

  it('never rate limits the health check, which hosting platforms poll constantly', async () => {
    for (let i = 0; i < 130; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });

  it('limits anonymous booking attempts separately and harder than reads', async () => {
    // Body sai nên trả 400, nhưng guard chạy trước validation nên vẫn bị đếm
    const attempt = () =>
      request(app.getHttpServer())
        .post('/public/businesses/some-shop/appointments')
        .send({});
    for (let i = 0; i < 10; i++) {
      await attempt().expect(400);
    }
    await attempt().expect(429);
  });

  it('has a generous overall ceiling that normal browsing never reaches', async () => {
    const read = () =>
      request(app.getHttpServer()).get('/public/businesses/does-not-exist');
    // 1 request đã dùng ở test "không rò rỉ" ở trên
    for (let i = 0; i < 119; i++) {
      await read().expect(404);
    }
    await read().expect(429);
  });

  it('sends standard security headers', async () => {
    // Đã bị chặn bởi rate limit ở trên nên dùng /health (được miễn) để đọc header
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
