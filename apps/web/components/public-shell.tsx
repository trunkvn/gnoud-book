import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

/** Khung cho các trang công khai của khách: logo ở trên, nội dung căn giữa. */
export function PublicShell({
  children,
  width = "max-w-2xl",
}: {
  children: ReactNode;
  width?: string;
}) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <span className="eyebrow hidden sm:inline-flex">Lịch hẹn</span>
      </header>
      <main id="main" className={`mx-auto flex w-full ${width} flex-1 flex-col gap-8 px-6 pt-4 pb-16`}>
        {children}
      </main>
    </>
  );
}
