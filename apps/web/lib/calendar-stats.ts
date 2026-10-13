import { dateKeyIn } from './dates';
import type { OwnerAppointment } from './owner';

export type CalendarStats = {
  /** Số lịch đã xác nhận trong ngày hôm nay (theo múi giờ cơ sở) */
  today: number;
  /** Trong tuần đang xem */
  confirmed: number;
  completed: number;
  cancelled: number;
  /** Lịch đã xác nhận sắp diễn ra gần nhất (có thể nằm ngoài tuần đang xem là không, chỉ xét trong dữ liệu) */
  next: OwnerAppointment | null;
};

/** Thống kê nhanh cho các thẻ tóm tắt phía trên lịch. */
export function summarize(
  appointments: OwnerAppointment[],
  todayKey: string,
  now: Date,
  timeZone: string,
): CalendarStats {
  let today = 0;
  let confirmed = 0;
  let completed = 0;
  let cancelled = 0;
  let next: OwnerAppointment | null = null;

  for (const appointment of appointments) {
    if (appointment.status === 'CANCELLED') {
      cancelled++;
      continue;
    }
    if (appointment.status === 'COMPLETED') {
      completed++;
      continue;
    }

    confirmed++;
    if (dateKeyIn(appointment.startsAt, timeZone) === todayKey) today++;

    const startsAt = new Date(appointment.startsAt);
    if (startsAt >= now && (!next || startsAt < new Date(next.startsAt))) {
      next = appointment;
    }
  }

  return { today, confirmed, completed, cancelled, next };
}
