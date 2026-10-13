import { PublicShell } from "@/components/public-shell";
import { ButtonLink } from "@/components/ui/button";

export default function BookNotFound() {
  return (
    <PublicShell>
      <div className="flex flex-col items-start gap-6 py-10">
        <p className="eyebrow">Lỗi 404</p>
        <h1 className="font-display text-5xl leading-[1.02] font-black tracking-tight">
          Không tìm thấy cơ sở này.
        </h1>
        <p className="max-w-md text-ink-soft">
          Đường dẫn có thể đã gõ sai hoặc cơ sở đã đổi địa chỉ. Hãy kiểm tra lại đường dẫn mà cơ sở đã gửi cho bạn.
        </p>
        <ButtonLink href="/" variant="secondary">
          Về trang chủ
        </ButtonLink>
      </div>
    </PublicShell>
  );
}
