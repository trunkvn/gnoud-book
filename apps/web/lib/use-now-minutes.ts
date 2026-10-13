'use client';

import { useSyncExternalStore } from 'react';
import { minutesOfDayIn } from './dates';

// Mỗi 30 giây báo cho React biết "đồng hồ đã chạy", để vạch giờ hiện tại tự dịch xuống.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

/**
 * Số phút kể từ 00:00 của thời điểm hiện tại theo múi giờ `timeZone`; null khi render ở server
 * (server không nên in giờ hiện tại vì nó cũ ngay khi trình duyệt nhận được).
 */
export function useNowMinutes(timeZone: string): number | null {
  return useSyncExternalStore(
    subscribe,
    () => minutesOfDayIn(new Date().toISOString(), timeZone),
    () => null,
  );
}
