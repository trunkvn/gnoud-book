// Dựng danh sách múi giờ cho ô chọn. Là hàm thuần nhận danh sách tên và hàm mô tả, để test được.

/** Các múi giờ hay dùng, hiện đầu danh sách. */
export const POPULAR_ZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

export type ZoneOption = { value: string; label: string };
export type ZoneGroup = { label: string; zones: ZoneOption[] };

/**
 * Nhóm múi giờ: "Phổ biến" trước, rồi theo châu lục. Đảm bảo `current` luôn có trong danh sách.
 *
 * Điều này quan trọng vì danh sách `Intl.supportedValuesOf('timeZone')` của trình duyệt dùng tên
 * chuẩn hoá (ví dụ "Asia/Saigon" thay cho "Asia/Ho_Chi_Minh"). Nếu giá trị hiện tại không có trong
 * danh sách thì thẻ <select> âm thầm hiển thị mục đầu tiên, và bấm "Lưu" sẽ đổi múi giờ sang một
 * nơi hoàn toàn khác mà người dùng không hay biết.
 */
export function buildZoneGroups(
  allNames: string[],
  current: string,
  describe: (name: string) => string,
): ZoneGroup[] {
  const popular = [...POPULAR_ZONES];
  if (!popular.includes(current)) popular.unshift(current);

  const popularSet = new Set(popular);
  const byRegion = new Map<string, ZoneOption[]>();
  for (const name of [...new Set(allNames)].sort()) {
    if (popularSet.has(name)) continue;
    const region = name.includes('/') ? name.split('/')[0] : 'Khác';
    byRegion.set(region, [
      ...(byRegion.get(region) ?? []),
      { value: name, label: describe(name) },
    ]);
  }

  return [
    {
      label: 'Phổ biến',
      zones: popular.map((name) => ({ value: name, label: describe(name) })),
    },
    ...[...byRegion].map(([label, zones]) => ({ label, zones })),
  ];
}
