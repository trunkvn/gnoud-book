import { formatDateTime } from "@/lib/appointment";
import type { CalendarStats } from "@/lib/calendar-stats";

function Tile({
  label,
  value,
  note,
  accent = false,
  className = "",
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={
        "flex flex-col justify-between gap-2 rounded-3xl border-2 border-hard p-4 shadow-[4px_4px_0_0_var(--hard)] sm:gap-3 sm:p-5 " +
        (accent ? "bg-marigold text-[#0d1f1b] " : "bg-paper-raised ") +
        className
      }
    >
      <p className="text-xs font-bold tracking-[0.16em] uppercase opacity-70">{label}</p>
      <p className="font-display text-5xl leading-none font-black">{value}</p>
      {note && <p className="text-sm opacity-80">{note}</p>}
    </div>
  );
}

/** Bốn thẻ tóm tắt phía trên lịch. */
export function StatTiles({
  stats,
  timezone,
}: {
  stats: CalendarStats;
  timezone: string;
}) {
  const next = stats.next;
  // Lưới: điện thoại dùng 6 cột chia 3+3 rồi 2+4; màn hình lớn dùng 4 thẻ đều nhau.

  return (
    <div className="grid grid-cols-6 gap-3 sm:gap-4 xl:grid-cols-4">
      <Tile accent className="col-span-3 xl:col-span-1" label="Hôm nay" value={String(stats.today)} note="lịch hẹn đã xác nhận" />
      <Tile
        className="col-span-3 xl:col-span-1"
        label="Tuần này"
        value={String(stats.confirmed)}
        note={`${stats.completed} đã hoàn thành`}
      />
      <Tile
        className="col-span-2 xl:col-span-1"
        label="Đã huỷ"
        value={String(stats.cancelled)}
        note="trong tuần đang xem"
      />
      <div className="col-span-4 flex flex-col justify-between gap-3 rounded-3xl border-2 border-hard bg-paper-raised p-5 shadow-[4px_4px_0_0_var(--hard)] xl:col-span-1">
        <p className="text-xs font-bold tracking-[0.16em] uppercase opacity-70">Sắp tới</p>
        {next ? (
          <>
            <p className="font-display text-2xl leading-tight font-black">{next.customer.name}</p>
            <p className="text-sm text-ink-soft">
              {next.service.name} · {formatDateTime(next.startsAt, timezone)}
            </p>
          </>
        ) : (
          <p className="font-display text-2xl leading-tight font-black text-ink-soft">
            Chưa có lịch sắp tới
          </p>
        )}
      </div>
    </div>
  );
}
