import { PublicShell } from "@/components/public-shell";
import { ButtonLink } from "@/components/ui/button";

export default function ManageNotFound() {
  return (
    <PublicShell>
      <div className="flex flex-col items-start gap-6 py-10">
        <p className="eyebrow">Lỗi 404</p>
        <h1 className="font-display text-5xl leading-[1.02] font-black tracking-tight">
          Không tìm thấy lịch hẹn.
        </h1>
        <p className="max-w-md text-ink-soft">
          Liên kết không đúng hoặc đã bị thay đổi. Hãy mở lại liên kết trong email xác nhận gần nhất của bạn.
        </p>
        <ButtonLink href="/" variant="secondary">
          Về trang chủ
        </ButtonLink>
      </div>
    </PublicShell>
  );
}
