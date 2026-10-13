"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Mode = "login" | "register";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">{isRegister ? "Bắt đầu" : "Chào mừng trở lại"}</p>
        <h1 className="font-display mt-4 text-5xl leading-[1.02] font-black tracking-tight">
          {isRegister ? "Tạo cơ sở của bạn" : "Đăng nhập"}
        </h1>
        <p className="mt-3 text-ink-soft">
          {isRegister
            ? "Mất chưa đầy một phút. Bạn có thể chỉnh mọi thứ sau."
            : "Vào trang lịch để xem và quản lý các cuộc hẹn."}
        </p>
      </div>

      {isRegister && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tên của bạn">
            <Input name="name" autoComplete="name" required placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Tên cơ sở">
            <Input name="businessName" required placeholder="Salon Hà Nội" />
          </Field>
        </div>
      )}

      <Field label="Email">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="ban@vidu.com"
        />
      </Field>

      <Field
        label="Mật khẩu"
        hint={isRegister ? "Tối thiểu 8 ký tự" : undefined}
      >
        <Input
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 8 : undefined}
          placeholder="••••••••"
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-xl border-[1.5px] border-coral/50 bg-coral-tint px-4 py-3 text-sm font-medium text-coral"
        >
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending
          ? "Đang xử lý…"
          : isRegister
            ? "Tạo tài khoản"
            : "Đăng nhập"}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        {isRegister ? (
          <>
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-bold text-jade underline underline-offset-4">
              Đăng nhập
            </Link>
          </>
        ) : (
          <>
            Chưa có tài khoản?{" "}
            <Link href="/register" className="font-bold text-jade underline underline-offset-4">
              Đăng ký miễn phí
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
