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

/**
 * Lỗi P2034 của Prisma = Postgres huỷ giao dịch vì xung đột ghi hoặc deadlock (mã 40001 / 40P01).
 * Xảy ra khi hai bên cùng tranh một khung giờ theo kiểu chéo nhau (một người đang đặt, một người
 * đổi vào đúng giờ đó): mỗi bên giữ chỗ mà bên kia cần, Postgres chọn một bên để huỷ.
 */
export function isWriteConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

/** Thua cuộc đua giành một khung giờ, dù bằng cách nào (bị từ chối hay bị chọn làm bên bị huỷ). */
export function isSlotContention(error: unknown): boolean {
  return isNoOverlapViolation(error) || isWriteConflict(error);
}
