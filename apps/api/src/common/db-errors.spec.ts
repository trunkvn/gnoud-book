import { Prisma } from '../generated/prisma/client.js';
import { isNoOverlapViolation } from './db-errors.js';

const prismaError = (originalCode?: string) =>
  new Prisma.PrismaClientKnownRequestError('boom', {
    code: 'P2039',
    clientVersion: 'test',
    meta: { driverAdapterError: { cause: { originalCode } } },
  });

describe('isNoOverlapViolation', () => {
  it('recognises the exclusion-constraint violation (Postgres 23P01)', () => {
    expect(isNoOverlapViolation(prismaError('23P01'))).toBe(true);
  });

  it('ignores other database errors', () => {
    expect(isNoOverlapViolation(prismaError('23505'))).toBe(false); // unique violation
    expect(isNoOverlapViolation(prismaError(undefined))).toBe(false);
  });

  it('ignores errors that are not Prisma errors', () => {
    expect(isNoOverlapViolation(new Error('23P01'))).toBe(false);
    expect(isNoOverlapViolation(undefined)).toBe(false);
  });
});
