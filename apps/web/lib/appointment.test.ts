import { describe, expect, it } from 'vitest';
import {
  addDays,
  errorMessage,
  formatDateTime,
  formatDayLabel,
  formatPrice,
  formatTimeOfDay,
  todayIn,
} from './appointment';

// 2030-01-07T02:00:00Z = 09:00 Thứ Hai ở Việt Nam = 11:00 ở Tokyo = 18:00 Chủ nhật 06/01 ở Los Angeles
const INSTANT = '2030-01-07T02:00:00.000Z';

describe('formatDateTime', () => {
  it('shows the same instant in each timezone, including a different calendar day', () => {
    expect(formatDateTime(INSTANT, 'Asia/Ho_Chi_Minh')).toBe(
      '09:00, Thứ Hai, 07/01/2030',
    );
    expect(formatDateTime(INSTANT, 'Asia/Tokyo')).toBe(
      '11:00, Thứ Hai, 07/01/2030',
    );
    expect(formatDateTime(INSTANT, 'America/Los_Angeles')).toBe(
      '18:00, Chủ Nhật, 06/01/2030',
    );
  });
});

describe('formatTimeOfDay', () => {
  it('uses a 24-hour clock in the given timezone', () => {
    expect(formatTimeOfDay(INSTANT, 'Asia/Ho_Chi_Minh')).toBe('09:00');
    expect(formatTimeOfDay('2030-01-07T16:00:00.000Z', 'Asia/Ho_Chi_Minh')).toBe(
      '23:00',
    );
  });
});

describe('formatDayLabel', () => {
  it('labels a calendar day with its weekday', () => {
    expect(formatDayLabel('2030-01-07')).toBe('Thứ Hai, 07/01');
    expect(formatDayLabel('2030-01-06')).toBe('Chủ Nhật, 06/01');
  });
});

describe('addDays', () => {
  it('moves across month and year boundaries', () => {
    expect(addDays('2030-01-31', 1)).toBe('2030-02-01');
    expect(addDays('2030-12-31', 1)).toBe('2031-01-01');
    expect(addDays('2030-03-01', -1)).toBe('2030-02-28');
    expect(addDays('2032-02-28', 1)).toBe('2032-02-29'); // năm nhuận
  });

  it('leaves the date alone for 0 days', () => {
    expect(addDays('2030-01-07', 0)).toBe('2030-01-07');
  });
});

describe('todayIn', () => {
  it('returns the calendar day in the given timezone, which can differ between zones', () => {
    const now = new Date('2030-01-06T20:00:00Z'); // 03:00 ngày 07 ở VN, 12:00 ngày 06 ở LA
    expect(todayIn('Asia/Ho_Chi_Minh', now)).toBe('2030-01-07');
    expect(todayIn('America/Los_Angeles', now)).toBe('2030-01-06');
  });
});

describe('formatPrice', () => {
  it('formats Vietnamese dong without decimals', () => {
    expect(formatPrice(150000, 'VND')).toMatch(/^150\.000\s?₫$/);
  });
});

describe('errorMessage', () => {
  it('reads a string message', () => {
    expect(errorMessage({ message: 'Hết chỗ' }, 'lỗi')).toBe('Hết chỗ');
  });

  it('takes the first validation message from a list', () => {
    expect(errorMessage({ message: ['a sai', 'b sai'] }, 'lỗi')).toBe('a sai');
  });

  it('falls back for anything unexpected', () => {
    expect(errorMessage(null, 'lỗi')).toBe('lỗi');
    expect(errorMessage({}, 'lỗi')).toBe('lỗi');
    expect(errorMessage('text', 'lỗi')).toBe('lỗi');
  });
});
