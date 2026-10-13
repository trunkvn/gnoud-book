import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Class dùng chung cho ô nhập, ô chọn, vùng văn bản */
export const inputClass =
  "rounded-xl border-[1.5px] border-ink/30 bg-paper-raised px-4 py-3 text-[0.95rem] text-ink " +
  "placeholder:text-ink-soft/70 transition focus:border-jade focus:outline-none " +
  "focus:ring-4 focus:ring-jade/20 disabled:opacity-60";

/** Nhãn + ô nhập + gợi ý/lỗi, ghép sẵn aria để trình đọc màn hình hiểu */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-sm font-medium text-coral">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-ink-soft">{hint}</span>
      ) : null}
    </label>
  );
}

/** Mặc định ô nhập rộng hết khung; nếu nơi dùng tự đặt độ rộng (w-28...) thì tôn trọng nó. */
const withDefaultWidth = (className?: string) =>
  cn(!/(^|\s)w-/.test(className ?? "") && "w-full", className);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, withDefaultWidth(className))} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-10", withDefaultWidth(className))} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-24", withDefaultWidth(className))} {...props} />;
}
