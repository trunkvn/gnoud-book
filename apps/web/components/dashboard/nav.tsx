"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  ClockIcon,
  StoreIcon,
  TagIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/dashboard", label: "Lịch", Icon: CalendarIcon, exact: true },
  { href: "/dashboard/services", label: "Dịch vụ", Icon: TagIcon },
  { href: "/dashboard/hours", label: "Giờ làm việc", Icon: ClockIcon },
  { href: "/dashboard/settings", label: "Cơ sở", Icon: StoreIcon },
] as const;

/**
 * Thanh điều hướng của khu vực chủ cơ sở: danh sách dọc ở thanh bên (máy tính),
 * hoặc thanh tab ở đáy màn hình (điện thoại). Mục đang mở được nhấn mạnh.
 */
export function DashboardNav({ variant }: { variant: "side" | "tabs" }) {
  const pathname = usePathname();

  return (
    <ul
      className={cn(
        variant === "side" ? "flex flex-col gap-1" : "grid grid-cols-4",
      )}
    >
      {ITEMS.map(({ href, label, Icon, ...rest }) => {
        const active =
          "exact" in rest && rest.exact
            ? pathname === href
            : pathname.startsWith(href);

        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center transition",
                variant === "side"
                  ? cn(
                      "gap-3 rounded-2xl px-4 py-3 text-[0.95rem] font-semibold",
                      active
                        ? "bg-marigold text-[#0d1f1b]"
                        : "text-on-deep/80 hover:bg-on-deep/10 hover:text-on-deep",
                    )
                  : cn(
                      "flex-col gap-1 py-2.5 text-[0.7rem] font-bold",
                      active ? "text-jade" : "text-ink-soft",
                    ),
              )}
            >
              <Icon />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
