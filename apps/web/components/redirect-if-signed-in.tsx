import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Đặt trong <Suspense> ở trang đăng nhập/đăng ký: ai đã đăng nhập rồi thì chuyển thẳng vào trang quản lý. */
export async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}
