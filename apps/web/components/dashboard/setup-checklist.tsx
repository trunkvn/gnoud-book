import Link from "next/link";
import { CopyLinkButton } from "@/components/dashboard/booking-link";
import { cn } from "@/lib/cn";

type Step = { done: boolean; title: string; body: string; href?: string; cta?: string };

/**
 * Danh sách việc cần làm cho chủ cơ sở mới: có dịch vụ, có giờ làm việc, rồi chia sẻ đường dẫn.
 * Khách chỉ đặt được lịch khi đã có cả dịch vụ lẫn giờ làm việc, nên đây là thứ đầu tiên họ cần thấy.
 */
export function SetupChecklist({
  hasServices,
  hasHours,
  slug,
}: {
  hasServices: boolean;
  hasHours: boolean;
  slug: string;
}) {
  const steps: Step[] = [
    {
      done: hasServices,
      title: "Thêm dịch vụ đầu tiên",
      body: "Tên, thời lượng và giá, để khách biết đặt gì.",
      href: "/dashboard/services",
      cta: "Thêm dịch vụ",
    },
    {
      done: hasHours,
      title: "Đặt giờ làm việc",
      body: "Chọn các khung giờ bạn nhận khách trong tuần.",
      href: "/dashboard/hours",
      cta: "Đặt giờ làm việc",
    },
    {
      done: false,
      title: "Chia sẻ đường dẫn đặt lịch",
      body: "Gửi cho khách qua tin nhắn, mạng xã hội hoặc đặt ở trang của bạn.",
    },
  ];
  const nextIndex = steps.findIndex((step) => !step.done);

  return (
    <section
      aria-label="Bắt đầu"
      className="rounded-3xl border-2 border-hard bg-marigold-soft/60 p-6 shadow-[6px_6px_0_0_var(--hard)]"
    >
      <p className="eyebrow !text-ink">Bắt đầu nhận lịch hẹn</p>
      <h2 className="font-display mt-3 text-3xl font-black">Ba bước là khách đặt được lịch.</h2>

      <ol className="mt-6 grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => {
          const active = index === nextIndex;
          return (
            <li
              key={step.title}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border-2 bg-paper-raised p-5",
                step.done ? "border-jade/50" : "border-hard",
                !step.done && !active && "opacity-70",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "font-display grid size-9 shrink-0 place-items-center rounded-full border-2 border-hard text-base font-black",
                    step.done ? "bg-jade text-on-jade" : "bg-paper-raised",
                  )}
                >
                  {step.done ? "✓" : index + 1}
                </span>
                <h3 className="font-display text-xl leading-tight font-extrabold">{step.title}</h3>
              </div>
              <p className="text-sm text-ink-soft">{step.body}</p>
              {step.done ? (
                <p className="text-sm font-bold text-jade">Đã xong</p>
              ) : step.href ? (
                <Link href={step.href} className="self-start text-sm font-bold text-jade underline underline-offset-4">
                  {step.cta} →
                </Link>
              ) : (
                <CopyLinkButton slug={slug} size="sm" />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
