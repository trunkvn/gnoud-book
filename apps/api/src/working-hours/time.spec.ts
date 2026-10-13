import { findIntervalError, minutesToTime, timeToMinutes } from './time.js';

describe('time helpers', () => {
  it('converts between "HH:mm" and minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('24:00')).toBe(1440);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(1440)).toBe('24:00');
  });
});

describe('findIntervalError', () => {
  const monday = (startMinute: number, endMinute: number) => ({
    dayOfWeek: 1,
    startMinute,
    endMinute,
  });

  it('accepts a day with a lunch break', () => {
    expect(findIntervalError([monday(540, 720), monday(780, 1020)])).toBeNull();
  });

  it('accepts back-to-back intervals that only touch', () => {
    expect(findIntervalError([monday(540, 720), monday(720, 1020)])).toBeNull();
  });

  it('rejects an interval that ends before it starts', () => {
    expect(findIntervalError([monday(720, 540)])).not.toBeNull();
    expect(findIntervalError([monday(540, 540)])).not.toBeNull();
  });

  it('rejects overlapping intervals on the same day', () => {
    expect(
      findIntervalError([monday(540, 720), monday(700, 900)]),
    ).not.toBeNull();
  });

  it('allows the same hours on different days', () => {
    const tuesday = { dayOfWeek: 2, startMinute: 540, endMinute: 720 };
    expect(findIntervalError([monday(540, 720), tuesday])).toBeNull();
  });
});
