import 'server-only';
import { API_URL, clientIpHeaders } from './api';
import type { ManagedAppointment } from './appointment';

/** Lấy lịch hẹn theo token trong link email. Trả về null nếu token không đúng. */
export async function getManagedAppointment(
  token: string,
): Promise<ManagedAppointment | null> {
  const res = await fetch(
    `${API_URL}/public/appointments/${encodeURIComponent(token)}`,
    { cache: 'no-store', headers: await clientIpHeaders() },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API trả về ${res.status}`);
  return res.json();
}
