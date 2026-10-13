import {
  type AppointmentEmailData,
  renderAppointmentEmail,
} from './email-utils.js';

export type AppointmentReminderData = AppointmentEmailData;

export function renderAppointmentReminder(data: AppointmentReminderData) {
  const subject = `Nhắc lịch hẹn: ${data.serviceName} tại ${data.businessName}`;
  const body = renderAppointmentEmail(data, {
    text: 'Nhắc bạn: lịch hẹn của bạn sẽ diễn ra trong vòng 24 giờ tới.',
    html: 'Nhắc bạn: lịch hẹn của bạn sẽ diễn ra trong <strong>vòng 24 giờ tới</strong>.',
  });

  return { subject, ...body };
}
