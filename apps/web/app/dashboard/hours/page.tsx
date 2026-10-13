import type { Metadata } from "next";
import { Suspense } from "react";
import { HoursEditor } from "@/components/dashboard/hours-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { apiGet } from "@/lib/api";
import { fromApi } from "@/lib/hours";
import type { WorkingHoursResponse } from "@/lib/owner";

export const metadata: Metadata = { title: "Giờ làm việc" };

export default function HoursPage() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <PageHeader
        eyebrow="Giờ làm việc"
        title="Khi nào bạn mở cửa"
        description="Chỉ những khung giờ nằm trong giờ làm việc mới được cho khách đặt. Một ngày có thể có nhiều khung, ví dụ nghỉ trưa."
      />
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-3xl bg-paper-sunk" aria-busy="true" />}>
        <HoursData />
      </Suspense>
    </div>
  );
}

async function HoursData() {
  const data = await apiGet<WorkingHoursResponse>("/working-hours");
  return <HoursEditor initial={fromApi(data.intervals)} timezone={data.timezone} />;
}
