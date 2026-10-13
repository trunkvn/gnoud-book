"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton, useBookingUrl } from "@/components/dashboard/booking-link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { TimezoneSelect } from "@/components/timezone-select";
import { errorMessage } from "@/lib/appointment";
import type { OwnerBusiness } from "@/lib/owner";

/** Tên, mô tả, múi giờ của cơ sở, và đường dẫn trang đặt lịch dành cho khách. */
export function SettingsForm({ business }: { business: OwnerBusiness }) {
  const router = useRouter();
  const bookingUrl = useBookingUrl(business.slug);
  const [timezone, setTimezone] = useState(business.timezone);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name")),
          description: String(form.get("description")),
          timezone,
        }),
      });
      if (!res.ok) {
        setError(errorMessage(await res.json().catch(() => null), "Không lưu được thông tin"));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-3xl border-2 border-hard bg-paper-raised p-6 shadow-[6px_6px_0_0_var(--hard)] sm:p-8"
      >
        <Field label="Tên cơ sở">
          <Input name="name" required maxLength={100} defaultValue={business.name} />
        </Field>
        <Field label="Mô tả" hint="Hiện trên trang đặt lịch của khách.">
          <Textarea name="description" maxLength={500} defaultValue={business.description ?? ""} />
        </Field>
        <Field
          label="Múi giờ"
          hint="Giờ làm việc và lịch hẹn của bạn được hiểu theo múi giờ này. Khách ở nơi khác vẫn thấy giờ đúng theo múi giờ của họ."
        >
          <TimezoneSelect value={timezone} onChange={setTimezone} />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl border-[1.5px] border-coral/50 bg-coral-tint px-4 py-3 text-sm font-medium text-coral">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t-2 border-dashed border-ink/25 pt-5">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
          {saved && <Badge tone="jade">Đã lưu</Badge>}
        </div>
      </form>

      <aside className="flex h-fit flex-col gap-4 rounded-3xl border-2 border-hard bg-marigold p-6 text-[#0d1f1b] shadow-[6px_6px_0_0_var(--hard)]">
        <p className="eyebrow !text-[#0d1f1b]">Đường dẫn của bạn</p>
        <p className="font-display text-2xl leading-tight font-black">
          {/* cho phép xuống dòng ở dấu "/" thay vì cắt giữa một chữ */}
          {bookingUrl.split("/").map((part, i, all) => (
            <span key={i}>
              {part}
              {i < all.length - 1 && <>/<wbr /></>}
            </span>
          ))}
        </p>
        <p className="text-sm opacity-80">
          Gửi đường dẫn này cho khách để họ chọn dịch vụ và đặt giờ.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/book/${business.slug}`} target="_blank" rel="noreferrer" variant="secondary" size="sm">
            Mở trang đặt lịch
          </ButtonLink>
          <CopyLinkButton slug={business.slug} size="sm" />
        </div>
      </aside>
    </div>
  );
}
