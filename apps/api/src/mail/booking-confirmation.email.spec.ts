import {
  type BookingConfirmationData,
  renderBookingConfirmation,
} from './booking-confirmation.email.js';

const base: BookingConfirmationData = {
  customerName: 'Minh',
  customerTimezone: 'Asia/Ho_Chi_Minh',
  businessName: 'Tiệm Tóc Đẹp',
  businessTimezone: 'Asia/Ho_Chi_Minh',
  serviceName: 'Cắt tóc',
  durationMinutes: 30,
  startsAt: new Date('2030-01-07T02:00:00Z'), // 09:00 giờ VN
  manageUrl: 'http://localhost:3000/manage/abc-123',
};

describe('renderBookingConfirmation', () => {
  it('describes the booking in the customer timezone', () => {
    const { subject, text } = renderBookingConfirmation(base);

    expect(subject).toBe('Xác nhận lịch hẹn: Cắt tóc tại Tiệm Tóc Đẹp');
    expect(text).toContain('Dịch vụ: Cắt tóc (30 phút)');
    expect(text).toContain('09:00');
    expect(text).toContain('07/01/2030');
    expect(text).toContain('(Asia/Ho_Chi_Minh)');
    expect(text).toContain('http://localhost:3000/manage/abc-123');
  });

  it('shows both local times when the customer is in another timezone', () => {
    const { text } = renderBookingConfirmation({
      ...base,
      customerTimezone: 'Asia/Tokyo',
    });

    expect(text).toMatch(/Thời gian: 11:00.*\(Asia\/Tokyo\)/);
    expect(text).toMatch(/Giờ tại cơ sở: 09:00.*\(Asia\/Ho_Chi_Minh\)/);
  });

  it('omits the business-time line when both timezones are the same', () => {
    expect(renderBookingConfirmation(base).text).not.toContain('Giờ tại cơ sở');
  });

  it('says the appointment was moved when it is a reschedule', () => {
    const { subject, text } = renderBookingConfirmation(base, {
      rescheduled: true,
    });

    expect(subject).toBe('Đã đổi lịch hẹn: Cắt tóc tại Tiệm Tóc Đẹp');
    expect(text).toContain('đã được đổi sang thời gian mới');
    expect(text).toContain('http://localhost:3000/manage/abc-123');
  });

  it('escapes HTML in values supplied by strangers', () => {
    const { html } = renderBookingConfirmation({
      ...base,
      customerName: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
