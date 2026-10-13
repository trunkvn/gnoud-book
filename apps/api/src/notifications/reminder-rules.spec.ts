import { needsReminder } from './reminder-rules.js';

const NOW = new Date('2030-01-06T12:00:00.000Z');
const hoursAhead = (hours: number) =>
  new Date(NOW.getTime() + hours * 3_600_000);

describe('needsReminder', () => {
  it('is true when the appointment is more than 24 hours away', () => {
    expect(needsReminder(hoursAhead(48), NOW)).toBe(true);
    expect(needsReminder(hoursAhead(24.01), NOW)).toBe(true);
  });

  it('is false at 24 hours or less (the customer was just told)', () => {
    expect(needsReminder(hoursAhead(24), NOW)).toBe(false);
    expect(needsReminder(hoursAhead(3), NOW)).toBe(false);
  });
});
