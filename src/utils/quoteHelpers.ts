import { QuoteCartItem } from '../types/hvac';

export function createQuoteLineId(): string {
  return `qline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function calcAdjustedUnitPrice(basePrice: number, percent: number): number {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  const safePct = Math.max(0, Number(percent) || 0);
  // Scaled integer math avoids float inaccuracies (e.g. 18000 * 1.1 = 19800.000000000004)
  // before rounding unconditionally up to the hundreds place (e.g. 18555 -> 18600).
  const scaled = Math.round(safeBase * safePct * 100);
  return Math.ceil(scaled / 1_000_000) * 100;
}

export function getBaseUnitPrice(item: QuoteCartItem, pricePercent: number): number {
  if (typeof item.customPrice === 'number') {
    return item.customPrice;
  }
  return calcAdjustedUnitPrice(item.product.price, pricePercent);
}

export function getEffectiveUnitPrice(item: QuoteCartItem, pricePercent: number): number {
  const base = getBaseUnitPrice(item, pricePercent);
  const delta = typeof item.priceDelta === 'number' ? item.priceDelta : 0;
  return Math.max(0, base + delta);
}

export function cloneQuoteItem(item: QuoteCartItem): QuoteCartItem {
  return {
    ...item,
    lineId: createQuoteLineId(),
    product: { ...item.product },
    mergedItems: item.mergedItems ? item.mergedItems.map((sub) => cloneQuoteItem(sub)) : undefined,
  };
}

export function ensureQuoteItemIds(items: QuoteCartItem[]): QuoteCartItem[] {
  return items.map((item) => ({
    ...item,
    lineId: item.lineId || createQuoteLineId(),
    mergedItems: item.mergedItems ? ensureQuoteItemIds(item.mergedItems) : undefined,
  }));
}
