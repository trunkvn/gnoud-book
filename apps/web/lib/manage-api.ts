import 'server-only';
import type { ManagedAppointment } from './appointment';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Lấy lịch hẹn theo token trong link email. Trả về null nếu token không đúng. */
export async function getManagedAppointment(
  token: string,
): Promise<ManagedAppointment | null> {
  const res = await fetch(
    `${API_URL}/public/appointments/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API trả về ${res.status}`);
  return res.json();
}
