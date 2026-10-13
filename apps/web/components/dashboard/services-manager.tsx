"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { errorMessage, formatPrice } from "@/lib/appointment";
import { cn } from "@/lib/cn";
import type { OwnerService } from "@/lib/owner";

/** Quản lý dịch vụ: thẻ dịch vụ, bật/tắt bán, thêm, sửa, xoá. Danh sách luôn là dữ liệu mới nhất từ server. */
export function ServicesManager({ services }: { services: OwnerService[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<OwnerService | "new" | null>(null);
  const [deleting, setDeleting] = useState<OwnerService | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function toggleActive(service: OwnerService) {
    setTogglingId(service.id);
    setToggleError(null);
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !service.active }),
      });
      if (!res.ok) {
        setToggleError(errorMessage(await res.json().catch(() => null), "Không đổi được trạng thái"));
        return;
      }
      router.refresh();
    } catch {
      setToggleError("Không kết nối được máy chủ");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-soft">
          {services.length === 0
            ? "Chưa có dịch vụ nào."
            : `${services.length} dịch vụ · ${services.filter((s) => s.active).length} đang bán`}
        </p>
        <Button onClick={() => setEditing("new")}>
          <PlusIcon className="size-4" />
          Thêm dịch vụ
        </Button>
      </div>

      {toggleError && (
        <p role="alert" className="rounded-xl border-[1.5px] border-coral/50 bg-coral-tint px-4 py-3 text-sm font-medium text-coral">
          {toggleError}
        </p>
      )}

      {services.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-ink/40 bg-paper-raised px-6 py-16 text-center">
          <p className="font-display text-3xl font-black">Bắt đầu với dịch vụ đầu tiên.</p>
          <p className="max-w-md text-ink-soft">
            Mỗi dịch vụ có tên, thời lượng và giá. Khách sẽ chọn một dịch vụ rồi mới thấy các khung giờ còn trống.
          </p>
          <Button onClick={() => setEditing("new")}>
            <PlusIcon className="size-4" />
            Thêm dịch vụ
          </Button>
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <li
              key={service.id}
              className={cn(
                "flex flex-col gap-4 rounded-3xl border-2 border-hard bg-paper-raised p-6 shadow-[4px_4px_0_0_var(--hard)]",
                !service.active && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl leading-tight font-black">{service.name}</h2>
                <Badge tone={service.active ? "jade" : "neutral"}>
                  {service.active ? "Đang bán" : "Tạm ngưng"}
                </Badge>
              </div>

              {service.description && (
                <p className="line-clamp-3 text-sm text-ink-soft">{service.description}</p>
              )}

              <div className="mt-auto flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-3xl leading-none font-black">
                    {formatPrice(service.price, service.currency)}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{service.durationMinutes} phút</p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={service.active}
                    disabled={togglingId === service.id}
                    onChange={() => toggleActive(service)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="relative h-7 w-12 rounded-full border-2 border-hard bg-paper-sunk transition peer-checked:bg-jade peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-jade peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:border-2 after:border-hard after:bg-paper-raised after:transition peer-checked:after:translate-x-5"
                  />
                  <span className="sr-only">Bán dịch vụ này</span>
                </label>
              </div>

              <div className="flex gap-2 border-t-2 border-dashed border-ink/25 pt-4">
                <Button variant="secondary" size="sm" onClick={() => setEditing(service)}>
                  <EditIcon className="size-4" />
                  Sửa
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(service)}>
                  <TrashIcon className="size-4" />
                  Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ServiceFormDialog
        // key: mỗi lần mở một dịch vụ khác thì dựng lại form để giá trị ban đầu đúng
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        target={editing}
        onClose={() => setEditing(null)}
      />
      <DeleteServiceDialog service={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function ServiceFormDialog({
  target,
  onClose,
}: {
  target: OwnerService | "new" | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const service = target !== null && target !== "new" ? target : null;
  const [price, setPrice] = useState(service?.price ?? 100000);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const body = {
      name: String(form.get("name")),
      description: String(form.get("description")),
      durationMinutes: Number(form.get("durationMinutes")),
      price: Number(form.get("price")),
    };

    try {
      const res = await fetch(service ? `/api/services/${service.id}` : "/api/services", {
        method: service ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(errorMessage(await res.json().catch(() => null), "Không lưu được dịch vụ"));
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      eyebrow={service ? "Sửa dịch vụ" : "Dịch vụ mới"}
      title={service ? service.name : "Thêm dịch vụ"}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Tên dịch vụ">
          <Input name="name" required maxLength={100} defaultValue={service?.name} placeholder="Cắt tóc nam" />
        </Field>
        <Field label="Mô tả (không bắt buộc)">
          <Textarea name="description" maxLength={500} defaultValue={service?.description ?? ""} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thời lượng (phút)" hint="Từ 5 đến 480 phút">
            <Input
              name="durationMinutes"
              type="number"
              required
              min={5}
              max={480}
              step={5}
              defaultValue={service?.durationMinutes ?? 30}
            />
          </Field>
          <Field
            label="Giá (VND)"
            hint={Number.isFinite(price) ? formatPrice(price, "VND") : undefined}
          >
            <Input
              name="price"
              type="number"
              required
              min={0}
              step={1000}
              value={Number.isFinite(price) ? price : ""}
              onChange={(event) => setPrice(event.target.valueAsNumber)}
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border-[1.5px] border-coral/50 bg-coral-tint px-4 py-3 text-sm font-medium text-coral">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 border-t-2 border-dashed border-ink/25 pt-5">
          <Button type="submit" disabled={pending}>
            {pending ? "Đang lưu…" : "Lưu dịch vụ"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Huỷ
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteServiceDialog({
  service,
  onClose,
}: {
  service: OwnerService | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!service) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${service.id}`, { method: "DELETE" });
      if (!res.ok) {
        // 409: dịch vụ đã có lịch hẹn. API trả lời kèm gợi ý nên hiện nguyên văn.
        setError(errorMessage(await res.json().catch(() => null), "Không xoá được dịch vụ"));
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={service !== null}
      onClose={() => {
        setError(null);
        onClose();
      }}
      eyebrow="Xoá dịch vụ"
      title={service?.name ?? ""}
    >
      <p className="text-ink-soft">
        Xoá hẳn dịch vụ này? Nếu dịch vụ đã có lịch hẹn thì không xoá được; khi đó hãy tắt công tắc &ldquo;đang bán&rdquo; để khách không đặt thêm.
      </p>
      {error && (
        <p role="alert" className="rounded-xl border-[1.5px] border-coral/50 bg-coral-tint px-4 py-3 text-sm font-medium text-coral">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="danger" onClick={remove} disabled={pending}>
          {pending ? "Đang xoá…" : "Xoá dịch vụ"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Giữ lại
        </Button>
      </div>
    </Dialog>
  );
}
