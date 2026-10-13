"use client";

import { Button } from "@/components/ui/button";

// Lỗi trong khu quản lý: giữ nguyên thanh bên (layout), chỉ thay phần nội dung bằng thông báo này.
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-5 p-6 lg:p-10">
      <p className="eyebrow">Có lỗi xảy ra</p>
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        Không tải được trang này.
      </h1>
      <p className="max-w-md text-ink-soft">
        Có thể kết nối tới máy chủ đang gián đoạn. Bạn thử lại nhé.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
