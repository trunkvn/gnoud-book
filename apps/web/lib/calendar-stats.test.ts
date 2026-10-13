import { describe, expect, it } from 'vitest';
import { summarize } from './calendar-stats';
import type { OwnerAppointment } from './owner';

const TZ = 'Asia/Ho_Chi_Minh';

const appt = (
  id: string,
  startsAt: string,
  status: OwnerAppointment['status'] = 'CONFIRMED',
): OwnerAppointment => ({
  id,
  status,
  startsAt,
  endsAt: startsAt,
  cancelledAt: null,
  customer: { name: id, email: `${id}@example.com`, timezone: 'UTC' },
  service: { id: 's', name: 'Cắt', durationMinutes: 60 },
});

// "Bây giờ" là 10:00 ngày 07/01/2030 giờ VN (03:00Z)
const NOW = new Date('2030-01-07T03:00:00Z');

describe('summarize', () => {
  it('counts each status separately', () => {
    const stats = summarize(
      [
        appt('a', '2030-01-07T02:00:00Z'),
        appt('b', '2030-01-08T02:00:00Z'),
        appt('c', '2030-01-09T02:00:00Z', 'CANCELLED'),
        appt('d', '2030-01-06T02:00:00Z', 'COMPLETED'),
      ],
      '2030-01-07',
      NOW,
      TZ,
    );
    expect(stats).toMatchObject({ confirmed: 2, cancelled: 1, completed: 1 });
  });

  it("counts only today's confirmed appointments, using the business timezone for the day", () => {
    const stats = summarize(
      [
        appt('a', '2030-01-07T02:00:00Z'), // 09:00 ngày 07 VN
        appt('b', '2030-01-07T09:00:00Z'), // 16:00 ngày 07 VN
        appt('c', '2030-01-06T17:30:00Z'), // 00:30 ngày 07 VN (vẫn là hôm nay ở VN)
        appt('d', '2030-01-07T17:30:00Z'), // 00:30 ngày 08 VN
        appt('e', '2030-01-07T05:00:00Z', 'CANCELLED'),
      ],
      '2030-01-07',
      NOW,
      TZ,
    );
    expect(stats.today).toBe(3);
  });

  it('picks the nearest confirmed appointment that has not started', () => {
    const stats = summarize(
      [
        appt('past', '2030-01-07T02:00:00Z'), // 09:00: đã bắt đầu
        appt('later', '2030-01-08T02:00:00Z'),
        appt('soon', '2030-01-07T05:00:00Z'), // 12:00
        appt('cancelled', '2030-01-07T04:00:00Z', 'CANCELLED'),
      ],
      '2030-01-07',
      NOW,
      TZ,
    );
    expect(stats.next?.id).toBe('soon');
  });

  it('has no next appointment when nothing is upcoming', () => {
    expect(summarize([], '2030-01-07', NOW, TZ)).toEqual({
      today: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      next: null,
    });
  });
});
