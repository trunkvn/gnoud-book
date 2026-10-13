import {
  type AppointmentCancellationData,
  renderAppointmentCancellation,
} from './appointment-cancellation.email.js';

const data: AppointmentCancellationData = {
  customerName: 'Minh',
  customerTimezone: 'Asia/Tokyo',
  businessName: 'Tiệm Tóc Đẹp',
  businessTimezone: 'Asia/Ho_Chi_Minh',
  serviceName: 'Cắt tóc',
  durationMinutes: 30,
  startsAt: new Date('2030-01-07T02:00:00Z'), // 11:00 giờ Tokyo
};

describe('renderAppointmentCancellation', () => {
  it('says which appointment was cancelled, in the customer timezone', () => {
    const { subject, text } = renderAppointmentCancellation(data);

    expect(subject).toBe('Đã huỷ lịch hẹn: Cắt tóc tại Tiệm Tóc Đẹp');
    expect(text).toContain('đã được huỷ');
    expect(text).toMatch(/Thời gian: 11:00.*\(Asia\/Tokyo\)/);
  });

  it('has no manage link, because the appointment is no longer active', () => {
    const { text, html } = renderAppointmentCancellation(data);

    expect(text).not.toContain('/manage/');
    expect(html).not.toContain('<a ');
  });

  it('escapes HTML in the customer name', () => {
    const { html } = renderAppointmentCancellation({
      ...data,
      customerName: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>');
  });
});
