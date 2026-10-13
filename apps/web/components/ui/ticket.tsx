import { cn } from "@/lib/cn";

/**
 * Tấm vé hẹn: phần trên ghi ngày, phần dưới ghi giờ và dịch vụ, ngăn cách bằng đường xé
 * (hai bên có khuyết nửa tròn). Dùng làm hình minh hoạ "một lịch hẹn" trên trang chủ.
 */
export function Ticket({
  weekday,
  day,
  month,
  time,
  service,
  business,
  className,
}: {
  weekday: string;
  day: string;
  month: string;
  time: string;
  service: string;
  business: string;
  className?: string;
}) {
  return (
    // drop-shadow phải đặt ở lớp ngoài, vì mask của .ticket sẽ cắt luôn cả box-shadow
    <div className={cn("drop-shadow-[6px_8px_0_var(--hard)]", className)}>
      <div className="ticket w-64 border-2 border-hard bg-paper-raised text-ink">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div>
            <p className="eyebrow !text-ink-soft">{weekday}</p>
            <p className="font-display mt-2 text-6xl leading-none font-black">{day}</p>
            <p className="mt-1 text-sm font-semibold tracking-wide uppercase">{month}</p>
          </div>
          <div className="mt-1 grid size-11 place-items-center rounded-full border-2 border-hard bg-marigold">
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" className="stroke-hard" strokeWidth="2" />
              <path d="M12 7v5l3 2" fill="none" className="stroke-hard" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-ink/40 px-5 pt-4 pb-5">
          <p className="text-2xl font-bold">{time}</p>
          <p className="mt-1 text-sm font-medium">{service}</p>
          <p className="text-xs text-ink-soft">{business}</p>
          {/* mã vạch trang trí */}
          <div className="mt-4 flex h-7 items-end gap-[3px]" aria-hidden="true">
            {[3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1].map((w, i) => (
              <span
                key={i}
                className="bg-ink"
                style={{ width: w, height: i % 4 === 0 ? "100%" : "78%" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
