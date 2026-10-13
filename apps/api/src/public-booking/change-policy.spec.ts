import { canChange, changeDeadline } from './change-policy.js';

const STARTS_AT = new Date('2030-01-07T02:00:00.000Z');
const confirmed = { status: 'CONFIRMED', startsAt: STARTS_AT };

describe('changeDeadline', () => {
  it('is 2 hours before the appointment starts', () => {
    expect(changeDeadline(STARTS_AT).toISOString()).toBe(
      '2030-01-07T00:00:00.000Z',
    );
  });
});

describe('canChange', () => {
  it('allows changes well ahead of the appointment', () => {
    expect(canChange(confirmed, new Date('2030-01-01T00:00:00Z'))).toBe(true);
  });

  it('allows changes up to the last moment before the deadline', () => {
    expect(canChange(confirmed, new Date('2030-01-06T23:59:59.999Z'))).toBe(
      true,
    );
  });

  it('refuses changes from the deadline onwards', () => {
    expect(canChange(confirmed, new Date('2030-01-07T00:00:00.000Z'))).toBe(
      false,
    );
    expect(canChange(confirmed, new Date('2030-01-07T01:30:00.000Z'))).toBe(
      false,
    );
  });

  it('refuses changes after the appointment has started', () => {
    expect(canChange(confirmed, new Date('2030-01-07T03:00:00Z'))).toBe(false);
  });

  it('refuses changes to an appointment that is already cancelled', () => {
    expect(
      canChange(
        { status: 'CANCELLED', startsAt: STARTS_AT },
        new Date('2030-01-01T00:00:00Z'),
      ),
    ).toBe(false);
  });
});
