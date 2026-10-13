import 'server-only';
import { cache } from 'react';
import { API_URL } from './api';
import type { PublicBusiness } from './public';

/** Thông tin công khai của một cơ sở theo slug. Trả về null nếu không có cơ sở nào như vậy. */
// `cache`: generateMetadata và trang cùng cần dữ liệu này nhưng chỉ gọi API một lần cho mỗi request.
export const getPublicBusiness = cache(async function getPublicBusiness(
  slug: string,
): Promise<PublicBusiness | null> {
  const res = await fetch(
    `${API_URL}/public/businesses/${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API trả về ${res.status}`);
  return res.json();
});
