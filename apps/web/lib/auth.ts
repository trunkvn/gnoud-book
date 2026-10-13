import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { API_URL, AUTH_COOKIE, clientIpHeaders } from "./api";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  businesses: { id: string; name: string; slug: string; timezone: string }[];
};

// Gọi NestJS để hỏi "cookie này là ai?". Trả về null nếu chưa đăng nhập.
// `cache` của React: trong cùng một request, layout và trang cùng hỏi nhưng chỉ gọi API một lần.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;

  // API không phản hồi được thì coi như chưa đăng nhập, để trang chủ không sập theo API.
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: {
        cookie: `${AUTH_COOKIE}=${token}`,
        ...(await clientIpHeaders()),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

// Dùng ở những trang bắt buộc đăng nhập.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
