'use client';

import { useEffect, useState } from 'react';
import {
  addDays,
  errorMessage,
  formatDateTime,
  formatDayLabel,
  todayIn,
  type ManagedAppointment,
  type Slot,
  type SlotDay,
  type SlotsResponse,
} from '@/lib/appointment';

const DAYS_PER_PAGE = 14;

type LoadResult = { key: string; days: SlotDay[]; error?: undefined } | { key: string; error: string; days?: undefined };

/**
 * Chọn một khung giờ trống để đổi lịch. Giờ hiển thị theo múi giờ của người xem; các slot lấy từ
 * API (đã loại giờ bị người khác chiếm, nhưng không loại giờ sát với lịch hiện tại của chính khách).
 */
export function SlotPicker({
  token,
  viewerTimezone,
  onRescheduled,
  onCancel,
}: {
  token: string;
  viewerTimezone: string;
  onRescheduled: (appointment: ManagedAppointment) => void;
  onCancel: () => void;
}) {
  const [pages, setPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Mỗi tổ hợp (múi giờ, số trang, lần tải lại) là một "yêu cầu". Kết quả gắn với khoá của nó,
  // nên "đang tải" = chưa có kết quả cho khoá hiện tại, không cần setState đồng bộ trong effect.
  const key = `${viewerTimezone}|${pages}|${reloadKey}`;
  const current = result?.key === key ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    const from = todayIn(viewerTimezone);
    const to = addDays(from, DAYS_PER_PAGE * pages - 1);
    const query = new URLSearchParams({ from, to, timezone: viewerTimezone });

    fetch(
      `/api/public/appointments/${encodeURIComponent(token)}/slots?${query}`,
      { signal: controller.signal },
    )
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
  }, [token, viewerTimezone, pages, key]);

  async function confirm() {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(
        `/api/public/appointments/${encodeURIComponent(token)}/reschedule`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startsAt: selected.startsAt }),
        },
      );
      const body = await res.json().catch(() => null);
      if (res.ok) {
        onRescheduled(body as ManagedAppointment);
        return;
      }
      setSubmitError(errorMessage(body, 'Không đổi được lịch, vui lòng thử lại'));
      if (res.status === 409) {
        // Giờ vừa bị người khác đặt: bỏ lựa chọn và tải lại danh sách cho khách chọn giờ khác
        setSelected(null);
        setReloadKey((value) => value + 1);
      }
    } catch {
      setSubmitError('Không kết nối được máy chủ');
    } finally {
      setSubmitting(false);
    }
  }

  const daysWithSlots = current?.days?.filter((day) => day.slots.length > 0) ?? [];

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Chọn giờ mới</h2>
        <button type="button" onClick={onCancel} className="text-sm underline">
          Đóng
        </button>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Giờ hiển thị theo múi giờ của bạn ({viewerTimezone}).
      </p>

      {!current && (
        <p className="text-sm" aria-live="polite">
          Đang tải các giờ còn trống…
        </p>
      )}
      {current?.error && (
        <p role="alert" className="text-sm text-red-600">
          {current.error}
        </p>
      )}

      {current?.days && daysWithSlots.length === 0 && (
        <p className="text-sm">Chưa có giờ trống trong {DAYS_PER_PAGE * pages} ngày tới.</p>
      )}

      {daysWithSlots.map((day) => (
        <div key={day.date} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{formatDayLabel(day.date)}</h3>
          <div className="flex flex-wrap gap-2">
            {day.slots.map((slot) => {
              const isSelected = selected?.startsAt === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelected(slot);
                    setSubmitError(null);
                  }}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-300 hover:border-zinc-500 dark:border-zinc-700'
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {current?.days && (
        <button
          type="button"
          onClick={() => setPages((value) => value + 1)}
          className="self-start text-sm underline"
        >
          Xem thêm {DAYS_PER_PAGE} ngày nữa
        </button>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      {selected && (
        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p>
            Đổi sang <strong>{formatDateTime(selected.startsAt, viewerTimezone)}</strong>?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={submitting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {submitting ? 'Đang đổi…' : 'Xác nhận đổi lịch'}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              disabled={submitting}
              className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700"
            >
              Chọn lại
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
