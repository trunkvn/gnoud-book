import { addDays } from './appointment';

/** "2030-01-07" có phải một ngày lịch có thật không (loại "2030-02-30") */
export function isDateKey(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Ngày Thứ Hai của tuần chứa `dateKey` (tuần bắt đầu từ Thứ Hai). */
export function mondayOf(dateKey: string): string {
  const dayOfWeek = new Date(`${dateKey}T00:00:00Z`).getUTCDay(); // 0 = Chủ nhật
  return addDays(dateKey, -((dayOfWeek + 6) % 7));
}

/** Bảy ngày của tuần, từ Thứ Hai đến Chủ Nhật. */
export function weekDays(mondayKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayKey, i));
}

/** Thời điểm `iso` rơi vào ngày nào (YYYY-MM-DD) theo múi giờ `timeZone`. */
export function dateKeyIn(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));
}

/** Số phút kể từ 00:00 của thời điểm `iso` theo múi giờ `timeZone`. */
export function minutesOfDayIn(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return get('hour') * 60 + get('minute');
}

/** "07/01 – 13/01/2030", hoặc có cả hai năm nếu tuần vắt qua năm mới. */
export function formatWeekRange(mondayKey: string): string {
  const sundayKey = addDays(mondayKey, 6);
  const [y1, m1, d1] = mondayKey.split('-');
  const [y2, m2, d2] = sundayKey.split('-');
  return y1 === y2
    ? `${d1}/${m1} – ${d2}/${m2}/${y2}`
    : `${d1}/${m1}/${y1} – ${d2}/${m2}/${y2}`;
}

const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_LONG = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

/** Chỉ số 0 = Thứ Hai … 6 = Chủ Nhật của một ngày lịch. */
export function weekdayIndex(dateKey: string): number {
  return (new Date(`${dateKey}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export const weekdayShort = (dateKey: string) => WEEKDAY_SHORT[weekdayIndex(dateKey)];
export const weekdayLong = (dateKey: string) => WEEKDAY_LONG[weekdayIndex(dateKey)];
