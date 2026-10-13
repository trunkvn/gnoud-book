import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <AuthForm mode="register" />
    </main>
  );
}
