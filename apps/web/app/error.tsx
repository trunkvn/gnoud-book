"use client";

import { PublicShell } from "@/components/public-shell";
import { Button, ButtonLink } from "@/components/ui/button";

// Hiện khi một trang gặp lỗi không lường trước. `reset` thử dựng lại trang mà không phải tải lại toàn bộ.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PublicShell>
      <div className="flex flex-col items-start gap-6 py-10">
        <p className="eyebrow">Có lỗi xảy ra</p>
        <h1 className="font-display text-5xl leading-[1] font-black tracking-tight sm:text-6xl">
          Ôi, có gì đó trục trặc rồi.
        </h1>
        <p className="max-w-md text-ink-soft">
          Chúng tôi chưa tải được trang này. Bạn thử lại nhé; nếu vẫn lỗi, hãy quay lại sau ít phút.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset}>Thử lại</Button>
          <ButtonLink href="/" variant="secondary">
            Về trang chủ
          </ButtonLink>
        </div>
      </div>
    </PublicShell>
  );
}
