import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth";

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <Suspense fallback={<p>Đang tải…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}

// Đọc cookie là dữ liệu theo từng request, nên phải nằm trong <Suspense>.
async function Welcome() {
  const user = await requireUser();
  const business = user.businesses[0];

  return (
    <>
      <h1 className="text-2xl font-semibold">Xin chào, {user.name}</h1>
      <p>
        Cơ sở: <strong>{business?.name}</strong> ({business?.slug})
      </p>
      <div>
        <LogoutButton />
      </div>
    </>
  );
}
