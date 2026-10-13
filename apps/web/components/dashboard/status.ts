import type { OwnerAppointment } from "@/lib/owner";

export const STATUS_LABEL: Record<OwnerAppointment["status"], string> = {
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã huỷ",
};

export const STATUS_TONE: Record<
  OwnerAppointment["status"],
  "jade" | "marigold" | "coral" | "neutral"
> = {
  CONFIRMED: "jade",
  COMPLETED: "neutral",
  CANCELLED: "coral",
};
