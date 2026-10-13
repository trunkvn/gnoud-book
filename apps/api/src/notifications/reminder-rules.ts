/** Nhắc khách trước giờ hẹn bao nhiêu giờ */
export const REMINDER_LEAD_HOURS = 24;

/** Một lượt quét xếp tối đa bao nhiêu job nhắc lịch */
export const REMINDER_SWEEP_BATCH = 500;

/** Mặc định quét mỗi 5 phút (đổi bằng REMINDER_SWEEP_CRON trong .env) */
export const DEFAULT_REMINDER_SWEEP_CRON = '*/5 * * * *';
