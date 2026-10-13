import type { ReactNode } from "react";

/** Đầu mỗi trang quản lý: nhãn nhỏ, tiêu đề lớn, mô tả, và (tuỳ chọn) các nút hành động bên phải. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-3 text-4xl leading-[1.04] font-black tracking-tight sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-ink-soft">{description}</p>
        )}
      </div>
      {actions}
    </header>
  );
}
