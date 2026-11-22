import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  DollarSign,
  ImageDown,
  Layers,
  Minus,
  Plus,
  Trash2,
  Ungroup,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { ConstructionLineItem, QuotationDraft, QuoteCartItem } from '../types/hvac';
import { getEffectiveUnitPrice } from '../utils/quoteHelpers';
import ConfirmDialog from './ConfirmDialog';
import { PIPE_WIRE_CATALOG } from '../data/pipeWireCatalog';
import PipeWireCalculatorModal from './PipeWireCalculatorModal';

interface QuotationBuilderProps {
  quoteItems: QuoteCartItem[];
  draft: QuotationDraft;
  onUpdateDraft: (nextDraft: QuotationDraft) => void;
  onChangePricePercent: (nextPercent: number) => void;
  onUpdateQuoteItem: (lineId: string, patch: Partial<QuoteCartItem>) => void;
  onRemoveQuoteItem: (lineId: string) => void;
  onDuplicateQuoteItem: (lineId: string) => void;
  onMoveQuoteItem: (lineId: string, direction: 'up' | 'down') => void;
  onMergeQuoteItem: (lineId: string, direction: 'up' | 'down') => void;
  onUnmergeQuoteItem: (lineId: string) => void;
  onBackAndKeep: () => void;
  onClearAndBack: () => void;
}

const BRAND_ENGLISH_MAP: Record<string, string> = {
  日立: 'Hitachi',
  國際: 'Panasonic',
  大金: 'Daikin',
  金鼎: 'JinDing',
  三菱重工: 'MHI',
  富士通: 'Fujitsu',
  東元: 'TECO',
};

const CONSTRUCTION_PRESET_ITEMS = [
  '銅管含電源線&控制線',
  '室外機安裝架',
  '牆體洗孔',
  '分離式安裝工資',
  '保養工資',
  '移機工資',
  '美化管槽',
  '外牆高空作業',
  '切溝配管含水泥回填',
  '排水器',
  '其他',
] as const;

function extractPowerLabel(capacityKw: string): string {
  const match = capacityKw.match(/[\d.]+\s*kW/i);
  return match ? match[0].toUpperCase().replace(/\s+/g, '') : capacityKw || '—';
}

function extractModelCode(name: string): string {
  const idx = name.indexOf('(');
  return idx > 0 ? name.slice(0, idx).trim() : name;
}

function getSubItems(item: QuoteCartItem): QuoteCartItem[] {
  return item.mergedItems && item.mergedItems.length > 0 ? item.mergedItems : [item];
}

export default function QuotationBuilder({
  quoteItems,
  draft,
  onUpdateDraft,
  onChangePricePercent,
  onUpdateQuoteItem,
  onRemoveQuoteItem,
  onDuplicateQuoteItem,
  onMoveQuoteItem,
  onMergeQuoteItem,
  onUnmergeQuoteItem,
  onBackAndKeep,
  onClearAndBack,
}: QuotationBuilderProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const pricePercent = typeof draft.pricePercent === 'number' ? draft.pricePercent : 100;
  const [percentInput, setPercentInput] = useState<string>(String(pricePercent));

  // Track which row currently has the "$" 調整價格 box open & its typed amount
  const [adjustingLineId, setAdjustingLineId] = useState<string | null>(null);
  const [adjustAmountInput, setAdjustAmountInput] = useState<string>('');
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const effectiveUnitPrice = (item: QuoteCartItem) =>
    getEffectiveUnitPrice(item, pricePercent);

  const openPriceAdjustBox = (lineId: string) => {
    if (adjustingLineId === lineId) {
      setAdjustingLineId(null);
      setAdjustAmountInput('');
    } else {
      setAdjustingLineId(lineId);
      setAdjustAmountInput('');
    }
  };

  const applyPriceAdjust = (item: QuoteCartItem) => {
    const parsed = Number(adjustAmountInput);
    if (!Number.isNaN(parsed) && parsed !== 0) {
      const nextDelta = (item.priceDelta ?? 0) + parsed;
      onUpdateQuoteItem(item.lineId, { priceDelta: nextDelta });
    }
    setAdjustingLineId(null);
    setAdjustAmountInput('');
  };

  const resetPriceDelta = (item: QuoteCartItem) => {
    onUpdateQuoteItem(item.lineId, { priceDelta: 0 });
    setAdjustingLineId(null);
    setAdjustAmountInput('');
  };

  // Group selected equipment by brand while preserving insertion order
  const brandGroups = useMemo(() => {
    const groups: { brand: string; items: QuoteCartItem[] }[] = [];
    const map = new Map<string, QuoteCartItem[]>();
    quoteItems.forEach((item) => {
      const b = item.product.brand;
      if (!map.has(b)) {
        const arr: QuoteCartItem[] = [];
        map.set(b, arr);
        groups.push({ brand: b, items: arr });
      }
      map.get(b)!.push(item);
    });
    return groups;
  }, [quoteItems]);

  const equipmentTotal = useMemo(() => {
    return quoteItems.reduce((sum, item) => {
      const unit = getEffectiveUnitPrice(item, pricePercent);
      return sum + unit * item.quantity;
    }, 0);
  }, [quoteItems, pricePercent]);

  const constructionSubtotal = useMemo(() => {
    return draft.constructionItems.reduce((sum, row) => {
      const q = Number(row.quantity) || 0;
      const p = Number(row.unitPrice) || 0;
      return sum + q * p;
    }, 0);
  }, [draft.constructionItems]);

  // 設備金額含稅、施工金額外加5%
  const constructionTotalWithTax = Math.round(constructionSubtotal * 1.05);
  const grandTotal = equipmentTotal + constructionTotalWithTax;
  const depositAmount = equipmentTotal;
  const balanceDue = constructionTotalWithTax;

  const updateDraftField = <K extends keyof QuotationDraft>(key: K, value: QuotationDraft[K]) => {
    onUpdateDraft({ ...draft, [key]: value });
  };

  const addConstructionRow = () => {
    const nextRow: ConstructionLineItem = {
      id: `const-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      spec: '',
      quantity: 1,
      unitPrice: '',
      isCustomName: false,
    };
    updateDraftField('constructionItems', [...draft.constructionItems, nextRow]);
  };

  const handleSelectConstructionPreset = (id: string, selectedValue: string) => {
    if (selectedValue === '其他') {
      updateConstructionRow(id, { name: '其他', isCustomName: true });
    } else {
      updateConstructionRow(id, { name: selectedValue, isCustomName: false });
    }
  };

  const updateConstructionRow = (id: string, patch: Partial<ConstructionLineItem>) => {
    updateDraftField(
      'constructionItems',
      draft.constructionItems.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const removeConstructionRow = (id: string) => {
    updateDraftField(
      'constructionItems',
      draft.constructionItems.filter((row) => row.id !== id)
    );
  };

  const handleCalculatorConfirm = (calculatedItems: ConstructionLineItem[]) => {
    const calcKeys = new Set<string>(PIPE_WIRE_CATALOG.map((s) => s.key));
    const manualRows = draft.constructionItems.filter(
      (row) => !row.sourceKey || !calcKeys.has(row.sourceKey)
    );
    updateDraftField('constructionItems', [...calculatedItems, ...manualRows]);
  };

  const minConstructionBlankRows = Math.max(0, 7 - draft.constructionItems.length);

  // Export crisp high-DPI JPG quotation matching the reference layout (NO edit buttons)
  const handleExportImage = () => {
    const scale = 2;
    const width = 1040;
    const padX = 48;
    const contentW = width - padX * 2;

    const custRowH = 38;
    const equipHeaderH = 44;
    const equipColH = 38;
    const equipSubLineH = 40;
    const equipGap = 24;

    const getExportRowHeight = (item: QuoteCartItem) => {
      const subs = getSubItems(item);
      return subs.length <= 1 ? 58 : subs.length * equipSubLineH + 18;
    };

    const equipBlocksHeight = brandGroups.reduce((acc, g) => {
      const rowsH = g.items.reduce((rAcc, item) => rAcc + getExportRowHeight(item), 0);
      return acc + equipHeaderH + equipColH + rowsH + equipGap;
    }, 0);

    const exportConstRows = draft.constructionItems.filter(
      (r) => r.name.trim() !== '' || r.spec.trim() !== '' || (Number(r.unitPrice) || 0) > 0
    );
    const constRowsCount = Math.max(8, exportConstRows.length);
    const constHeaderH = 44;
    const constColH = 36;
    const constRowH = 34;
    const summaryH = 126;

    const topSectionH = 96 + custRowH * 4 + 28;
    const totalHeight =
      topSectionH +
      equipBlocksHeight +
      constHeaderH +
      constColH +
      constRowsCount * constRowH +
      summaryH +
      56;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = totalHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    // Pure white paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, totalHeight);

    // Title: 冷氣工程估價單
    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 30px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('冷氣工程估價單', width / 2, 56);
    ctx.textAlign = 'left';

    // Customer Info 4-row table
    let y = 86;
    const custRows = [
      { label: '顧客姓名：', val: draft.customerName || '' },
      { label: '顧客地址：', val: draft.customerAddress || '' },
      { label: '顧客電話：', val: draft.customerPhone || '' },
      { label: '估價日期：', val: draft.quoteDate || '' },
    ];

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#0F172A';
    custRows.forEach((row) => {
      ctx.strokeRect(padX, y, contentW, custRowH);
      ctx.fillStyle = '#0F172A';
      ctx.font = '15px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(row.label, padX + 14, y + 24);
      ctx.fillStyle = '#1E293B';
      ctx.fillText(row.val, padX + 106, y + 24);
      y += custRowH;
    });

    y += 28;

    // Equipment tables grouped by brand
    const eqCols = [
      { label: '位置', w: 105 },
      { label: '機型', w: 325 },
      { label: '功率(KW)', w: 105 },
      { label: '單價', w: 105 },
      { label: '數量', w: 80 },
      { label: '價錢', w: 115 },
      { label: '備註', w: contentW - (105 + 325 + 105 + 105 + 80 + 115) },
    ];

    brandGroups.forEach((group) => {
      const eng = BRAND_ENGLISH_MAP[group.brand];
      const titleText = eng
        ? `${group.brand} (${eng})系列空調設備`
        : `${group.brand} 系列空調設備`;

      // Brand Header Row
      ctx.strokeStyle = '#0F172A';
      ctx.strokeRect(padX, y, contentW, equipHeaderH);
      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 20px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(titleText, padX + contentW / 2, y + 29);
      ctx.textAlign = 'left';
      y += equipHeaderH;

      // Column Headers
      let cx = padX;
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      eqCols.forEach((col) => {
        ctx.strokeRect(cx, y, col.w, equipColH);
        ctx.textAlign = 'center';
        ctx.fillText(col.label, cx + col.w / 2, y + 24);
        cx += col.w;
      });
      ctx.textAlign = 'left';
      y += equipColH;

      // Equipment Rows (supports single & merged multi-line models, zero edit buttons)
      group.items.forEach((item) => {
        const subItems = getSubItems(item);
        const rowH = getExportRowHeight(item);
        const unitPrice = effectiveUnitPrice(item);
        const lineTotal = unitPrice * item.quantity;
        const midY = y + rowH / 2 + 5;

        let rx = padX;
        eqCols.forEach((col, idx) => {
          ctx.strokeRect(rx, y, col.w, rowH);
          ctx.textAlign = 'center';

          if (idx === 0) {
            ctx.fillStyle = '#1E293B';
            ctx.font = '14px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
            ctx.fillText(item.location || '', rx + col.w / 2, midY);
          } else if (idx === 1) {
            const blockTop = y + (rowH - subItems.length * equipSubLineH) / 2;
            subItems.forEach((sub, sIdx) => {
              const sy = blockTop + sIdx * equipSubLineH;
              const specLine = `${sub.product.brand} - ${sub.product.modelType}型 - ${sub.product.inverterType} - ${sub.product.climateMode}`;
              const modelCode = extractModelCode(sub.product.name);

              if (sIdx === 0) {
                ctx.fillStyle = '#64748B';
                ctx.font = '11px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
                ctx.fillText(specLine, rx + col.w / 2, sy + 15);
              }
              ctx.fillStyle = '#0F172A';
              ctx.font = 'bold 14px "JetBrains Mono", "Noto Sans TC", sans-serif';
              ctx.fillText(modelCode, rx + col.w / 2, sy + 34);
            });
          } else if (idx === 2) {
            const blockTop = y + (rowH - subItems.length * equipSubLineH) / 2;
            subItems.forEach((sub, sIdx) => {
              const sy = blockTop + sIdx * equipSubLineH;
              const powerStr = extractPowerLabel(sub.product.capacityKw);
              ctx.fillStyle = '#0F172A';
              ctx.font = '14px "JetBrains Mono", sans-serif';
              ctx.fillText(powerStr, rx + col.w / 2, sy + 26);
            });
          } else if (idx === 3) {
            ctx.fillStyle = '#0F172A';
            ctx.font = '14px "JetBrains Mono", sans-serif';
            ctx.fillText(unitPrice.toLocaleString(), rx + col.w / 2, midY);
          } else if (idx === 4) {
            ctx.fillStyle = '#0F172A';
            ctx.font = '14px "JetBrains Mono", sans-serif';
            ctx.fillText(String(item.quantity), rx + col.w / 2, midY);
          } else if (idx === 5) {
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 14px "JetBrains Mono", sans-serif';
            ctx.fillText(lineTotal.toLocaleString(), rx + col.w / 2, midY);
          } else if (idx === 6) {
            ctx.fillStyle = '#475569';
            ctx.font = '13px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
            ctx.fillText(item.remark || '', rx + col.w / 2, midY);
          }
          rx += col.w;
        });
        ctx.textAlign = 'left';
        y += rowH;
      });

      y += equipGap;
    });

    // Construction & Materials Table
    ctx.strokeStyle = '#0F172A';
    ctx.strokeRect(padX, y, contentW, constHeaderH);
    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 20px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('施工暨材料明細列表', padX + contentW / 2, y + 29);
    ctx.textAlign = 'left';
    y += constHeaderH;

    const cCols = [
      { label: '項目', w: 430 },
      { label: '規格', w: 140 },
      { label: '數量', w: 110 },
      { label: '單價', w: 130 },
      { label: '價錢', w: contentW - (430 + 140 + 110 + 130) },
    ];

    let cx = padX;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    cCols.forEach((col) => {
      ctx.strokeRect(cx, y, col.w, constColH);
      ctx.textAlign = 'center';
      ctx.fillText(col.label, cx + col.w / 2, y + 23);
      cx += col.w;
    });
    ctx.textAlign = 'left';
    y += constColH;

    for (let i = 0; i < constRowsCount; i++) {
      const row = exportConstRows[i];
      let rx = padX;
      cCols.forEach((col, idx) => {
        ctx.strokeRect(rx, y, col.w, constRowH);
        if (row) {
          const q = Number(row.quantity) || 0;
          const p = Number(row.unitPrice) || 0;
          const total = q * p;
          ctx.fillStyle = '#0F172A';
          if (idx === 0) {
            ctx.font = '14px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(row.name || '', rx + 14, y + 22);
          } else {
            ctx.font = '14px "JetBrains Mono", "Noto Sans TC", sans-serif';
            ctx.textAlign = 'center';
            const val =
              idx === 1
                ? row.spec
                : idx === 2
                ? row.quantity !== ''
                  ? String(row.quantity)
                  : ''
                : idx === 3
                ? row.unitPrice !== ''
                  ? Number(row.unitPrice).toLocaleString()
                  : ''
                : total > 0
                ? total.toLocaleString()
                : '';
            ctx.fillText(val, rx + col.w / 2, y + 22);
          }
        }
        rx += col.w;
      });
      ctx.textAlign = 'left';
      y += constRowH;
    }

    // Bottom Summary Block
    const leftBoxW = cCols[0].w;
    const midBoxW = cCols[1].w + cCols[2].w;
    const rightBoxW = cCols[3].w + cCols[4].w;
    const sumRowH = summaryH / 3;

    // Left note box
    ctx.strokeRect(padX, y, leftBoxW, summaryH);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 15px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(`◎ 訂金為設備款： ${depositAmount.toLocaleString()}`, padX + 20, y + 38);
    ctx.fillText(`◎ 完工驗收後尾款： ${balanceDue.toLocaleString()}`, padX + 20, y + 70);
    ctx.fillStyle = '#334155';
    ctx.font = '13px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('* 設備金額含稅、施工金額外加5%', padX + 20, y + 104);

    // Right 3 summary rows
    const sumRows = [
      { label: '施工總價', val: constructionTotalWithTax.toLocaleString(), isRed: false },
      { label: '設備總價', val: equipmentTotal.toLocaleString(), isRed: false },
      { label: '完工總價', val: grandTotal.toLocaleString(), isRed: true },
    ];

    sumRows.forEach((sRow, idx) => {
      const sy = y + idx * sumRowH;
      ctx.strokeRect(padX + leftBoxW, sy, midBoxW, sumRowH);
      ctx.strokeRect(padX + leftBoxW + midBoxW, sy, rightBoxW, sumRowH);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(sRow.label, padX + leftBoxW + midBoxW / 2, sy + 26);

      ctx.fillStyle = sRow.isRed ? '#DC2626' : '#0F172A';
      ctx.font = 'bold 16px "JetBrains Mono", sans-serif';
      ctx.fillText(sRow.val, padX + leftBoxW + midBoxW + rightBoxW / 2, sy + 27);
    });
    ctx.textAlign = 'left';

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    const customerSlug = draft.customerName.trim() || '未命名客戶';
    a.download = `冷氣工程估價單_${customerSlug}.jpg`;
    a.click();
  };

  return (
    <div className="mx-auto max-w-[1440px] px-3 pb-20 pt-4 sm:px-6 sm:pt-5">
      {/* 上方區塊：固定操作按鈕列（深可可膠囊工具列，手機雙欄好點按，桌機單排不折行） */}
      <section
        aria-label="報價單操作列"
        className="bento-dark sticky top-[57px] z-20 mx-auto max-w-[1040px] p-3 sm:p-3.5"
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {/* 1. 返回並保留 (鼠尾草綠) */}
            <button
              type="button"
              onClick={onBackAndKeep}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#3A614D] bg-[#4E7C64] px-3.5 py-2 text-sm font-bold text-[#FFF8EE] transition-colors hover:bg-[#416A55] active:scale-[0.99] whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>返回並保留</span>
            </button>

            {/* 2. 清除返回 (赤陶紅) */}
            <button
              type="button"
              onClick={() =>
                setPendingConfirm({
                  title: '確認清除並返回',
                  message: '確定要清除整張報價單內容並返回品牌價格查詢頁面嗎？',
                  confirmLabel: '確定清除',
                  onConfirm: () => {
                    setPendingConfirm(null);
                    onClearAndBack();
                  },
                })
              }
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#A84732] bg-[#D16047] px-3.5 py-2 text-sm font-bold text-[#FFF8EE] transition-colors hover:bg-[#BA5039] active:scale-[0.99] whitespace-nowrap"
            >
              <XCircle className="h-4 w-4 shrink-0" />
              <span>清除返回</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            {/* 百分比調整（預設 100%，調整後單價無條件進位至百） */}
            <div
              className="inline-flex min-h-[40px] flex-1 items-center justify-between gap-1.5 rounded-xl border border-[#D4BCAE] bg-[#FFF8EE] px-2.5 py-1.5 text-[#3B312C] sm:flex-none sm:justify-start"
              title="調整設備單價百分比（無條件進位至百位，例：18555 → 18600）"
            >
              <span className="text-xs font-bold text-[#6E5C52] whitespace-nowrap">
                單價比例
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(0, pricePercent - 1);
                    setPercentInput(String(next));
                    onChangePricePercent(next);
                  }}
                  aria-label="減少百分比"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBB5A5] bg-[#F6E9DA] text-[#4A3F3A] transition-colors hover:bg-[#F6BE6B]/40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    aria-label="單價調整百分比"
                    value={percentInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setPercentInput(raw);
                      if (raw !== '') {
                        const parsed = Number(raw);
                        if (!Number.isNaN(parsed) && parsed >= 0) {
                          onChangePricePercent(parsed);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (percentInput.trim() === '' || Number.isNaN(Number(percentInput))) {
                        setPercentInput('100');
                        onChangePricePercent(100);
                      } else {
                        const normalized = Math.max(0, Number(percentInput));
                        setPercentInput(String(normalized));
                        onChangePricePercent(normalized);
                      }
                    }}
                    className="font-mono-tabular w-12 bg-transparent text-center text-base font-bold text-[#3B312C] focus:outline-none sm:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-xs font-bold text-[#7A665B]">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = pricePercent + 1;
                    setPercentInput(String(next));
                    onChangePricePercent(next);
                  }}
                  aria-label="增加百分比"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBB5A5] bg-[#F6E9DA] text-[#4A3F3A] transition-colors hover:bg-[#F6BE6B]/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {pricePercent !== 100 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPercentInput('100');
                      onChangePricePercent(100);
                    }}
                    className="ml-0.5 rounded-md bg-[#F6BE6B]/30 px-1.5 py-1 text-[11px] font-bold text-[#8A4E14] hover:bg-[#F6BE6B]/60 whitespace-nowrap"
                  >
                    重設
                  </button>
                )}
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              {/* 3. 管路計算 (蜜糖金) */}
              <button
                type="button"
                onClick={() => setShowCalculator(true)}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#C68934] bg-[#F6BE6B] px-3.5 py-2 text-sm font-bold text-[#3B312C] transition-colors hover:bg-[#F3AF48] whitespace-nowrap"
              >
                <Zap className="h-4 w-4 text-[#3B312C] shrink-0" />
                <span>管路計算</span>
              </button>

              {/* 4. 匯出圖檔 (奶油白) */}
              <button
                type="button"
                onClick={handleExportImage}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#DFCBB9] bg-[#FFF8EE] px-3.5 py-2 text-sm font-bold text-[#3B312C] transition-colors hover:bg-[#F5E6D5] whitespace-nowrap"
              >
                <ImageDown className="h-4 w-4 shrink-0" />
                <span>匯出圖檔</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 下方區塊：冷氣工程估價單編輯區 */}
      <section
        aria-label="冷氣工程估價單"
        className="bento-card mx-auto mt-4 max-w-[1040px] p-4 sm:mt-5 sm:p-8"
      >
        {/* 主標題 */}
        <h1 className="text-center text-xl font-bold tracking-wide text-[#2E4F7E] sm:text-[26px]">
          冷氣工程估價單
        </h1>

        {/* 顧客資訊表 (text-base on mobile prevents iOS Safari zoom) */}
        <div className="mt-5 overflow-hidden rounded-lg border-2 border-[#4A3F3A] bg-[#FFFDF9] sm:mt-6">
          <div className="flex items-center border-b border-[#4A3F3A] px-3 py-2 text-sm">
            <label className="w-24 shrink-0 font-semibold text-[#3B312C]">顧客姓名：</label>
            <input
              type="text"
              value={draft.customerName}
              onChange={(e) => updateDraftField('customerName', e.target.value)}
              placeholder="輸入顧客姓名"
              className="w-full bg-transparent text-base text-[#3B312C] placeholder:text-[#A48F7E] focus:outline-none sm:text-sm"
            />
          </div>
          <div className="flex items-center border-b border-[#4A3F3A] px-3 py-2 text-sm">
            <label className="w-24 shrink-0 font-semibold text-[#3B312C]">顧客地址：</label>
            <input
              type="text"
              value={draft.customerAddress}
              onChange={(e) => updateDraftField('customerAddress', e.target.value)}
              placeholder="輸入顧客地址"
              className="w-full bg-transparent text-base text-[#3B312C] placeholder:text-[#A48F7E] focus:outline-none sm:text-sm"
            />
          </div>
          <div className="flex items-center border-b border-[#4A3F3A] px-3 py-2 text-sm">
            <label className="w-24 shrink-0 font-semibold text-[#3B312C]">顧客電話：</label>
            <input
              type="tel"
              value={draft.customerPhone}
              onChange={(e) => updateDraftField('customerPhone', e.target.value)}
              placeholder="輸入顧客電話"
              className="font-mono-tabular w-full bg-transparent text-base text-[#3B312C] placeholder:text-[#A48F7E] focus:outline-none sm:text-sm"
            />
          </div>
          <div className="flex items-center px-3 py-2 text-sm">
            <label className="w-24 shrink-0 font-semibold text-[#3B312C]">估價日期：</label>
            <input
              type="text"
              value={draft.quoteDate}
              onChange={(e) => updateDraftField('quoteDate', e.target.value)}
              className="font-mono-tabular w-full bg-transparent text-base text-[#3B312C] focus:outline-none sm:text-sm"
            />
          </div>
        </div>

        {/* 設備明細列表（依品牌分組） */}
        {brandGroups.length === 0 ? (
          <div className="mt-6 rounded-xl border-2 border-dashed border-[#CBB5A5] bg-[#F6E9DA]/60 p-8 text-center text-sm font-medium text-[#7A675B]">
            目前尚未勾選任何空調設備，請點擊「返回並保留」至品牌價格查詢勾選機型。
          </div>
        ) : (
          brandGroups.map((group) => {
            const eng = BRAND_ENGLISH_MAP[group.brand];
            const sectionTitle = eng
              ? `${group.brand} (${eng})系列空調設備`
              : `${group.brand} 系列空調設備`;

            return (
              <div key={group.brand} className="mt-6">
                {/* ========= 手機版專屬卡片編輯介面 (md:hidden) ========= */}
                <div className="space-y-3 md:hidden">
                  <div className="rounded-xl border-2 border-[#4A3F3A] bg-[#F5E6D5] px-3 py-2.5 text-center text-base font-bold text-[#2E4F7E]">
                    {sectionTitle}
                  </div>

                  {group.items.map((item, rowIdx) => {
                    const subItems = getSubItems(item);
                    const isMerged = subItems.length > 1;
                    const unitPrice = effectiveUnitPrice(item);
                    const lineTotal = unitPrice * item.quantity;
                    const priceDelta = item.priceDelta ?? 0;
                    const isAdjustOpen = adjustingLineId === item.lineId;
                    const canMoveUp = rowIdx > 0;
                    const canMoveDown = rowIdx < group.items.length - 1;

                    return (
                      <div
                        key={item.lineId}
                        className="space-y-3 rounded-xl border-2 border-[#CBB5A5] bg-[#FFFDF9] p-3.5 shadow-[0_3px_0_rgba(74,63,58,0.08)]"
                      >
                        {/* 機型與合併控制區 */}
                        <div className="border-b border-[#E8D8C8] pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-2">
                              {subItems.map((sub, sIdx) => {
                                const specSummary = `${sub.product.brand} - ${sub.product.modelType}型 - ${sub.product.inverterType} - ${sub.product.climateMode}`;
                                const modelCode = extractModelCode(sub.product.name);
                                const powerStr = extractPowerLabel(sub.product.capacityKw);
                                return (
                                  <div
                                    key={`${sub.lineId}-${sIdx}`}
                                    className={
                                      sIdx > 0 ? 'border-t border-dashed border-[#DFCBB9] pt-2' : ''
                                    }
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      {sIdx === 0 && (
                                        <span className="text-[11px] font-medium text-[#7A675B]">
                                          {specSummary}
                                        </span>
                                      )}
                                      <span className="font-mono-tabular shrink-0 rounded-md border border-[#DFCBB9] bg-[#F6E9DA] px-1.5 py-0.5 text-[11px] font-bold text-[#3B312C]">
                                        {powerStr}
                                      </span>
                                    </div>
                                    <div className="font-mono-tabular mt-0.5 break-all text-sm font-bold text-[#3B312C]">
                                      {modelCode}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 機型欄位編輯按鈕：向上合併 / 向下合併 / 取消合併 (僅編輯畫面) */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {canMoveUp && (
                              <button
                                type="button"
                                onClick={() => onMergeQuoteItem(item.lineId, 'up')}
                                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#CBB5A5] bg-[#F6E9DA] px-2.5 py-1 text-xs font-bold text-[#3B312C] active:bg-[#EAD6C2]"
                              >
                                <Layers className="h-3.5 w-3.5 text-[#8A5A2B]" />
                                <span>向上合併</span>
                              </button>
                            )}
                            {canMoveDown && (
                              <button
                                type="button"
                                onClick={() => onMergeQuoteItem(item.lineId, 'down')}
                                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#CBB5A5] bg-[#F6E9DA] px-2.5 py-1 text-xs font-bold text-[#3B312C] active:bg-[#EAD6C2]"
                              >
                                <Layers className="h-3.5 w-3.5 text-[#8A5A2B]" />
                                <span>向下合併</span>
                              </button>
                            )}
                            {isMerged && (
                              <button
                                type="button"
                                onClick={() => onUnmergeQuoteItem(item.lineId)}
                                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#D4973D] bg-[#FDF0D5] px-2.5 py-1 text-xs font-bold text-[#7A4A0B] active:bg-[#F6BE6B]/40"
                              >
                                <Ungroup className="h-3.5 w-3.5" />
                                <span>取消合併</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 位置 + 單價 + $調整價格 */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[#7A675B]">
                              位置
                            </label>
                            <input
                              type="text"
                              value={item.location ?? ''}
                              onChange={(e) =>
                                onUpdateQuoteItem(item.lineId, { location: e.target.value })
                              }
                              placeholder="輸入位置"
                              className="min-h-[40px] w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-base text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-1 flex items-center justify-between text-[11px] font-bold text-[#7A675B]">
                              <span>單價</span>
                              {priceDelta !== 0 && (
                                <span className="font-mono-tabular text-[10px] font-bold text-[#B36B16]">
                                  {priceDelta > 0
                                    ? `+${priceDelta.toLocaleString()}`
                                    : priceDelta.toLocaleString()}
                                </span>
                              )}
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={unitPrice}
                                onChange={(e) =>
                                  onUpdateQuoteItem(item.lineId, {
                                    customPrice: Math.max(0, Number(e.target.value) || 0),
                                    priceDelta: 0,
                                  })
                                }
                                className="font-mono-tabular min-h-[40px] w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-base font-bold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => openPriceAdjustBox(item.lineId)}
                                aria-label="調整價格"
                                title="調整價格（額外加價/減價）"
                                className={`flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl border font-bold transition-colors ${
                                  isAdjustOpen || priceDelta !== 0
                                    ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                                    : 'border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] hover:bg-[#F5E6D5]'
                                }`}
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 點擊 $ 後展開的調整價格方框 */}
                        {isAdjustOpen && (
                          <div className="rounded-xl border-2 border-[#D4973D] bg-[#FDF0D5] p-2.5">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-xs font-bold text-[#7A4A0B]">
                                額外加價至單價（可輸入負數）
                              </span>
                              <button
                                type="button"
                                onClick={() => setAdjustingLineId(null)}
                                className="rounded p-1 text-[#7A4A0B] hover:bg-[#F6BE6B]/40"
                                aria-label="關閉調整方框"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={adjustAmountInput}
                                onChange={(e) => setAdjustAmountInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    applyPriceAdjust(item);
                                  }
                                }}
                                placeholder="例如 500 或 -300"
                                autoFocus
                                className="font-mono-tabular min-h-[40px] flex-1 rounded-lg border border-[#D4973D] bg-[#FFFDF9] px-2.5 py-1.5 text-base font-bold text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => applyPriceAdjust(item)}
                                className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-lg border border-[#3B312C] bg-[#4A3F3A] px-3 py-1.5 text-xs font-bold text-[#F6BE6B] active:bg-[#3B312C]"
                              >
                                <Check className="h-4 w-4" />
                                <span>加上</span>
                              </button>
                              {priceDelta !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => resetPriceDelta(item)}
                                  className="min-h-[40px] shrink-0 rounded-lg border border-[#D4973D] bg-[#FFFDF9] px-2.5 py-1.5 text-xs font-bold text-[#7A4A0B]"
                                >
                                  歸零
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 數量 + 價錢 (調整後的單價 * 數量) */}
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DFCBB9] bg-[#F5E6D5] px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#7A675B]">數量</span>
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuoteItem(item.lineId, {
                                    quantity: Math.max(1, item.quantity - 1),
                                  })
                                }
                                aria-label="減少數量"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] active:bg-[#EAD6C2]"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="font-mono-tabular min-w-[26px] text-center text-base font-bold text-[#3B312C]">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuoteItem(item.lineId, {
                                    quantity: item.quantity + 1,
                                  })
                                }
                                aria-label="增加數量"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] active:bg-[#EAD6C2]"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[11px] font-bold text-[#7A675B]">價錢</div>
                            <div className="font-mono-tabular text-base font-extrabold text-[#3B312C]">
                              ${lineTotal.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* 備註輸入 + 操作按鈕列 (上移 / 下移 / 新增複製 / 刪除) */}
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[#7A675B]">
                              備註
                            </label>
                            <input
                              type="text"
                              value={item.remark ?? ''}
                              onChange={(e) =>
                                onUpdateQuoteItem(item.lineId, { remark: e.target.value })
                              }
                              placeholder="輸入備註"
                              className="min-h-[40px] w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-base text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                            <button
                              type="button"
                              disabled={!canMoveUp}
                              onClick={() => onMoveQuoteItem(item.lineId, 'up')}
                              aria-label="往上移動"
                              className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-[#CBB5A5] bg-[#FFF8EE] px-2 py-1.5 text-xs font-bold text-[#3B312C] disabled:opacity-35 active:bg-[#F5E6D5]"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                              <span>上移</span>
                            </button>
                            <button
                              type="button"
                              disabled={!canMoveDown}
                              onClick={() => onMoveQuoteItem(item.lineId, 'down')}
                              aria-label="往下移動"
                              className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-[#CBB5A5] bg-[#FFF8EE] px-2 py-1.5 text-xs font-bold text-[#3B312C] disabled:opacity-35 active:bg-[#F5E6D5]"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                              <span>下移</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDuplicateQuoteItem(item.lineId)}
                              aria-label="新增複製"
                              className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-[#A7C9B5] bg-[#EAF3EC] px-2 py-1.5 text-xs font-bold text-[#2F5B44] active:bg-[#D5E7DA]"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span>複製</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const modelLabel = subItems
                                  .map((s) => extractModelCode(s.product.name))
                                  .join(' + ');
                                setPendingConfirm({
                                  title: '確認刪除設備',
                                  message: `確定要刪除設備「${modelLabel}」嗎？`,
                                  onConfirm: () => {
                                    setPendingConfirm(null);
                                    onRemoveQuoteItem(item.lineId);
                                  },
                                });
                              }}
                              aria-label="刪除"
                              className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-[#E6B0A3] bg-[#FDECE7] px-2 py-1.5 text-xs font-bold text-[#A43B24] active:bg-[#FAD7CD]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>刪除</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ========= 桌機版完整紙本表格編輯介面 (hidden md:block) ========= */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[780px] border-collapse border-2 border-[#4A3F3A] bg-[#FFFDF9] text-center text-sm">
                    <thead>
                      <tr className="bg-[#F5E6D5]/75">
                        <th
                          colSpan={7}
                          className="border border-[#4A3F3A] py-2.5 text-lg font-bold text-[#2E4F7E]"
                        >
                          {sectionTitle}
                        </th>
                      </tr>
                      <tr className="bg-[#F6E9DA] text-xs font-bold text-[#3B312C]">
                        <th className="w-24 border border-[#4A3F3A] py-2">位置</th>
                        <th className="border border-[#4A3F3A] py-2">機型</th>
                        <th className="w-24 border border-[#4A3F3A] py-2">功率(KW)</th>
                        <th className="w-32 border border-[#4A3F3A] py-2">單價</th>
                        <th className="w-24 border border-[#4A3F3A] py-2">數量</th>
                        <th className="w-28 border border-[#4A3F3A] py-2">價錢</th>
                        <th className="w-36 border border-[#4A3F3A] py-2">備註</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, rowIdx) => {
                        const subItems = getSubItems(item);
                        const isMerged = subItems.length > 1;
                        const unitPrice = effectiveUnitPrice(item);
                        const lineTotal = unitPrice * item.quantity;
                        const priceDelta = item.priceDelta ?? 0;
                        const isAdjustOpen = adjustingLineId === item.lineId;
                        const canMoveUp = rowIdx > 0;
                        const canMoveDown = rowIdx < group.items.length - 1;

                        return (
                          <tr key={item.lineId} className="align-middle">
                            {/* 位置 */}
                            <td className="border border-[#4A3F3A] px-1.5 py-2">
                              <input
                                type="text"
                                value={item.location ?? ''}
                                onChange={(e) =>
                                  onUpdateQuoteItem(item.lineId, { location: e.target.value })
                                }
                                placeholder="位置"
                                className="w-full bg-transparent text-center text-xs text-[#3B312C] placeholder:text-[#A48F7E] focus:outline-none"
                              />
                            </td>

                            {/* 機型 + 向上合併 / 向下合併 / 取消合併 (僅編輯畫面顯示) */}
                            <td className="border border-[#4A3F3A] px-2 py-2">
                              <div className="space-y-1.5">
                                {subItems.map((sub, sIdx) => {
                                  const specSummary = `${sub.product.brand} - ${sub.product.modelType}型 - ${sub.product.inverterType} - ${sub.product.climateMode}`;
                                  const modelCode = extractModelCode(sub.product.name);
                                  return (
                                    <div
                                      key={`${sub.lineId}-${sIdx}`}
                                      className={
                                        sIdx > 0
                                          ? 'border-t border-dashed border-[#DFCBB9] pt-1.5'
                                          : ''
                                      }
                                    >
                                      {sIdx === 0 && (
                                        <div className="text-[11px] text-[#7A675B]">
                                          {specSummary}
                                        </div>
                                      )}
                                      <div className="font-mono-tabular mt-0.5 text-sm font-bold text-[#3B312C]">
                                        {modelCode}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {(canMoveUp || canMoveDown || isMerged) && (
                                <div className="mt-2 flex flex-wrap items-center justify-center gap-1 border-t border-[#EFE3D5] pt-1.5">
                                  {canMoveUp && (
                                    <button
                                      type="button"
                                      onClick={() => onMergeQuoteItem(item.lineId, 'up')}
                                      className="inline-flex items-center gap-0.5 rounded-md border border-[#CBB5A5] bg-[#F6E9DA] px-1.5 py-0.5 text-[11px] font-bold text-[#3B312C] hover:bg-[#EAD6C2]"
                                    >
                                      <Layers className="h-3 w-3 text-[#8A5A2B]" />
                                      <span>向上合併</span>
                                    </button>
                                  )}
                                  {canMoveDown && (
                                    <button
                                      type="button"
                                      onClick={() => onMergeQuoteItem(item.lineId, 'down')}
                                      className="inline-flex items-center gap-0.5 rounded-md border border-[#CBB5A5] bg-[#F6E9DA] px-1.5 py-0.5 text-[11px] font-bold text-[#3B312C] hover:bg-[#EAD6C2]"
                                    >
                                      <Layers className="h-3 w-3 text-[#8A5A2B]" />
                                      <span>向下合併</span>
                                    </button>
                                  )}
                                  {isMerged && (
                                    <button
                                      type="button"
                                      onClick={() => onUnmergeQuoteItem(item.lineId)}
                                      className="inline-flex items-center gap-0.5 rounded-md border border-[#D4973D] bg-[#FDF0D5] px-1.5 py-0.5 text-[11px] font-bold text-[#7A4A0B] hover:bg-[#F6BE6B]/50"
                                    >
                                      <Ungroup className="h-3 w-3" />
                                      <span>取消合併</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 功率(KW) */}
                            <td className="font-mono-tabular border border-[#4A3F3A] px-2 py-2 text-xs font-semibold text-[#3B312C]">
                              <div className="space-y-3">
                                {subItems.map((sub, sIdx) => (
                                  <div key={`${sub.lineId}-kw-${sIdx}`}>
                                    {extractPowerLabel(sub.product.capacityKw)}
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* 單價 + "$" 調整價格按鈕與展開方框 */}
                            <td className="border border-[#4A3F3A] px-1.5 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={unitPrice}
                                  onChange={(e) =>
                                    onUpdateQuoteItem(item.lineId, {
                                      customPrice: Math.max(0, Number(e.target.value) || 0),
                                      priceDelta: 0,
                                    })
                                  }
                                  className="font-mono-tabular w-20 bg-transparent text-center text-xs font-bold text-[#3B312C] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => openPriceAdjustBox(item.lineId)}
                                  title="調整價格（輸入金額額外加上單價）"
                                  aria-label="調整價格"
                                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                                    isAdjustOpen || priceDelta !== 0
                                      ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                                      : 'border-[#CBB5A5] bg-[#F6E9DA] text-[#3B312C] hover:border-[#D4973D] hover:bg-[#FDF0D5]'
                                  }`}
                                >
                                  <DollarSign className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {priceDelta !== 0 && !isAdjustOpen && (
                                <div className="font-mono-tabular mt-0.5 text-[10px] font-bold text-[#B36B16]">
                                  調整 {priceDelta > 0 ? `+${priceDelta.toLocaleString()}` : priceDelta.toLocaleString()}
                                </div>
                              )}

                              {/* 點擊 $ 後出現的金額輸入方框 */}
                              {isAdjustOpen && (
                                <div className="mt-1.5 rounded-lg border border-[#D4973D] bg-[#FDF0D5] p-1.5 text-left">
                                  <div className="mb-1 flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-[#7A4A0B]">
                                      額外加減金額
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setAdjustingLineId(null)}
                                      className="rounded p-0.5 text-[#7A4A0B] hover:bg-[#F6BE6B]/40"
                                      aria-label="關閉"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={adjustAmountInput}
                                      onChange={(e) => setAdjustAmountInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          applyPriceAdjust(item);
                                        }
                                      }}
                                      placeholder="+500 / -300"
                                      autoFocus
                                      className="font-mono-tabular w-full min-w-[70px] rounded border border-[#D4973D] bg-[#FFFDF9] px-1.5 py-0.5 text-xs font-bold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => applyPriceAdjust(item)}
                                      className="shrink-0 rounded bg-[#4A3F3A] px-1.5 py-0.5 text-[11px] font-bold text-[#F6BE6B] hover:bg-[#3B312C]"
                                    >
                                      確定
                                    </button>
                                  </div>
                                  {priceDelta !== 0 && (
                                    <button
                                      type="button"
                                      onClick={() => resetPriceDelta(item)}
                                      className="mt-1 text-[10px] font-bold text-[#7A4A0B] hover:underline"
                                    >
                                      歸零 ({priceDelta > 0 ? `+${priceDelta}` : priceDelta})
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 數量 */}
                            <td className="border border-[#4A3F3A] px-1.5 py-2">
                              <div className="inline-flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQuoteItem(item.lineId, {
                                      quantity: Math.max(1, item.quantity - 1),
                                    })
                                  }
                                  className="rounded p-0.5 text-[#7A675B] hover:bg-[#F5E6D5] hover:text-[#3B312C]"
                                  aria-label="減少數量"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="font-mono-tabular min-w-[16px] text-center text-xs font-bold text-[#3B312C]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQuoteItem(item.lineId, {
                                      quantity: item.quantity + 1,
                                    })
                                  }
                                  className="rounded p-0.5 text-[#7A675B] hover:bg-[#F5E6D5] hover:text-[#3B312C]"
                                  aria-label="增加數量"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </td>

                            {/* 價錢 = 調整後的單價 * 數量 */}
                            <td className="font-mono-tabular border border-[#4A3F3A] px-2 py-2 text-xs font-bold text-[#3B312C]">
                              {lineTotal.toLocaleString()}
                            </td>

                            {/* 備註 + 往上移動 / 往下移動 / 新增複製 / 刪除 (僅編輯畫面) */}
                            <td className="border border-[#4A3F3A] px-1.5 py-2">
                              <input
                                type="text"
                                value={item.remark ?? ''}
                                onChange={(e) =>
                                  onUpdateQuoteItem(item.lineId, { remark: e.target.value })
                                }
                                placeholder="備註"
                                className="w-full bg-transparent text-center text-xs text-[#3B312C] placeholder:text-[#A48F7E] focus:outline-none"
                              />
                              <div className="mt-1.5 flex items-center justify-center gap-1 border-t border-[#EFE3D5] pt-1">
                                <button
                                  type="button"
                                  disabled={!canMoveUp}
                                  onClick={() => onMoveQuoteItem(item.lineId, 'up')}
                                  title="往上移動"
                                  aria-label="往上移動"
                                  className="rounded p-1 text-[#7A675B] hover:bg-[#F5E6D5] hover:text-[#3B312C] disabled:pointer-events-none disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={!canMoveDown}
                                  onClick={() => onMoveQuoteItem(item.lineId, 'down')}
                                  title="往下移動"
                                  aria-label="往下移動"
                                  className="rounded p-1 text-[#7A675B] hover:bg-[#F5E6D5] hover:text-[#3B312C] disabled:pointer-events-none disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDuplicateQuoteItem(item.lineId)}
                                  title="新增複製"
                                  aria-label="新增複製"
                                  className="rounded p-1 text-[#4E7C64] hover:bg-[#EAF3EC] hover:text-[#2F5B44]"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const modelLabel = subItems
                                      .map((s) => extractModelCode(s.product.name))
                                      .join(' + ');
                                    setPendingConfirm({
                                      title: '確認刪除設備',
                                      message: `確定要刪除設備「${modelLabel}」嗎？`,
                                      onConfirm: () => {
                                        setPendingConfirm(null);
                                        onRemoveQuoteItem(item.lineId);
                                      },
                                    });
                                  }}
                                  title="刪除"
                                  aria-label="刪除"
                                  className="rounded p-1 text-[#8A7567] hover:bg-[#FDECE7] hover:text-[#D16047]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}

        {/* ========= 施工暨材料明細列表：手機版卡片介面 (md:hidden) ========= */}
        <div className="mt-6 space-y-3 md:hidden">
          <div className="rounded-xl border-2 border-[#4A3F3A] bg-[#F5E6D5] px-3 py-2.5 text-center text-base font-bold text-[#2E4F7E]">
            施工暨材料明細列表
          </div>

          {draft.constructionItems.map((row) => {
            const lineSum = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
            const isPresetValue = (CONSTRUCTION_PRESET_ITEMS as readonly string[]).includes(row.name);
            const showCustomInput = Boolean(row.isCustomName) || (row.name !== '' && !isPresetValue);

            return (
              <div
                key={row.id}
                className="space-y-2.5 rounded-xl border-2 border-[#CBB5A5] bg-[#FFFDF9] p-3.5 shadow-[0_3px_0_rgba(74,63,58,0.08)]"
              >
                <div className="flex items-center gap-2">
                  {showCustomInput ? (
                    <div className="flex flex-1 items-center gap-1.5">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateConstructionRow(row.id, { name: e.target.value })}
                        placeholder="輸入自訂施工項目"
                        className="min-h-[40px] flex-1 rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-base font-semibold text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateConstructionRow(row.id, { name: '', isCustomName: false })
                        }
                        className="min-h-[40px] shrink-0 rounded-xl border border-[#CBB5A5] bg-[#FFF8EE] px-2.5 text-xs font-bold text-[#3B312C] active:bg-[#F5E6D5]"
                      >
                        重選
                      </button>
                    </div>
                  ) : (
                    <select
                      aria-label="選擇施工項目"
                      value={row.name}
                      onChange={(e) => handleSelectConstructionPreset(row.id, e.target.value)}
                      className={`min-h-[40px] flex-1 rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-base font-semibold focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none ${
                        row.name ? 'text-[#3B312C]' : 'text-[#8A7567]'
                      }`}
                    >
                      <option value="">選擇施工項目</option>
                      {CONSTRUCTION_PRESET_ITEMS.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setPendingConfirm({
                        title: '確認刪除施工項目',
                        message: `確定要刪除施工項目「${row.name.trim() || '未選擇項目'}」嗎？`,
                        onConfirm: () => {
                          setPendingConfirm(null);
                          removeConstructionRow(row.id);
                        },
                      })
                    }
                    aria-label="刪除此施工項目"
                    className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl border border-[#E6B0A3] bg-[#FDECE7] text-[#A43B24] active:bg-[#FAD7CD]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#7A675B]">
                      規格 (點選手動編輯)
                    </label>
                    <input
                      type="text"
                      value={row.spec}
                      onChange={(e) => updateConstructionRow(row.id, { spec: e.target.value })}
                      placeholder="輸入規格"
                      className="min-h-[38px] w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2 py-1 text-center text-base text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#7A675B]">
                      數量
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={row.quantity}
                      onChange={(e) =>
                        updateConstructionRow(row.id, {
                          quantity: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="font-mono-tabular min-h-[38px] w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2 py-1 text-center text-base font-bold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[#7A675B]">
                      單價
                    </label>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="0"
                      value={row.unitPrice}
                      onChange={(e) =>
                        updateConstructionRow(row.id, {
                          unitPrice: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="font-mono-tabular min-h-[38px] w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2 py-1 text-center text-base font-bold text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#EFE3D5] pt-2 text-xs">
                  <span className="font-bold text-[#7A675B]">價錢 (單價 × 數量)</span>
                  <span className="font-mono-tabular text-sm font-extrabold text-[#3B312C]">
                    ${lineSum.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addConstructionRow}
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#CBB5A5] bg-[#F6E9DA] py-2.5 text-sm font-bold text-[#3B312C] active:bg-[#EAD6C2]"
          >
            <Plus className="h-4 w-4" />
            <span>新增施工項目</span>
          </button>

          {/* 手機版總結卡片 */}
          <div className="overflow-hidden rounded-xl border-2 border-[#4A3F3A] bg-[#FFFDF9]">
            <div className="grid grid-cols-2 border-b border-[#E8D8C8] px-3.5 py-2.5 text-sm">
              <span className="font-bold text-[#7A675B]">施工總價 (含5%)</span>
              <span className="font-mono-tabular text-right font-bold text-[#3B312C]">
                ${constructionTotalWithTax.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 border-b border-[#E8D8C8] px-3.5 py-2.5 text-sm">
              <span className="font-bold text-[#7A675B]">設備總價</span>
              <span className="font-mono-tabular text-right font-bold text-[#3B312C]">
                ${equipmentTotal.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 border-b-2 border-[#4A3F3A] bg-[#FDECE7] px-3.5 py-3 text-base">
              <span className="font-extrabold text-[#3B312C]">完工總價</span>
              <span className="font-mono-tabular text-right font-extrabold text-[#D16047]">
                ${grandTotal.toLocaleString()}
              </span>
            </div>
            <div className="space-y-1 bg-[#F6E9DA] px-3.5 py-3 text-xs font-semibold text-[#3B312C]">
              <p className="font-mono-tabular">
                ◎ 訂金為設備款： ${depositAmount.toLocaleString()}
              </p>
              <p className="font-mono-tabular">
                ◎ 完工驗收後尾款： ${balanceDue.toLocaleString()}
              </p>
              <p className="pt-0.5 text-[11px] text-[#7A675B]">
                * 設備金額含稅、施工金額外加5%
              </p>
            </div>
          </div>
        </div>

        {/* ========= 施工暨材料明細列表：桌機版紙本表格 (hidden md:block) ========= */}
        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[780px] border-collapse border-2 border-[#4A3F3A] bg-[#FFFDF9] text-center text-sm">
            <thead>
              <tr className="bg-[#F5E6D5]/75">
                <th
                  colSpan={5}
                  className="border border-[#4A3F3A] py-2.5 text-lg font-bold text-[#2E4F7E]"
                >
                  施工暨材料明細列表
                </th>
              </tr>
              <tr className="bg-[#F6E9DA] text-xs font-bold text-[#3B312C]">
                <th className="border border-[#4A3F3A] py-2">項目</th>
                <th className="w-28 border border-[#4A3F3A] py-2">規格</th>
                <th className="w-24 border border-[#4A3F3A] py-2">數量</th>
                <th className="w-28 border border-[#4A3F3A] py-2">單價</th>
                <th className="w-32 border border-[#4A3F3A] py-2">價錢</th>
              </tr>
            </thead>
            <tbody>
              {draft.constructionItems.map((row) => {
                const lineSum = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
                const isPresetValue = (CONSTRUCTION_PRESET_ITEMS as readonly string[]).includes(
                  row.name
                );
                const showCustomInput =
                  Boolean(row.isCustomName) || (row.name !== '' && !isPresetValue);

                return (
                  <tr key={row.id} className="group h-9">
                    <td className="border border-[#4A3F3A] px-2 py-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        {showCustomInput ? (
                          <div className="flex w-full items-center gap-1.5">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                updateConstructionRow(row.id, { name: e.target.value })
                              }
                              placeholder="輸入施工或材料項目"
                              className="w-full rounded bg-transparent px-1 py-0.5 text-xs font-semibold text-[#3B312C] placeholder:text-[#A48F7E] focus:bg-[#FDF0D5] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateConstructionRow(row.id, { name: '', isCustomName: false })
                              }
                              title="切換回預設項目選單"
                              className="shrink-0 rounded border border-[#CBB5A5] bg-[#F6E9DA] px-1.5 py-0.5 text-[10px] font-bold text-[#3B312C] hover:bg-[#EAD6C2]"
                            >
                              選單
                            </button>
                          </div>
                        ) : (
                          <select
                            aria-label="選擇施工項目"
                            value={row.name}
                            onChange={(e) => handleSelectConstructionPreset(row.id, e.target.value)}
                            className={`w-full cursor-pointer bg-transparent py-0.5 text-center text-xs font-semibold focus:outline-none ${
                              row.name ? 'text-[#3B312C]' : 'text-[#8A7567]'
                            }`}
                          >
                            <option value="">選擇施工項目</option>
                            {CONSTRUCTION_PRESET_ITEMS.map((preset) => (
                              <option key={preset} value={preset}>
                                {preset}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setPendingConfirm({
                              title: '確認刪除施工項目',
                              message: `確定要刪除施工項目「${row.name.trim() || '未選擇項目'}」嗎？`,
                              onConfirm: () => {
                                setPendingConfirm(null);
                                removeConstructionRow(row.id);
                              },
                            })
                          }
                          title="刪除此列"
                          className="shrink-0 text-[#A48F7E] transition-colors hover:text-[#D16047]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="border border-[#4A3F3A] px-1.5 py-1">
                      <input
                        type="text"
                        value={row.spec}
                        onChange={(e) => updateConstructionRow(row.id, { spec: e.target.value })}
                        placeholder="規格"
                        title="點選手動編輯規格"
                        className="w-full cursor-text rounded bg-transparent px-1.5 py-0.5 text-center text-xs text-[#3B312C] placeholder:text-[#A48F7E] hover:bg-[#F6E9DA] focus:bg-[#FDF0D5] focus:outline-none focus:ring-1 focus:ring-[#D9822B]"
                      />
                    </td>
                    <td className="border border-[#4A3F3A] px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.quantity}
                        onChange={(e) =>
                          updateConstructionRow(row.id, {
                            quantity: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className="font-mono-tabular w-full bg-transparent text-center text-xs font-bold text-[#3B312C] focus:outline-none"
                      />
                    </td>
                    <td className="border border-[#4A3F3A] px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateConstructionRow(row.id, {
                            unitPrice: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className="font-mono-tabular w-full bg-transparent text-center text-xs text-[#3B312C] placeholder:text-[#A48F7E] focus:outline-none"
                      />
                    </td>
                    <td className="font-mono-tabular border border-[#4A3F3A] px-2 py-1 text-xs font-bold text-[#3B312C]">
                      {lineSum > 0 ? lineSum.toLocaleString() : ''}
                    </td>
                  </tr>
                );
              })}

              {/* + 新增施工項目 列 */}
              <tr className="h-9 bg-[#F6E9DA]/45">
                <td className="border border-[#4A3F3A] px-2 py-1">
                  <button
                    type="button"
                    onClick={addConstructionRow}
                    className="flex w-full items-center justify-center gap-1 text-xs font-bold text-[#7A675B] hover:text-[#3B312C]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>新增施工項目</span>
                  </button>
                </td>
                <td className="border border-[#4A3F3A]" />
                <td className="border border-[#4A3F3A]" />
                <td className="border border-[#4A3F3A]" />
                <td className="border border-[#4A3F3A]" />
              </tr>

              {/* 補足經典紙本表格空白格線 */}
              {Array.from({ length: minConstructionBlankRows }).map((_, idx) => (
                <tr key={`blank-${idx}`} className="h-8">
                  <td className="border border-[#4A3F3A]" />
                  <td className="border border-[#4A3F3A]" />
                  <td className="border border-[#4A3F3A]" />
                  <td className="border border-[#4A3F3A]" />
                  <td className="border border-[#4A3F3A]" />
                </tr>
              ))}

              {/* 底部金額總結區 */}
              <tr>
                <td
                  rowSpan={3}
                  className="border border-[#4A3F3A] bg-[#F6E9DA]/60 px-5 py-4 text-left align-middle"
                >
                  <div className="space-y-1.5 text-sm font-semibold text-[#3B312C]">
                    <p className="font-mono-tabular">
                      ◎ 訂金為設備款： {depositAmount.toLocaleString()}
                    </p>
                    <p className="font-mono-tabular">
                      ◎ 完工驗收後尾款： {balanceDue.toLocaleString()}
                    </p>
                    <p className="pt-1 text-xs text-[#7A675B]">
                      * 設備金額含稅、施工金額外加5%
                    </p>
                  </div>
                </td>
                <td
                  colSpan={2}
                  className="border border-[#4A3F3A] py-2.5 text-xs font-bold text-[#3B312C]"
                >
                  施工總價
                </td>
                <td
                  colSpan={2}
                  className="font-mono-tabular border border-[#4A3F3A] py-2.5 text-sm font-bold text-[#3B312C]"
                >
                  {constructionTotalWithTax.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className="border border-[#4A3F3A] py-2.5 text-xs font-bold text-[#3B312C]"
                >
                  設備總價
                </td>
                <td
                  colSpan={2}
                  className="font-mono-tabular border border-[#4A3F3A] py-2.5 text-sm font-bold text-[#3B312C]"
                >
                  {equipmentTotal.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-[#FDECE7]/70">
                <td
                  colSpan={2}
                  className="border border-[#4A3F3A] py-2.5 text-xs font-extrabold text-[#3B312C]"
                >
                  完工總價
                </td>
                <td
                  colSpan={2}
                  className="font-mono-tabular border border-[#4A3F3A] py-2.5 text-sm font-extrabold text-[#D16047]"
                >
                  {grandTotal.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 管路計算浮動視窗 */}
      <PipeWireCalculatorModal
        isOpen={showCalculator}
        initialItems={draft.constructionItems}
        onClose={() => setShowCalculator(false)}
        onConfirm={handleCalculatorConfirm}
      />

      {/* 刪除確認提醒視窗 */}
      <ConfirmDialog
        isOpen={pendingConfirm !== null}
        title={pendingConfirm?.title}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel}
        onConfirm={() => pendingConfirm?.onConfirm()}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
