// Kiểu dữ liệu và các hàm thuần (không phụ thuộc React) cho trang quản lý lịch hẹn.

export type AppointmentStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

/** Hình dạng API trả về ở GET/POST /public/appointments/:token */
export type ManagedAppointment = {
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  canChange: boolean;
  changeDeadline: string;
  customer: { name: string; timezone: string };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
    currency: string;
  };
  business: { name: string; slug: string; timezone: string };
};

export type Slot = { startsAt: string; endsAt: string; time: string };
export type SlotDay = { date: string; slots: Slot[] };
export type SlotsResponse = { viewerTimezone: string; days: SlotDay[] };

/** "09:30, Thứ Hai, 07/01/2030" – giờ hiển thị theo múi giờ `timeZone`. */
export function formatDateTime(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('hour')}:${get('minute')}, ${get('weekday')}, ${get('day')}/${get('month')}/${get('year')}`;
}

/** Tách một thời điểm thành các phần để dựng "tờ lịch": thứ, ngày, tháng, giờ (theo múi giờ `timeZone`). */
export function dateParts(
  iso: string,
  timeZone: string,
): { weekday: string; day: string; month: string; time: string } {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    weekday: get('weekday'),
    day: get('day'),
    month: `Tháng ${get('month')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/**
 * Hai múi giờ có cho cùng giờ địa phương tại thời điểm `iso` không. So theo kết quả chứ không so tên,
 * vì nhiều tên là một nơi (Asia/Saigon = Asia/Ho_Chi_Minh) và hai nơi khác tên có thể cùng giờ.
 */
export function sameLocalTime(iso: string, zoneA: string, zoneB: string): boolean {
  const key = (timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso));
  return key(zoneA) === key(zoneB);
}

/** "07:30" – chỉ phần giờ, theo múi giờ `timeZone`. */
export function formatTimeOfDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(
    price,
  );
}

/** "2030-01-07" -> "Thứ Hai, 07/01". Ngày lịch thuần tuý nên không phụ thuộc múi giờ. */
export function formatDayLabel(dateKey: string): string {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).formatToParts(new Date(`${dateKey}T00:00:00Z`));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('weekday')}, ${get('day')}/${get('month')}`;
}

/** Cộng/trừ ngày trên một ngày lịch "YYYY-MM-DD". */
export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Hôm nay là ngày nào (YYYY-MM-DD) theo múi giờ `timeZone`. */
export function todayIn(timeZone: string, now = new Date()): string {
  // Locale en-CA định dạng ngày đúng kiểu YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

/** Lấy thông báo lỗi từ phản hồi lỗi của API (message có thể là chuỗi hoặc mảng chuỗi). */
export function errorMessage(body: unknown, fallback: string): string {
  const message = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  if (typeof message === 'string') return message;
  return fallback;
}
