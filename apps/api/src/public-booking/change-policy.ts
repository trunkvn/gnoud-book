import { CHANGE_CUTOFF_HOURS } from './booking-rules.js';

const HOUR_MS = 3_600_000;

/** Hạn chót để khách huỷ hoặc đổi lịch: trước giờ hẹn CHANGE_CUTOFF_HOURS giờ. */
export function changeDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() - CHANGE_CUTOFF_HOURS * HOUR_MS);
}

/** Khách còn được huỷ/đổi lịch hẹn này không? (đúng hạn chót thì đã là quá muộn) */
export function canChange(
  appointment: { status: string; startsAt: Date },
  now: Date,
): boolean {
  return (
    appointment.status === 'CONFIRMED' &&
    now.getTime() < changeDeadline(appointment.startsAt).getTime()
  );
}
