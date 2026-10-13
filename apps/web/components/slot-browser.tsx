'use client';

import { useEffect, useState } from 'react';
import {
  addDays,
  errorMessage,
  formatDayLabel,
  todayIn,
  type Slot,
  type SlotDay,
  type SlotsResponse,
} from '@/lib/appointment';
import { cn } from '@/lib/cn';
import { weekdayShort } from '@/lib/dates';

const DAYS_PER_PAGE = 14;

type LoadResult =
  | { key: string; days: SlotDay[]; error?: undefined }
  | { key: string; error: string; days?: undefined };

/**
 * Chọn một khung giờ trống: một dải ngày (chỉ những ngày còn giờ) rồi các giờ của ngày đang chọn.
 * Dùng chung cho trang đặt lịch của khách và trang đổi lịch. Giờ hiển thị theo múi giờ `timezone`.
 */
export function SlotBrowser({
  endpoint,
  baseQuery,
  timezone,
  selected,
  onSelect,
  reloadKey = 0,
}: {
  /** Đường dẫn API trả về slot, không kèm query. */
  endpoint: string;
  /** Tham số cố định kèm theo (ví dụ serviceId). */
  baseQuery?: Record<string, string>;
  timezone: string;
  /** startsAt của slot đang chọn */
  selected: string | null;
  onSelect: (slot: Slot) => void;
  /** Tăng giá trị này để buộc tải lại (ví dụ sau khi một slot vừa bị người khác đặt). */
  reloadKey?: number;
}) {
  const [pages, setPages] = useState(1);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [result, setResult] = useState<LoadResult | null>(null);

  // Mỗi tổ hợp (nguồn, múi giờ, số trang, lần tải lại) là một "yêu cầu". Kết quả gắn với khoá của nó,
  // nên "đang tải" = chưa có kết quả cho khoá hiện tại, không cần setState đồng bộ trong effect.
  const baseKey = JSON.stringify(baseQuery ?? {});
  const key = `${endpoint}|${baseKey}|${timezone}|${pages}|${reloadKey}`;
  const current = result?.key === key ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    const from = todayIn(timezone);
    const to = addDays(from, DAYS_PER_PAGE * pages - 1);
    const query = new URLSearchParams({
      ...(JSON.parse(baseKey) as Record<string, string>),
      from,
      to,
      timezone,
    });

    fetch(`${endpoint}?${query}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(errorMessage(body, 'Không tải được các giờ còn trống'));
        }
        return body as SlotsResponse;
      })
      .then((data) => setResult({ key, days: data.days }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          error:
            error instanceof Error
              ? error.message
              : 'Không tải được các giờ còn trống',
        });
      });

    return () => controller.abort();
  }, [endpoint, baseKey, timezone, pages, key]);

  const daysWithSlots = current?.days?.filter((day) => day.slots.length > 0) ?? [];
  // Ngày đang xem: ngày khách đã bấm nếu nó còn giờ, nếu không thì ngày đầu tiên còn giờ
  const activeDay =
    daysWithSlots.find((day) => day.date === chosenDate) ?? daysWithSlots[0];

  if (!current) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[4.5rem] w-16 shrink-0 animate-pulse rounded-2xl bg-paper-sunk" />
          ))}
        </div>
        <p className="text-sm text-ink-soft">Đang tải các giờ còn trống…</p>
      </div>
    );
  }

  if (current.error) {
    return (
      <p role="alert" className="text-sm font-semibold text-coral">
        {current.error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {daysWithSlots.length === 0 ? (
        <p className="rounded-2xl border-[1.5px] border-dashed border-ink/40 px-4 py-6 text-center text-sm text-ink-soft">
          Chưa có giờ trống trong {DAYS_PER_PAGE * pages} ngày tới.
        </p>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Chọn ngày"
            className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-3"
          >
            {daysWithSlots.map((day) => {
              const active = day.date === activeDay?.date;
              return (
                <button
                  key={day.date}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setChosenDate(day.date)}
                  className={cn(
                    'flex w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border-[1.5px] px-2 py-2.5 transition',
                    active
                      ? 'border-hard bg-jade text-on-jade shadow-[3px_3px_0_0_var(--hard)]'
                      : 'border-ink/30 bg-paper-raised hover:border-jade',
                  )}
                >
                  <span className="text-[0.7rem] font-bold tracking-wider uppercase opacity-80">
                    {weekdayShort(day.date)}
                  </span>
                  <span className="font-display text-2xl leading-none font-black">
                    {day.date.slice(8)}
                  </span>
                  <span className="mt-1 text-[0.65rem] font-semibold opacity-80">
                    {day.slots.length} giờ
                  </span>
                </button>
              );
            })}
          </div>

          {activeDay && (
            <div role="tabpanel" className="flex flex-col gap-3">
              <h3 className="text-sm font-bold tracking-wide uppercase">
                {formatDayLabel(activeDay.date)}
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeDay.slots.map((slot) => {
                  const isSelected = selected === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelect(slot)}
                      className={cn(
                        'min-w-[4.75rem] rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition',
                        isSelected
                          ? 'border-hard bg-jade text-on-jade shadow-[2px_2px_0_0_var(--hard)]'
                          : 'border-ink/30 bg-paper hover:border-jade hover:bg-jade-tint',
                      )}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setPages((value) => value + 1)}
        className="self-start text-sm font-semibold underline underline-offset-4"
      >
        Xem thêm {DAYS_PER_PAGE} ngày nữa
      </button>
    </div>
  );
}
