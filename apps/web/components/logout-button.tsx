"use client";

import { useRouter } from "next/navigation";
import { LogoutIcon } from "@/components/ui/icons";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-on-deep/80 transition hover:bg-on-deep/10 hover:text-on-deep"
    >
      <LogoutIcon className="size-4" />
      Đăng xuất
    </button>
  );
}
