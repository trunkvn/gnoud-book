import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";

export const metadata: Metadata = { title: "Đăng ký" };

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
