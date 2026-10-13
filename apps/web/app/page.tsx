import { Suspense } from "react";
import { CalendarPreview } from "@/components/landing/calendar-preview";
import { GuestActions, HeaderActions } from "@/components/landing/header-actions";
import { ButtonLink } from "@/components/ui/button";
import { DialEmblem } from "@/components/ui/emblem";
import { Lattice } from "@/components/ui/lattice";
import { Logo } from "@/components/ui/logo";
import { Marquee } from "@/components/ui/marquee";
import { Ticket } from "@/components/ui/ticket";

const FEATURES = [
  {
    n: "01",
    title: "Múi giờ không bao giờ sai",
    body: "Giờ được lưu theo một chuẩn duy nhất (UTC) và hiển thị theo múi giờ của từng người xem. Khách ở Tokyo thấy 11:00, cơ sở ở Hà Nội thấy 09:00, cùng một lịch hẹn.",
  },
  {
    n: "02",
    title: "Không bao giờ đặt trùng",
    body: "Hai khách bấm đặt cùng một giây? Cơ sở dữ liệu là trọng tài: chỉ một người giữ được chỗ, người còn lại được mời chọn giờ khác thay vì nhận một lỗi khó hiểu.",
  },
  {
    n: "03",
    title: "Nhắc lịch trước 24 giờ",
    body: "Email xác nhận gửi ngay sau khi đặt, email nhắc tự động trước 24 giờ. Khách huỷ hoặc đổi lịch bằng một đường link trong email, không cần tạo tài khoản.",
  },
];

const STEPS = [
  { title: "Bạn thiết lập", body: "Tạo dịch vụ, đặt giờ làm việc theo tuần, chọn múi giờ cho cơ sở." },
  { title: "Khách chọn giờ", body: "Họ xem các khung giờ còn trống theo múi giờ của mình và đặt trong vài giây." },
  { title: "Cả hai đúng hẹn", body: "Bạn nhìn cả tuần trên một trang lịch; khách nhận email xác nhận và nhắc lịch." },
];

// Trang xem thử (nếu có): đặt NEXT_PUBLIC_DEMO_SLUG=slug-cua-co-so-demo trong .env.local
const DEMO_SLUG = process.env.NEXT_PUBLIC_DEMO_SLUG;

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 sm:py-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-3">
          <a href="#tinh-nang" className="hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-ink/8 sm:block">
            Tính năng
          </a>
          <Suspense fallback={<GuestActions />}>
            <HeaderActions />
          </Suspense>
        </nav>
      </header>

      <main id="main" className="flex-1 overflow-x-clip">
        {/* ——— Hero ——— */}
        <section className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 pt-6 pb-20 lg:grid-cols-[1.15fr_1fr] lg:pt-12 lg:pb-28">
          <div>
            <p className="eyebrow rise" style={{ "--i": 0 } as React.CSSProperties}>
              Nền tảng đặt lịch cho cơ sở nhỏ
            </p>
            <h1
              className="font-display rise mt-6 text-[clamp(2.7rem,6.3vw,5.6rem)] leading-[0.95] font-black tracking-tight"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Mỗi cuộc hẹn
              <br />
              <span className="relative inline-block">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-[-0.08em] bottom-[0.06em] -z-10 h-[0.36em] -rotate-1 bg-marigold"
                />
                đúng giờ,
              </span>
              <br />
              không lộn xộn.
            </h1>
            <p
              className="rise mt-8 max-w-xl text-lg leading-relaxed text-ink-soft"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              Khách chọn dịch vụ và một khung giờ còn trống, nhận email xác nhận và email nhắc lịch.
              Bạn nhìn cả tuần trên một trang lịch gọn gàng. Múi giờ nào cũng đúng.
            </p>
            <div
              className="rise mt-10 flex flex-wrap items-center gap-4"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              <ButtonLink href="/register" size="lg">
                Tạo cơ sở của bạn
                <span aria-hidden="true">→</span>
              </ButtonLink>
              <ButtonLink href="#cach-hoat-dong" variant="secondary" size="lg">
                Xem cách hoạt động
              </ButtonLink>
            </div>
            <p className="rise mt-6 text-sm text-ink-soft" style={{ "--i": 4 } as React.CSSProperties}>
              Miễn phí · Không cần thẻ · Khách không cần tạo tài khoản
              {DEMO_SLUG && (
                <>
                  {" · "}
                  <a href={`/book/${DEMO_SLUG}`} className="font-semibold text-jade underline underline-offset-4">
                    Xem thử trang đặt lịch mẫu
                  </a>
                </>
              )}
            </p>
          </div>

          {/* mặt đồng hồ + tấm vé + nhãn dán */}
          <div className="rise relative mx-auto w-full max-w-[34rem]" style={{ "--i": 2 } as React.CSSProperties}>
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,var(--jade-tint)_0%,transparent_68%)] opacity-80" aria-hidden="true" />
            <DialEmblem />
            <Ticket
              className="absolute -bottom-6 -left-1 -rotate-6 scale-[0.82] origin-bottom-left sm:-left-8 sm:scale-100"
              weekday="Thứ Hai"
              day="07"
              month="Tháng 1"
              time="09:00 – 09:45"
              service="Cắt tóc nam"
              business="Salon Hà Nội"
            />
            <div
              className="absolute top-2 -right-1 grid size-28 rotate-12 place-items-center rounded-full border-2 border-hard bg-paper-raised p-2 text-center shadow-[4px_4px_0_0_var(--hard)] sm:-right-4"
              aria-hidden="true"
            >
              <p className="text-[0.7rem] leading-tight font-bold tracking-wide uppercase">
                Nhắc lịch
                <span className="font-display block text-3xl leading-none font-black text-jade">24h</span>
                trước giờ hẹn
              </p>
            </div>
          </div>
        </section>

        {/* ——— Dải chữ ——— */}
        <div className="-rotate-1 border-y-2 border-hard bg-marigold py-4 text-[#0d1f1b]">
          <Marquee
            items={[
              "Múi giờ chính xác",
              "Không đặt trùng giờ",
              "Email nhắc trước 24 giờ",
              "Huỷ hoặc đổi lịch bằng một đường link",
              "Một trang lịch cho cả tuần",
            ]}
          />
        </div>

        {/* ——— Tính năng ——— */}
        <section id="tinh-nang" className="mx-auto w-full max-w-7xl scroll-mt-8 px-6 py-24 lg:py-32">
          <p className="eyebrow">Làm ít, làm kỹ</p>
          <h2 className="font-display mt-4 max-w-3xl text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] font-black tracking-tight">
            Chỉ làm đúng ba việc, và làm thật cẩn thận.
          </h2>

          <ol className="mt-14 grid gap-6 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <li
                key={f.n}
                className="relative flex flex-col rounded-3xl border-2 border-hard bg-paper-raised p-8 shadow-[6px_6px_0_0_var(--hard)]"
                style={{ transform: `rotate(${[-0.8, 0.6, -0.4][i]}deg)` }}
              >
                <span className="font-display text-7xl leading-none font-black text-marigold [-webkit-text-stroke:2px_var(--hard)]">
                  {f.n}
                </span>
                <h3 className="font-display mt-6 text-2xl leading-tight font-extrabold">{f.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{f.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ——— Xem trước ——— */}
        <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:pb-32">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <p className="eyebrow">Trang lịch của bạn</p>
              <h2 className="font-display mt-4 text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] font-black tracking-tight">
                Gọn như một tờ lịch giấy.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
                Cả tuần trên một trang: lịch chồng giờ được xếp cạnh nhau, giờ đóng cửa tô gạch chéo,
                lịch đã huỷ gạch ngang. Bấm vào một lịch hẹn để hoàn thành hoặc huỷ.
              </p>
            </div>
            <CalendarPreview />
          </div>
        </section>

        {/* ——— Cách hoạt động ——— */}
        <section id="cach-hoat-dong" className="scroll-mt-8 border-y-2 border-hard bg-paper-sunk/70">
          <div className="mx-auto w-full max-w-7xl px-6 py-24">
            <p className="eyebrow">Ba bước</p>
            <h2 className="font-display mt-4 text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] font-black tracking-tight">
              Từ trống trơn đến kín lịch.
            </h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  <div className="flex items-center gap-4">
                    <span className="font-display grid size-14 shrink-0 place-items-center rounded-full border-2 border-hard bg-jade text-2xl font-black text-on-jade">
                      {i + 1}
                    </span>
                    <span aria-hidden="true" className="hidden h-0.5 flex-1 border-t-2 border-dashed border-ink/40 md:block" />
                  </div>
                  <h3 className="font-display mt-6 text-2xl font-extrabold">{s.title}</h3>
                  <p className="mt-2 max-w-xs leading-relaxed text-ink-soft">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ——— Lời kêu gọi cuối ——— */}
        <section className="relative overflow-hidden bg-deep text-on-deep">
          <Lattice className="text-on-deep/12" />
          <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-8 px-6 py-24 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="font-display max-w-2xl text-[clamp(2.2rem,5vw,4.2rem)] leading-[1.02] font-black tracking-tight">
              Sẵn sàng đón lịch hẹn đầu tiên?
            </h2>
            <ButtonLink href="/register" variant="secondary" size="lg" className="shrink-0 !text-[#0d1f1b] !bg-marigold">
              Bắt đầu ngay
              <span aria-hidden="true">→</span>
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-hard">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 md:grid-cols-[2fr_1fr_1fr]">
          <div className="flex max-w-sm flex-col gap-4">
            <Logo />
            <p className="text-sm leading-relaxed text-ink-soft">
              Nền tảng đặt lịch cho cơ sở nhỏ: múi giờ chính xác, không đặt trùng, nhắc lịch tự động.
            </p>
          </div>
          <nav aria-label="Sản phẩm" className="flex flex-col gap-2 text-sm">
            <p className="eyebrow mb-2">Sản phẩm</p>
            <a href="#tinh-nang" className="hover:underline">Tính năng</a>
            <a href="#cach-hoat-dong" className="hover:underline">Cách hoạt động</a>
            {DEMO_SLUG && <a href={`/book/${DEMO_SLUG}`} className="hover:underline">Trang đặt lịch mẫu</a>}
          </nav>
          <nav aria-label="Tài khoản" className="flex flex-col gap-2 text-sm">
            <p className="eyebrow mb-2">Tài khoản</p>
            <a href="/login" className="hover:underline">Đăng nhập</a>
            <a href="/register" className="hover:underline">Đăng ký miễn phí</a>
          </nav>
        </div>
        <p className="mx-auto w-full max-w-7xl px-6 pb-10 text-sm text-ink-soft">
          © 2026 Gnoud Book · Dự án portfolio, làm bằng Next.js, NestJS và PostgreSQL.
        </p>
      </footer>
    </>
  );
}
