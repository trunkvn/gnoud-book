import Link from "next/link";
import { cn } from "@/lib/cn";

/** Dấu hiệu nhỏ: mặt trời vàng trong vòng tròn mực, như một con dấu thu nhỏ của mặt đồng hồ */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      <circle cx="16" cy="16" r="14.5" className="fill-jade stroke-hard" strokeWidth="1.5" />
      <circle cx="16" cy="18" r="6" className="fill-marigold" />
      <path
        d="M16 4.5v3M7.3 8.3l2.1 2.1M24.7 8.3l-2.1 2.1M4.5 16h3M24.5 16h3"
        className="stroke-on-jade"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  light = false,
}: {
  href?: string;
  className?: string;
  /** Dùng trên nền ngọc bích đậm: chữ sáng */
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="Gnoud Book, về trang chủ"
    >
      <LogoMark />
      <span
        className={cn(
          "font-display text-[1.35rem] leading-none font-extrabold tracking-tight",
          light ? "text-on-deep" : "text-ink",
        )}
      >
        Gnoud<span className="text-marigold">·</span>Book
      </span>
    </Link>
  );
}
