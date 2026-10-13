import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth";

/** Thông tin người đang đăng nhập (đọc session nên phải nằm trong Suspense). */
export async function UserCard() {
  const user = await requireUser();
  const business = user.businesses[0];
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-on-deep/20 bg-on-deep/5 p-4">
      <div className="flex items-center gap-3">
        <span className="font-display grid size-11 shrink-0 place-items-center rounded-full border-2 border-on-deep/40 bg-marigold text-lg font-black text-[#0d1f1b]">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-xs text-on-deep/70">{business?.name}</p>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}

export function UserCardSkeleton() {
  return <div className="h-[7.5rem] animate-pulse rounded-2xl bg-on-deep/10" />;
}
