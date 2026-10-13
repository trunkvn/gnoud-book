import {
  type ManageableAppointmentEmailData,
  renderAppointmentEmail,
} from './email-utils.js';

export type BookingConfirmationData = ManageableAppointmentEmailData;

/** `rescheduled`: cùng mẫu email nhưng nói rõ lịch hẹn vừa được đổi sang giờ mới. */
export function renderBookingConfirmation(
  data: BookingConfirmationData,
  options: { rescheduled?: boolean } = {},
) {
  const subject = options.rescheduled
    ? `Đã đổi lịch hẹn: ${data.serviceName} tại ${data.businessName}`
    : `Xác nhận lịch hẹn: ${data.serviceName} tại ${data.businessName}`;

  const body = renderAppointmentEmail(
    data,
    options.rescheduled
      ? {
          text: 'Lịch hẹn của bạn đã được đổi sang thời gian mới.',
          html: 'Lịch hẹn của bạn đã được <strong>đổi sang thời gian mới</strong>.',
        }
      : {
          text: 'Lịch hẹn của bạn đã được xác nhận.',
          html: 'Lịch hẹn của bạn đã được <strong>xác nhận</strong>.',
        },
    { label: 'Huỷ hoặc đổi lịch', url: data.manageUrl },
  );

  return { subject, ...body };
}
