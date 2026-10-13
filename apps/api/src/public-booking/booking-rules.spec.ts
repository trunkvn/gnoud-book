import { CHANGE_CUTOFF_HOURS, MIN_NOTICE_MINUTES } from './booking-rules.js';
import { changeDeadline } from './change-policy.js';

describe('booking rules', () => {
  it('only lets customers book slots they can still change online', () => {
    // Email xác nhận hứa "đổi hoặc huỷ được tới 2 giờ trước giờ hẹn". Nếu cho đặt gần hơn mức đó
    // thì khách vừa đặt xong đã hết quyền đổi/huỷ và lời hứa trở thành sai.
    const now = new Date('2030-01-07T00:00:00.000Z');
    const earliestBookable = new Date(
      now.getTime() + MIN_NOTICE_MINUTES * 60_000,
    );

    expect(changeDeadline(earliestBookable).getTime()).toBeGreaterThanOrEqual(
      now.getTime(),
    );
  });

  it('keeps the minimum notice in step with the change cutoff', () => {
    expect(MIN_NOTICE_MINUTES).toBe(CHANGE_CUTOFF_HOURS * 60);
  });
});
