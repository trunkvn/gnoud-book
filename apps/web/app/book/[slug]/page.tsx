import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking-flow";
import { PublicShell } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { getPublicBusiness } from "@/lib/public-api";

export async function generateMetadata({
  params,
}: PageProps<"/book/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) return { title: "Không tìm thấy cơ sở" };

  return {
    title: `Đặt lịch · ${business.name}`,
    description:
      business.description ?? `Đặt lịch trực tuyến tại ${business.name}: chọn dịch vụ, chọn giờ còn trống, nhận email xác nhận.`,
  };
}

export default function BookPage({ params }: PageProps<"/book/[slug]">) {
  return (
    <PublicShell width="max-w-6xl">
      {/* slug trong URL là dữ liệu theo từng request nên phải nằm trong Suspense (Cache Components) */}
      <Suspense fallback={<BookSkeleton />}>
        <Book params={params} />
      </Suspense>
    </PublicShell>
  );
}

async function Book({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();

  return (
    <>
      <header className="flex flex-col gap-5 pb-4">
        <p className="eyebrow">Đặt lịch trực tuyến</p>
        <h1 className="font-display text-[clamp(2.6rem,6.5vw,5.2rem)] leading-[0.98] font-black tracking-tight">
          {business.name}
        </h1>
        {business.description && (
          <p className="max-w-2xl text-lg leading-relaxed text-ink-soft">{business.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge tone="jade">Xác nhận qua email</Badge>
          <Badge tone="neutral">Giờ cơ sở: {business.timezone}</Badge>
        </div>
      </header>
      <BookingFlow business={business} />
    </>
  );
}

function BookSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="h-6 w-40 rounded bg-paper-sunk" />
      <div className="h-20 w-3/4 rounded-xl bg-paper-sunk" />
      <div className="h-72 rounded-3xl bg-paper-sunk" />
    </div>
  );
}
