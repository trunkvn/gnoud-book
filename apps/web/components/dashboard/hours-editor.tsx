"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { errorMessage } from "@/lib/appointment";
import { cn } from "@/lib/cn";
import {
  copyDay,
  DAY_LABELS,
  DAY_ORDER,
  DEFAULT_INTERVAL,
  emptyWeek,
  sameWeek,
  timeOptions,
  toApi,
  toMinutes,
  validateWeek,
  type Interval,
  type Week,
} from "@/lib/hours";

/** Chỉnh giờ làm việc theo tuần. Sửa thoải mái; bấm "Lưu" thì cả tuần được thay một lượt. */
export function HoursEditor({
  initial,
  timezone,
}: {
  initial: Week;
  timezone: string;
}) {
  const router = useRouter();
  const [week, setWeek] = useState<Week>(initial);
  const [baseline, setBaseline] = useState<Week>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const errors = validateWeek(week);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = !sameWeek(week, baseline);

  function setDay(dayOfWeek: number, intervals: Interval[]) {
    setSavedNotice(false);
    setWeek((current) =>
      current.map((day, index) => (index === dayOfWeek ? intervals : day)),
    );
  }

  async function save() {
    setPending(true);
    setError(null);
    setSavedNotice(false);
    try {
      const res = await fetch("/api/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervals: toApi(week) }),
      });
      if (!res.ok) {
        setError(errorMessage(await res.json().catch(() => null), "Không lưu được giờ làm việc"));
        return;
      }
      setBaseline(week);
      setSavedNotice(true);
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setPending(false);
    }
  }

  function applyPreset(preset: "weekdays" | "all" | "none") {
    setSavedNotice(false);
    const next = emptyWeek();
    if (preset === "weekdays") for (const d of [1, 2, 3, 4, 5]) next[d] = [{ ...DEFAULT_INTERVAL }];
    if (preset === "all") for (let d = 0; d < 7; d++) next[d] = [{ ...DEFAULT_INTERVAL }];
    setWeek(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-soft">
          Giờ theo múi giờ của cơ sở: <strong className="text-ink">{timezone}</strong>. Đổi ở mục &ldquo;Cơ sở&rdquo;.
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => applyPreset("weekdays")}>
            Thứ Hai–Sáu, 09:00–17:00
          </Button>
          <Button variant="ghost" size="sm" onClick={() => applyPreset("none")}>
            Đóng cả tuần
          </Button>
        </div>
      </div>

      <ul className="overflow-hidden rounded-3xl border-2 border-hard bg-paper-raised shadow-[6px_6px_0_0_var(--hard)]">
        {DAY_ORDER.map((dayOfWeek) => (
          <DayRow
            key={dayOfWeek}
            dayOfWeek={dayOfWeek}
            intervals={week[dayOfWeek]}
            error={errors[dayOfWeek]}
            onChange={(intervals) => setDay(dayOfWeek, intervals)}
            onCopy={(targets) => {
              setSavedNotice(false);
              setWeek((current) => copyDay(current, dayOfWeek, targets));
            }}
          />
        ))}
      </ul>

      {/* thanh lưu: luôn nằm sát đáy màn hình khi có thay đổi */}
      <div
        className={cn(
          "sticky bottom-24 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-hard bg-paper-raised px-5 py-4 shadow-[4px_4px_0_0_var(--hard)] lg:bottom-6",
          !dirty && !savedNotice && !error && "hidden",
        )}
      >
        <div className="flex items-center gap-3">
          {error ? (
            <p role="alert" className="text-sm font-semibold text-coral">{error}</p>
          ) : savedNotice && !dirty ? (
            <Badge tone="jade">Đã lưu</Badge>
          ) : hasErrors ? (
            <p role="alert" className="text-sm font-semibold text-coral">Sửa các lỗi ở trên để lưu được.</p>
          ) : (
            <Badge tone="marigold">Có thay đổi chưa lưu</Badge>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={() => setWeek(baseline)} disabled={!dirty || pending}>
            Hoàn tác
          </Button>
          <Button onClick={save} disabled={!dirty || hasErrors || pending}>
            {pending ? "Đang lưu…" : "Lưu giờ làm việc"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DayRow({
  dayOfWeek,
  intervals,
  error,
  onChange,
  onCopy,
}: {
  dayOfWeek: number;
  intervals: Interval[];
  error?: string;
  onChange: (intervals: Interval[]) => void;
  onCopy: (targets: number[]) => void;
}) {
  const open = intervals.length > 0;
  const label = DAY_LABELS[dayOfWeek];

  function addInterval() {
    const last = intervals.at(-1);
    const startMin = last ? Math.min(toMinutes(last.end), 22 * 60) : 9 * 60;
    const endMin = Math.min(startMin + 120, 1440);
    const fmt = (m: number) =>
      m === 1440 ? "24:00" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    onChange([...intervals, { start: fmt(startMin), end: fmt(endMin) }]);
  }

  return (
    <li className="grid gap-4 border-b border-line px-5 py-5 last:border-b-0 md:grid-cols-[11rem_1fr_auto] md:items-start">
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            role="switch"
            checked={open}
            onChange={(event) => onChange(event.target.checked ? [{ ...DEFAULT_INTERVAL }] : [])}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-7 w-12 shrink-0 rounded-full border-2 border-hard bg-paper-sunk transition peer-checked:bg-jade peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-jade after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:border-2 after:border-hard after:bg-paper-raised after:transition peer-checked:after:translate-x-5"
          />
          <span className="font-display text-xl font-extrabold">{label}</span>
          <span className="sr-only">{open ? "đang mở cửa" : "đóng cửa"}</span>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {open ? (
          <>
            {intervals.map((interval, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <TimeSelect
                  label={`${label}, khung ${index + 1}: giờ mở cửa`}
                  kind="start"
                  value={interval.start}
                  onChange={(start) =>
                    onChange(intervals.map((it, i) => (i === index ? { ...it, start } : it)))
                  }
                />
                <span aria-hidden="true" className="font-semibold">–</span>
                <TimeSelect
                  label={`${label}, khung ${index + 1}: giờ đóng cửa`}
                  kind="end"
                  value={interval.end}
                  onChange={(end) =>
                    onChange(intervals.map((it, i) => (i === index ? { ...it, end } : it)))
                  }
                />
                <button
                  type="button"
                  onClick={() => onChange(intervals.filter((_, i) => i !== index))}
                  aria-label={`Xoá khung giờ ${index + 1} của ${label}`}
                  className="rounded-full p-2 text-ink-soft hover:bg-ink/8 hover:text-coral"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addInterval}
              className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-jade underline-offset-4 hover:underline"
            >
              <PlusIcon className="size-4" />
              Thêm khung giờ (ví dụ nghỉ trưa)
            </button>
          </>
        ) : (
          <p className="py-2 text-sm text-ink-soft">Đóng cửa</p>
        )}
        {error && (
          <p role="alert" className="text-sm font-semibold text-coral">{error}</p>
        )}
      </div>

      {open && <CopyMenu fromDay={dayOfWeek} onApply={onCopy} />}
    </li>
  );
}

function TimeSelect({
  label,
  kind,
  value,
  onChange,
}: {
  label: string;
  kind: "start" | "end";
  value: string;
  onChange: (value: string) => void;
}) {
  const options = timeOptions(kind);
  // Giờ lạ (không nằm trên lưới 15 phút) vẫn phải hiện đúng thay vì bị đổi thầm
  const list = options.includes(value) ? options : [...options, value].sort();

  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-36 py-2"
    >
      {list.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </Select>
  );
}

function CopyMenu({
  fromDay,
  onApply,
}: {
  fromDay: number;
  onApply: (targets: number[]) => void;
}) {
  const [checked, setChecked] = useState<number[]>([]);

  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none rounded-full border-[1.5px] border-ink/40 px-4 py-2 text-sm font-semibold hover:bg-paper-sunk">
        Sao chép sang…
      </summary>
      <div className="absolute right-0 z-10 mt-2 flex w-56 flex-col gap-3 rounded-2xl border-2 border-hard bg-paper-raised p-4 shadow-[4px_4px_0_0_var(--hard)]">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Chọn các ngày nhận lịch của {DAY_LABELS[fromDay]}</legend>
          {DAY_ORDER.filter((d) => d !== fromDay).map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={checked.includes(d)}
                onChange={(event) =>
                  setChecked((current) =>
                    event.target.checked ? [...current, d] : current.filter((x) => x !== d),
                  )
                }
                className="size-4 accent-[var(--jade)]"
              />
              {DAY_LABELS[d]}
            </label>
          ))}
        </fieldset>
        <Button
          size="sm"
          disabled={checked.length === 0}
          onClick={() => {
            onApply(checked);
            setChecked([]);
          }}
        >
          Áp dụng
        </Button>
      </div>
    </details>
  );
}
