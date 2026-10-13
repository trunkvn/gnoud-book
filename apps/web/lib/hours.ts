// Giờ làm việc theo tuần: chuyển đổi giữa dạng API và dạng dùng trong form, và kiểm tra hợp lệ.

export type Interval = { start: string; end: string };
/** Chỉ số = dayOfWeek (0 = Chủ Nhật … 6 = Thứ Bảy), như API. Mỗi ngày là một danh sách khung giờ. */
export type Week = Interval[][];
export type ApiInterval = { dayOfWeek: number; start: string; end: string };

/** Thứ tự hiển thị: bắt đầu từ Thứ Hai. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const DAY_LABELS: Record<number, string> = {
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
  0: 'Chủ Nhật',
};

export const DEFAULT_INTERVAL: Interval = { start: '09:00', end: '17:00' };

export function emptyWeek(): Week {
  return Array.from({ length: 7 }, () => []);
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const byStart = (a: Interval, b: Interval) => toMinutes(a.start) - toMinutes(b.start);

export function fromApi(intervals: ApiInterval[]): Week {
  const week = emptyWeek();
  for (const { dayOfWeek, start, end } of intervals) {
    week[dayOfWeek].push({ start, end });
  }
  return week.map((day) => [...day].sort(byStart));
}

/** Danh sách phẳng để gửi lên API (PUT /working-hours). */
export function toApi(week: Week): ApiInterval[] {
  return week.flatMap((day, dayOfWeek) =>
    [...day].sort(byStart).map(({ start, end }) => ({ dayOfWeek, start, end })),
  );
}

/** Lỗi của từng ngày (chỉ số dayOfWeek -> thông báo). Rỗng nghĩa là hợp lệ. */
export function validateWeek(week: Week): Record<number, string> {
  const errors: Record<number, string> = {};

  week.forEach((day, dayOfWeek) => {
    if (day.some((i) => toMinutes(i.end) <= toMinutes(i.start))) {
      errors[dayOfWeek] = 'Giờ kết thúc phải sau giờ bắt đầu';
      return;
    }
    const sorted = [...day].sort(byStart);
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i - 1].end) > toMinutes(sorted[i].start)) {
        errors[dayOfWeek] = 'Các khung giờ bị chồng lấn nhau';
        return;
      }
    }
  });

  return errors;
}

/** Các giờ có thể chọn, cách nhau 15 phút. Giờ đóng cửa còn có "24:00" (hết ngày). */
export function timeOptions(kind: 'start' | 'end'): string[] {
  const options: string[] = [];
  for (let minutes = 0; minutes < 1440; minutes += 15) {
    options.push(
      `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    );
  }
  return kind === 'start' ? options : [...options.slice(1), '24:00'];
}

/** Sao chép lịch của một ngày sang các ngày khác (ghi đè). */
export function copyDay(week: Week, from: number, to: number[]): Week {
  return week.map((day, dayOfWeek) =>
    to.includes(dayOfWeek) ? week[from].map((i) => ({ ...i })) : day,
  );
}

export function sameWeek(a: Week, b: Week): boolean {
  return JSON.stringify(toApi(a)) === JSON.stringify(toApi(b));
}
