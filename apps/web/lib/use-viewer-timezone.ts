'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Múi giờ của người đang xem trang. Máy chủ không biết múi giờ này nên trả về null khi render
 * ở server và lúc hydrate; ngay sau đó React tự render lại với múi giờ thật của trình duyệt.
 * Nhờ vậy không bao giờ có chuyện server in giờ này, trình duyệt in giờ khác.
 */
export function useViewerTimezone(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}
