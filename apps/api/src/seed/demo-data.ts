import { DateTime } from 'luxon';

// Dữ liệu cho tài khoản demo. Là hàm/hằng thuần (không đụng database) để test được: script
// prisma/seed.ts chỉ việc ghi những gì ở đây vào database.

export const DEMO = {
  email: 'demo@gnoud.dev',
  password: 'demo-password-123',
  ownerName: 'Nguyễn Đại Dương',
  business: {
    name: 'Salon Hà Nội',
    slug: 'salon-demo',
    description:
      'Salon tóc nhỏ giữa lòng Hà Nội: cắt, uốn, nhuộm và gội đầu dưỡng sinh. Đặt lịch trước để không phải chờ.',
    timezone: 'Asia/Ho_Chi_Minh',
  },
} as const;

export const DEMO_SERVICES = [
  {
    name: 'Cắt tóc nam',
    description: 'Cắt, gội và tạo kiểu cơ bản.',
    durationMinutes: 45,
    price: 120_000,
  },
  {
    name: 'Uốn tóc',
    description: 'Uốn xoăn nhẹ hoặc xoăn sóng lớn, đã gồm dưỡng tóc.',
    durationMinutes: 120,
    price: 650_000,
  },
  {
    name: 'Nhuộm tóc',
    description: 'Nhuộm toàn đầu với thuốc không amoniac.',
    durationMinutes: 90,
    price: 480_000,
  },
  {
    name: 'Gội đầu dưỡng sinh',
    description: 'Massage đầu, cổ, vai gáy thư giãn.',
    durationMinutes: 60,
    price: 220_000,
  },
] as const;

const WEEKDAY_HOURS = [
  { start: '09:00', end: '12:00' },
  { start: '13:00', end: '17:30' },
];

/** Thứ Hai–Thứ Sáu 09:00–12:00 và 13:00–17:30 (nghỉ trưa); Thứ Bảy 09:00–13:00; Chủ Nhật nghỉ. */
export const DEMO_HOURS = [
  ...[1, 2, 3, 4, 5].flatMap((dayOfWeek) =>
    WEEKDAY_HOURS.map((interval) => ({ dayOfWeek, ...interval })),
  ),
  { dayOfWeek: 6, start: '09:00', end: '13:00' },
];

// Mẫu lịch hẹn của một tuần: [thứ (0 = Thứ Hai), giờ bắt đầu, chỉ số dịch vụ, khách, múi giờ khách, huỷ?]
type Template = [number, string, number, string, string, boolean?];
const WEEK_TEMPLATE: Template[] = [
  [0, '09:00', 0, 'Nguyễn Minh Anh', 'Asia/Ho_Chi_Minh'],
  [0, '10:00', 1, 'Trần Quốc Bảo', 'Asia/Ho_Chi_Minh'],
  [0, '14:00', 3, 'Lê Thu Hà', 'Asia/Ho_Chi_Minh'],
  [1, '09:30', 0, 'Phạm Gia Huy', 'Asia/Ho_Chi_Minh'],
  [1, '09:30', 0, 'Yuki Tanaka', 'Asia/Tokyo', true],
  [1, '11:00', 3, 'Đỗ Khánh Linh', 'Asia/Ho_Chi_Minh'],
  [1, '15:00', 2, 'Bùi Thanh Tùng', 'Asia/Ho_Chi_Minh'],
  [2, '10:00', 0, 'Vũ Hải Yến', 'Asia/Ho_Chi_Minh'],
  [2, '13:00', 1, 'Ngô Bảo Châu', 'Asia/Ho_Chi_Minh'],
  [3, '09:00', 0, 'Đặng Quốc Việt', 'Asia/Ho_Chi_Minh'],
  [3, '14:00', 2, 'Camille Laurent', 'Europe/Paris'],
  [3, '16:00', 3, 'Hoàng Nam', 'Asia/Ho_Chi_Minh'],
  [4, '11:00', 0, 'Lý Mai Phương', 'Asia/Ho_Chi_Minh'],
  [4, '14:30', 2, 'Trịnh Công Sơn', 'Asia/Ho_Chi_Minh', true],
  [5, '09:00', 1, 'Phan Ngọc Ánh', 'Asia/Ho_Chi_Minh'],
];

export type DemoAppointment = {
  serviceIndex: number;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  customerEmail: string;
  customerTimezone: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
};

const emailOf = (name: string) =>
  `${name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')}@example.com`;

/**
 * Lịch hẹn demo cho tuần hiện tại và tuần sau (tính theo ngày của cơ sở). Lịch đã qua thì là
 * "hoàn thành" (trừ lịch cố ý để huỷ), lịch chưa tới thì "đã xác nhận" - nhờ vậy dữ liệu luôn
 * trông hợp lý bất kể chạy seed vào ngày nào.
 */
export function buildDemoAppointments(
  now: Date,
  timezone: string,
  durations: number[],
): DemoAppointment[] {
  const monday = DateTime.fromJSDate(now, { zone: timezone }).startOf('week');
  const createdCap = now.getTime() - 2 * 3_600_000;

  return [0, 7].flatMap((weekOffset) =>
    WEEK_TEMPLATE.map(
      ([day, time, serviceIndex, name, customerTimezone, cancelled]) => {
        const [hour, minute] = time.split(':').map(Number);
        const start = monday
          .plus({ days: weekOffset + day })
          .set({ hour, minute, second: 0, millisecond: 0 });
        const startsAt = start.toJSDate();
        const endsAt = start
          .plus({ minutes: durations[serviceIndex] })
          .toJSDate();

        return {
          serviceIndex,
          startsAt,
          endsAt,
          customerName: name,
          customerEmail: emailOf(name),
          customerTimezone,
          status: cancelled
            ? 'CANCELLED'
            : startsAt < now
              ? 'COMPLETED'
              : 'CONFIRMED',
          // Đặt từ 3 ngày trước giờ hẹn, nhưng không bao giờ ở tương lai
          createdAt: new Date(
            Math.min(startsAt.getTime() - 3 * 86_400_000, createdCap),
          ),
        } as const;
      },
    ),
  );
}
