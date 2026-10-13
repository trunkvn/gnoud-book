// Giới hạn số request theo IP trong 1 phút. Lưu trong bộ nhớ của tiến trình nên mỗi instance API
// đếm riêng; khi chạy nhiều instance thì cần chuyển sang kho chung (vd Redis).
const MINUTE_MS = 60_000;

/** Áp cho mọi route: đủ rộng cho người dùng bình thường (một trang dashboard gọi vài request). */
export const DEFAULT_LIMIT = { limit: 120, ttl: MINUTE_MS };

/** Đăng nhập, đăng ký: chặn dò mật khẩu và tạo tài khoản hàng loạt. */
export const AUTH_LIMIT = { default: { limit: 10, ttl: MINUTE_MS } };

/** Tạo lịch hẹn công khai (không cần đăng nhập): chặn spam đặt lịch và email rác. */
export const BOOKING_LIMIT = { default: { limit: 10, ttl: MINUTE_MS } };

/** Huỷ / đổi lịch bằng token: ít khi cần quá vài lần. */
export const MANAGE_LIMIT = { default: { limit: 20, ttl: MINUTE_MS } };
