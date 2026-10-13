// Kiểu dữ liệu của các API công khai dành cho khách (không cần đăng nhập).

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
};

export type PublicBusiness = {
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
  services: PublicService[];
};

/** Kết quả POST /public/businesses/:slug/appointments */
export type CreatedAppointment = {
  id: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  startsAt: string;
  endsAt: string;
  manageToken: string;
  customer: { name: string; email: string; timezone: string };
  service: PublicService;
  business: { name: string; slug: string; timezone: string };
};
