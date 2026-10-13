import { Suspense, type ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard/nav";
import { UserCard, UserCardSkeleton } from "@/components/dashboard/user-card";
import { Lattice } from "@/components/ui/lattice";
import { Logo } from "@/components/ui/logo";
import { requireUser } from "@/lib/auth";

// Khu vực của chủ cơ sở: thanh bên cố định (máy tính) hoặc thanh tab đáy màn hình (điện thoại).
// Phần khung bên dưới được dựng sẵn tĩnh; chỉ phần nội dung chờ kiểm tra đăng nhập.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col justify-between overflow-hidden border-r-2 border-hard bg-deep p-6 text-on-deep lg:flex">
        <Lattice className="text-on-deep/8" />
        <div className="relative flex flex-col gap-10">
          <Logo light />
          <DashboardNav variant="side" />
        </div>
        <div className="relative">
          <Suspense fallback={<UserCardSkeleton />}>
            <UserCard />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="flex items-center justify-between border-b-2 border-hard bg-paper px-5 py-4 lg:hidden">
          <Logo />
        </header>

        <main id="main" className="flex flex-1 flex-col">
          <Suspense fallback={<PageSkeleton />}>
            <AuthGate>{children}</AuthGate>
          </Suspense>
        </main>
      </div>

      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-hard bg-paper-raised lg:hidden"
      >
        <DashboardNav variant="tabs" />
      </nav>
    </div>
  );
}

/** Chặn người chưa đăng nhập: chuyển về /login trước khi nội dung được gửi đi. */
async function AuthGate({ children }: { children: ReactNode }) {
  await requireUser();
  return <>{children}</>;
}

function PageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6 p-6 lg:p-10" aria-busy="true">
      <div className="h-12 w-1/2 rounded-xl bg-paper-sunk" />
      <div className="h-96 rounded-3xl bg-paper-sunk" />
    </div>
  );
}
