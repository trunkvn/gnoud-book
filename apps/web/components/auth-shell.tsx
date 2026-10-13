import type { ReactNode } from "react";
import { DialEmblem } from "@/components/ui/emblem";
import { Lattice } from "@/components/ui/lattice";
import { Logo } from "@/components/ui/logo";

const POINTS = [
  "Khách đặt giờ theo múi giờ của họ",
  "Không bao giờ đặt trùng một khung giờ",
  "Email xác nhận và nhắc lịch tự động",
];

/** Bố cục chung cho đăng nhập và đăng ký: bảng thương hiệu bên trái, form bên phải. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden border-r-2 border-hard bg-deep text-on-deep lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Lattice className="text-on-deep/10" />
        {/* mặt đồng hồ lớn bị cắt ở mép dưới-phải */}
        <div className="pointer-events-none absolute -right-52 -bottom-56 w-[40rem] opacity-60">
          <DialEmblem />
        </div>

        <Logo light className="relative" />

        <div className="relative max-w-md">
          <p className="eyebrow !text-marigold">Dành cho cơ sở nhỏ</p>
          <p className="font-display mt-5 text-5xl leading-[1.02] font-black tracking-tight">
            Giờ hẹn của bạn, được giữ gìn cẩn thận.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-[0.95rem]">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3">
                <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-marigold text-[0.7rem] font-black text-[#0d1f1b]">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-on-deep/70">© 2026 Gnoud Book</p>
      </aside>

      <main id="main" className="flex flex-col px-6 py-8 sm:px-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
