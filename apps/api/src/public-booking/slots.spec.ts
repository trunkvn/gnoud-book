import { generateSlots, type SlotRequest } from './slots.js';

const VN = 'Asia/Ho_Chi_Minh'; // UTC+7, không có giờ mùa hè
// 2030-01-07 là Thứ hai. 09:00 giờ VN = 02:00 UTC.
const MONDAY = 1;

function request(overrides: Partial<SlotRequest> = {}): SlotRequest {
  return {
    timezone: VN,
    intervals: [{ dayOfWeek: MONDAY, startMinute: 9 * 60, endMinute: 12 * 60 }],
    durationMinutes: 60,
    rangeStart: new Date('2030-01-06T17:00:00Z'), // 00:00 Thứ hai giờ VN
    rangeEnd: new Date('2030-01-07T17:00:00Z'), // 00:00 Thứ ba giờ VN
    busy: [],
    earliestStart: new Date('2000-01-01T00:00:00Z'),
    ...overrides,
  };
}

const iso = (slots: { startsAt: Date }[]) =>
  slots.map((s) => s.startsAt.toISOString());

describe('generateSlots', () => {
  it('lists slots on a 30-minute grid that still fit before closing time', () => {
    const slots = generateSlots(request());
    // Dịch vụ 60 phút trong khung 09:00–12:00 => bắt đầu muộn nhất 11:00
    expect(iso(slots)).toEqual([
      '2030-01-07T02:00:00.000Z', // 09:00
      '2030-01-07T02:30:00.000Z', // 09:30
      '2030-01-07T03:00:00.000Z', // 10:00
      '2030-01-07T03:30:00.000Z', // 10:30
      '2030-01-07T04:00:00.000Z', // 11:00
    ]);
    expect(slots[0].endsAt.toISOString()).toBe('2030-01-07T03:00:00.000Z');
  });

  it('respects a lunch break', () => {
    const slots = generateSlots(
      request({
        durationMinutes: 30,
        intervals: [
          { dayOfWeek: MONDAY, startMinute: 9 * 60, endMinute: 10 * 60 },
          { dayOfWeek: MONDAY, startMinute: 13 * 60, endMinute: 14 * 60 },
        ],
      }),
    );
    expect(iso(slots)).toEqual([
      '2030-01-07T02:00:00.000Z', // 09:00
      '2030-01-07T02:30:00.000Z', // 09:30
      '2030-01-07T06:00:00.000Z', // 13:00
      '2030-01-07T06:30:00.000Z', // 13:30
    ]);
  });

  it('returns nothing on a day without working hours', () => {
    const tuesday = request({
      rangeStart: new Date('2030-01-07T17:00:00Z'),
      rangeEnd: new Date('2030-01-08T17:00:00Z'),
    });
    expect(generateSlots(tuesday)).toEqual([]);
  });

  it('removes every slot that overlaps a booked appointment', () => {
    const slots = generateSlots(
      request({
        // đã có lịch 10:00–11:00 giờ VN
        busy: [
          {
            startsAt: new Date('2030-01-07T03:00:00Z'),
            endsAt: new Date('2030-01-07T04:00:00Z'),
          },
        ],
      }),
    );
    // 09:00–10:00 vẫn được (chỉ chạm đầu), 09:30–10:30 / 10:00–11:00 / 10:30–11:30 bị chặn,
    // 11:00–12:00 vẫn được (chạm đầu bên kia)
    expect(iso(slots)).toEqual([
      '2030-01-07T02:00:00.000Z',
      '2030-01-07T04:00:00.000Z',
    ]);
  });

  it('drops slots earlier than the minimum notice', () => {
    const slots = generateSlots(
      request({ earliestStart: new Date('2030-01-07T03:10:00Z') }), // 10:10 giờ VN
    );
    expect(iso(slots)).toEqual([
      '2030-01-07T03:30:00.000Z', // 10:30
      '2030-01-07T04:00:00.000Z', // 11:00
    ]);
  });

  it('only returns slots that start inside the requested range', () => {
    const slots = generateSlots(
      request({
        rangeStart: new Date('2030-01-07T03:00:00Z'), // 10:00 giờ VN
        rangeEnd: new Date('2030-01-07T04:00:00Z'), // 11:00 giờ VN (không bao gồm)
      }),
    );
    expect(iso(slots)).toEqual([
      '2030-01-07T03:00:00.000Z',
      '2030-01-07T03:30:00.000Z',
    ]);
  });

  it('treats "24:00" as the end of the day', () => {
    const slots = generateSlots(
      request({
        durationMinutes: 60,
        intervals: [
          { dayOfWeek: MONDAY, startMinute: 23 * 60, endMinute: 1440 },
        ],
      }),
    );
    expect(iso(slots)).toEqual(['2030-01-07T16:00:00.000Z']); // 23:00 giờ VN
  });

  it('reads working hours in the business timezone, not UTC', () => {
    // Cơ sở ở Los Angeles (UTC-8 mùa đông): 09:00 địa phương = 17:00 UTC
    const slots = generateSlots(
      request({
        timezone: 'America/Los_Angeles',
        rangeStart: new Date('2030-01-07T08:00:00Z'), // 00:00 Thứ hai giờ LA
        rangeEnd: new Date('2030-01-08T08:00:00Z'),
        intervals: [
          { dayOfWeek: MONDAY, startMinute: 9 * 60, endMinute: 10 * 60 },
        ],
        durationMinutes: 60,
      }),
    );
    expect(iso(slots)).toEqual(['2030-01-07T17:00:00.000Z']);
  });

  it('skips wall-clock times that do not exist when clocks spring forward', () => {
    // New York, 2026-03-08: 02:00 nhảy thẳng thành 03:00 nên 02:00 và 02:30 không tồn tại.
    const slots = generateSlots(
      request({
        timezone: 'America/New_York',
        rangeStart: new Date('2026-03-08T05:00:00Z'), // 00:00 EST
        rangeEnd: new Date('2026-03-09T04:00:00Z'), // 00:00 EDT ngày hôm sau
        intervals: [{ dayOfWeek: 0, startMinute: 60, endMinute: 4 * 60 }], // Chủ nhật 01:00–04:00
        durationMinutes: 30,
      }),
    );
    expect(iso(slots)).toEqual([
      '2026-03-08T06:00:00.000Z', // 01:00 EST
      '2026-03-08T06:30:00.000Z', // 01:30 EST
      '2026-03-08T07:00:00.000Z', // 03:00 EDT
      '2026-03-08T07:30:00.000Z', // 03:30 EDT
    ]);
  });

  it('does not crash when closing time falls inside the skipped hour', () => {
    // Đóng cửa lúc 02:30 – giờ này không tồn tại ngày 2026-03-08 ở New York.
    const run = () =>
      generateSlots(
        request({
          timezone: 'America/New_York',
          rangeStart: new Date('2026-03-08T05:00:00Z'),
          rangeEnd: new Date('2026-03-09T04:00:00Z'),
          intervals: [{ dayOfWeek: 0, startMinute: 60, endMinute: 150 }],
          durationMinutes: 30,
        }),
      );
    expect(run).not.toThrow();
    expect(iso(run())).toContain('2026-03-08T06:00:00.000Z'); // 01:00 EST vẫn đặt được
  });
});
