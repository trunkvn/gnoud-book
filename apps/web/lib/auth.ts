import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const AUTH_COOKIE = "access_token";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  businesses: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  }[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { cookie: `${AUTH_COOKIE}=${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

// dùng trong các route bắt buộc đăng nhập
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user!;
}
