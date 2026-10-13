'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  dateParts,
  errorMessage,
  formatDateTime,
  formatPrice,
  sameLocalTime,
  type ManagedAppointment,
} from '@/lib/appointment';
import { cn } from '@/lib/cn';
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
  const parts = viewerTimezone
    ? dateParts(appointment.startsAt, viewerTimezone)
    : null;
  const differentZone =
    viewerTimezone !== null &&
    !sameLocalTime(appointment.startsAt, viewerTimezone, businessTimezone);

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
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Quản lý lịch hẹn</p>
        <h1 className="font-display mt-4 text-5xl leading-[1.02] font-black tracking-tight sm:text-6xl">
          Xin chào, {appointment.customer.name}.
        </h1>
        <p className="mt-3 text-ink-soft">
          {active
            ? 'Đây là lịch hẹn của bạn. Bạn có thể đổi giờ hoặc huỷ ở bên dưới.'
            : cancelled
              ? 'Lịch hẹn này đã được huỷ.'
              : 'Lịch hẹn này đã hoàn thành.'}
        </p>
      </header>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-2xl border-[1.5px] px-5 py-4 text-sm font-semibold',
            notice.kind === 'error'
              ? 'border-coral/50 bg-coral-tint text-coral'
              : 'border-jade/50 bg-jade-tint text-jade-strong',
          )}
        >
          {notice.text}
        </p>
      )}

      {/* Thẻ lịch hẹn: khối "tờ lịch" bên trái, chi tiết bên phải */}
      <section
        className={cn(
          'grid overflow-hidden rounded-3xl border-2 border-hard bg-paper-raised shadow-[6px_6px_0_0_var(--hard)] sm:grid-cols-[11rem_1fr]',
          cancelled && 'opacity-80',
        )}
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-1 border-b-2 border-dashed border-ink/40 p-6 text-center sm:border-r-2 sm:border-b-0',
            cancelled ? 'bg-paper-sunk' : 'bg-jade text-on-jade',
          )}
        >
          <p className="text-xs font-bold tracking-[0.16em] uppercase">
            {parts?.weekday ?? '…'}
          </p>
          <p className="font-display text-7xl leading-none font-black">
            {parts?.day ?? '··'}
          </p>
          <p className="text-sm font-semibold">{parts?.month ?? ''}</p>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl leading-tight font-extrabold">
                {appointment.service.name}
              </h2>
              <p className="text-ink-soft">{appointment.business.name}</p>
            </div>
            <Badge tone={active ? 'jade' : cancelled ? 'coral' : 'neutral'}>
              {active ? 'Đã xác nhận' : cancelled ? 'Đã huỷ' : 'Đã hoàn thành'}
            </Badge>
          </div>

          <p
            className={cn(
              'font-display text-4xl font-black',
              cancelled && 'line-through decoration-2',
            )}
          >
            {parts?.time ?? '--:--'}
            <span className="ml-2 text-base font-semibold text-ink-soft no-underline">
              {viewerTimezone ?? ''}
            </span>
          </p>

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {differentZone && (
              <>
                <dt className="text-ink-soft">Giờ tại cơ sở</dt>
                <dd className="font-medium">
                  {formatDateTime(appointment.startsAt, businessTimezone)}
                </dd>
              </>
            )}
            <dt className="text-ink-soft">Thời lượng</dt>
            <dd className="font-medium">{appointment.service.durationMinutes} phút</dd>
            <dt className="text-ink-soft">Giá</dt>
            <dd className="font-medium">
              {formatPrice(appointment.service.price, appointment.service.currency)}
            </dd>
          </dl>
        </div>
      </section>

      {active && !appointment.canChange && (
        <p className="rounded-2xl border-[1.5px] border-marigold bg-marigold-soft px-5 py-4 text-sm font-medium text-ink">
          Đã quá hạn huỷ hoặc đổi lịch
          {viewerTimezone &&
            ` (hạn chót là ${formatDateTime(appointment.changeDeadline, viewerTimezone)})`}
          . Nếu cần thay đổi, vui lòng liên hệ trực tiếp {appointment.business.name}.
        </p>
      )}

      {active && appointment.canChange && mode === 'view' && (
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            onClick={() => {
              setNotice(null);
              setMode('reschedule');
            }}
            disabled={!viewerTimezone}
          >
            Đổi lịch
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setNotice(null);
              setMode('confirmCancel');
            }}
          >
            Huỷ lịch
          </Button>
        </div>
      )}

      {active && mode === 'confirmCancel' && (
        <section className="flex flex-col gap-4 rounded-3xl border-2 border-coral bg-coral-tint p-6">
          <p className="font-semibold">Bạn chắc chắn muốn huỷ lịch hẹn này?</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={cancelAppointment} disabled={busy}>
              {busy ? 'Đang huỷ…' : 'Huỷ lịch hẹn'}
            </Button>
            <Button variant="secondary" onClick={() => setMode('view')} disabled={busy}>
              Giữ lịch
            </Button>
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
