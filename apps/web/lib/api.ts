import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";
export const AUTH_COOKIE = "access_token";

/**
 * Gọi API NestJS từ server của Next, kèm cookie đăng nhập của người đang xem trang.
 * (Request giữa hai server không tự có cookie của trình duyệt nên phải gắn lại.)
 * Chưa đăng nhập hoặc phiên hết hạn thì chuyển về trang đăng nhập.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) redirect("/login");

  const res = await fetch(`${API_URL}${path}`, {
    headers: { cookie: `${AUTH_COOKIE}=${token}` },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/login");
  if (!res.ok) throw new Error(`API ${path} trả về ${res.status}`);

  return res.json();
}
