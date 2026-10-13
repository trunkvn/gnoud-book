import type { ComponentProps } from "react";

// Bộ icon nét đơn giản (24x24, nét 2, màu theo chữ). Chỉ là trang trí nên ẩn khỏi trình đọc màn hình.
function Icon({ children, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5 shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CalendarIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);
export const TagIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.3 7.3a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0L3.8 12.9a1 1 0 0 1-.3-.7Z" />
    <circle cx="8.2" cy="8.2" r="1.4" />
  </Icon>
);
export const ClockIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </Icon>
);
export const StoreIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20" />
  </Icon>
);
export const PlusIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const TrashIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5" />
  </Icon>
);
export const EditIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="m4 20 1-4.2L16.6 4.2a1.8 1.8 0 0 1 2.6 0l.6.6a1.8 1.8 0 0 1 0 2.6L8.2 19 4 20Z" />
    <path d="m14.5 6.3 3.2 3.2" />
  </Icon>
);
export const CloseIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
export const CheckIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const ChevronLeftIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
  </Icon>
);
export const ChevronRightIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Icon>
);
export const LogoutIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14M10 12h10m0 0-3.5-3.5M20 12l-3.5 3.5" />
  </Icon>
);
export const CopyIcon = (p: ComponentProps<"svg">) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
  </Icon>
);
