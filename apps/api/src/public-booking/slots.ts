import { DateTime } from 'luxon';
import type { MinuteInterval } from '../working-hours/time.js';
import { SLOT_STEP_MINUTES } from './booking-rules.js';

export type TimeRange = { startsAt: Date; endsAt: Date };

export type SlotRequest = {
  /** Múi giờ IANA của cơ sở. Giờ làm việc được hiểu theo múi giờ này. */
  timezone: string;
  /** Giờ làm việc theo tuần (dayOfWeek 0 = Chủ nhật, số phút kể từ 00:00 giờ cơ sở) */
  intervals: MinuteInterval[];
  durationMinutes: number;
  /** Chỉ lấy slot bắt đầu trong khoảng [rangeStart, rangeEnd) – tính theo thời điểm UTC */
  rangeStart: Date;
  rangeEnd: Date;
  /** Các lịch hẹn đang chiếm chỗ */
  busy: TimeRange[];
  /** Slot bắt đầu sớm hơn thời điểm này bị loại (thường là "bây giờ + thời gian báo trước") */
  earliestStart: Date;
  stepMinutes?: number;
};

/**
 * Tính các slot còn trống. Hàm thuần: không đọc database, không đọc đồng hồ,
 * nên test được chính xác. Mọi thời điểm vào/ra đều là UTC.
 */
export function generateSlots(request: SlotRequest): TimeRange[] {
  const {
    timezone,
    intervals,
    durationMinutes,
    rangeStart,
    rangeEnd,
    busy,
    earliestStart,
    stepMinutes = SLOT_STEP_MINUTES,
  } = request;

  const lowerBound = Math.max(rangeStart.getTime(), earliestStart.getTime());
  const slots: TimeRange[] = [];

  // Duyệt từng NGÀY THEO GIỜ CƠ SỞ (không phải ngày UTC) phủ lên khoảng cần tìm.
  let day = DateTime.fromJSDate(rangeStart, { zone: timezone }).startOf('day');
  while (day.toMillis() < rangeEnd.getTime()) {
    const dayOfWeek = day.weekday % 7; // Luxon: 1 = Thứ hai … 7 = Chủ nhật  ->  0 = Chủ nhật
    const dayIntervals = intervals
      .filter((interval) => interval.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startMinute - b.startMinute);

    for (const interval of dayIntervals) {
      // Giờ đóng cửa có thể rơi vào giờ "không tồn tại"; khi đó Luxon đẩy sang giờ kế tiếp, dùng tạm vẫn ổn.
      const intervalEnd = wallClockToInstant(day, interval.endMinute).instant;

      for (
        let minute = interval.startMinute;
        minute < interval.endMinute;
        minute += stepMinutes
      ) {
        const { instant: start, exists } = wallClockToInstant(day, minute);
        if (!exists) continue; // giờ này không tồn tại (nhảy giờ mùa hè)

        const end = start.plus({ minutes: durationMinutes });
        if (end.toMillis() > intervalEnd.toMillis()) break; // không còn vừa khung giờ này nữa

        const startMs = start.toMillis();
        if (startMs < lowerBound || startMs >= rangeEnd.getTime()) continue;
        if (overlapsAny(startMs, end.toMillis(), busy)) continue;

        slots.push({ startsAt: start.toJSDate(), endsAt: end.toJSDate() });
      }
    }

    day = day.plus({ days: 1 }).startOf('day');
  }

  return slots;
}

/**
 * Đổi "ngày D, phút thứ M kể từ 00:00 giờ địa phương" thành một thời điểm cụ thể.
 * `exists` = false nếu giờ đó không có thật (ví dụ 02:30 ngày chuyển sang giờ mùa hè);
 * lúc đó `instant` là thời điểm gần nhất sau khoảng nhảy.
 */
function wallClockToInstant(
  day: DateTime,
  minuteOfDay: number,
): { instant: DateTime; exists: boolean } {
  const dayOffset = Math.floor(minuteOfDay / 1440); // 1440 phút = "24:00" = 00:00 ngày hôm sau
  const minuteInDay = minuteOfDay % 1440;
  const hour = Math.floor(minuteInDay / 60);
  const minute = minuteInDay % 60;

  const result = day.plus({ days: dayOffset }).set({ hour, minute });
  // Nếu giờ bị "đẩy" sang giờ khác thì giờ gốc không tồn tại.
  return {
    instant: result,
    exists: result.hour === hour && result.minute === minute,
  };
}

/** Hai khoảng [a1,a2) và [b1,b2) chồng nhau khi a1 < b2 và a2 > b1. Chạm đầu nhau thì không. */
function overlapsAny(startMs: number, endMs: number, busy: TimeRange[]) {
  return busy.some(
    (range) =>
      startMs < range.endsAt.getTime() && endMs > range.startsAt.getTime(),
  );
}
