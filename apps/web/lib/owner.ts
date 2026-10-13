// Kiểu dữ liệu mà API trả cho chủ cơ sở (dùng chung giữa server component và client component).

export type OwnerAppointment = {
  id: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  customer: { name: string; email: string; timezone: string };
  service: { id: string; name: string; durationMinutes: number };
};

export type OwnerAppointmentsResponse = {
  timezone: string;
  appointments: OwnerAppointment[];
};

export type OwnerService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
  active: boolean;
};

export type WorkingHoursResponse = {
  timezone: string;
  intervals: { dayOfWeek: number; start: string; end: string }[];
};

export type OwnerBusiness = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
};
