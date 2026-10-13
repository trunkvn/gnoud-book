import { PublicShell } from "@/components/public-shell";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="flex flex-col items-start gap-6 py-10">
        <p className="eyebrow">Lỗi 404</p>
        <h1 className="font-display text-6xl leading-[0.95] font-black tracking-tight sm:text-7xl">
          Trang này không có trong lịch.
        </h1>
        <p className="max-w-md text-lg text-ink-soft">
          Đường dẫn có thể đã gõ sai hoặc trang đã được chuyển đi nơi khác.
        </p>
        <ButtonLink href="/" size="lg">
          Về trang chủ
        </ButtonLink>
      </div>
    </PublicShell>
  );
}
