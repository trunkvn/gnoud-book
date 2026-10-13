import { describe, expect, it } from 'vitest';
import {
  copyDay,
  emptyWeek,
  fromApi,
  sameWeek,
  timeOptions,
  toApi,
  validateWeek,
} from './hours';

describe('fromApi / toApi', () => {
  const api = [
    { dayOfWeek: 1, start: '13:00', end: '17:30' },
    { dayOfWeek: 1, start: '09:00', end: '12:00' },
    { dayOfWeek: 0, start: '10:00', end: '14:00' },
  ];

  it('groups intervals by weekday and sorts them within a day', () => {
    const week = fromApi(api);
    expect(week[1]).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:30' },
    ]);
    expect(week[0]).toEqual([{ start: '10:00', end: '14:00' }]);
    expect(week[2]).toEqual([]);
  });

  it('round-trips to the flat list the API expects, sorted by day then time', () => {
    expect(toApi(fromApi(api))).toEqual([
      { dayOfWeek: 0, start: '10:00', end: '14:00' },
      { dayOfWeek: 1, start: '09:00', end: '12:00' },
      { dayOfWeek: 1, start: '13:00', end: '17:30' },
    ]);
  });

  it('an empty week produces no intervals (every day closed)', () => {
    expect(toApi(emptyWeek())).toEqual([]);
  });
});

describe('validateWeek', () => {
  it('accepts a day with a lunch break and touching intervals', () => {
    const week = emptyWeek();
    week[1] = [
      { start: '09:00', end: '12:00' },
      { start: '12:00', end: '17:00' },
    ];
    expect(validateWeek(week)).toEqual({});
  });

  it('rejects an interval that ends at or before it starts', () => {
    const week = emptyWeek();
    week[2] = [{ start: '17:00', end: '09:00' }];
    week[3] = [{ start: '09:00', end: '09:00' }];
    expect(Object.keys(validateWeek(week)).sort()).toEqual(['2', '3']);
  });

  it('rejects overlapping intervals regardless of the order they were added in', () => {
    const week = emptyWeek();
    week[4] = [
      { start: '13:00', end: '17:00' },
      { start: '09:00', end: '14:00' },
    ];
    expect(validateWeek(week)[4]).toMatch(/chồng lấn/);
  });

  it('reports the problem only on the day that has it', () => {
    const week = emptyWeek();
    week[1] = [{ start: '09:00', end: '17:00' }];
    week[5] = [{ start: '10:00', end: '09:00' }];
    expect(Object.keys(validateWeek(week))).toEqual(['5']);
  });
});

describe('timeOptions', () => {
  it('offers 15-minute steps; start runs 00:00-23:45, end runs 00:15-24:00', () => {
    const start = timeOptions('start');
    const end = timeOptions('end');
    expect(start[0]).toBe('00:00');
    expect(start.at(-1)).toBe('23:45');
    expect(start).toHaveLength(96);
    expect(end[0]).toBe('00:15');
    expect(end.at(-1)).toBe('24:00');
    expect(end).toHaveLength(96);
  });
});

describe('copyDay', () => {
  it('copies one day onto others without sharing references', () => {
    const week = emptyWeek();
    week[1] = [{ start: '09:00', end: '17:00' }];
    week[6] = [{ start: '08:00', end: '10:00' }];

    const copied = copyDay(week, 1, [2, 6]);

    expect(copied[2]).toEqual([{ start: '09:00', end: '17:00' }]);
    expect(copied[6]).toEqual([{ start: '09:00', end: '17:00' }]); // ghi đè
    expect(copied[3]).toEqual([]);
    copied[2][0].start = '10:00';
    expect(copied[1][0].start).toBe('09:00');
  });
});

describe('sameWeek', () => {
  it('ignores ordering and compares by content', () => {
    const a = emptyWeek();
    a[1] = [
      { start: '13:00', end: '17:00' },
      { start: '09:00', end: '12:00' },
    ];
    const b = emptyWeek();
    b[1] = [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ];
    expect(sameWeek(a, b)).toBe(true);
    b[1][0].end = '12:30';
    expect(sameWeek(a, b)).toBe(false);
  });
});
