import { HvacProduct, QuoteCartItem } from '../types/hvac';

export type SpaceArrangementMode = 'horizontal' | 'vertical' | 'stack2x3' | 'stack3x2';

export interface ParsedDimensionsCm {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  rawText: string;
}

export interface SpaceUnitEntry {
  uid: string;
  productId: string;
  brand: string;
  modelType: string;
  fullName: string;
  indoorName: string;
  outdoorName: string;
  indoorDimText: string;
  outdoorDimText: string;
  indoorDimCm: ParsedDimensionsCm | null;
  outdoorDimCm: ParsedDimensionsCm | null;
  openingWidthCm: number | null;
  openingWasOddAdjusted: boolean;
  indoorWidthBaseCm: number | null;
}

export interface PlacedOutdoorRect {
  uid: string;
  productId: string;
  brand: string;
  outdoorName: string;
  indoorName: string;
  widthCm: number;
  heightCm: number;
  riserHeightCm: number;
  xCm: number;
  bottomCm: number;
  orderIndex: number;
}

export interface OutdoorLayoutItem {
  uid: string;
  productId: string;
  brand: string;
  outdoorName: string;
  indoorName: string;
  widthCm: number;
  heightCm: number;
}

export interface LayoutOptions {
  leftOffsetCm?: number;
  topOffsetCm?: number;
  bottomOffsetCm?: number;
  riserHeightCm?: number;
}

export interface LayoutMetrics {
  leftOffsetCm: number;
  verticalAnchor: 'top' | 'bottom';
  verticalOffsetCm: number;
  defaultTotalWidthCm: number;
  defaultTotalHeightCm: number;
  horizontalSumWidthCm: number;
  horizontalCount: number;
  horizontalSpacingCm: number;
  horizontalSpacingList: number[];
  verticalSumHeightCm: number;
  verticalCount: number;
  verticalSpacingCm: number;
  verticalSpacingList: number[];
}

export function getProductMainName(fullName: string): string {
  const stripped = fullName.replace(/(?:\s*[（(][^）)]*[）)])+\s*$/g, '').trim();
  return stripped || fullName.trim();
}

export function splitModelNames(fullName: string): {
  indoorName: string;
  outdoorName: string;
} {
  const withoutParens = getProductMainName(fullName);
  const slashParts = withoutParens
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (slashParts.length >= 2) {
    return {
      indoorName: slashParts[0],
      outdoorName: slashParts[1],
    };
  }
  return {
    indoorName: withoutParens || fullName,
    outdoorName: withoutParens || fullName,
  };
}

export function parseDimensionsToCm(dimText: string | undefined): ParsedDimensionsCm | null {
  if (!dimText) return null;
  const normalized = dimText.replace(/，/g, ',').trim();
  if (!normalized || normalized.startsWith('—') || normalized.startsWith('-')) {
    return null;
  }

  const matches = normalized.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;

  const nums = matches.map(Number).filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length < 2) return null;

  const isCm = /cm|公分/i.test(normalized) && !/mm|公釐/i.test(normalized);
  const divisor = isCm ? 1 : 10;

  return {
    widthCm: Number((nums[0] / divisor).toFixed(1)),
    heightCm: Number((nums[1] / divisor).toFixed(1)),
    depthCm: nums[2] !== undefined ? Number((nums[2] / divisor).toFixed(1)) : 0,
    rawText: dimText,
  };
}

/**
 * 建議開孔尺寸：室內機寬度減去 10 公分，若為單數則總數 +1，需顯示偶數
 */
export function calculateRecommendedOpeningWidth(indoorDimCm: ParsedDimensionsCm | null): {
  openingWidthCm: number | null;
  baseWidthCm: number | null;
  wasOddAdjusted: boolean;
} {
  if (!indoorDimCm) {
    return { openingWidthCm: null, baseWidthCm: null, wasOddAdjusted: false };
  }
  const baseWidthCm = Math.round(indoorDimCm.widthCm);
  const subtracted = Math.max(0, baseWidthCm - 10);
  const wasOddAdjusted = subtracted % 2 !== 0;
  const openingWidthCm = wasOddAdjusted ? subtracted + 1 : subtracted;
  return {
    openingWidthCm,
    baseWidthCm,
    wasOddAdjusted,
  };
}

export function buildSpaceUnitFromProduct(
  product: HvacProduct,
  uid: string,
  suffix?: string
): SpaceUnitEntry {
  const { indoorName, outdoorName } = splitModelNames(product.name);
  const indoorDimCm = parseDimensionsToCm(product.indoorDim);
  const outdoorDimCm = parseDimensionsToCm(product.outdoorDim);
  const opening = calculateRecommendedOpeningWidth(indoorDimCm);

  return {
    uid,
    productId: product.id,
    brand: product.brand,
    modelType: product.modelType,
    fullName: getProductMainName(product.name),
    indoorName: suffix ? `${indoorName} ${suffix}` : indoorName,
    outdoorName: suffix ? `${outdoorName} ${suffix}` : outdoorName,
    indoorDimText: product.indoorDim,
    outdoorDimText: product.outdoorDim,
    indoorDimCm,
    outdoorDimCm,
    openingWidthCm: opening.openingWidthCm,
    openingWasOddAdjusted: opening.wasOddAdjusted,
    indoorWidthBaseCm: opening.baseWidthCm,
  };
}

export function expandQuoteItemsToSpaceUnits(quoteItems: QuoteCartItem[]): SpaceUnitEntry[] {
  const units: SpaceUnitEntry[] = [];

  quoteItems.forEach((item) => {
    if (item.mergedItems && item.mergedItems.length > 0) {
      const qty = Math.max(1, item.quantity || 1);
      for (let q = 0; q < qty; q++) {
        item.mergedItems.forEach((sub, subIdx) => {
          const suffix = qty > 1 ? `#${q + 1}` : undefined;
          units.push(
            buildSpaceUnitFromProduct(sub.product, `${item.lineId}-sub-${subIdx}-q${q}`, suffix)
          );
        });
      }
      return;
    }

    const qty = Math.max(1, item.quantity || 1);
    for (let q = 0; q < qty; q++) {
      const suffix = qty > 1 ? `#${q + 1}` : undefined;
      units.push(buildSpaceUnitFromProduct(item.product, `${item.lineId}-q${q}`, suffix));
    }
  });

  return units;
}

export function getArrangementGridDims(
  arrangement: SpaceArrangementMode,
  count: number
): { cols: number; rows: number } {
  if (count <= 0) return { cols: 1, rows: 1 };
  switch (arrangement) {
    case 'horizontal':
      return { cols: count, rows: 1 };
    case 'vertical':
      return { cols: 1, rows: count };
    case 'stack2x3': {
      const cols = Math.min(2, count);
      const rows = Math.ceil(count / 2);
      return { cols, rows };
    }
    case 'stack3x2': {
      const cols = Math.min(3, count);
      const rows = Math.ceil(count / 3);
      return { cols, rows };
    }
  }
}

export const DEFAULT_LEFT_OFFSET_CM = 10;
export const DEFAULT_BOTTOM_OFFSET_CM = 15;
export const DEFAULT_TOP_OFFSET_CM = 10;
export const DEFAULT_HORIZONTAL_GAP_CM = 30;
export const DEFAULT_VERTICAL_GAP_CM = 20;

export function buildRowsMatrix(
  items: OutdoorLayoutItem[],
  arrangement: SpaceArrangementMode
): OutdoorLayoutItem[][] {
  if (items.length === 0) return [];
  const { cols } = getArrangementGridDims(arrangement, items.length);
  const rowsMatrix: OutdoorLayoutItem[][] = [];
  for (let i = 0; i < items.length; i += cols) {
    rowsMatrix.push(items.slice(i, i + cols));
  }
  return rowsMatrix;
}

export function computeDefaultBoardSize(
  items: OutdoorLayoutItem[],
  arrangement: SpaceArrangementMode,
  options?: LayoutOptions
): { defaultTotalWidthCm: number; defaultTotalHeightCm: number } {
  if (items.length === 0) {
    return { defaultTotalWidthCm: 300, defaultTotalHeightCm: 200 };
  }
  const leftOffsetCm = options?.leftOffsetCm ?? DEFAULT_LEFT_OFFSET_CM;
  const topOffsetCm = options?.topOffsetCm ?? DEFAULT_TOP_OFFSET_CM;
  const bottomOffsetCm = options?.bottomOffsetCm ?? DEFAULT_BOTTOM_OFFSET_CM;
  const riserHeightCm = options?.riserHeightCm ?? 0;

  const rowsMatrix = buildRowsMatrix(items, arrangement);
  const verticalOffsetCm = arrangement === 'vertical' ? topOffsetCm : bottomOffsetCm;

  const rowDefaultWidths = rowsMatrix.map((row) => {
    const sumW = row.reduce((s, it) => s + it.widthCm, 0);
    return leftOffsetCm + sumW + DEFAULT_HORIZONTAL_GAP_CM * row.length;
  });

  const rowHeights = rowsMatrix.map((row) =>
    Math.max(...row.map((it) => it.heightCm + riserHeightCm))
  );
  const sumRowHeights = rowHeights.reduce((s, h) => s + h, 0);

  return {
    defaultTotalWidthCm: Number(Math.max(...rowDefaultWidths).toFixed(1)),
    defaultTotalHeightCm: Number(
      (
        verticalOffsetCm +
        sumRowHeights +
        DEFAULT_VERTICAL_GAP_CM * rowsMatrix.length
      ).toFixed(1)
    ),
  };
}

export function computeLayoutAndMetrics(
  items: OutdoorLayoutItem[],
  arrangement: SpaceArrangementMode,
  totalWidthCm?: number,
  totalHeightCm?: number,
  options?: LayoutOptions
): { rects: PlacedOutdoorRect[]; metrics: LayoutMetrics } {
  const leftOffsetCm = options?.leftOffsetCm ?? DEFAULT_LEFT_OFFSET_CM;
  const topOffsetCm = options?.topOffsetCm ?? DEFAULT_TOP_OFFSET_CM;
  const bottomOffsetCm = options?.bottomOffsetCm ?? DEFAULT_BOTTOM_OFFSET_CM;
  const riserHeightCm = options?.riserHeightCm ?? 0;

  const verticalAnchor: 'top' | 'bottom' =
    arrangement === 'vertical' ? 'top' : 'bottom';
  const verticalOffsetCm = verticalAnchor === 'top' ? topOffsetCm : bottomOffsetCm;

  const { defaultTotalWidthCm, defaultTotalHeightCm } = computeDefaultBoardSize(
    items,
    arrangement,
    options
  );

  if (items.length === 0) {
    return {
      rects: [],
      metrics: {
        leftOffsetCm,
        verticalAnchor,
        verticalOffsetCm,
        defaultTotalWidthCm,
        defaultTotalHeightCm,
        horizontalSumWidthCm: 0,
        horizontalCount: 0,
        horizontalSpacingCm: DEFAULT_HORIZONTAL_GAP_CM,
        horizontalSpacingList: [leftOffsetCm],
        verticalSumHeightCm: 0,
        verticalCount: 0,
        verticalSpacingCm: DEFAULT_VERTICAL_GAP_CM,
        verticalSpacingList: [verticalOffsetCm],
      },
    };
  }

  const effectiveTotalW =
    typeof totalWidthCm === 'number' && totalWidthCm > 0 ? totalWidthCm : defaultTotalWidthCm;
  const effectiveTotalH =
    typeof totalHeightCm === 'number' && totalHeightCm > 0 ? totalHeightCm : defaultTotalHeightCm;

  const rowsMatrix = buildRowsMatrix(items, arrangement);

  // Horizontal segment metrics (Row 0 represents primary horizontal count)
  const firstRow = rowsMatrix[0] || [];
  const horizontalCount = firstRow.length;
  const horizontalSumWidthCm = Number(
    firstRow.reduce((sum, it) => sum + it.widthCm, 0).toFixed(1)
  );
  const horizontalSpacingCm =
    horizontalCount > 0
      ? Number(
          (
            (effectiveTotalW - leftOffsetCm - horizontalSumWidthCm) /
            horizontalCount
          ).toFixed(1)
        )
      : 0;
  const horizontalSpacingList = [
    leftOffsetCm,
    ...Array.from({ length: horizontalCount }, () => horizontalSpacingCm),
  ];

  // Vertical segment metrics (across rows, including riserHeightCm if enabled)
  const rowHeights = rowsMatrix.map((row) =>
    Math.max(...row.map((it) => it.heightCm + riserHeightCm))
  );
  const verticalCount = rowsMatrix.length;
  const verticalSumHeightCm = Number(rowHeights.reduce((sum, h) => sum + h, 0).toFixed(1));
  const verticalSpacingCm =
    verticalCount > 0
      ? Number(
          (
            (effectiveTotalH - verticalOffsetCm - verticalSumHeightCm) /
            verticalCount
          ).toFixed(1)
        )
      : 0;
  const verticalSpacingList = [
    verticalOffsetCm,
    ...Array.from({ length: verticalCount }, () => verticalSpacingCm),
  ];

  // Compute placement anchored either top-left (vertical mode) or bottom-left
  const rects: PlacedOutdoorRect[] = [];
  let currentVerticalCursor = verticalOffsetCm;
  let globalIdx = 0;

  for (let r = 0; r < rowsMatrix.length; r++) {
    const rowItems = rowsMatrix[r];
    const rowSumW = rowItems.reduce((sum, it) => sum + it.widthCm, 0);
    const rowGapX =
      rowItems.length > 0
        ? (effectiveTotalW - leftOffsetCm - rowSumW) / rowItems.length
        : 0;

    let currentX = leftOffsetCm;
    for (let c = 0; c < rowItems.length; c++) {
      const it = rowItems[c];
      const totalRectH = it.heightCm + riserHeightCm;
      const bottomCm =
        verticalAnchor === 'top'
          ? Number((effectiveTotalH - currentVerticalCursor - totalRectH).toFixed(1))
          : Number(currentVerticalCursor.toFixed(1));
      rects.push({
        uid: it.uid,
        productId: it.productId,
        brand: it.brand,
        outdoorName: it.outdoorName,
        indoorName: it.indoorName,
        widthCm: it.widthCm,
        heightCm: it.heightCm,
        riserHeightCm,
        xCm: Number(currentX.toFixed(1)),
        bottomCm,
        orderIndex: globalIdx,
      });
      currentX += it.widthCm + rowGapX;
      globalIdx++;
    }

    currentVerticalCursor += rowHeights[r] + verticalSpacingCm;
  }

  return {
    rects,
    metrics: {
      leftOffsetCm,
      verticalAnchor,
      verticalOffsetCm,
      defaultTotalWidthCm,
      defaultTotalHeightCm,
      horizontalSumWidthCm,
      horizontalCount,
      horizontalSpacingCm,
      horizontalSpacingList,
      verticalSumHeightCm,
      verticalCount,
      verticalSpacingCm,
      verticalSpacingList,
    },
  };
}
