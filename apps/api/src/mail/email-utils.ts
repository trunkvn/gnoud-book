import { DateTime } from 'luxon';

/** Dữ liệu chung cho các email gửi cho khách về một lịch hẹn */
export type AppointmentEmailData = {
  customerName: string;
  /** Múi giờ của khách – giờ hẹn được hiển thị theo múi giờ này */
  customerTimezone: string;
  businessName: string;
  businessTimezone: string;
  serviceName: string;
  durationMinutes: number;
  startsAt: Date;
  /** Link để khách huỷ hoặc đổi lịch */
  manageUrl: string;
};

export function formatTime(date: Date, timezone: string): string {
  const local = DateTime.fromJSDate(date, { zone: timezone }).setLocale('vi');
  return `${local.toFormat('HH:mm, cccc, dd/MM/yyyy')} (${timezone})`;
}

// Tên khách do người lạ nhập, nên phải escape trước khi đưa vào HTML.
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Dựng phần nội dung (bản chữ thường + bản HTML) cho email về một lịch hẹn.
 * `intro` có hai dạng vì bản HTML có thể in đậm một vài từ (đã tự escape ở nơi gọi).
 */
export function renderAppointmentEmail(
  data: AppointmentEmailData,
  intro: { text: string; html: string },
) {
  const rows: [string, string][] = [
    ['Dịch vụ', `${data.serviceName} (${data.durationMinutes} phút)`],
    ['Cơ sở', data.businessName],
    ['Thời gian', formatTime(data.startsAt, data.customerTimezone)],
  ];
  // Khách ở múi giờ khác cơ sở: ghi thêm giờ tại cơ sở để khỏi nhầm.
  if (data.customerTimezone !== data.businessTimezone) {
    rows.push([
      'Giờ tại cơ sở',
      formatTime(data.startsAt, data.businessTimezone),
    ]);
  }

  const text = [
    `Xin chào ${data.customerName},`,
    '',
    intro.text,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Huỷ hoặc đổi lịch: ${data.manageUrl}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="vi">
  <body style="font-family: Arial, Helvetica, sans-serif; color: #171717; line-height: 1.5;">
    <p>Xin chào ${escapeHtml(data.customerName)},</p>
    <p>${intro.html}</p>
    <table cellpadding="6" style="border-collapse: collapse;">
${rows
  .map(
    ([label, value]) =>
      `      <tr><td style="color: #666;">${escapeHtml(label)}</td><td><strong>${escapeHtml(value)}</strong></td></tr>`,
  )
  .join('\n')}
    </table>
    <p><a href="${escapeHtml(data.manageUrl)}">Huỷ hoặc đổi lịch</a></p>
  </body>
</html>`;

  return { text, html };
}
