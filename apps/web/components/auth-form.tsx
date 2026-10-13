"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-500 dark:border-zinc-700";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = Array.isArray(body?.message)
          ? body.message[0]
          : body?.message;
        setError(message ?? "Có lỗi xảy ra, vui lòng thử lại");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <h1 className="text-2xl font-semibold">
        {isRegister ? "Tạo tài khoản chủ cơ sở" : "Đăng nhập"}
      </h1>

      {isRegister && (
        <>
          <input
            name="name"
            placeholder="Tên của bạn"
            required
            className={inputClass}
          />
          <input
            name="businessName"
            placeholder="Tên cơ sở"
            required
            className={inputClass}
          />
        </>
      )}
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        placeholder="Mật khẩu (tối thiểu 8 ký tự)"
        required
        minLength={isRegister ? 8 : undefined}
        className={inputClass}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Đang xử lý…" : isRegister ? "Đăng ký" : "Đăng nhập"}
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {isRegister ? (
          <>
            Đã có tài khoản?{" "}
            <Link href="/login" className="underline">
              Đăng nhập
            </Link>
          </>
        ) : (
          <>
            Chưa có tài khoản?{" "}
            <Link href="/register" className="underline">
              Đăng ký
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
