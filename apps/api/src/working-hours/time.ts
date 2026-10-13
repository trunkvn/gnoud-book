export type MinuteInterval = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

// "09:00" – "23:59". Giờ kết thúc được phép là "24:00" (hết ngày).
export const START_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const END_TIME_PATTERN = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;

/** "09:30" -> 570 (số phút kể từ 00:00) */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** 570 -> "09:30" */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Trả về thông báo lỗi nếu lịch không hợp lệ, hoặc null nếu ổn. */
export function findIntervalError(intervals: MinuteInterval[]): string | null {
  for (const interval of intervals) {
    if (interval.endMinute <= interval.startMinute) {
      return `Giờ kết thúc phải sau giờ bắt đầu (ngày ${interval.dayOfWeek})`;
    }
  }

  const sorted = [...intervals].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute,
  );
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (
      previous.dayOfWeek === current.dayOfWeek &&
      previous.endMinute > current.startMinute
    ) {
      return `Các khung giờ bị chồng lấn nhau (ngày ${current.dayOfWeek})`;
    }
  }
  return null;
}
