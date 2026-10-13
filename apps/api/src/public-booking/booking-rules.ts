// Các quy tắc đặt lịch. Đổi ở đây là ảnh hưởng toàn bộ hệ thống.

/** Slot bắt đầu cách nhau bao nhiêu phút (lưới 09:00, 09:30, 10:00…) */
export const SLOT_STEP_MINUTES = 30;

/** Khách phải đặt trước ít nhất bao nhiêu phút so với giờ hiện tại */
export const MIN_NOTICE_MINUTES = 60;

/** Một lần tra cứu slot được xem tối đa bao nhiêu ngày */
export const MAX_RANGE_DAYS = 31;

/** Khách chỉ được huỷ/đổi lịch cho tới trước giờ hẹn bao nhiêu giờ */
export const CHANGE_CUTOFF_HOURS = 2;
