import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const EMAIL_DOMAIN = '@auth-e2e.test';
const validBody = {
  email: `owner${EMAIL_DOMAIN}`,
  password: 'correct-horse-battery',
  name: 'Chủ Tiệm',
  businessName: 'Tiệm Tóc Đẹp',
};

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const cleanup = () =>
    prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(cleanup);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('registers an owner, creates a business and sets an httpOnly cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validBody)
      .expect(201);

    expect(res.body).toMatchObject({
      email: validBody.email,
      name: validBody.name,
      businesses: [{ name: 'Tiệm Tóc Đẹp', slug: 'tiem-toc-dep' }],
    });
    expect(res.body.passwordHash).toBeUndefined();

    const cookie = res.get('Set-Cookie')?.[0] ?? '';
    expect(cookie).toContain('access_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('does not store the password in plain text', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(validBody);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: validBody.email },
    });
    expect(user.passwordHash).not.toContain(validBody.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('gives a second business with the same name a different slug', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(validBody);
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validBody, email: `other${EMAIL_DOMAIN}` })
      .expect(201);

    expect(res.body.businesses[0].slug).toMatch(/^tiem-toc-dep-[0-9a-f]{4}$/);
  });

  it('rejects a duplicate email (case-insensitive)', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(validBody);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validBody, email: validBody.email.toUpperCase() })
      .expect(409);
  });

  it('rejects invalid input', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/auth/register')
      .send({ ...validBody, email: 'not-an-email' })
      .expect(400);
    await request(server)
      .post('/auth/register')
      .send({ ...validBody, password: 'short' })
      .expect(400);
    await request(server)
      .post('/auth/register')
      .send({ ...validBody, isAdmin: true })
      .expect(400);
  });

  it('logs in, reads /auth/me with the cookie, then logs out', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(validBody);

    const agent = request.agent(app.getHttpServer()); // giữ cookie giữa các request
    await agent
      .post('/auth/login')
      .send({ email: validBody.email, password: validBody.password })
      .expect(200);

    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.email).toBe(validBody.email);

    await agent.post('/auth/logout').expect(204);
    await agent.get('/auth/me').expect(401);
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(validBody);
    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: validBody.email, password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `nobody${EMAIL_DOMAIN}`, password: 'whatever-123' })
      .expect(401);

    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('protects /auth/me', async () => {
    const server = app.getHttpServer();
    await request(server).get('/auth/me').expect(401);
    await request(server)
      .get('/auth/me')
      .set('Cookie', 'access_token=forged.token.value')
      .expect(401);
  });
});
