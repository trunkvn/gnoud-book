import { DateTime } from 'luxon';
import {
  buildDemoAppointments,
  DEMO,
  DEMO_HOURS,
  DEMO_SERVICES,
} from './demo-data.js';

const ZONE = DEMO.business.timezone;
const DURATIONS = DEMO_SERVICES.map((s) => s.durationMinutes);
// Thứ Tư 2030-01-09, 12:00 giờ VN
const NOW = new Date('2030-01-09T05:00:00Z');
const build = (now = NOW) => buildDemoAppointments(now, ZONE, DURATIONS);

describe('buildDemoAppointments', () => {
  it('covers this week and next week', () => {
    const appointments = build();
    expect(appointments).toHaveLength(30);

    const days = new Set(
      appointments.map((a) =>
        DateTime.fromJSDate(a.startsAt, { zone: ZONE }).toISODate(),
      ),
    );
    expect(days.has('2030-01-07')).toBe(true); // Thứ Hai tuần này
    expect(days.has('2030-01-14')).toBe(true); // Thứ Hai tuần sau
  });

  it('never double-books: confirmed appointments do not overlap (the database would reject them)', () => {
    const confirmed = build()
      .filter((a) => a.status === 'CONFIRMED')
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    for (let i = 1; i < confirmed.length; i++) {
      expect(confirmed[i].startsAt.getTime()).toBeGreaterThanOrEqual(
        confirmed[i - 1].endsAt.getTime(),
      );
    }
  });

  it('keeps every appointment inside working hours', () => {
    for (const a of build()) {
      const start = DateTime.fromJSDate(a.startsAt, { zone: ZONE });
      const end = DateTime.fromJSDate(a.endsAt, { zone: ZONE });
      const dayOfWeek = start.weekday % 7;
      const fits = DEMO_HOURS.some((h) => {
        const [sh, sm] = h.start.split(':').map(Number);
        const [eh, em] = h.end.split(':').map(Number);
        const minutes = start.hour * 60 + start.minute;
        const endMinutes = end.hour * 60 + end.minute;
        return (
          h.dayOfWeek === dayOfWeek &&
          minutes >= sh * 60 + sm &&
          endMinutes <= eh * 60 + em
        );
      });
      expect(fits, `${a.customerName} ${start.toISO()}`).toBe(true);
    }
  });

  it('marks past appointments completed and future ones confirmed, except deliberate cancellations', () => {
    for (const a of build()) {
      if (a.status === 'CANCELLED') continue;
      expect(a.status).toBe(a.startsAt < NOW ? 'COMPLETED' : 'CONFIRMED');
    }
    expect(build().filter((a) => a.status === 'CANCELLED')).toHaveLength(4);
  });

  it('is plausible whichever day it runs: created in the past and before the appointment', () => {
    for (const now of [
      new Date('2030-01-07T01:00:00Z'), // sáng Thứ Hai
      new Date('2030-01-12T08:00:00Z'), // Thứ Bảy
      new Date('2030-01-13T10:00:00Z'), // Chủ nhật
    ]) {
      for (const a of build(now)) {
        expect(a.createdAt.getTime()).toBeLessThan(now.getTime());
        expect(a.createdAt.getTime()).toBeLessThan(a.startsAt.getTime());
      }
    }
  });

  it('gives each customer a plain ASCII email', () => {
    const emails = build().map((a) => a.customerEmail);
    expect(emails).toContain('nguyen.minh.anh@example.com');
    expect(emails).toContain('do.khanh.linh@example.com');
    expect(emails.every((e) => /^[a-z0-9.]+@example\.com$/.test(e))).toBe(true);
  });

  it('is deterministic for a given moment', () => {
    expect(build()).toEqual(build());
  });
});
