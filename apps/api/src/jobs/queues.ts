import type { Queue } from 'pg-boss';

export const QUEUES = {
  bookingConfirmation: 'booking-confirmation',
  appointmentReminder: 'appointment-reminder',
  reminderSweep: 'reminder-sweep',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Cấu hình từng hàng đợi. Tạo (nếu chưa có) mỗi lần ứng dụng khởi động. */
export function queueDefinitions(
  retryDelaySeconds: number,
): Record<QueueName, Omit<Queue, 'name'>> {
  // Việc gửi email: lỗi thì thử lại tối đa 5 lần, mỗi lần chờ lâu gấp đôi lần trước.
  // `exclusive` + singletonKey: mỗi lịch hẹn chỉ có tối đa một job đang chờ/đang chạy.
  const email = {
    policy: 'exclusive',
    retryLimit: 5,
    retryDelay: retryDelaySeconds,
    retryBackoff: true,
    expireInSeconds: 120,
  } as const;

  return {
    [QUEUES.bookingConfirmation]: email,
    [QUEUES.appointmentReminder]: email,
    // Job quét định kỳ: không cần thử lại, vì lần quét kế tiếp sẽ nhặt lại những gì còn sót.
    [QUEUES.reminderSweep]: { retryLimit: 0, expireInSeconds: 300 },
  };
}
