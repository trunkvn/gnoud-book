import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import "./globals.css";

// Font tiêu đề: serif biến thiên có cá tính. Bắt buộc có subset "vietnamese",
// nếu thiếu thì các chữ có dấu sẽ rơi sang một font khác và nhìn rất lệch.
const display = Fraunces({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

// Font nội dung: Be Vietnam Pro, thiết kế riêng cho tiếng Việt nên dấu đẹp và dễ đọc.
const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Gnoud Book · Đặt lịch đúng giờ",
    template: "%s · Gnoud Book",
  },
  description:
    "Nền tảng đặt lịch cho cơ sở nhỏ: khách chọn giờ trống, nhận email xác nhận và nhắc lịch; bạn quản lý cả tuần trên một trang lịch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* Người dùng bàn phím/trình đọc màn hình nhảy thẳng tới nội dung, khỏi duyệt qua thanh điều hướng */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Bỏ qua tới nội dung
        </a>
        {children}
      </body>
    </html>
  );
}
