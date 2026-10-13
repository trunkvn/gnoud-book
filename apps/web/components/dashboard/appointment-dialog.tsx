"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { errorMessage, formatDateTime, sameLocalTime } from "@/lib/appointment";
import type { OwnerAppointment } from "@/lib/owner";
import { STATUS_LABEL, STATUS_TONE } from "./status";

/**
 * Chi tiết một lịch hẹn và các hành động của chủ cơ sở (hoàn thành, huỷ). Dùng thẻ <dialog> gốc
 * của trình duyệt nên có sẵn: khoá cuộn nền, bẫy phím Tab trong hộp thoại, đóng bằng phím Esc.
 */
export function AppointmentDialog({
  appointment,
  timezone,
  onClose,
}: {
  appointment: OwnerAppointment | null;
  timezone: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: "cancel" | "complete") {
    if (!appointment) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/${kind}`, {
        method: "POST",
      });
      if (!res.ok) {
        setError(
          errorMessage(await res.json().catch(() => null), "Không thực hiện được, vui lòng thử lại"),
        );
        return;
      }
      router.refresh(); // tải lại dữ liệu của trang lịch (server component)
      onClose();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  }

  const started = appointment ? new Date(appointment.startsAt) <= new Date() : false;
  const sameZone = appointment
    ? sameLocalTime(appointment.startsAt, appointment.customer.timezone, timezone)
    : true;

  return (
    <Dialog
      open={appointment !== null}
      onClose={() => {
        setConfirmCancel(false);
        setError(null);
        onClose();
      }}
      eyebrow="Chi tiết lịch hẹn"
      title={appointment?.service.name ?? ""}
    >
      {appointment && (
        <>
          <div className="flex items-center gap-3">
            <Badge tone={STATUS_TONE[appointment.status]}>
              {STATUS_LABEL[appointment.status]}
            </Badge>
            <span className="text-sm text-ink-soft">
              {appointment.service.durationMinutes} phút
            </span>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm">
            <dt className="text-ink-soft">Thời gian</dt>
            <dd className="font-semibold">
              {formatDateTime(appointment.startsAt, timezone)}
            </dd>
            {!sameZone && (
              <>
                <dt className="text-ink-soft">Giờ của khách</dt>
                <dd>{formatDateTime(appointment.startsAt, appointment.customer.timezone)}</dd>
              </>
            )}
            <dt className="text-ink-soft">Khách</dt>
            <dd className="font-semibold">{appointment.customer.name}</dd>
            <dt className="text-ink-soft">Email</dt>
            <dd>
              <a
                href={`mailto:${appointment.customer.email}`}
                className="font-medium text-jade underline underline-offset-4"
              >
                {appointment.customer.email}
              </a>
            </dd>
          </dl>

          {error && (
            <p
              role="alert"
              className="rounded-xl border-[1.5px] border-coral/50 bg-coral-tint px-4 py-3 text-sm font-medium text-coral"
            >
              {error}
            </p>
          )}

          {appointment.status === "CONFIRMED" && !confirmCancel && (
            <div className="flex flex-wrap gap-3 border-t-2 border-dashed border-ink/25 pt-5">
              {started && (
                <Button onClick={() => act("complete")} disabled={busy}>
                  Đánh dấu đã hoàn thành
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setConfirmCancel(true)}
                disabled={busy}
              >
                Huỷ lịch hẹn
              </Button>
            </div>
          )}

          {appointment.status === "CONFIRMED" && confirmCancel && (
            <div className="flex flex-col gap-4 rounded-2xl border-2 border-coral bg-coral-tint p-4">
              <p className="text-sm font-semibold">
                Huỷ lịch hẹn này? Khách sẽ nhận email báo huỷ và khung giờ được trả lại cho người khác.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="danger" size="sm" onClick={() => act("cancel")} disabled={busy}>
                  {busy ? "Đang huỷ…" : "Xác nhận huỷ"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmCancel(false)} disabled={busy}>
                  Giữ lịch
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
