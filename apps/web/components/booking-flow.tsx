'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TimezoneSelect } from '@/components/timezone-select';
import { Button, ButtonLink } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Ticket } from '@/components/ui/ticket';
import {
  dateParts,
  errorMessage,
  formatDateTime,
  formatPrice,
  formatTimeOfDay,
  sameLocalTime,
  type Slot,
} from '@/lib/appointment';
import { cn } from '@/lib/cn';
import type { CreatedAppointment, PublicBusiness } from '@/lib/public';
import { useViewerTimezone } from '@/lib/use-viewer-timezone';
import { SlotBrowser } from './slot-browser';

/**
 * Luồng khách đặt lịch: chọn dịch vụ -> chọn giờ (theo múi giờ của khách) -> nhập tên và email.
 * Bên phải là "tấm vé" xem trước lịch hẹn, cập nhật ngay khi khách chọn.
 */
export function BookingFlow({ business }: { business: PublicBusiness }) {
  const detectedTimezone = useViewerTimezone();
  const [timezoneOverride, setTimezoneOverride] = useState<string | null>(null);
  const [changingTimezone, setChangingTimezone] = useState(false);
  const timezone = timezoneOverride ?? detectedTimezone;

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAppointment | null>(null);

  const service = business.services.find((s) => s.id === serviceId) ?? null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !slot || !timezone) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(
        `/api/public/businesses/${encodeURIComponent(business.slug)}/appointments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId: service.id,
            startsAt: slot.startsAt,
            customerName: String(form.get('name')),
            customerEmail: String(form.get('email')),
            customerTimezone: timezone,
          }),
        },
      );
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setCreated(body as CreatedAppointment);
        return;
      }
      setError(errorMessage(body, 'Không đặt được lịch, vui lòng thử lại'));
      if (res.status === 409) {
        // Giờ vừa bị người khác đặt: bỏ lựa chọn và tải lại danh sách để khách chọn giờ khác
        setSlot(null);
        setReloadKey((value) => value + 1);
      }
    } catch {
      setError('Không kết nối được máy chủ');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Confirmation
        created={created}
        timezone={timezone ?? created.customer.timezone}
        onAnother={() => {
          setCreated(null);
          setSlot(null);
          setServiceId(null);
          setError(null);
        }}
      />
    );
  }

  // Dữ liệu cho tấm vé xem trước (trước khi chọn thì hiện chỗ trống)
  const parts = slot && timezone ? dateParts(slot.startsAt, timezone) : null;

  if (business.services.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-ink/40 bg-paper-raised px-6 py-16 text-center">
        <p className="font-display text-3xl font-black">Cơ sở chưa mở đặt lịch.</p>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Hiện chưa có dịch vụ nào để đặt. Vui lòng quay lại sau hoặc liên hệ trực tiếp với {business.name}.
        </p>
      </div>
    );
  }

  // grid-cols-1 = minmax(0,1fr): nếu thiếu, cột lưới co theo nội dung nhỏ nhất của con và dải ngày
  // cuộn ngang (rất rộng) sẽ làm cả trang phình ra khỏi màn hình điện thoại.
  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex flex-col gap-10">
        {/* ——— 1. Dịch vụ ——— */}
        <Step number={1} title="Chọn dịch vụ" done={service !== null}>
          <div role="radiogroup" aria-label="Dịch vụ" className="grid gap-3 sm:grid-cols-2">
            {business.services.map((s) => {
              const selected = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setServiceId(s.id);
                    setSlot(null);
                    setError(null);
                  }}
                  className={cn(
                    'flex flex-col gap-2 rounded-2xl border-2 p-5 text-left transition',
                    selected
                      ? 'border-hard bg-jade-tint shadow-[4px_4px_0_0_var(--hard)]'
                      : 'border-ink/30 bg-paper-raised hover:border-jade',
                  )}
                >
                  <span className="font-display text-xl leading-tight font-extrabold">{s.name}</span>
                  {s.description && (
                    <span className="line-clamp-2 text-sm text-ink-soft">{s.description}</span>
                  )}
                  <span className="mt-auto flex items-baseline justify-between pt-2">
                    <span className="font-display text-xl font-black">
                      {formatPrice(s.price, s.currency)}
                    </span>
                    <span className="text-sm font-semibold text-ink-soft">{s.durationMinutes} phút</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        {/* ——— 2. Giờ ——— */}
        <Step number={2} title="Chọn ngày và giờ" done={slot !== null} disabled={service === null}>
          {service === null ? (
            <p className="rounded-2xl border-[1.5px] border-dashed border-ink/40 px-4 py-6 text-center text-sm text-ink-soft">
              Hãy chọn dịch vụ ở bước 1 để xem các giờ còn trống.
            </p>
          ) : timezone === null ? (
            <p className="text-sm text-ink-soft" aria-busy="true">Đang xác định múi giờ của bạn…</p>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="text-ink-soft">
                  Giờ hiển thị theo múi giờ của bạn: <strong className="text-ink">{timezone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setChangingTimezone((v) => !v)}
                  className="font-semibold text-jade underline underline-offset-4"
                >
                  {changingTimezone ? 'Xong' : 'Đổi'}
                </button>
              </div>
              {changingTimezone && (
                <TimezoneSelect
                  value={timezone}
                  onChange={(value) => setTimezoneOverride(value)}
                  label="Múi giờ hiển thị"
                  className="max-w-md"
                />
              )}
              <SlotBrowser
                endpoint={`/api/public/businesses/${encodeURIComponent(business.slug)}/slots`}
                baseQuery={{ serviceId: service.id }}
                timezone={timezone}
                selected={slot?.startsAt ?? null}
                reloadKey={reloadKey}
                onSelect={(picked) => {
                  setSlot(picked);
                  setError(null);
                }}
              />
            </div>
          )}
        </Step>

        {/* ——— 3. Thông tin ——— */}
        <Step number={3} title="Thông tin của bạn" disabled={slot === null}>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Họ và tên">
                <Input name="name" required maxLength={100} autoComplete="name" placeholder="Nguyễn Văn A" disabled={slot === null} />
              </Field>
              <Field label="Email" hint="Chúng tôi gửi email xác nhận và nhắc lịch tới đây.">
                <Input name="email" type="email" required autoComplete="email" placeholder="ban@vidu.com" disabled={slot === null} />
              </Field>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border-[1.5px] border-coral/50 bg-coral-tint px-4 py-3 text-sm font-medium text-coral">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={slot === null || submitting} className="self-start">
              {submitting ? 'Đang đặt lịch…' : 'Xác nhận đặt lịch'}
            </Button>
          </form>
        </Step>
      </div>

      {/* ——— Tấm vé xem trước ——— */}
      <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
        <p className="eyebrow">Lịch hẹn của bạn</p>
        <Ticket
          className={cn('self-center transition', slot ? 'rotate-0' : '-rotate-2 opacity-90')}
          weekday={parts?.weekday ?? '—'}
          day={parts?.day ?? '··'}
          month={parts?.month ?? 'Chưa chọn giờ'}
          time={slot && timezone ? `${parts?.time} – ${formatTimeOfDay(slot.endsAt, timezone)}` : '--:--'}
          service={service?.name ?? 'Chưa chọn dịch vụ'}
          business={business.name}
        />
        {service && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-soft">Giá</dt>
            <dd className="font-semibold">{formatPrice(service.price, service.currency)}</dd>
            <dt className="text-ink-soft">Thời lượng</dt>
            <dd className="font-semibold">{service.durationMinutes} phút</dd>
            {slot && timezone && !sameLocalTime(slot.startsAt, timezone, business.timezone) && (
              <>
                <dt className="text-ink-soft">Giờ tại cơ sở</dt>
                <dd className="font-semibold">{formatDateTime(slot.startsAt, business.timezone)}</dd>
              </>
            )}
          </dl>
        )}
        <p className="text-sm text-ink-soft">
          Bạn có thể đổi hoặc huỷ lịch qua đường dẫn trong email, cho tới 2 giờ trước giờ hẹn.
        </p>
      </aside>
    </div>
  );
}

function Step({
  number,
  title,
  done = false,
  disabled = false,
  children,
}: {
  number: number;
  title: string;
  done?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('transition', disabled && 'opacity-60')} aria-label={title}>
      <div className="mb-5 flex items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'font-display grid size-10 shrink-0 place-items-center rounded-full border-2 border-hard text-lg font-black',
            done ? 'bg-jade text-on-jade' : 'bg-paper-raised',
          )}
        >
          {done ? '✓' : number}
        </span>
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Confirmation({
  created,
  timezone,
  onAnother,
}: {
  created: CreatedAppointment;
  timezone: string;
  onAnother: () => void;
}) {
  const parts = dateParts(created.startsAt, timezone);
  const differentZone = !sameLocalTime(created.startsAt, timezone, created.business.timezone);

  return (
    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex flex-col gap-6">
        <p className="eyebrow">Hoàn tất</p>
        <h2 className="font-display text-5xl leading-[1.02] font-black tracking-tight sm:text-6xl">
          Đã giữ chỗ cho bạn, {created.customer.name}!
        </h2>
        <p className="max-w-xl text-lg text-ink-soft">
          Chúng tôi vừa gửi email xác nhận tới <strong className="text-ink">{created.customer.email}</strong>.
          Trong email có đường dẫn để bạn đổi hoặc huỷ lịch, và bạn sẽ nhận thêm một email nhắc trước 24 giờ.
        </p>
        {differentZone && (
          <p className="text-sm text-ink-soft">
            Giờ tại cơ sở: <strong className="text-ink">{formatDateTime(created.startsAt, created.business.timezone)}</strong>
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/manage/${created.manageToken}`} size="lg">
            Quản lý lịch hẹn
          </ButtonLink>
          <Button variant="secondary" size="lg" onClick={onAnother}>
            Đặt thêm một lịch
          </Button>
        </div>
        <p className="text-sm text-ink-soft">
          Hãy lưu đường dẫn <Link href={`/manage/${created.manageToken}`} className="font-semibold text-jade underline underline-offset-4">quản lý lịch hẹn</Link>{' '}
          này: ai có đường dẫn đều có thể đổi hoặc huỷ lịch.
        </p>
      </div>

      <Ticket
        className="justify-self-center"
        weekday={parts.weekday}
        day={parts.day}
        month={parts.month}
        time={`${parts.time} – ${formatTimeOfDay(created.endsAt, timezone)}`}
        service={created.service.name}
        business={created.business.name}
      />
    </div>
  );
}
