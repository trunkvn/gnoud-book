import {
  type AppointmentEmailData,
  renderAppointmentEmail,
} from './email-utils.js';

export type BookingConfirmationData = AppointmentEmailData;

export function renderBookingConfirmation(data: BookingConfirmationData) {
  const subject = `Xác nhận lịch hẹn: ${data.serviceName} tại ${data.businessName}`;
  const body = renderAppointmentEmail(data, {
    text: 'Lịch hẹn của bạn đã được xác nhận.',
    html: 'Lịch hẹn của bạn đã được <strong>xác nhận</strong>.',
  });

  return { subject, ...body };
}
