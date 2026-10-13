import Link from 'next/link';

export default function ManageNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Không tìm thấy lịch hẹn</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Liên kết không đúng hoặc đã bị thay đổi. Hãy mở lại liên kết trong email xác nhận gần nhất của bạn.
      </p>
      <Link href="/" className="underline">
        Về trang chủ
      </Link>
    </main>
  );
}
