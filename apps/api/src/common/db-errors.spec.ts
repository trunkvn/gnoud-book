import { Prisma } from '../generated/prisma/client.js';
import {
  isNoOverlapViolation,
  isSlotContention,
  isWriteConflict,
} from './db-errors.js';

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

describe('isWriteConflict', () => {
  const withCode = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('boom', {
      code,
      clientVersion: 'test',
    });

  it('recognises a transaction aborted by a write conflict or deadlock (P2034)', () => {
    expect(isWriteConflict(withCode('P2034'))).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isWriteConflict(withCode('P2002'))).toBe(false);
    expect(isWriteConflict(new Error('P2034'))).toBe(false);
  });
});

describe('isSlotContention', () => {
  it('covers both ways of losing a race for a time slot', () => {
    expect(isSlotContention(prismaError('23P01'))).toBe(true);
    expect(
      isSlotContention(
        new Prisma.PrismaClientKnownRequestError('boom', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      ),
    ).toBe(true);
  });

  it('does not swallow unrelated errors', () => {
    expect(isSlotContention(prismaError('23505'))).toBe(false);
    expect(isSlotContention(new Error('database down'))).toBe(false);
  });
});
