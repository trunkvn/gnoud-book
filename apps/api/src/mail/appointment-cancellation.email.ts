import {
  type AppointmentEmailData,
  renderAppointmentEmail,
} from './email-utils.js';

export type AppointmentCancellationData = AppointmentEmailData;

/** Email báo đã huỷ. Không có link quản lý vì lịch hẹn này không còn hiệu lực. */
export function renderAppointmentCancellation(
  data: AppointmentCancellationData,
) {
  const subject = `Đã huỷ lịch hẹn: ${data.serviceName} tại ${data.businessName}`;
  const body = renderAppointmentEmail(
    data,
    {
      text: 'Lịch hẹn dưới đây đã được huỷ. Bạn không cần làm gì thêm.',
      html: 'Lịch hẹn dưới đây đã được <strong>huỷ</strong>. Bạn không cần làm gì thêm.',
    },
    null,
  );

  return { subject, ...body };
}
