import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Grid3X3,
  Plus,
  Ruler,
  Trash2,
  X,
} from 'lucide-react';
import { getBrandTheme } from '../data/productsData';
import { HvacProduct, QuoteCartItem } from '../types/hvac';
import {
  buildSpaceUnitFromProduct,
  computeDefaultBoardSize,
  computeLayoutAndMetrics,
  expandQuoteItemsToSpaceUnits,
  getProductMainName,
  PlacedOutdoorRect,
  SpaceArrangementMode,
  SpaceUnitEntry,
  splitModelNames,
  parseDimensionsToCm,
} from '../utils/spacePlannerHelpers';

interface SpacePlanningViewProps {
  quoteItems: QuoteCartItem[];
  products: HvacProduct[];
  onBackToPriceLookup: () => void;
}

const ARRANGEMENT_OPTIONS: { value: SpaceArrangementMode; label: string }[] = [
  { value: 'horizontal', label: '水平' },
  { value: 'vertical', label: '垂直' },
  { value: 'stack2x3', label: '2*3堆疊' },
  { value: 'stack3x2', label: '3*2堆疊' },
];

export default function SpacePlanningView({
  quoteItems,
  products,
  onBackToPriceLookup,
}: SpacePlanningViewProps) {
  // Base units come from checked quoteItems, plus user can optionally add extra units locally
  const initialUnits = useMemo(() => expandQuoteItemsToSpaceUnits(quoteItems), [quoteItems]);
  const [units, setUnits] = useState<SpaceUnitEntry[]>(initialUnits);

  // Keep synced when quoteItems change externally
  useEffect(() => {
    setUnits(expandQuoteItemsToSpaceUnits(quoteItems));
  }, [quoteItems]);

  // Outdoor units that have valid parsed dimensions
  const outdoorSourceItems = useMemo(
    () =>
      units
        .filter((u) => u.outdoorDimCm !== null)
        .map((u) => ({
          uid: u.uid,
          productId: u.productId,
          brand: u.brand,
          outdoorName: u.outdoorName,
          indoorName: u.indoorName,
          widthCm: u.outdoorDimCm!.widthCm,
          heightCm: u.outdoorDimCm!.heightCm,
        })),
    [units]
  );

  // 4 Editable Grid Controls (default arrangement = 'horizontal')
  const [arrangement, setArrangement] = useState<SpaceArrangementMode>('horizontal');
  const [unitCm, setUnitCm] = useState<number>(5);

  // 畫布下方兩個控制方塊：1. 基礎調整 (水平左側預設 10、垂直上方預設 10)、2. 墊高+2
  const [leftOffsetCm, setLeftOffsetCm] = useState<number>(10);
  const [topOffsetCm, setTopOffsetCm] = useState<number>(10);
  const [leftOffsetInput, setLeftOffsetInput] = useState<string>('10');
  const [topOffsetInput, setTopOffsetInput] = useState<string>('10');
  const [hasRiserPad, setHasRiserPad] = useState<boolean>(false);

  const layoutOptions = useMemo(
    () => ({
      leftOffsetCm: Math.max(0, leftOffsetCm),
      topOffsetCm: Math.max(0, topOffsetCm),
      riserHeightCm: hasRiserPad ? 2 : 0,
    }),
    [leftOffsetCm, topOffsetCm, hasRiserPad]
  );

  const defaultBoardSize = useMemo(
    () => computeDefaultBoardSize(outdoorSourceItems, arrangement, layoutOptions),
    [outdoorSourceItems, arrangement, layoutOptions]
  );

  const [totalWidthCm, setTotalWidthCm] = useState<number>(
    () => computeDefaultBoardSize(outdoorSourceItems, 'horizontal').defaultTotalWidthCm
  );
  const [totalHeightCm, setTotalHeightCm] = useState<number>(
    () => computeDefaultBoardSize(outdoorSourceItems, 'horizontal').defaultTotalHeightCm
  );
  const [totalWidthInput, setTotalWidthInput] = useState<string>(
    () => String(computeDefaultBoardSize(outdoorSourceItems, 'horizontal').defaultTotalWidthCm)
  );
  const [totalHeightInput, setTotalHeightInput] = useState<string>(
    () => String(computeDefaultBoardSize(outdoorSourceItems, 'horizontal').defaultTotalHeightCm)
  );

  const isCustomTotalWRef = useRef<boolean>(false);
  const isCustomTotalHRef = useRef<boolean>(false);

  // Reset default totalWidth/totalHeight when arrangement changes or units are added/removed/replaced,
  // while preserving user's custom totalWidth/totalHeight when only swapping two existing rectangles.
  const layoutStructureKey = useMemo(() => {
    const dimsSig = outdoorSourceItems
      .map((i) => `${i.widthCm}x${i.heightCm}`)
      .sort()
      .join(',');
    return `${arrangement}::${dimsSig}`;
  }, [arrangement, outdoorSourceItems]);

  const prevStructureKeyRef = useRef<string>(layoutStructureKey);
  useEffect(() => {
    if (prevStructureKeyRef.current !== layoutStructureKey) {
      prevStructureKeyRef.current = layoutStructureKey;
      isCustomTotalWRef.current = false;
      isCustomTotalHRef.current = false;
      setTotalWidthCm(defaultBoardSize.defaultTotalWidthCm);
      setTotalHeightCm(defaultBoardSize.defaultTotalHeightCm);
      setTotalWidthInput(String(defaultBoardSize.defaultTotalWidthCm));
      setTotalHeightInput(String(defaultBoardSize.defaultTotalHeightCm));
      setHasManualDrag(false);
    } else {
      if (!isCustomTotalWRef.current) {
        setTotalWidthCm(defaultBoardSize.defaultTotalWidthCm);
        setTotalWidthInput(String(defaultBoardSize.defaultTotalWidthCm));
      }
      if (!isCustomTotalHRef.current) {
        setTotalHeightCm(defaultBoardSize.defaultTotalHeightCm);
        setTotalHeightInput(String(defaultBoardSize.defaultTotalHeightCm));
      }
    }
  }, [layoutStructureKey, defaultBoardSize]);

  const [snapToUnit, setSnapToUnit] = useState<boolean>(false);
  const [hasManualDrag, setHasManualDrag] = useState<boolean>(false);
  const [selectedRectUid, setSelectedRectUid] = useState<string | null>(null);
  const [quickAddProductId, setQuickAddProductId] = useState<string>(
    () => products[0]?.id || ''
  );

  const safeUnitCm = Math.max(1, unitCm || 5);
  const safeTotalW = Math.max(10, totalWidthCm || defaultBoardSize.defaultTotalWidthCm);
  const safeTotalH = Math.max(15, totalHeightCm || defaultBoardSize.defaultTotalHeightCm);

  // Auto-computed layout and spacing formulas
  const autoComputed = useMemo(
    () =>
      computeLayoutAndMetrics(
        outdoorSourceItems,
        arrangement,
        safeTotalW,
        safeTotalH,
        layoutOptions
      ),
    [outdoorSourceItems, arrangement, safeTotalW, safeTotalH, layoutOptions]
  );

  const [placedRects, setPlacedRects] = useState<PlacedOutdoorRect[]>(autoComputed.rects);

  // Re-sync placedRects whenever calculated layout updates
  useEffect(() => {
    setPlacedRects(autoComputed.rects);
    setSelectedRectUid((prev) =>
      prev && autoComputed.rects.some((r) => r.uid === prev) ? prev : null
    );
  }, [autoComputed.rects]);

  const gridColsCount = Math.ceil(safeTotalW / safeUnitCm);
  const gridRowsCount = Math.ceil(safeTotalH / safeUnitCm);

  // Check if any rectangle overflows or overlaps due to negative spacing
  const isOverflowing = useMemo(() => {
    return placedRects.some(
      (r) =>
        r.xCm + r.widthCm > safeTotalW + 0.05 ||
        r.bottomCm + r.heightCm + r.riserHeightCm > safeTotalH + 0.05 ||
        r.bottomCm < -0.05
    );
  }, [placedRects, safeTotalW, safeTotalH]);

  const hasNegativeSpacing =
    outdoorSourceItems.length > 0 &&
    (autoComputed.metrics.horizontalSpacingCm < 0 ||
      autoComputed.metrics.verticalSpacingCm < 0);

  // Catalog products with valid outdoor dimensions for model swapping
  const swappableProducts = useMemo(() => {
    return products.filter((p) => parseDimensionsToCm(p.outdoorDim) !== null);
  }, [products]);

  // Pointer drag state
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    uid: string;
    startClientX: number;
    startClientY: number;
    origXCm: number;
    origBottomCm: number;
    rectWidthCm: number;
    rectHeightCm: number;
    moved: boolean;
  } | null>(null);
  const [draggingUid, setDraggingUid] = useState<string | null>(null);

  const handleRectPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    rect: PlacedOutdoorRect
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      uid: rect.uid,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origXCm: rect.xCm,
      origBottomCm: rect.bottomCm,
      rectWidthCm: rect.widthCm,
      rectHeightCm: rect.heightCm + rect.riserHeightCm,
      moved: false,
    };
  };

  const handleRectPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    const board = boardRef.current;
    if (!st || !board) return;

    const dxPx = e.clientX - st.startClientX;
    const dyPx = e.clientY - st.startClientY;
    if (!st.moved && Math.hypot(dxPx, dyPx) < 5) {
      return;
    }

    if (!st.moved) {
      st.moved = true;
      setDraggingUid(st.uid);
      setHasManualDrag(true);
    }

    const boardRect = board.getBoundingClientRect();
    if (boardRect.width <= 0 || boardRect.height <= 0) return;

    const dxCm = (dxPx / boardRect.width) * safeTotalW;
    const dyCm = (dyPx / boardRect.height) * safeTotalH;

    let nextX = st.origXCm + dxCm;
    let nextBottom = st.origBottomCm - dyCm;

    if (snapToUnit) {
      nextX = Math.round(nextX / safeUnitCm) * safeUnitCm;
      nextBottom = Math.round(nextBottom / safeUnitCm) * safeUnitCm;
    } else {
      nextX = Math.round(nextX * 2) / 2;
      nextBottom = Math.round(nextBottom * 2) / 2;
    }

    const maxX = Math.max(0, safeTotalW - st.rectWidthCm);
    const maxBottom = Math.max(0, safeTotalH - st.rectHeightCm);
    nextX = Math.max(0, Math.min(maxX, nextX));
    nextBottom = Math.max(0, Math.min(maxBottom, nextBottom));

    setPlacedRects((prev) =>
      prev.map((r) =>
        r.uid === st.uid ? { ...r, xCm: nextX, bottomCm: nextBottom } : r
      )
    );
  };

  const handleRectPointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    rect: PlacedOutdoorRect
  ) => {
    const st = dragStateRef.current;
    if (!st) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore capture release error
    }

    const wasDragged = st.moved;
    dragStateRef.current = null;
    setDraggingUid(null);

    if (!wasDragged) {
      handleRectClick(rect.uid);
    }
  };

  const handleRectClick = (clickedUid: string) => {
    if (!selectedRectUid) {
      setSelectedRectUid(clickedUid);
      return;
    }
    if (selectedRectUid === clickedUid) {
      setSelectedRectUid(null);
      return;
    }

    // Swap models between selectedRectUid and clickedUid
    const uidA = selectedRectUid;
    const uidB = clickedUid;

    if (!hasManualDrag) {
      // Swap unit positions in the array so auto-layout cleanly reflows with zero overlap
      setUnits((prev) => {
        const idxA = prev.findIndex((u) => u.uid === uidA);
        const idxB = prev.findIndex((u) => u.uid === uidB);
        if (idxA === -1 || idxB === -1) return prev;
        const next = [...prev];
        const temp = next[idxA];
        next[idxA] = next[idxB];
        next[idxB] = temp;
        return next;
      });
    } else {
      // Preserve custom dragged coordinates while swapping model info & sizes
      setPlacedRects((prev) => {
        const rectA = prev.find((r) => r.uid === uidA);
        const rectB = prev.find((r) => r.uid === uidB);
        if (!rectA || !rectB) return prev;
        return prev.map((r) => {
          if (r.uid === uidA) {
            return {
              ...r,
              productId: rectB.productId,
              brand: rectB.brand,
              outdoorName: rectB.outdoorName,
              indoorName: rectB.indoorName,
              widthCm: rectB.widthCm,
              heightCm: rectB.heightCm,
            };
          }
          if (r.uid === uidB) {
            return {
              ...r,
              productId: rectA.productId,
              brand: rectA.brand,
              outdoorName: rectA.outdoorName,
              indoorName: rectA.indoorName,
              widthCm: rectA.widthCm,
              heightCm: rectA.heightCm,
            };
          }
          return r;
        });
      });
    }

    setSelectedRectUid(null);
  };

  const handleReplaceRectModel = (targetUid: string, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;
    const dim = parseDimensionsToCm(prod.outdoorDim);
    const { indoorName, outdoorName } = splitModelNames(prod.name);

    setUnits((prev) =>
      prev.map((u) =>
        u.uid === targetUid ? buildSpaceUnitFromProduct(prod, u.uid) : u
      )
    );

    if (hasManualDrag && dim) {
      setPlacedRects((prev) =>
        prev.map((r) =>
          r.uid === targetUid
            ? {
                ...r,
                productId: prod.id,
                brand: prod.brand,
                outdoorName,
                indoorName,
                widthCm: dim.widthCm,
                heightCm: dim.heightCm,
              }
            : r
        )
      );
    }
  };

  const handleAddLocalUnit = () => {
    const prod = products.find((p) => p.id === quickAddProductId);
    if (!prod) return;
    const newUid = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setUnits((prev) => [...prev, buildSpaceUnitFromProduct(prod, newUid)]);
  };

  const handleRemoveUnit = (uid: string) => {
    setUnits((prev) => prev.filter((u) => u.uid !== uid));
    if (selectedRectUid === uid) setSelectedRectUid(null);
  };

  const selectedRect = placedRects.find((r) => r.uid === selectedRectUid) || null;

  // Checkerboard SVG pattern using exact cm coordinates inside viewBox="0 0 safeTotalW safeTotalH"
  const patternSize = safeUnitCm * 2;
  const majorStepCm = safeUnitCm * 5;

  const verticalTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let x = 0; x <= safeTotalW; x += majorStepCm) {
      ticks.push(Number(x.toFixed(1)));
    }
    return ticks;
  }, [safeTotalW, majorStepCm]);

  const horizontalTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = 0; y <= safeTotalH; y += majorStepCm) {
      ticks.push(Number(y.toFixed(1)));
    }
    return ticks;
  }, [safeTotalH, majorStepCm]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6">
      {/* 頂部操作列 */}
      <div className="bento-card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBackToPriceLookup}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#3B312C] bg-[#4A3F3A] px-3.5 py-2 text-xs font-bold text-[#FFF8EE] shadow-[0_2px_0_rgba(59,49,44,0.28)] transition-colors hover:bg-[#3B312C]"
          >
            <ArrowLeft className="h-4 w-4 text-[#F6BE6B]" />
            <span>返回價格查詢</span>
          </button>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[#3B312C]">
              空間規劃
            </h1>
            <p className="text-xs text-[#7A675B]">
              上區塊自動試算室內機建議開孔尺寸；下區塊以灰色棋盤格配置室外機排列與間距。
            </p>
          </div>
        </div>

        {/* 快速補充機型加入規劃 */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={quickAddProductId}
            onChange={(e) => setQuickAddProductId(e.target.value)}
            aria-label="選擇要加入空間規劃的機型"
            className="max-w-[230px] rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-xs font-semibold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} · {getProductMainName(p.name)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddLocalUnit}
            className="inline-flex items-center gap-1 rounded-xl border border-[#C68934] bg-[#F6BE6B] px-3 py-1.5 text-xs font-bold text-[#3B312C] transition-colors hover:bg-[#F3AF48]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>加入規劃</span>
          </button>
        </div>
      </div>

      {/* 上區塊：室內機名稱及建議開孔尺寸 */}
      <section aria-label="室內機名稱及建議開孔尺寸" className="bento-card p-5">
        <div className="mb-4 flex flex-col gap-2 border-b border-[#E8D8C8] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#4A3F3A] text-[#F6BE6B]">
              <Ruler className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-[#3B312C]">
                上區塊 · 室內機名稱及建議開孔尺寸
              </h2>
              <p className="text-xs text-[#7A675B]">
                建議開孔寬度公式：室內機寬度(cm) − 10 公分；若為單數則總數 + 1，一律顯示偶數。
              </p>
            </div>
          </div>
          <span className="font-mono-tabular text-xs font-bold text-[#6E5C52]">
            已列入 {units.length} 台設備
          </span>
        </div>

        {units.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#DFCBB9] bg-[#F6E9DA]/60 px-6 py-10 text-center">
            <p className="text-sm font-bold text-[#3B312C]">目前尚未加入任何空調機型</p>
            <p className="mt-1 text-xs text-[#7A675B]">
              可返回「品牌價格查詢」勾選機型，或直接從右上方選單點選「加入規劃」。
            </p>
            <button
              type="button"
              onClick={onBackToPriceLookup}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-[#3B312C] bg-[#F6BE6B] px-4 py-2 text-xs font-bold text-[#3B312C] hover:bg-[#F3AF48]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>前往品牌價格查詢勾選</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[#D2BEB0] bg-[#F5E6D5] text-xs font-bold text-[#4A3F3A]">
                  <th className="w-12 px-3 py-2.5 text-center">#</th>
                  <th className="px-4 py-2.5">室內機名稱</th>
                  <th className="w-48 px-3 py-2.5">原機寬×高×深</th>
                  <th className="w-56 px-3 py-2.5">建議開孔尺寸 (偶數寬度)</th>
                  <th className="w-40 px-3 py-2.5">對應室外機</th>
                  <th className="w-16 px-3 py-2.5 text-center">移除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAD9C8] text-sm">
                {units.map((unit, idx) => {
                  const theme = getBrandTheme(unit.brand);
                  return (
                    <tr key={unit.uid} className="hover:bg-[#F6E9DA]/50">
                      <td className="font-mono-tabular px-3 py-3 text-center text-xs font-bold text-[#7A675B]">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${theme.badgeBg} ${theme.badgeText}`}
                          >
                            {unit.brand}
                          </span>
                          <span className="rounded-md bg-[#F2E2D1] px-1.5 py-0.5 text-[11px] font-semibold text-[#5C4F49]">
                            {unit.modelType}
                          </span>
                        </div>
                        <div className="mt-1 font-extrabold text-[#3B312C]">
                          {unit.indoorName}
                        </div>
                        {unit.fullName !== unit.indoorName && (
                          <div className="text-[11px] text-[#7A675B]">{unit.fullName}</div>
                        )}
                      </td>
                      <td className="font-mono-tabular px-3 py-3 text-xs text-[#5C4F49]">
                        <div className="font-semibold">{unit.indoorDimText}</div>
                        {unit.indoorDimCm && (
                          <div className="mt-0.5 text-[11px] text-[#8E7A6E]">
                            約 {unit.indoorDimCm.widthCm} × {unit.indoorDimCm.heightCm} ×{' '}
                            {unit.indoorDimCm.depthCm} cm
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {unit.openingWidthCm !== null && unit.indoorWidthBaseCm !== null ? (
                          <div className="inline-flex flex-col">
                            <span className="font-mono-tabular inline-flex items-baseline gap-1 text-base font-extrabold text-[#B35E14]">
                              {unit.openingWidthCm} 公分
                            </span>
                            <span className="font-mono-tabular text-[11px] text-[#7A675B]">
                              {unit.indoorWidthBaseCm} − 10 ={' '}
                              {unit.indoorWidthBaseCm - 10}
                              {unit.openingWasOddAdjusted
                                ? ` (單數+1 → ${unit.openingWidthCm})`
                                : ' (偶數)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#8E7A6E]">無內機尺寸資料</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {unit.outdoorDimCm ? (
                          <div>
                            <div className="font-bold text-[#3B312C]">
                              {unit.outdoorName}
                            </div>
                            <div className="font-mono-tabular text-[11px] text-[#7A675B]">
                              {unit.outdoorDimCm.widthCm} × {unit.outdoorDimCm.heightCm} cm
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#8E7A6E]">無獨立室外機尺寸</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(unit.uid)}
                          title="從本次空間規劃移除"
                          className="rounded-lg p-1.5 text-[#8E7A6E] transition-colors hover:bg-[#FDECE7] hover:text-[#A43B24]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 下區塊：灰色棋盤底格與 4 個可編輯方塊 */}
      <section aria-label="室外機棋盤空間規劃" className="bento-card mt-5 p-5">
        <div className="mb-4 flex flex-col gap-3 border-b border-[#E8D8C8] pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#4A3F3A] text-[#F6BE6B]">
              <Grid3X3 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-[#3B312C]">
                下區塊 · 室外機配置棋盤規劃圖
              </h2>
              <p className="text-xs text-[#7A675B]">
                每格預設 {safeUnitCm} 公分 · 拖曳矩形可自由移動位置，點選兩個矩形即可直接交換型號。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-3 py-1.5 text-xs font-bold text-[#3B312C]">
              <input
                type="checkbox"
                checked={snapToUnit}
                onChange={(e) => setSnapToUnit(e.target.checked)}
                className="accent-[#4A3F3A]"
              />
              <span>拖曳吸附格線 ({safeUnitCm}cm)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* 旁邊顯示 4 個可編輯方塊 + 自動運算數據 */}
          <aside className="space-y-4 lg:col-span-4 xl:col-span-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {/* 1. 預設單位 */}
              <div className="rounded-xl border-2 border-[#DFCBB9] bg-[#F6E9DA] p-3">
                <label
                  htmlFor="space-unit-cm"
                  className="block text-xs font-extrabold text-[#3B312C]"
                >
                  1. 預設單位 (cm/格)
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="space-unit-cm"
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={unitCm}
                    onChange={(e) => setUnitCm(Math.max(1, Number(e.target.value) || 5))}
                    className="font-mono-tabular w-full rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2.5 py-1.5 text-sm font-extrabold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                  />
                  <span className="shrink-0 text-xs font-bold text-[#6E5C52]">公分</span>
                </div>
              </div>

              {/* 2. 總寬 */}
              <div className="rounded-xl border-2 border-[#DFCBB9] bg-[#F6E9DA] p-3">
                <div className="flex items-center justify-between gap-1">
                  <label
                    htmlFor="space-total-width"
                    className="block text-xs font-extrabold text-[#3B312C]"
                  >
                    2. 總寬 (cm)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      isCustomTotalWRef.current = false;
                      setTotalWidthCm(defaultBoardSize.defaultTotalWidthCm);
                      setTotalWidthInput(String(defaultBoardSize.defaultTotalWidthCm));
                      setHasManualDrag(false);
                    }}
                    className="text-[10px] font-bold text-[#9C5B18] hover:underline"
                  >
                    預設 {defaultBoardSize.defaultTotalWidthCm}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="space-total-width"
                    type="number"
                    min={10}
                    max={3000}
                    step={5}
                    value={totalWidthInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTotalWidthInput(raw);
                      const num = Number(raw);
                      if (raw.trim() !== '' && !Number.isNaN(num) && num >= 10) {
                        isCustomTotalWRef.current = true;
                        setTotalWidthCm(num);
                        setHasManualDrag(false);
                      }
                    }}
                    onBlur={() => {
                      const num = Number(totalWidthInput);
                      if (totalWidthInput.trim() === '' || Number.isNaN(num) || num < 10) {
                        setTotalWidthInput(String(safeTotalW));
                      }
                    }}
                    className="font-mono-tabular w-full rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2.5 py-1.5 text-sm font-extrabold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                  />
                  <span className="font-mono-tabular shrink-0 text-xs font-bold text-[#6E5C52]">
                    {gridColsCount}格
                  </span>
                </div>
              </div>

              {/* 3. 總高 */}
              <div className="rounded-xl border-2 border-[#DFCBB9] bg-[#F6E9DA] p-3">
                <div className="flex items-center justify-between gap-1">
                  <label
                    htmlFor="space-total-height"
                    className="block text-xs font-extrabold text-[#3B312C]"
                  >
                    3. 總高 (cm)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      isCustomTotalHRef.current = false;
                      setTotalHeightCm(defaultBoardSize.defaultTotalHeightCm);
                      setTotalHeightInput(String(defaultBoardSize.defaultTotalHeightCm));
                      setHasManualDrag(false);
                    }}
                    className="text-[10px] font-bold text-[#9C5B18] hover:underline"
                  >
                    預設 {defaultBoardSize.defaultTotalHeightCm}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="space-total-height"
                    type="number"
                    min={15}
                    max={3000}
                    step={5}
                    value={totalHeightInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTotalHeightInput(raw);
                      const num = Number(raw);
                      if (raw.trim() !== '' && !Number.isNaN(num) && num >= 15) {
                        isCustomTotalHRef.current = true;
                        setTotalHeightCm(num);
                        setHasManualDrag(false);
                      }
                    }}
                    onBlur={() => {
                      const num = Number(totalHeightInput);
                      if (totalHeightInput.trim() === '' || Number.isNaN(num) || num < 15) {
                        setTotalHeightInput(String(safeTotalH));
                      }
                    }}
                    className="font-mono-tabular w-full rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2.5 py-1.5 text-sm font-extrabold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                  />
                  <span className="font-mono-tabular shrink-0 text-xs font-bold text-[#6E5C52]">
                    {gridRowsCount}格
                  </span>
                </div>
              </div>

              {/* 4. 排列方式 */}
              <div className="rounded-xl border-2 border-[#DFCBB9] bg-[#F6E9DA] p-3">
                <label
                  htmlFor="space-arrangement"
                  className="block text-xs font-extrabold text-[#3B312C]"
                >
                  4. 排列方式
                </label>
                <select
                  id="space-arrangement"
                  value={arrangement}
                  onChange={(e) =>
                    setArrangement(e.target.value as SpaceArrangementMode)
                  }
                  className="mt-1.5 w-full rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2.5 py-1.5 text-sm font-extrabold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                >
                  {ARRANGEMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 自動運算間距數據 */}
            <div className="rounded-xl border border-[#DFCBB9] bg-[#FFFDF9] p-3.5 text-xs">
              <div className="border-b border-[#E8D8C8] pb-2 font-extrabold text-[#3B312C]">
                間距換算結果（
                {autoComputed.metrics.verticalAnchor === 'top'
                  ? '靠左上對齊'
                  : '靠左下對齊'}
                ）
              </div>
              <dl className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[#6E5C52]">
                    左側 /{' '}
                    {autoComputed.metrics.verticalAnchor === 'top' ? '上方' : '下方'}
                    預設距離
                  </dt>
                  <dd className="font-mono-tabular font-extrabold text-[#3B312C]">
                    左 {autoComputed.metrics.leftOffsetCm} /{' '}
                    {autoComputed.metrics.verticalAnchor === 'top' ? '上' : '下'}{' '}
                    {autoComputed.metrics.verticalOffsetCm} cm
                  </dd>
                </div>

                <div className="rounded-lg bg-[#F6E9DA]/80 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-bold text-[#3B312C]">矩形水平間距</dt>
                    <dd className="font-mono-tabular text-sm font-extrabold text-[#B35E14]">
                      {autoComputed.metrics.horizontalSpacingList.join(' / ')} cm
                    </dd>
                  </div>
                  <div className="font-mono-tabular mt-1 text-[11px] text-[#7A675B]">
                    ({safeTotalW} − {autoComputed.metrics.leftOffsetCm} −{' '}
                    {autoComputed.metrics.horizontalSumWidthCm}) ÷{' '}
                    {autoComputed.metrics.horizontalCount || 1} ={' '}
                    {autoComputed.metrics.horizontalSpacingCm} cm
                  </div>
                </div>

                <div className="rounded-lg bg-[#F6E9DA]/80 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-bold text-[#3B312C]">矩形垂直間距</dt>
                    <dd className="font-mono-tabular text-sm font-extrabold text-[#B35E14]">
                      {autoComputed.metrics.verticalSpacingList.join(' / ')} cm
                    </dd>
                  </div>
                  <div className="font-mono-tabular mt-1 text-[11px] text-[#7A675B]">
                    ({safeTotalH} − {autoComputed.metrics.verticalOffsetCm} −{' '}
                    {autoComputed.metrics.verticalSumHeightCm}) ÷{' '}
                    {autoComputed.metrics.verticalCount || 1} ={' '}
                    {autoComputed.metrics.verticalSpacingCm} cm
                  </div>
                </div>
              </dl>
            </div>

            {/* 座標顯示欄位：即時顯示每個矩形 4 個頂點座標 */}
            <div className="rounded-xl border border-[#DFCBB9] bg-[#FFFDF9] p-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-[#E8D8C8] pb-2">
                <span className="font-extrabold text-[#3B312C]">座標 (矩形 4 點即時座標)</span>
                <span className="text-[10px] font-bold text-[#7A675B]">
                  {autoComputed.metrics.verticalAnchor === 'top'
                    ? '原點：左上 (cm)'
                    : '原點：左下 (cm)'}
                </span>
              </div>

              {placedRects.length === 0 ? (
                <p className="mt-2.5 text-[11px] text-[#8E7A6E]">
                  尚無矩形，加入設備後即會即時顯示 4 個頂點座標。
                </p>
              ) : (
                <div className="mt-2.5 space-y-2">
                  {placedRects.map((rect, idx) => {
                    const fmt = (n: number) => Number(n.toFixed(1));
                    const totalRectH = rect.heightCm + rect.riserHeightCm;
                    const xLeft = fmt(rect.xCm);
                    const xRight = fmt(rect.xCm + rect.widthCm);
                    const isTopOrigin = autoComputed.metrics.verticalAnchor === 'top';
                    const yTop = isTopOrigin
                      ? fmt(safeTotalH - (rect.bottomCm + totalRectH))
                      : fmt(rect.bottomCm + totalRectH);
                    const yBottom = isTopOrigin
                      ? fmt(safeTotalH - rect.bottomCm)
                      : fmt(rect.bottomCm);
                    const isActive =
                      selectedRectUid === rect.uid || draggingUid === rect.uid;

                    return (
                      <div
                        key={`coord-${rect.uid}`}
                        onClick={() =>
                          setSelectedRectUid((prev) =>
                            prev === rect.uid ? null : rect.uid
                          )
                        }
                        className={`cursor-pointer rounded-lg border p-2 transition-colors ${
                          isActive
                            ? 'border-[#D9822B] bg-[#FDF1DB]'
                            : 'border-[#E8D8C8] bg-[#F6E9DA]/50 hover:border-[#CBB5A5]'
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="truncate font-extrabold text-[#3B312C]">
                            #{idx + 1} {rect.outdoorName}
                          </span>
                          <span className="font-mono-tabular shrink-0 text-[10px] font-semibold text-[#7A675B]">
                            {rect.riserHeightCm > 0
                              ? `${rect.widthCm}×${rect.heightCm} + ${rect.widthCm}×${rect.riserHeightCm}`
                              : `${rect.widthCm}×${rect.heightCm}`}
                          </span>
                        </div>
                        <div className="font-mono-tabular grid grid-cols-2 gap-1 text-[11px]">
                          <div className="rounded bg-[#FFFDF9] px-1.5 py-1 text-[#4A3F3A]">
                            <span className="text-[#8E7A6E]">左上 </span>
                            <strong className="text-[#3B312C]">
                              ({xLeft}, {yTop})
                            </strong>
                          </div>
                          <div className="rounded bg-[#FFFDF9] px-1.5 py-1 text-[#4A3F3A]">
                            <span className="text-[#8E7A6E]">右上 </span>
                            <strong className="text-[#3B312C]">
                              ({xRight}, {yTop})
                            </strong>
                          </div>
                          <div className="rounded bg-[#FFFDF9] px-1.5 py-1 text-[#4A3F3A]">
                            <span className="text-[#8E7A6E]">左下 </span>
                            <strong className="text-[#3B312C]">
                              ({xLeft}, {yBottom})
                            </strong>
                          </div>
                          <div className="rounded bg-[#FFFDF9] px-1.5 py-1 text-[#4A3F3A]">
                            <span className="text-[#8E7A6E]">右下 </span>
                            <strong className="text-[#3B312C]">
                              ({xRight}, {yBottom})
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* 灰色棋盤底格畫布與可移動矩形 */}
          <div className="lg:col-span-8 xl:col-span-9">
            {/* 點選交換型號提示條 */}
            {selectedRect ? (
              <div className="mb-3 flex flex-col gap-2 rounded-xl border-2 border-[#C68934] bg-[#FDF1DB] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5C3A0E]">
                  <ArrowLeftRight className="h-4 w-4 shrink-0 text-[#B35E14]" />
                  <span>
                    已選取 <strong>{selectedRect.outdoorName}</strong>
                    ：請再點選另一個矩形即可直接互換型號，或從右側更換為其他機型
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedRect.productId}
                    onChange={(e) =>
                      handleReplaceRectModel(selectedRect.uid, e.target.value)
                    }
                    aria-label="更換選取矩形的室外機型號"
                    className="max-w-[200px] rounded-lg border border-[#C68934] bg-[#FFFDF9] px-2 py-1 text-xs font-bold text-[#3B312C] focus:outline-none"
                  >
                    {swappableProducts.map((p) => {
                      const names = splitModelNames(p.name);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.brand} · {names.outdoorName} ({p.outdoorDim})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSelectedRectUid(null)}
                    className="rounded-lg p-1 text-[#7D4B16] hover:bg-[#FAE4BE]"
                    title="取消選取"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DFCBB9] bg-[#F5E6D5]/70 px-3.5 py-2 text-xs text-[#6E5C52]">
                <span>
                  操作說明：按住室外機矩形可拖曳移動；點選兩個矩形可互換型號，或點選單個矩形更換型號。
                </span>
                <span className="font-mono-tabular font-bold text-[#3B312C]">
                  畫布：{safeTotalW} × {safeTotalH} cm（{gridColsCount} × {gridRowsCount} 格）
                </span>
              </div>
            )}

            {(isOverflowing || hasNegativeSpacing) && (
              <div className="mb-3 rounded-xl border border-[#E6B0A3] bg-[#FDECE7] px-3.5 py-2 text-xs font-bold text-[#A43B24]">
                {hasNegativeSpacing
                  ? `注意：目前設定的總寬 (${safeTotalW} cm) 或總高 (${safeTotalH} cm) 小於設備總尺寸與預設邊距，建議調大數值以免矩形重疊。`
                  : `注意：目前部分室外機排列超出設定的「總寬 ${safeTotalW} cm × 總高 ${safeTotalH} cm」範圍，建議調大左側總寬或總高數值。`}
              </div>
            )}

            {/* 棋盤畫布容器 */}
            <div className="overflow-x-auto rounded-2xl border-2 border-[#CBB5A5] bg-[#E2E4E8] p-3 sm:p-5">
              {/* 若為左上對齊（垂直排列），水平刻度顯示於上方 */}
              {autoComputed.metrics.verticalAnchor === 'top' && (
                <div className="relative mb-1.5 ml-9 h-4 min-w-[460px]">
                  {verticalTicks.map((cm) => (
                    <span
                      key={`tx-top-${cm}`}
                      style={{ left: `${(cm / safeTotalW) * 100}%` }}
                      className="font-mono-tabular absolute -translate-x-1/2 text-[10px] font-bold text-slate-600"
                    >
                      {cm}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex min-w-[460px] items-stretch">
                {/* 左側公分刻度 (左上對齊時由上往下；左下對齊時由下往上) */}
                <div className="relative mr-1.5 w-7 shrink-0">
                  {horizontalTicks.map((cm) => (
                    <span
                      key={`ty-${cm}`}
                      style={
                        autoComputed.metrics.verticalAnchor === 'top'
                          ? { top: `${(cm / safeTotalH) * 100}%` }
                          : { bottom: `${(cm / safeTotalH) * 100}%` }
                      }
                      className={`font-mono-tabular absolute right-0 text-[10px] font-bold text-slate-600 ${
                        autoComputed.metrics.verticalAnchor === 'top'
                          ? '-translate-y-1/2'
                          : 'translate-y-1/2'
                      }`}
                    >
                      {cm}
                    </span>
                  ))}
                </div>

                {/* 灰色棋盤本體 */}
                <div
                  ref={boardRef}
                  onClick={() => setSelectedRectUid(null)}
                  style={{ aspectRatio: `${safeTotalW} / ${safeTotalH}` }}
                  className="relative w-full overflow-hidden rounded border-2 border-slate-500 bg-[#E5E7EB] shadow-inner select-none"
                >
                  {/* SVG 灰色棋盤底格 (每格 = safeUnitCm × safeUnitCm) */}
                  <svg
                    viewBox={`0 0 ${safeTotalW} ${safeTotalH}`}
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  >
                    <defs>
                      <pattern
                        id="space-gray-checker"
                        x="0"
                        y={
                          autoComputed.metrics.verticalAnchor === 'top'
                            ? 0
                            : safeTotalH % patternSize
                        }
                        width={patternSize}
                        height={patternSize}
                        patternUnits="userSpaceOnUse"
                      >
                        <rect x="0" y="0" width={safeUnitCm} height={safeUnitCm} fill="#E5E7EB" />
                        <rect
                          x={safeUnitCm}
                          y="0"
                          width={safeUnitCm}
                          height={safeUnitCm}
                          fill="#D1D5DB"
                        />
                        <rect
                          x="0"
                          y={safeUnitCm}
                          width={safeUnitCm}
                          height={safeUnitCm}
                          fill="#D1D5DB"
                        />
                        <rect
                          x={safeUnitCm}
                          y={safeUnitCm}
                          width={safeUnitCm}
                          height={safeUnitCm}
                          fill="#E5E7EB"
                        />
                      </pattern>
                    </defs>
                    <rect
                      x="0"
                      y="0"
                      width={safeTotalW}
                      height={safeTotalH}
                      fill="url(#space-gray-checker)"
                    />
                    {/* 對齊參考線：左側基準垂直線 + 上方基準或下方 15cm 水平線 */}
                    {layoutOptions.leftOffsetCm > 0 &&
                      safeTotalW > layoutOptions.leftOffsetCm && (
                        <line
                          x1={layoutOptions.leftOffsetCm}
                          y1="0"
                          x2={layoutOptions.leftOffsetCm}
                          y2={safeTotalH}
                          stroke="#D9822B"
                          strokeWidth={Math.max(0.8, safeTotalW / 380)}
                          strokeDasharray={`${Math.max(2, safeTotalW / 80)} ${Math.max(
                            2,
                            safeTotalW / 80
                          )}`}
                        />
                      )}
                    {autoComputed.metrics.verticalAnchor === 'top'
                      ? layoutOptions.topOffsetCm > 0 &&
                        safeTotalH > layoutOptions.topOffsetCm && (
                          <line
                            x1="0"
                            y1={layoutOptions.topOffsetCm}
                            x2={safeTotalW}
                            y2={layoutOptions.topOffsetCm}
                            stroke="#D9822B"
                            strokeWidth={Math.max(0.8, safeTotalH / 260)}
                            strokeDasharray={`${Math.max(2, safeTotalW / 80)} ${Math.max(
                              2,
                              safeTotalW / 80
                            )}`}
                          />
                        )
                      : safeTotalH > 15 && (
                          <line
                            x1="0"
                            y1={safeTotalH - 15}
                            x2={safeTotalW}
                            y2={safeTotalH - 15}
                            stroke="#D9822B"
                            strokeWidth={Math.max(0.8, safeTotalH / 260)}
                            strokeDasharray={`${Math.max(2, safeTotalW / 80)} ${Math.max(
                              2,
                              safeTotalW / 80
                            )}`}
                          />
                        )}
                  </svg>

                  {/* 室外機可移動矩形 (若勾選墊高+2則下方合併顯示不同色長條矩形) */}
                  {placedRects.map((rect) => {
                    const isSelected = selectedRectUid === rect.uid;
                    const isDragging = draggingUid === rect.uid;
                    const hasRiser = rect.riserHeightCm > 0;
                    const totalRectH = rect.heightCm + rect.riserHeightCm;
                    const theme = getBrandTheme(rect.brand);

                    return (
                      <div
                        key={rect.uid}
                        onPointerDown={(e) => handleRectPointerDown(e, rect)}
                        onPointerMove={handleRectPointerMove}
                        onPointerUp={(e) => handleRectPointerUp(e, rect)}
                        onPointerCancel={(e) => handleRectPointerUp(e, rect)}
                        onClick={(e) => e.stopPropagation()}
                        title={
                          hasRiser
                            ? `${rect.outdoorName}：寬 ${rect.widthCm} × 高 ${rect.heightCm} + 下方墊高 ${rect.widthCm}×${rect.riserHeightCm} cm`
                            : `${rect.outdoorName}：寬 ${rect.widthCm} × 高 ${rect.heightCm} cm`
                        }
                        style={{
                          left: `${(rect.xCm / safeTotalW) * 100}%`,
                          bottom: `${(rect.bottomCm / safeTotalH) * 100}%`,
                          width: `${(rect.widthCm / safeTotalW) * 100}%`,
                          height: `${(totalRectH / safeTotalH) * 100}%`,
                        }}
                        className={`touch-none absolute flex flex-col overflow-hidden rounded-md border-2 transition-shadow ${
                          isSelected
                            ? 'z-20 border-[#D9822B] ring-4 ring-[#D9822B]/35 shadow-lg'
                            : isDragging
                              ? 'z-30 cursor-grabbing border-[#3B312C] shadow-xl'
                              : 'z-10 cursor-grab border-[#3B312C] shadow-md'
                        }`}
                      >
                        {/* 上方原室外機矩形 (名稱絕對置中，寬顯示於內靠下，高顯示於內靠右) */}
                        <div
                          className={`relative min-h-0 flex-1 transition-colors ${
                            isSelected
                              ? 'bg-[#F6BE6B]/95 text-[#3B312C]'
                              : isDragging
                                ? 'bg-[#4A3F3A]/95 text-[#FFF8EE]'
                                : 'bg-[#4A3F3A]/90 text-[#FFF8EE] hover:bg-[#3B312C]'
                          }`}
                        >
                          {/* 品牌標籤置於左上角，避免影響名稱絕對置中 */}
                          <span
                            className={`pointer-events-none absolute left-1 top-1 rounded px-1 py-0.2 text-[8px] font-bold leading-tight ${
                              isSelected
                                ? 'bg-[#3B312C] text-[#F6BE6B]'
                                : `${theme.badgeBg} ${theme.badgeText}`
                            }`}
                          >
                            {rect.brand}
                          </span>

                          {/* 矩形名稱：水平與垂直絕對置中 */}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
                            <span className="max-w-full truncate text-[11px] font-extrabold leading-tight sm:text-xs">
                              {rect.outdoorName}
                            </span>
                          </div>

                          {/* 寬：顯示於矩形內靠下 */}
                          <div
                            className={`font-mono-tabular pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[10px] font-bold leading-none ${
                              isSelected ? 'text-[#5C3A0E]' : 'text-[#F6BE6B]'
                            }`}
                          >
                            寬 {rect.widthCm} cm
                          </div>

                          {/* 高：顯示於矩形內靠右 */}
                          <div
                            className={`font-mono-tabular pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 flex-col items-end text-[9px] font-bold leading-tight ${
                              isSelected ? 'text-[#5C3A0E]' : 'text-[#F6BE6B]'
                            }`}
                          >
                            <span>高</span>
                            <span>{rect.heightCm}</span>
                          </div>
                        </div>

                        {/* 下方墊高+2 長條矩形 (例如 80×2 cm，不同色合併區分) */}
                        {hasRiser && (
                          <div
                            style={{
                              height: `${(rect.riserHeightCm / totalRectH) * 100}%`,
                              minHeight: '6px',
                            }}
                            className="flex w-full shrink-0 items-center justify-center border-t border-white/85 bg-[#0284C7] px-1 text-[8px] font-extrabold leading-none text-white"
                          >
                            <span className="font-mono-tabular truncate">
                              {rect.widthCm}×{rect.riserHeightCm} 墊高
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {placedRects.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                      <div className="rounded-xl border border-[#CBB5A5] bg-[#FFF8EE]/95 px-4 py-3 text-center shadow">
                        <p className="text-xs font-bold text-[#3B312C]">
                          棋盤格尚無可放置的室外機矩形
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#7A675B]">
                          請先選擇附有外機尺寸的機型，即會依「高/寬 ÷ 預設單位」自動繪製。
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 若為左下對齊，水平刻度顯示於下方 */}
              {autoComputed.metrics.verticalAnchor === 'bottom' && (
                <div className="relative ml-9 mt-1.5 h-4 min-w-[460px]">
                  {verticalTicks.map((cm) => (
                    <span
                      key={`tx-bot-${cm}`}
                      style={{ left: `${(cm / safeTotalW) * 100}%` }}
                      className="font-mono-tabular absolute -translate-x-1/2 text-[10px] font-bold text-slate-600"
                    >
                      {cm}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 畫布下方顯示兩個方塊：1. 基礎調整、2. 墊高+2 */}
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* 1. 基礎調整 */}
              <div className="rounded-xl border-2 border-[#DFCBB9] bg-[#F6E9DA] p-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#DFCBB9] pb-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#3B312C]">
                      1. 基礎調整
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[#7A675B]">
                      調整水平左側與垂直上方基準邊距 (cm)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLeftOffsetCm(10);
                      setTopOffsetCm(10);
                      setLeftOffsetInput('10');
                      setTopOffsetInput('10');
                      setHasManualDrag(false);
                    }}
                    className="shrink-0 text-[10px] font-bold text-[#9C5B18] hover:underline"
                  >
                    預設 10 / 10
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="space-base-left-offset"
                      className="block text-[11px] font-bold text-[#4A3F3A]"
                    >
                      水平左側預設 (cm)
                    </label>
                    <input
                      id="space-base-left-offset"
                      type="number"
                      min={0}
                      max={300}
                      step={1}
                      value={leftOffsetInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setLeftOffsetInput(raw);
                        const num = Number(raw);
                        if (raw.trim() !== '' && !Number.isNaN(num) && num >= 0) {
                          setLeftOffsetCm(num);
                          setHasManualDrag(false);
                        }
                      }}
                      onBlur={() => {
                        const num = Number(leftOffsetInput);
                        if (leftOffsetInput.trim() === '' || Number.isNaN(num) || num < 0) {
                          setLeftOffsetInput(String(leftOffsetCm));
                        }
                      }}
                      className="font-mono-tabular mt-1 w-full rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2.5 py-1.5 text-sm font-extrabold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="space-base-top-offset"
                      className="block text-[11px] font-bold text-[#4A3F3A]"
                    >
                      垂直上方預設 (cm)
                    </label>
                    <input
                      id="space-base-top-offset"
                      type="number"
                      min={0}
                      max={300}
                      step={1}
                      value={topOffsetInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setTopOffsetInput(raw);
                        const num = Number(raw);
                        if (raw.trim() !== '' && !Number.isNaN(num) && num >= 0) {
                          setTopOffsetCm(num);
                          setHasManualDrag(false);
                        }
                      }}
                      onBlur={() => {
                        const num = Number(topOffsetInput);
                        if (topOffsetInput.trim() === '' || Number.isNaN(num) || num < 0) {
                          setTopOffsetInput(String(topOffsetCm));
                        }
                      }}
                      className="font-mono-tabular mt-1 w-full rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2.5 py-1.5 text-sm font-extrabold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. 墊高+2 */}
              <label
                htmlFor="space-riser-pad-toggle"
                className={`flex cursor-pointer flex-col justify-between rounded-xl border-2 p-3.5 transition-colors ${
                  hasRiserPad
                    ? 'border-[#0284C7] bg-[#E0F2FE]'
                    : 'border-[#DFCBB9] bg-[#F6E9DA] hover:border-[#CBB5A5]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      id="space-riser-pad-toggle"
                      type="checkbox"
                      checked={hasRiserPad}
                      onChange={(e) => {
                        setHasRiserPad(e.target.checked);
                        setHasManualDrag(false);
                      }}
                      className="h-4 w-4 rounded accent-[#0284C7]"
                    />
                    <span className="text-sm font-extrabold text-[#3B312C]">
                      2. 墊高+2
                    </span>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                      hasRiserPad
                        ? 'bg-[#0284C7] text-white'
                        : 'bg-[#EAD9C8] text-[#6E5C52]'
                    }`}
                  >
                    {hasRiserPad ? '已合併 +2 cm' : '未啟用'}
                  </span>
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-[#5C4F49]">
                  勾選後，於矩形下方額外新增「寬 × 2 cm」長條矩形並與原矩形合併（如 80×60 合併下方 80×2，合計 80×62 cm）。
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#4A3F3A]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-3.5 rounded-sm bg-[#4A3F3A]" />
                    <span>原室外機本體</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-3.5 rounded-sm bg-[#0284C7]" />
                    <span>下方墊高長條 (寬×2 cm)</span>
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
