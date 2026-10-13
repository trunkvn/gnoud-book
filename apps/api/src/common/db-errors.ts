import { Prisma } from '../generated/prisma/client.js';

/**
 * Lỗi Postgres 23P01 = vi phạm exclusion constraint "Appointment_no_overlap",
 * tức là có người vừa đặt trùng khung giờ. Prisma bọc nó thành lỗi P2039 và để
 * mã gốc của Postgres trong meta.driverAdapterError.cause.originalCode.
 */
export function isNoOverlapViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const meta = error.meta as
    { driverAdapterError?: { cause?: { originalCode?: string } } } | undefined;
  return meta?.driverAdapterError?.cause?.originalCode === '23P01';
}
