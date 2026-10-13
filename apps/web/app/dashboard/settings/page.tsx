import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { apiGet } from "@/lib/api";
import type { OwnerBusiness } from "@/lib/owner";

export const metadata: Metadata = { title: "Cơ sở" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <PageHeader
        eyebrow="Cơ sở"
        title="Thông tin của bạn"
        description="Tên, mô tả và múi giờ của cơ sở."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-paper-sunk" aria-busy="true" />}>
        <SettingsData />
      </Suspense>
    </div>
  );
}

async function SettingsData() {
  const business = await apiGet<OwnerBusiness>("/business");
  return <SettingsForm business={business} />;
}
