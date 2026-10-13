import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Họa tiết lưới tam giác với chấm ở mỗi nút (gợi hoa văn hình học truyền thống), vẽ bằng một
 * <pattern> SVG nên lặp vô hạn mà chỉ nặng vài trăm byte. Màu lấy từ `currentColor`.
 */
export function Lattice({ className }: { className?: string }) {
  const id = useId();
  const w = 44;
  const h = 76.2; // w * sqrt(3)

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    >
      <defs>
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <path d={`M0 0H${w} M0 ${h}H${w}`} />
            <path d={`M0 0L${w / 2} ${h / 2}L0 ${h} M${w} 0L${w / 2} ${h / 2}L${w} ${h}`} />
            <path d={`M${w / 2} ${h / 2}H${w}`} opacity="0.5" />
          </g>
          <g fill="currentColor">
            <circle cx="0" cy="0" r="1.6" />
            <circle cx={w} cy="0" r="1.6" />
            <circle cx={w / 2} cy={h / 2} r="1.6" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
