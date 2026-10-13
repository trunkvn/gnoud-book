import {
  type AppointmentReminderData,
  renderAppointmentReminder,
} from './appointment-reminder.email.js';

const base: AppointmentReminderData = {
  customerName: 'Minh',
  customerTimezone: 'Asia/Tokyo',
  businessName: 'Tiệm Tóc Đẹp',
  businessTimezone: 'Asia/Ho_Chi_Minh',
  serviceName: 'Cắt tóc',
  durationMinutes: 30,
  startsAt: new Date('2030-01-07T02:00:00Z'), // 09:00 giờ VN = 11:00 giờ Tokyo
  manageUrl: 'http://localhost:3000/manage/abc-123',
};

describe('renderAppointmentReminder', () => {
  it('reminds the customer about the upcoming appointment in their timezone', () => {
    const { subject, text } = renderAppointmentReminder(base);

    expect(subject).toBe('Nhắc lịch hẹn: Cắt tóc tại Tiệm Tóc Đẹp');
    expect(text).toContain('trong vòng 24 giờ tới');
    expect(text).toMatch(/Thời gian: 11:00.*\(Asia\/Tokyo\)/);
    expect(text).toMatch(/Giờ tại cơ sở: 09:00.*\(Asia\/Ho_Chi_Minh\)/);
    expect(text).toContain('http://localhost:3000/manage/abc-123');
  });

  it('escapes HTML in the customer name', () => {
    const { html } = renderAppointmentReminder({
      ...base,
      customerName: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
