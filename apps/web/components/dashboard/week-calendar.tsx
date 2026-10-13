"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatTimeOfDay } from "@/lib/appointment";
import {
  blockPosition,
  closedRanges,
  layoutDay,
  visibleHours,
} from "@/lib/calendar-layout";
import { cn } from "@/lib/cn";
import {
  dateKeyIn,
  formatWeekRange,
  minutesOfDayIn,
  weekdayIndex,
  weekdayLong,
  weekdayShort,
} from "@/lib/dates";
import type { Week } from "@/lib/hours";
import { toMinutes } from "@/lib/hours";
import type { OwnerAppointment } from "@/lib/owner";
import { useNowMinutes } from "@/lib/use-now-minutes";
import { AppointmentDialog } from "./appointment-dialog";
import { STATUS_LABEL, STATUS_TONE } from "./status";

const PX_PER_HOUR = 64;

type DayItem = {
  appointment: OwnerAppointment;
  startMin: number;
  endMin: number;
};

/** Lịch tuần của chủ cơ sở: lưới giờ trên máy tính, danh sách theo ngày trên điện thoại. */
export function WeekCalendar({
  timezone,
  days,
  todayKey,
  appointments,
  openHours,
  hrefs,
}: {
  timezone: string;
  /** Bảy ngày YYYY-MM-DD từ Thứ Hai đến Chủ Nhật */
  days: string[];
  todayKey: string;
  appointments: OwnerAppointment[];
  /** Giờ làm việc theo tuần (chỉ số = dayOfWeek), để tô vùng ngoài giờ */
  openHours: Week;
  hrefs: { prev: string; next: string; today: string };
}) {
  const [selected, setSelected] = useState<OwnerAppointment | null>(null);

  // Gom lịch hẹn theo ngày (theo múi giờ cơ sở) và đổi giờ sang số phút trong ngày
  const byDay = new Map<string, DayItem[]>(days.map((day) => [day, []]));
  for (const appointment of appointments) {
    const key = dateKeyIn(appointment.startsAt, timezone);
    const startMin = minutesOfDayIn(appointment.startsAt, timezone);
    const durationMin =
      (new Date(appointment.endsAt).getTime() -
        new Date(appointment.startsAt).getTime()) /
      60_000;
    byDay.get(key)?.push({ appointment, startMin, endMin: startMin + durationMin });
  }

  // Khoảng giờ hiển thị bao trùm cả giờ làm việc lẫn mọi lịch hẹn
  const openAsItems = openHours.flatMap((day) =>
    day.map((i) => ({ startMin: toMinutes(i.start), endMin: toMinutes(i.end) })),
  );
  const hours = visibleHours([
    ...openAsItems,
    ...[...byDay.values()].flat(),
  ]);
  const gridHeight = (hours.end - hours.start) * PX_PER_HOUR;
  const hourMarks = Array.from(
    { length: hours.end - hours.start },
    (_, i) => hours.start + i,
  );

  const openIntervalsFor = (dayKey: string) =>
    openHours[(weekdayIndex(dayKey) + 1) % 7].map((i) => ({
      startMin: toMinutes(i.start),
      endMin: toMinutes(i.end),
    }));

  const total = appointments.filter((a) => a.status !== "CANCELLED").length;

  return (
    <>
      <section className="overflow-hidden rounded-3xl border-2 border-hard bg-paper-raised shadow-[6px_6px_0_0_var(--hard)]">
        {/* thanh công cụ: tuần trước / hôm nay / tuần sau */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-hard px-5 py-4">
          <div className="flex items-center gap-2">
            <Link
              href={hrefs.prev}
              aria-label="Tuần trước"
              className="grid size-10 place-items-center rounded-full border-[1.5px] border-ink/70 hover:bg-paper-sunk"
            >
              <ChevronLeftIcon />
            </Link>
            <Link
              href={hrefs.next}
              aria-label="Tuần sau"
              className="grid size-10 place-items-center rounded-full border-[1.5px] border-ink/70 hover:bg-paper-sunk"
            >
              <ChevronRightIcon />
            </Link>
            <ButtonLink href={hrefs.today} variant="secondary" size="sm">
              Hôm nay
            </ButtonLink>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl leading-none font-black">
              {formatWeekRange(days[0])}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {total} lịch hẹn · giờ {timezone}
            </p>
          </div>
        </div>

        {/* ——— Máy tính: lưới giờ ——— */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b-2 border-hard bg-paper-sunk/60">
            <div />
            {days.map((day) => {
              const isToday = day === todayKey;
              const count = byDay
                .get(day)!
                .filter((i) => i.appointment.status !== "CANCELLED").length;
              return (
                <div key={day} className="border-l border-line px-3 py-3 text-center">
                  <p className="text-xs font-bold tracking-wider text-ink-soft uppercase">
                    {weekdayShort(day)}
                  </p>
                  <p
                    className={cn(
                      "font-display mx-auto mt-1 grid size-11 place-items-center rounded-full text-2xl leading-none font-black",
                      isToday && "border-2 border-hard bg-marigold text-[#0d1f1b]",
                    )}
                  >
                    {day.slice(8)}
                  </p>
                  <p className="mt-1 h-4 text-[0.7rem] font-semibold text-jade">
                    {count > 0 ? `${count} lịch` : ""}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="scroll-thin max-h-[40rem] overflow-y-auto">
            <div
              className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]"
              style={{ height: gridHeight }}
            >
              {/* cột nhãn giờ */}
              <div className="relative">
                {hourMarks.map((hour, i) => (
                  <span
                    key={hour}
                    // nhãn đầu tiên nằm ngay mép trên (không dịch lên) để khỏi bị cắt mất
                    className={cn(
                      "absolute right-2 text-[0.7rem] font-semibold text-ink-soft",
                      i > 0 && "-translate-y-1/2",
                    )}
                    style={{ top: i === 0 ? 3 : i * PX_PER_HOUR }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </span>
                ))}
              </div>

              {days.map((day) => {
                const items = byDay.get(day)!;
                const layout = layoutDay(
                  items.map((i) => ({
                    id: i.appointment.id,
                    startMin: i.startMin,
                    endMin: i.endMin,
                  })),
                );
                const closed = closedRanges(
                  openIntervalsFor(day),
                  hours.start * 60,
                  hours.end * 60,
                );

                return (
                  <div
                    key={day}
                    className={cn(
                      "relative border-l border-line",
                      day === todayKey && "bg-marigold-soft/35",
                    )}
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, var(--line) ${PX_PER_HOUR - 1}px, var(--line) ${PX_PER_HOUR}px)`,
                    }}
                  >
                    {/* giờ đóng cửa: gạch chéo */}
                    {closed.map((range) => (
                      <div
                        key={range.startMin}
                        aria-hidden="true"
                        className="absolute inset-x-0 opacity-70"
                        style={{
                          top: ((range.startMin - hours.start * 60) / 60) * PX_PER_HOUR,
                          height: ((range.endMin - range.startMin) / 60) * PX_PER_HOUR,
                          backgroundImage:
                            "repeating-linear-gradient(135deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent 9px)",
                        }}
                      />
                    ))}

                    {items.map(({ appointment, startMin, endMin }) => {
                      const { top, height } = blockPosition(
                        startMin,
                        endMin,
                        hours.start,
                        PX_PER_HOUR,
                      );
                      const placement = layout.get(appointment.id)!;
                      const width = 100 / placement.lanes;

                      return (
                        <button
                          key={appointment.id}
                          type="button"
                          onClick={() => setSelected(appointment)}
                          aria-label={`${formatTimeOfDay(appointment.startsAt, timezone)}, ${appointment.customer.name}, ${appointment.service.name}, ${STATUS_LABEL[appointment.status]}`}
                          className={cn(
                            "absolute overflow-hidden rounded-lg border-[1.5px] px-2 py-1 text-left text-xs transition hover:z-10 hover:-translate-y-px hover:shadow-[2px_2px_0_0_var(--hard)]",
                            appointment.status === "CONFIRMED" &&
                              "border-hard bg-jade text-on-jade",
                            appointment.status === "COMPLETED" &&
                              "border-jade/50 bg-jade-tint text-jade-strong",
                            appointment.status === "CANCELLED" &&
                              "border-dashed border-ink/40 bg-paper-sunk text-ink-soft line-through",
                          )}
                          style={{
                            top,
                            height,
                            left: `calc(${placement.lane * width}% + 2px)`,
                            width: `calc(${width}% - 4px)`,
                          }}
                        >
                          <span className="block font-bold">
                            {formatTimeOfDay(appointment.startsAt, timezone)}
                          </span>
                          <span className="block truncate font-semibold">
                            {appointment.customer.name}
                          </span>
                          {height >= 56 && (
                            <span className="block truncate opacity-80">
                              {appointment.service.name}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {day === todayKey && (
                      <NowLine
                        timezone={timezone}
                        startHour={hours.start}
                        endHour={hours.end}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ——— Điện thoại: danh sách theo ngày ——— */}
        <ol className="divide-y divide-line lg:hidden">
          {days.map((day) => {
            const items = [...byDay.get(day)!].sort((a, b) => a.startMin - b.startMin);
            const isToday = day === todayKey;

            return (
              <li key={day} className={cn("px-5 py-4", isToday && "bg-marigold-soft/35")}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-xl font-extrabold">
                    {weekdayLong(day)}
                    <span className="ml-2 text-base font-semibold text-ink-soft">
                      {day.slice(8)}/{day.slice(5, 7)}
                    </span>
                  </h3>
                  {isToday && <Badge tone="marigold">Hôm nay</Badge>}
                </div>

                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">Không có lịch hẹn.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {items.map(({ appointment }) => (
                      <li key={appointment.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(appointment)}
                          className="flex w-full items-start gap-4 rounded-2xl border-[1.5px] border-ink/30 bg-paper px-4 py-3 text-left hover:border-jade"
                        >
                          <span
                            className={cn(
                              "font-display text-xl font-black",
                              appointment.status === "CANCELLED" && "line-through opacity-60",
                            )}
                          >
                            {formatTimeOfDay(appointment.startsAt, timezone)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold break-words">
                              {appointment.customer.name}
                            </span>
                            <span className="block text-sm break-words text-ink-soft">
                              {appointment.service.name}
                            </span>
                            {/* "Đã xác nhận" là trạng thái bình thường nên không cần nhãn; chỉ nêu các trạng thái khác */}
                            {appointment.status !== "CONFIRMED" && (
                              <Badge
                                tone={STATUS_TONE[appointment.status]}
                                className="mt-1.5"
                              >
                                {STATUS_LABEL[appointment.status]}
                              </Badge>
                            )}
                          </span>

                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <AppointmentDialog
        appointment={selected}
        timezone={timezone}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

/** Vạch đỏ "bây giờ" trên cột của hôm nay (chỉ vẽ ở trình duyệt vì server không biết giờ hiện tại). */
function NowLine({
  timezone,
  startHour,
  endHour,
}: {
  timezone: string;
  startHour: number;
  endHour: number;
}) {
  const now = useNowMinutes(timezone);
  if (now === null || now < startHour * 60 || now > endHour * 60) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
      style={{ top: ((now - startHour * 60) / 60) * PX_PER_HOUR }}
    >
      <span className="-ml-1.5 size-3 rounded-full border-2 border-hard bg-coral" />
      <span className="h-0.5 flex-1 bg-coral" />
    </div>
  );
}
