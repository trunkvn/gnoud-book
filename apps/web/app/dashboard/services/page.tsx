import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ServicesManager } from "@/components/dashboard/services-manager";
import { apiGet } from "@/lib/api";
import type { OwnerService } from "@/lib/owner";

export const metadata: Metadata = { title: "Dịch vụ" };

export default function ServicesPage() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <PageHeader
        eyebrow="Dịch vụ"
        title="Những gì bạn cung cấp"
        description="Tên, thời lượng và giá của từng dịch vụ. Thời lượng quyết định các khung giờ khách nhìn thấy."
      />
      <Suspense fallback={<ListSkeleton />}>
        <ServicesData />
      </Suspense>
    </div>
  );
}

async function ServicesData() {
  const services = await apiGet<OwnerService[]>("/services");
  return <ServicesManager services={services} />;
}

function ListSkeleton() {
  return (
    <div className="grid animate-pulse gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-56 rounded-3xl bg-paper-sunk" />
      ))}
    </div>
  );
}
