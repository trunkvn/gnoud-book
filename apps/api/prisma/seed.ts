// Nạp dữ liệu demo: một chủ cơ sở, một cơ sở có dịch vụ, giờ làm việc và lịch hẹn rải trong hai tuần.
// Chạy: pnpm --filter @gnoud-book/api db:seed
// Chạy lại được nhiều lần: mỗi lần xoá tài khoản demo cũ (kéo theo mọi dữ liệu của nó) rồi tạo mới.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  buildDemoAppointments,
  DEMO,
  DEMO_HOURS,
  DEMO_SERVICES,
} from '../src/seed/demo-data.js';

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Từ chối nạp dữ liệu demo ở production. Thêm --force nếu bạn thực sự muốn.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    options: '-c timezone=UTC', // như PrismaService: xem ghi chú ở đó
  }),
});

try {
  // Slug đã bị một cơ sở KHÁC chiếm thì dừng, không đụng vào dữ liệu thật
  const taken = await prisma.business.findUnique({
    where: { slug: DEMO.business.slug },
    include: { owner: true },
  });
  if (taken && taken.owner.email !== DEMO.email) {
    throw new Error(`Slug "${DEMO.business.slug}" đang thuộc về ${taken.owner.email}.`);
  }

  await prisma.user.deleteMany({ where: { email: DEMO.email } });

  const user = await prisma.user.create({
    data: {
      email: DEMO.email,
      passwordHash: await bcrypt.hash(DEMO.password, 10),
      name: DEMO.ownerName,
      businesses: {
        create: {
          ...DEMO.business,
          services: { create: DEMO_SERVICES.map((s) => ({ ...s })) },
          workingHours: {
            create: DEMO_HOURS.map(({ dayOfWeek, start, end }) => ({
              dayOfWeek,
              startMinute: toMinutes(start),
              endMinute: toMinutes(end),
            })),
          },
        },
      },
    },
    include: { businesses: { include: { services: true } } },
  });

  const business = user.businesses[0];
  const serviceIdByName = new Map(business.services.map((s) => [s.name, s.id]));
  const serviceIds = DEMO_SERVICES.map((s) => serviceIdByName.get(s.name)!);

  const appointments = buildDemoAppointments(
    new Date(),
    business.timezone,
    DEMO_SERVICES.map((s) => s.durationMinutes),
  );
  await prisma.appointment.createMany({
    data: appointments.map(({ serviceIndex, ...a }) => ({
      ...a,
      businessId: business.id,
      serviceId: serviceIds[serviceIndex],
    })),
  });

  console.log(`Đã nạp dữ liệu demo: ${appointments.length} lịch hẹn, ${business.services.length} dịch vụ.`);
  console.log(`  Đăng nhập:  ${DEMO.email} / ${DEMO.password}`);
  console.log(`  Trang đặt lịch của khách: /book/${DEMO.business.slug}`);
} finally {
  await prisma.$disconnect();
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
