"use client";

import { useSyncExternalStore } from "react";
import { Select } from "@/components/ui/field";
import { buildZoneGroups, type ZoneGroup } from "@/lib/timezones";

// Danh sách múi giờ phụ thuộc vào bản ICU của trình duyệt, nên chỉ dựng ở client và dựng một lần
// cho mỗi giá trị hiện tại (hàm thuần buildZoneGroups lo việc nhóm và đảm bảo giá trị hiện tại luôn có trong danh sách).
let cached: { key: string; groups: ZoneGroup[] } | null = null;

function describeZone(name: string): string {
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone: name, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? "";
  return `${name.replaceAll("_", " ")} (${offset.replace("GMT", "UTC")})`;
}

function groupsFor(current: string): ZoneGroup[] {
  if (cached?.key !== current) {
    cached = {
      key: current,
      groups: buildZoneGroups(
        [...Intl.supportedValuesOf("timeZone"), "UTC"],
        current,
        describeZone,
      ),
    };
  }
  return cached.groups;
}

const subscribeNever = () => () => {};
const serverGroups = (): ZoneGroup[] => [];

/** Ô chọn múi giờ có nhóm "Phổ biến" ở đầu. Trước khi trình duyệt dựng xong danh sách chỉ hiện giá trị hiện tại. */
export function TimezoneSelect({
  value,
  onChange,
  label = "Múi giờ",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const groups = useSyncExternalStore(
    subscribeNever,
    () => groupsFor(value),
    serverGroups,
  );

  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      {groups.length === 0 && <option value={value}>{value}</option>}
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.zones.map((zone) => (
            <option key={zone.value} value={zone.value}>
              {zone.label}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
