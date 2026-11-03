import { Prisma } from '@prisma/client';

/**
 * Safely converts a Prisma.Decimal, string, or number to a standard JavaScript number.
 */
export function toNumber(value: Prisma.Decimal | number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (Prisma.Decimal.isDecimal(value)) {
    return value.toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Converts a nullable Decimal to a nullable number.
 */
export function toOptionalNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toNumber(value);
}

/**
 * Deeply transforms any Prisma.Decimal instances inside an object or array into standard JavaScript numbers.
 */
export function serializeDecimals<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Prisma.Decimal.isDecimal(data)) {
    return data.toNumber() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeDecimals(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeDecimals(value);
    }
    return result as T;
  }

  return data;
}

