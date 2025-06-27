import { generateKeyBetween } from "fractional-indexing";

/**
 * Returns a key that sorts after `order` and before `nextOrder`.
 * `order`/`nextOrder` are fractional index strings, `null` meaning
 * "start of list" or "end of list".
 */
export function orderBetween(
  order: string | null,
  nextOrder: string | null
): string {
  try {
    return generateKeyBetween(order, nextOrder);
  } catch {
    // Fall back to appending at the end if the neighbours are corrupt.
    return generateKeyBetween(order, null);
  }
}

export function orderAtEnd(orders: string[]): string {
  const sorted = [...orders].sort();
  const last = sorted.length ? sorted[sorted.length - 1] : null;
  return orderBetween(last, null);
}

export function sortByOrder<T extends { order: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order.localeCompare(b.order));
}
