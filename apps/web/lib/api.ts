import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";
export const AUTH_COOKIE = "access_token";

/**
 * Khi server Next gọi API thay cho khách, API chỉ thấy IP của server Next. Chuyển tiếp IP thật của
 * khách (Vercel đặt sẵn vào X-Forwarded-For) để giới hạn tốc độ tính theo từng khách chứ không
 * dồn mọi người vào một hạn mức chung. Chạy local không có header này thì không gửi gì thêm.
 */
export async function clientIpHeaders(): Promise<Record<string, string>> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded ? { "x-forwarded-for": forwarded } : {};
}

/**
 * Gọi API NestJS từ server của Next, kèm cookie đăng nhập của người đang xem trang.
 * (Request giữa hai server không tự có cookie của trình duyệt nên phải gắn lại.)
 * Chưa đăng nhập hoặc phiên hết hạn thì chuyển về trang đăng nhập.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) redirect("/login");

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      cookie: `${AUTH_COOKIE}=${token}`,
      ...(await clientIpHeaders()),
    },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/login");
  if (!res.ok) throw new Error(`API ${path} trả về ${res.status}`);

  return res.json();
}
