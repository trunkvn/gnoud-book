import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

/** Nút ở góc phải đầu trang chủ: thay đổi tuỳ người xem đã đăng nhập hay chưa. */
export async function HeaderActions() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <ButtonLink href="/dashboard" size="sm">
        Vào trang quản lý
      </ButtonLink>
    );
  }
  return <GuestActions />;
}

export function GuestActions() {
  return (
    <>
      <ButtonLink href="/login" variant="ghost" size="sm">
        Đăng nhập
      </ButtonLink>
      <ButtonLink href="/register" size="sm">
        {/* nhãn ngắn trên điện thoại để thanh đầu trang không vượt quá chiều rộng màn hình */}
        <span className="sm:hidden">Dùng thử</span>
        <span className="hidden sm:inline">Dùng thử miễn phí</span>
      </ButtonLink>
    </>
  );
}
