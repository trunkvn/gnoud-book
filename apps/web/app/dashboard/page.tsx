import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingLinkActions } from "@/components/dashboard/booking-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { addDays, todayIn } from "@/lib/appointment";
import { apiGet } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { summarize } from "@/lib/calendar-stats";
import { isDateKey, mondayOf, weekDays } from "@/lib/dates";
import { fromApi } from "@/lib/hours";
import type {
  OwnerAppointmentsResponse,
  OwnerService,
  WorkingHoursResponse,
} from "@/lib/owner";

export const metadata: Metadata = { title: "Lịch" };

export default function CalendarPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <PageHeader
        eyebrow="Lịch hẹn"
        title="Một tuần của bạn"
        description="Mọi cuộc hẹn của cơ sở trên một trang. Bấm vào một lịch hẹn để xem chi tiết, hoàn thành hoặc huỷ."
      />
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Tuần đang xem nằm trong URL (?week=2030-01-07) nên có thể chia sẻ/đánh dấu trang, và nút
// tuần trước/sau chỉ là các đường link thường: không cần state ở trình duyệt.
async function CalendarData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { week } = await searchParams;
  const user = await requireUser();
  const timezone = user.businesses[0].timezone;

  const now = new Date();
  const todayKey = todayIn(timezone, now);
  const monday = mondayOf(typeof week === "string" && isDateKey(week) ? week : todayKey);
  const days = weekDays(monday);

  const [data, hours, services] = await Promise.all([
    apiGet<OwnerAppointmentsResponse>(`/appointments?from=${days[0]}&to=${days[6]}`),
    apiGet<WorkingHoursResponse>("/working-hours"),
    apiGet<OwnerService[]>("/services"),
  ]);

  const slug = user.businesses[0].slug;
  const hasServices = services.some((service) => service.active);
  const hasHours = hours.intervals.length > 0;
  const hasAnyAppointment = data.appointments.length > 0;

  return (
    <>
      <div className="-mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Trang đặt lịch của khách: <span className="font-semibold text-ink">/book/{slug}</span>
        </p>
        <BookingLinkActions slug={slug} />
      </div>
      {(!hasServices || !hasHours) && (
        <SetupChecklist hasServices={hasServices} hasHours={hasHours} slug={slug} />
      )}
      <StatTiles stats={summarize(data.appointments, todayKey, now, timezone)} timezone={timezone} />
      {hasServices && hasHours && !hasAnyAppointment && (
        <p className="rounded-2xl border-[1.5px] border-dashed border-ink/40 bg-paper-raised px-5 py-4 text-sm text-ink-soft">
          Tuần này chưa có lịch hẹn nào. Gửi đường dẫn đặt lịch cho khách để nhận lịch hẹn đầu tiên.
        </p>
      )}
      <WeekCalendar
        timezone={timezone}
        days={days}
        todayKey={todayKey}
        appointments={data.appointments}
        openHours={fromApi(hours.intervals)}
        hrefs={{
          prev: `/dashboard?week=${addDays(monday, -7)}`,
          next: `/dashboard?week=${addDays(monday, 7)}`,
          today: "/dashboard",
        }}
      />
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-3xl bg-paper-sunk" />
        ))}
      </div>
      <div className="h-[34rem] rounded-3xl bg-paper-sunk" />
    </div>
  );
}
