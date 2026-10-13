import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Gnoud Book</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Nền tảng đặt lịch cho cơ sở của bạn
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700"
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Đăng ký
        </Link>
      </div>
    </main>
  );
}
