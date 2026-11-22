import { useEffect, useState } from 'react';
import BrandPriceLookup from './components/BrandPriceLookup';
import HomeDirectory from './components/HomeDirectory';
import MascotBadge from './components/MascotBadge';
import MultiSplitLookup from './components/MultiSplitLookup';
import PipingCalculator from './components/PipingCalculator';
import QuotationBuilder from './components/QuotationBuilder';
import SiteSurveyRecord, { createEmptyRoom } from './components/SiteSurveyRecord';
import SpacePlanningView from './components/SpacePlanningView';
import { loadGoogleSheetProducts } from './data/googleSheetProducts';
import {
  HvacProduct,
  ModuleId,
  PipingRunItem,
  QuotationDraft,
  QuoteCartItem,
  SiteSurveyRecord as SurveyRecordType,
} from './types/hvac';
import {
  cloneQuoteItem,
  createQuoteLineId,
  ensureQuoteItemIds,
  getEffectiveUnitPrice,
} from './utils/quoteHelpers';

const STORAGE_KEYS = {
  PRODUCTS: 'hvac_pro_products_v1',
  SURVEYS: 'hvac_pro_surveys_v1',
  QUOTE: 'hvac_pro_quote_v1',
  QUOTE_DRAFT: 'hvac_pro_quote_draft_v1',
};

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

function createInitialQuoteDraft(): QuotationDraft {
  return {
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    quoteDate: getTodayDateString(),
    pricePercent: 100,
    constructionItems: [
      {
        id: `const-init-${Date.now()}`,
        name: '',
        spec: '',
        quantity: 1,
        unitPrice: '',
        isCustomName: false,
      },
    ],
  };
}

function createInitialSurvey(): SurveyRecordType {
  return {
    id: `survey-${Date.now()}`,
    projectOrAddress: '',
    designer: '',
    ductBeautification: false,
    wallCoreDrilling: false,
    wallChasing: false,
    rooms: [createEmptyRoom()],
    updatedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
  };
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [products, setProducts] = useState<HvacProduct[]>([]);
  const [productSyncMessage, setProductSyncMessage] = useState('正在載入雲端產品價目表…');
  const [productSyncError, setProductSyncError] = useState(false);

  const [surveys, setSurveys] = useState<SurveyRecordType[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SURVEYS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse errors
    }
    return [createInitialSurvey()];
  });

  const [activeSurveyId, setActiveSurveyId] = useState<string>(() => surveys[0].id);

  const [quoteItems, setQuoteItems] = useState<QuoteCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUOTE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return ensureQuoteItemIds(parsed);
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  const [quotationDraft, setQuotationDraft] = useState<QuotationDraft>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUOTE_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...createInitialQuoteDraft(),
            ...parsed,
            pricePercent:
              typeof parsed.pricePercent === 'number' && !Number.isNaN(parsed.pricePercent)
                ? parsed.pricePercent
                : 100,
            constructionItems: Array.isArray(parsed.constructionItems)
              ? parsed.constructionItems
              : [],
          };
        }
      }
    } catch {
      // Ignore parse errors
    }
    return createInitialQuoteDraft();
  });

  const [pipingSeedRuns, setPipingSeedRuns] = useState<PipingRunItem[] | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    } catch (error) {
      console.error('Unable to clear the saved product catalog.', error);
    }

    let cancelled = false;
    loadGoogleSheetProducts()
      .then((cloudProducts) => {
        if (cancelled) return;
        setProducts(cloudProducts);
        setProductSyncMessage(`已從雲端同步 ${cloudProducts.length} 筆產品資料。`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Unable to load the product catalog from Google Sheets.', error);
        setProducts([]);
        setProductSyncError(true);
        setProductSyncMessage(
          `雲端產品價目表載入失敗：${error instanceof Error ? error.message : '未知錯誤'}`
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // Ignore storage quota errors
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SURVEYS, JSON.stringify(surveys));
    } catch {
      // Ignore storage quota errors
    }
  }, [surveys]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUOTE, JSON.stringify(quoteItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [quoteItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUOTE_DRAFT, JSON.stringify(quotationDraft));
    } catch {
      // Ignore storage quota errors
    }
  }, [quotationDraft]);

  const handleImportProducts = (newProducts: HvacProduct[], mode: 'append' | 'replace') => {
    setProducts((prev) => (mode === 'replace' ? newProducts : [...newProducts, ...prev]));
  };

  const handleToggleQuoteItem = (product: HvacProduct) => {
    setQuoteItems((prev) => {
      const hasDirect = prev.some((item) => item.product.id === product.id && !item.mergedItems?.length);
      const hasInMerged = prev.some((item) =>
        item.mergedItems?.some((sub) => sub.product.id === product.id)
      );
      if (hasDirect || hasInMerged) {
        return prev.filter(
          (item) =>
            item.product.id !== product.id &&
            !item.mergedItems?.some((sub) => sub.product.id === product.id)
        );
      }
      return [...prev, { lineId: createQuoteLineId(), product, quantity: 1 }];
    });
  };

  const handleUpdateQuoteItem = (lineId: string, patch: Partial<QuoteCartItem>) => {
    setQuoteItems((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveQuoteItem = (lineId: string) => {
    setQuoteItems((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  const handleDuplicateQuoteItem = (lineId: string) => {
    setQuoteItems((prev) => {
      const idx = prev.findIndex((item) => item.lineId === lineId);
      if (idx === -1) return prev;
      const duplicate = cloneQuoteItem(prev[idx]);
      const next = [...prev];
      next.splice(idx + 1, 0, duplicate);
      return next;
    });
  };

  const handleMoveQuoteItem = (lineId: string, direction: 'up' | 'down') => {
    setQuoteItems((prev) => {
      const idx = prev.findIndex((item) => item.lineId === lineId);
      if (idx === -1) return prev;
      const brand = prev[idx].product.brand;
      const brandIndices = prev
        .map((it, i) => (it.product.brand === brand ? i : -1))
        .filter((i) => i !== -1);
      const pos = brandIndices.indexOf(idx);
      const targetPos = direction === 'up' ? pos - 1 : pos + 1;
      if (targetPos < 0 || targetPos >= brandIndices.length) return prev;
      const swapIdx = brandIndices[targetPos];
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[swapIdx];
      next[swapIdx] = temp;
      return next;
    });
  };

  const handleMergeQuoteItem = (lineId: string, direction: 'up' | 'down') => {
    const pct = quotationDraft.pricePercent;
    setQuoteItems((prev) => {
      const idx = prev.findIndex((item) => item.lineId === lineId);
      if (idx === -1) return prev;
      const brand = prev[idx].product.brand;
      const brandIndices = prev
        .map((it, i) => (it.product.brand === brand ? i : -1))
        .filter((i) => i !== -1);
      const pos = brandIndices.indexOf(idx);
      const neighborPos = direction === 'up' ? pos - 1 : pos + 1;
      if (neighborPos < 0 || neighborPos >= brandIndices.length) return prev;

      const upperIdx = direction === 'up' ? brandIndices[neighborPos] : idx;
      const lowerIdx = direction === 'up' ? idx : brandIndices[neighborPos];
      const upper = prev[upperIdx];
      const lower = prev[lowerIdx];

      // 單價為合併當下所編輯過的單價加總
      const mergedUnitPrice =
        getEffectiveUnitPrice(upper, pct) + getEffectiveUnitPrice(lower, pct);

      const expand = (it: QuoteCartItem): QuoteCartItem[] =>
        it.mergedItems && it.mergedItems.length > 0
          ? it.mergedItems.map((sub) => ({ ...sub }))
          : [{ ...it }];

      const combinedLocation = upper.location?.trim()
        ? upper.location
        : lower.location || '';
      const combinedRemark =
        upper.remark?.trim() && lower.remark?.trim() && upper.remark !== lower.remark
          ? `${upper.remark} / ${lower.remark}`
          : upper.remark || lower.remark || '';

      const mergedRow: QuoteCartItem = {
        lineId: createQuoteLineId(),
        product: upper.product,
        quantity: upper.quantity,
        location: combinedLocation,
        remark: combinedRemark,
        customPrice: mergedUnitPrice,
        priceDelta: 0,
        mergedItems: [...expand(upper), ...expand(lower)],
      };

      const next = [...prev];
      next[upperIdx] = mergedRow;
      next.splice(lowerIdx, 1);
      return next;
    });
  };

  const handleUnmergeQuoteItem = (lineId: string) => {
    setQuoteItems((prev) => {
      const idx = prev.findIndex((item) => item.lineId === lineId);
      if (idx === -1) return prev;
      const target = prev[idx];
      if (!target.mergedItems || target.mergedItems.length <= 1) return prev;
      const restored = target.mergedItems.map((sub) => ({
        ...sub,
        lineId: createQuoteLineId(),
      }));
      const next = [...prev];
      next.splice(idx, 1, ...restored);
      return next;
    });
  };

  const handleChangeQuotePercent = (nextPercent: number) => {
    const clamped = Math.max(0, nextPercent);
    setQuotationDraft((prev) => ({
      ...prev,
      pricePercent: clamped,
    }));
    // Reset customPrice only on unmerged items so merged items preserve their snapshotted merge total
    setQuoteItems((prev) =>
      prev.map((item) => {
        if (item.mergedItems && item.mergedItems.length > 1) {
          return item;
        }
        const { customPrice: _removed, ...rest } = item;
        return rest;
      })
    );
  };

  const handleClearQuoteAndReturn = () => {
    setQuoteItems([]);
    setQuotationDraft(createInitialQuoteDraft());
    setActiveModule('price');
  };

  const handleCreateSurvey = () => {
    const next = createInitialSurvey();
    setSurveys((prev) => [...prev, next]);
    setActiveSurveyId(next.id);
  };

  const handleDeleteSurvey = (id: string) => {
    setSurveys((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((s) => s.id !== id);
      if (activeSurveyId === id) {
        setActiveSurveyId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleUpdateSurvey = (updated: SurveyRecordType) => {
    setSurveys((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleSendSurveyToPiping = (survey: SurveyRecordType) => {
    const mapped: PipingRunItem[] = survey.rooms.map((room, idx) => {
      const totalPipe =
        (parseFloat(room.indoorPipeLength) || 0) + (parseFloat(room.outdoorPipeLength) || 0);
      const pingNum = parseFloat(room.ping) || 0;
      const guessedGauge: PipingRunItem['pipeGauge'] =
        pingNum >= 9 ? '2/5 管路' : pingNum >= 6 ? '2/4 管路' : '2/3 管路';
      return {
        id: `srv-pipe-${Date.now()}-${idx}`,
        label: room.area || `空間 #${idx + 1}`,
        pipeGauge: guessedGauge,
        lengthM: totalPipe > 0 ? Number(totalPipe.toFixed(1)) : '',
        signalCableType: '2C隔離線',
        signalCableLengthM: '',
        powerCableType: '2.0mm電源線',
        powerCableLengthM: '',
      };
    });
    setPipingSeedRuns(mapped);
    setActiveModule('piping');
  };

  const activeSurvey = surveys.find((s) => s.id === activeSurveyId) || surveys[0];

  const navItems: { id: ModuleId; label: string }[] = [
    { id: 'price', label: '品牌價格查詢' },
    { id: 'survey', label: '場地探勘紀錄' },
    { id: 'multisplit', label: '一對多組合查詢' },
    { id: 'piping', label: '管路計算系統' },
  ];

  return (
    <div className="min-h-screen bg-[#E8D8CC] text-[#3B312C]">
      {/* 3-Zone Top Bar Contract: [Mascot + Wordmark] — [4 single-line nav links] — [1 primary action] */}
      <header className="sticky top-0 z-30 border-b-2 border-[#3B312C] bg-[#4A3F3A] text-[#FFF8EE] shadow-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2.5 sm:gap-8 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveModule('home')}
            className="inline-flex items-center gap-2.5 text-sm font-bold tracking-tight text-[#FFF8EE] hover:text-[#F6BE6B] transition-colors whitespace-nowrap shrink-0 sm:text-base"
          >
            <MascotBadge size="sm" />
            <span>小隼空調助手ver_4</span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#E5D3C5]">
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-[#F6BE6B] font-bold text-[#F6BE6B]'
                      : 'border-transparent hover:border-[#C8B2A3] hover:text-[#FFF8EE]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveModule(activeModule === 'home' ? 'price' : 'home')}
              className="rounded-xl border border-[#D4973D] bg-[#F6BE6B] px-3.5 py-1.5 text-xs font-bold text-[#3B312C] shadow-[0_2px_0_rgba(38,29,25,0.35)] transition-all hover:bg-[#F8C97E] active:translate-y-px whitespace-nowrap shrink-0"
            >
              {activeModule === 'home' ? '快速查價' : '主頁目錄'}
            </button>
          </div>
        </div>

        {/* Mobile quick module switcher (single row horizontal scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-[#5E5049] bg-[#3E3531] px-4 py-2 md:hidden">
          {navItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#F6BE6B] text-[#3B312C]'
                    : 'text-[#E2CFC0] hover:bg-[#4A3F3A]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <div
        role={productSyncError ? 'alert' : 'status'}
        className={`px-4 py-2 text-center text-sm font-medium ${
          productSyncError
            ? 'bg-red-100 text-red-800'
            : 'bg-[#FFF8EE] text-[#5C4F49]'
        }`}
      >
        {productSyncMessage}
      </div>

      {/* Main Module Viewport */}
      {activeModule === 'home' && (
        <HomeDirectory
          onNavigate={setActiveModule}
          productCount={products.length}
          quoteCount={quoteItems.length}
          surveyCount={surveys.length}
          activeSurveyRoomCount={activeSurvey.rooms.length}
        />
      )}

      {activeModule === 'price' && (
        <BrandPriceLookup
          products={products}
          onImportProducts={handleImportProducts}
          quoteItems={quoteItems}
          onToggleQuoteItem={handleToggleQuoteItem}
          onOpenQuotePage={() => setActiveModule('quote')}
          onOpenSpacePlanning={() => setActiveModule('space')}
        />
      )}

      {activeModule === 'space' && (
        <SpacePlanningView
          quoteItems={quoteItems}
          products={products}
          onBackToPriceLookup={() => setActiveModule('price')}
        />
      )}

      {activeModule === 'quote' && (
        <QuotationBuilder
          quoteItems={quoteItems}
          draft={quotationDraft}
          onUpdateDraft={setQuotationDraft}
          onChangePricePercent={handleChangeQuotePercent}
          onUpdateQuoteItem={handleUpdateQuoteItem}
          onRemoveQuoteItem={handleRemoveQuoteItem}
          onDuplicateQuoteItem={handleDuplicateQuoteItem}
          onMoveQuoteItem={handleMoveQuoteItem}
          onMergeQuoteItem={handleMergeQuoteItem}
          onUnmergeQuoteItem={handleUnmergeQuoteItem}
          onBackAndKeep={() => setActiveModule('price')}
          onClearAndBack={handleClearQuoteAndReturn}
        />
      )}

      {activeModule === 'survey' && (
        <SiteSurveyRecord
          surveys={surveys}
          activeSurveyId={activeSurvey.id}
          onSelectSurvey={setActiveSurveyId}
          onCreateSurvey={handleCreateSurvey}
          onDeleteSurvey={handleDeleteSurvey}
          onUpdateSurvey={handleUpdateSurvey}
          onSendToPiping={handleSendSurveyToPiping}
        />
      )}

      {activeModule === 'multisplit' && <MultiSplitLookup />}

      {activeModule === 'piping' && (
        <PipingCalculator key={pipingSeedRuns ? pipingSeedRuns[0]?.id : 'default'} surveys={surveys} initialRuns={pipingSeedRuns} />
      )}
    </div>
  );
}
