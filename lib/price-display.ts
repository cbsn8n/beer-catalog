export const PRICE_SPREAD_RUB = 10;

export function getBeerPriceBounds(price: number | null | undefined) {
  if (typeof price !== "number" || !Number.isFinite(price)) return null;

  const base = Math.round(price);
  const min = Math.max(0, base - PRICE_SPREAD_RUB);
  const max = Math.max(min, base + PRICE_SPREAD_RUB);

  return { min, max };
}

export function formatBeerPriceApprox(price: number | null | undefined) {
  const bounds = getBeerPriceBounds(price);
  if (!bounds) return null;
  return `~${bounds.min}-${bounds.max} ₽`;
}

export function isBeerPriceInSelectedRange(
  price: number | null | undefined,
  selectedMin: number,
  selectedMax: number
) {
  const bounds = getBeerPriceBounds(price);
  if (!bounds) return true;

  // Intersects user-selected slider range.
  return !(bounds.max < selectedMin || bounds.min > selectedMax);
}
