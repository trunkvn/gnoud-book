'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  errorMessage,
  formatDateTime,
  type ManagedAppointment,
  type Slot,
} from '@/lib/appointment';
import { SlotBrowser } from './slot-browser';

/**
 * Đổi lịch hẹn: chọn một khung giờ trống (bằng SlotBrowser) rồi xác nhận. Các slot do API lọc sẵn:
 * không có giờ người khác đã đặt, và không bị chính lịch hiện tại của khách chặn các giờ sát nó.
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
  const [selected, setSelected] = useState<Slot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  return (
    <section className="flex flex-col gap-5 rounded-3xl border-2 border-hard bg-paper-raised p-6 shadow-[6px_6px_0_0_var(--hard)]">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Chọn giờ mới</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-semibold underline underline-offset-4"
        >
          Đóng
        </button>
      </div>
      <p className="text-sm text-ink-soft">
        Giờ hiển thị theo múi giờ của bạn ({viewerTimezone}).
      </p>

      <SlotBrowser
        endpoint={`/api/public/appointments/${encodeURIComponent(token)}/slots`}
        timezone={viewerTimezone}
        selected={selected?.startsAt ?? null}
        reloadKey={reloadKey}
        onSelect={(slot) => {
          setSelected(slot);
          setSubmitError(null);
        }}
      />

      {submitError && (
        <p role="alert" className="text-sm font-semibold text-coral">
          {submitError}
        </p>
      )}

      {selected && (
        <div className="flex flex-col gap-4 border-t-2 border-dashed border-ink/30 pt-5">
          <p>
            Đổi sang <strong>{formatDateTime(selected.startsAt, viewerTimezone)}</strong>?
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={confirm} disabled={submitting}>
              {submitting ? 'Đang đổi…' : 'Xác nhận đổi lịch'}
            </Button>
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={submitting}>
              Chọn lại
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
