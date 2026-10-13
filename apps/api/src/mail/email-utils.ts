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
};

/** Email mà khách còn có thể huỷ/đổi lịch: có kèm link quản lý */
export type ManageableAppointmentEmailData = AppointmentEmailData & {
  /** Link để khách huỷ hoặc đổi lịch */
  manageUrl: string;
};

/** Liên kết ở cuối email (nếu có) */
export type EmailFooterLink = { label: string; url: string };

/**
 * Hai múi giờ có cho cùng giờ địa phương tại thời điểm `date` không. So theo kết quả chứ không so tên:
 * trình duyệt báo "Asia/Saigon", cơ sở lưu "Asia/Ho_Chi_Minh", cùng một nơi nhưng khác chuỗi.
 */
export function sameLocalTime(
  date: Date,
  zoneA: string,
  zoneB: string,
): boolean {
  const key = (zone: string) =>
    DateTime.fromJSDate(date, { zone }).toFormat('yyyy-MM-dd HH:mm');
  return key(zoneA) === key(zoneB);
}

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
  footerLink: EmailFooterLink | null,
) {
  const rows: [string, string][] = [
    ['Dịch vụ', `${data.serviceName} (${data.durationMinutes} phút)`],
    ['Cơ sở', data.businessName],
    ['Thời gian', formatTime(data.startsAt, data.customerTimezone)],
  ];
  // Khách ở múi giờ khác cơ sở: ghi thêm giờ tại cơ sở để khỏi nhầm.
  if (
    !sameLocalTime(data.startsAt, data.customerTimezone, data.businessTimezone)
  ) {
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
    ...(footerLink ? ['', `${footerLink.label}: ${footerLink.url}`] : []),
  ].join('\n');

  // Email KHÔNG hỗ trợ CSS hiện đại (class, flex, biến CSS): phải dùng bảng và style viết thẳng trên từng thẻ.
  // Màu và kiểu chữ lấy theo bộ nhận diện của trang web (ngọc bích, vàng cúc, giấy xanh nhạt).
  const detailRows = rows
    .map(
      ([label, value], index) =>
        `<tr>
            <td style="padding:6px 16px 6px 0;color:#3f5249;font-size:14px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
            <td style="padding:6px 0;color:#0d1f1b;font-size:${index === 2 ? 17 : 15}px;font-weight:${index === 2 ? 800 : 600};">${escapeHtml(value)}</td>
          </tr>`,
    )
    .join('\n          ');

  const button = footerLink
    ? `<p style="margin:28px 0 0;">
          <a href="${escapeHtml(footerLink.url)}" style="display:inline-block;background:#0b5d54;color:#f6fbf1;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;border:2px solid #0d1f1b;">${escapeHtml(footerLink.label)}</a>
        </p>`
    : '';

  const html = `<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:24px 12px;background:#f1f4ea;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;color:#0d1f1b;line-height:1.55;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fafcf5;border:2px solid #0d1f1b;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:#07403a;padding:20px 28px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:800;color:#f6fbf1;">Gnoud<span style="color:#f2a93b;">·</span>Book</span>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 34px;">
                <p style="margin:0 0 6px;font-size:16px;">Xin chào ${escapeHtml(data.customerName)},</p>
                <p style="margin:0 0 22px;font-size:16px;">${intro.html}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:2px dashed #9fb1a6;border-bottom:2px dashed #9fb1a6;padding:12px 0;">
          ${detailRows}
                </table>${button}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#3f5249;">Email này được gửi tự động bởi Gnoud Book.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
}
