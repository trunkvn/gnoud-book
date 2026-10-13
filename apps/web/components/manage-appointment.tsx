'use client';

import { useState } from 'react';
import {
  errorMessage,
  formatDateTime,
  formatPrice,
  type ManagedAppointment,
} from '@/lib/appointment';
import { useViewerTimezone } from '@/lib/use-viewer-timezone';
import { SlotPicker } from './slot-picker';

type Mode = 'view' | 'confirmCancel' | 'reschedule';
type Notice = { kind: 'success' | 'error'; text: string };

/** Trang khách xem, huỷ hoặc đổi lịch hẹn của mình (vào bằng link trong email, không cần đăng nhập). */
export function ManageAppointment({
  token,
  initial,
}: {
  token: string;
  initial: ManagedAppointment;
}) {
  const viewerTimezone = useViewerTimezone();
  const [appointment, setAppointment] = useState(initial);
  const [mode, setMode] = useState<Mode>('view');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const cancelled = appointment.status === 'CANCELLED';
  const active = appointment.status === 'CONFIRMED';
  const businessTimezone = appointment.business.timezone;

  // Trước khi biết múi giờ của trình duyệt thì chưa in giờ (tránh server và trình duyệt in khác nhau)
  const when = viewerTimezone
    ? formatDateTime(appointment.startsAt, viewerTimezone)
    : '…';
  const differentZone = viewerTimezone && viewerTimezone !== businessTimezone;

  async function cancelAppointment() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/public/appointments/${encodeURIComponent(token)}/cancel`,
        { method: 'POST' },
      );
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setAppointment(body as ManagedAppointment);
        setNotice({
          kind: 'success',
          text: 'Đã huỷ lịch hẹn. Chúng tôi đã gửi email xác nhận cho bạn.',
        });
      } else {
        setNotice({
          kind: 'error',
          text: errorMessage(body, 'Không huỷ được lịch hẹn, vui lòng thử lại'),
        });
      }
    } catch {
      setNotice({ kind: 'error', text: 'Không kết nối được máy chủ' });
    } finally {
      setBusy(false);
      setMode('view');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Lịch hẹn của bạn</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Xin chào {appointment.customer.name}.
        </p>
      </header>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-md border p-3 text-sm ${
            notice.kind === 'error'
              ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
              : 'border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200'
          }`}
        >
          {notice.text}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{appointment.service.name}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              active
                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {active ? 'Đã xác nhận' : cancelled ? 'Đã huỷ' : 'Đã hoàn thành'}
          </span>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-zinc-500">Cơ sở</dt>
          <dd>{appointment.business.name}</dd>
          <dt className="text-zinc-500">Thời gian</dt>
          <dd className={cancelled ? 'line-through' : 'font-medium'}>
            {when}
            {viewerTimezone && (
              <span className="block text-xs font-normal text-zinc-500 no-underline">
                {viewerTimezone}
              </span>
            )}
          </dd>
          {differentZone && (
            <>
              <dt className="text-zinc-500">Giờ tại cơ sở</dt>
              <dd>{formatDateTime(appointment.startsAt, businessTimezone)}</dd>
            </>
          )}
          <dt className="text-zinc-500">Thời lượng</dt>
          <dd>{appointment.service.durationMinutes} phút</dd>
          <dt className="text-zinc-500">Giá</dt>
          <dd>
            {formatPrice(appointment.service.price, appointment.service.currency)}
          </dd>
        </dl>
      </section>

      {active && !appointment.canChange && (
        <p className="rounded-md border border-zinc-300 p-3 text-sm dark:border-zinc-700">
          Đã quá hạn huỷ hoặc đổi lịch
          {viewerTimezone &&
            ` (hạn chót là ${formatDateTime(appointment.changeDeadline, viewerTimezone)})`}
          . Nếu cần thay đổi, vui lòng liên hệ trực tiếp {appointment.business.name}.
        </p>
      )}

      {active && appointment.canChange && mode === 'view' && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setMode('reschedule');
            }}
            disabled={!viewerTimezone}
            className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Đổi lịch
          </button>
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setMode('confirmCancel');
            }}
            className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          >
            Huỷ lịch
          </button>
        </div>
      )}

      {active && mode === 'confirmCancel' && (
        <section className="flex flex-col gap-3 rounded-lg border border-red-300 p-4 dark:border-red-900">
          <p>Bạn chắc chắn muốn huỷ lịch hẹn này?</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelAppointment}
              disabled={busy}
              className="rounded-md bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {busy ? 'Đang huỷ…' : 'Huỷ lịch hẹn'}
            </button>
            <button
              type="button"
              onClick={() => setMode('view')}
              disabled={busy}
              className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700"
            >
              Giữ lịch
            </button>
          </div>
        </section>
      )}

      {active && mode === 'reschedule' && viewerTimezone && (
        <SlotPicker
          token={token}
          viewerTimezone={viewerTimezone}
          onCancel={() => setMode('view')}
          onRescheduled={(updated) => {
            setAppointment(updated);
            setMode('view');
            setNotice({
              kind: 'success',
              text: 'Đã đổi lịch hẹn. Chúng tôi đã gửi email xác nhận giờ mới cho bạn.',
            });
          }}
        />
      )}
    </div>
  );
}
