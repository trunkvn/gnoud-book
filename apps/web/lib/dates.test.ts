import { describe, expect, it } from 'vitest';
import {
  dateKeyIn,
  formatWeekRange,
  isDateKey,
  minutesOfDayIn,
  mondayOf,
  weekdayLong,
  weekdayShort,
  weekDays,
} from './dates';

describe('isDateKey', () => {
  it('accepts real calendar dates', () => {
    expect(isDateKey('2030-01-07')).toBe(true);
    expect(isDateKey('2032-02-29')).toBe(true);
  });

  it('rejects wrong formats and dates that do not exist', () => {
    expect(isDateKey('2030-02-30')).toBe(false);
    expect(isDateKey('2031-02-29')).toBe(false);
    expect(isDateKey('07/01/2030')).toBe(false);
    expect(isDateKey('')).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
  });
});

describe('mondayOf', () => {
  it('returns the Monday of the same week for every day', () => {
    // 2030-01-07 là Thứ Hai
    for (const day of ['07', '08', '09', '10', '11', '12', '13']) {
      expect(mondayOf(`2030-01-${day}`)).toBe('2030-01-07');
    }
  });

  it('starts the next week on the following Monday', () => {
    expect(mondayOf('2030-01-14')).toBe('2030-01-14');
  });

  it('crosses month and year boundaries', () => {
    expect(mondayOf('2030-03-01')).toBe('2030-02-25');
    expect(mondayOf('2031-01-01')).toBe('2030-12-30');
  });
});

describe('weekDays', () => {
  it('lists Monday to Sunday', () => {
    expect(weekDays('2030-12-30')).toEqual([
      '2030-12-30',
      '2030-12-31',
      '2031-01-01',
      '2031-01-02',
      '2031-01-03',
      '2031-01-04',
      '2031-01-05',
    ]);
  });
});

describe('dateKeyIn / minutesOfDayIn', () => {
  const instant = '2030-01-06T17:30:00.000Z'; // 00:30 ngày 07/01 ở VN, 09:30 ngày 06/01 ở LA

  it('reads the calendar day in the given timezone', () => {
    expect(dateKeyIn(instant, 'Asia/Ho_Chi_Minh')).toBe('2030-01-07');
    expect(dateKeyIn(instant, 'America/Los_Angeles')).toBe('2030-01-06');
  });

  it('reads minutes since midnight in the given timezone', () => {
    expect(minutesOfDayIn(instant, 'Asia/Ho_Chi_Minh')).toBe(30);
    expect(minutesOfDayIn(instant, 'America/Los_Angeles')).toBe(9 * 60 + 30);
    expect(minutesOfDayIn('2030-01-07T02:00:00Z', 'Asia/Ho_Chi_Minh')).toBe(540);
  });

  it('does not turn midnight into 24:00', () => {
    expect(minutesOfDayIn('2030-01-06T17:00:00Z', 'Asia/Ho_Chi_Minh')).toBe(0);
  });
});

describe('formatWeekRange', () => {
  it('shows the year once for a week inside one year', () => {
    expect(formatWeekRange('2030-01-07')).toBe('07/01 – 13/01/2030');
  });

  it('shows both years when the week spans New Year', () => {
    expect(formatWeekRange('2030-12-30')).toBe('30/12/2030 – 05/01/2031');
  });
});

describe('weekday labels', () => {
  it('names days starting from Monday', () => {
    expect(weekdayShort('2030-01-07')).toBe('T2');
    expect(weekdayShort('2030-01-13')).toBe('CN');
    expect(weekdayLong('2030-01-11')).toBe('Thứ Sáu');
  });
});
