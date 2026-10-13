import { cn } from "@/lib/cn";

// Một lịch tuần "giả" chỉ để minh hoạ sản phẩm trên trang chủ (không phải dữ liệu thật, không tương tác).
const PX_PER_HOUR = 52;
const START_HOUR = 9;

const DAYS = [
  { label: "T2", day: "07", today: false, items: [
    { at: 9, hours: 1, who: "Minh Anh", what: "Cắt tóc", tone: "done" },
    { at: 11, hours: 1.5, who: "Quốc Bảo", what: "Uốn tóc", tone: "done" },
  ] },
  { label: "T3", day: "08", today: true, items: [
    { at: 9.5, hours: 0.75, who: "Gia Huy", what: "Cắt tóc", tone: "on" },
    { at: 11, hours: 1, who: "Khánh Linh", what: "Gội đầu", tone: "on" },
    { at: 12.5, hours: 1, who: "Tùng", what: "Nhuộm", tone: "on" },
  ] },
  { label: "T4", day: "09", today: false, items: [
    { at: 10, hours: 0.75, who: "Hải Yến", what: "Cắt tóc", tone: "on" },
    { at: 11.5, hours: 1.5, who: "Bảo Châu", what: "Uốn tóc", tone: "on" },
  ] },
  { label: "T5", day: "10", today: false, items: [
    { at: 9, hours: 0.75, who: "Quốc Việt", what: "Cắt tóc", tone: "on" },
    { at: 11, hours: 1, who: "Công Sơn", what: "Nhuộm", tone: "off" },
  ] },
  { label: "T6", day: "11", today: false, items: [
    { at: 10.5, hours: 0.75, who: "Mai Phương", what: "Cắt tóc", tone: "on" },
    { at: 12, hours: 1.5, who: "Ngọc Ánh", what: "Uốn tóc", tone: "on" },
  ] },
] as const;

const HOURS = [9, 10, 11, 12, 13];

/** Khung cửa sổ trình duyệt chứa một lịch tuần minh hoạ. */
export function CalendarPreview() {
  const height = HOURS.length * PX_PER_HOUR;

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-3xl border-2 border-hard bg-paper-raised shadow-[8px_8px_0_0_var(--hard)]"
    >
      {/* thanh tiêu đề cửa sổ */}
      <div className="flex items-center gap-2 border-b-2 border-hard bg-paper-sunk px-4 py-3">
        <span className="size-3 rounded-full border-[1.5px] border-hard bg-coral" />
        <span className="size-3 rounded-full border-[1.5px] border-hard bg-marigold" />
        <span className="size-3 rounded-full border-[1.5px] border-hard bg-jade" />
        <span className="ml-3 rounded-full border border-line bg-paper px-4 py-0.5 text-xs text-ink-soft">
          gnoud-book.app / dashboard
        </span>
      </div>

      <div className="grid grid-cols-[3rem_repeat(5,minmax(0,1fr))]">
        <div />
        {DAYS.map((d) => (
          <div key={d.label} className="border-l border-line py-2 text-center">
            <p className="text-[0.65rem] font-bold tracking-wider text-ink-soft uppercase">{d.label}</p>
            <p
              className={cn(
                "font-display mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-lg leading-none font-black",
                d.today && "border-2 border-hard bg-marigold text-[#0d1f1b]",
              )}
            >
              {d.day}
            </p>
          </div>
        ))}

        <div className="relative border-t border-line" style={{ height }}>
          {HOURS.map((h, i) => (
            <span
              key={h}
              className="absolute right-2 text-[0.65rem] font-semibold text-ink-soft"
              style={{ top: i * PX_PER_HOUR + 2 }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        {DAYS.map((d) => (
          <div
            key={d.label}
            className={cn("relative border-t border-l border-line", d.today && "bg-marigold-soft/35")}
            style={{
              height,
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, var(--line) ${PX_PER_HOUR - 1}px, var(--line) ${PX_PER_HOUR}px)`,
            }}
          >
            {d.items.map((item) => (
              <div
                key={item.who}
                className={cn(
                  "absolute inset-x-1 overflow-hidden rounded-md border-[1.5px] px-1.5 py-0.5 text-[0.65rem] leading-tight",
                  item.tone === "on" && "border-hard bg-jade text-on-jade",
                  item.tone === "done" && "border-jade/50 bg-jade-tint text-jade-strong",
                  item.tone === "off" && "border-dashed border-ink/40 bg-paper-sunk text-ink-soft line-through",
                )}
                style={{
                  top: (item.at - START_HOUR) * PX_PER_HOUR + 1,
                  height: item.hours * PX_PER_HOUR - 3,
                }}
              >
                <span className="block font-bold">{item.who}</span>
                <span className="block opacity-80">{item.what}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
