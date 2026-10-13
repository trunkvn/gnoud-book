/** Nhắc khách trước giờ hẹn bao nhiêu giờ */
export const REMINDER_LEAD_HOURS = 24;

/** Một lượt quét xếp tối đa bao nhiêu job nhắc lịch */
export const REMINDER_SWEEP_BATCH = 500;

/** Mặc định quét mỗi 5 phút (đổi bằng REMINDER_SWEEP_CRON trong .env) */
export const DEFAULT_REMINDER_SWEEP_CRON = '*/5 * * * *';

/**
 * Lịch hẹn bắt đầu sau `now` hơn 24 giờ thì vẫn còn chờ tới lượt được nhắc.
 * Còn lại (sát giờ) thì thôi: khách vừa đặt hoặc vừa đổi lịch, không cần nhắc ngay.
 */
export function needsReminder(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() - now.getTime() > REMINDER_LEAD_HOURS * 3_600_000;
}
