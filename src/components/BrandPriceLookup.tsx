import { useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FilterX,
  LayoutGrid,
  Search,
  ShoppingBag,
  Snowflake,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { CSV_TEMPLATE_HEADER, getBrandTheme, parseCsvProducts } from '../data/productsData';
import { HvacProduct, InverterType, QuoteCartItem, SetType } from '../types/hvac';
import { getProductMainName } from '../utils/spacePlannerHelpers';

const ENVIRONMENT_TYPES = ['內機', '暖氣', '冷氣'] as const;

const formatProductPrice = (price: number) => (price > 0 ? price.toLocaleString() : '—');

interface BrandPriceLookupProps {
  products: HvacProduct[];
  onImportProducts: (newProducts: HvacProduct[], mode: 'append' | 'replace') => void;
  quoteItems: QuoteCartItem[];
  onToggleQuoteItem: (product: HvacProduct) => void;
  onOpenQuotePage: () => void;
  onOpenSpacePlanning: () => void;
}

export default function BrandPriceLookup({
  products,
  onImportProducts,
  quoteItems,
  onToggleQuoteItem,
  onOpenQuotePage,
  onOpenSpacePlanning,
}: BrandPriceLookupProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('全部');
  const [selectedModelType, setSelectedModelType] = useState<string>('全部');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('全部');
  const [selectedSetType, setSelectedSetType] = useState<'全部' | SetType>('全部');
  const [selectedInverter, setSelectedInverter] = useState<'全部' | InverterType>('全部');
  const [selectedGrade, setSelectedGrade] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedIdSet = useMemo(() => {
    const ids = new Set<string>();
    quoteItems.forEach((item) => {
      ids.add(item.product.id);
      item.mergedItems?.forEach((sub) => ids.add(sub.product.id));
    });
    return ids;
  }, [quoteItems]);

  // Derive all unique brands & modelTypes dynamically from current products (supports imported attachments!)
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.brand));
    return Array.from(set);
  }, [products]);

  const modelTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (!p.modelType.includes('一對多')) set.add(p.modelType);
    });
    return Array.from(set);
  }, [products]);

  // 階級：品牌選擇後再篩選 "備註" 中的分類
  const availableGrades = useMemo(() => {
    if (selectedBrand === '全部') return [];
    const set = new Set<string>();
    products
      .filter((p) => p.brand === selectedBrand)
      .forEach((p) => {
        if (p.grade && p.grade.trim()) {
          set.add(p.grade.trim());
        }
      });
    return Array.from(set);
  }, [products, selectedBrand]);

  const handleSelectBrand = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedGrade('全部');
  };

  const resetAllFilters = () => {
    setSelectedBrand('全部');
    setSelectedModelType('全部');
    setSelectedEnvironment('全部');
    setSelectedSetType('全部');
    setSelectedInverter('全部');
    setSelectedGrade('全部');
    setSearchQuery('');
  };

  // Unordered, case-insensitive multi-token search + button filters
  const filteredProducts = useMemo(() => {
    const tokens = searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return products.filter((p) => {
      if (selectedBrand !== '全部' && p.brand !== selectedBrand) return false;
      if (selectedModelType !== '全部' && p.modelType !== selectedModelType) return false;
      if (selectedEnvironment !== '全部' && p.environment !== selectedEnvironment) return false;
      if (selectedSetType !== '全部' && p.setType !== selectedSetType) return false;
      if (selectedInverter !== '全部' && p.inverterType !== selectedInverter) return false;
      if (selectedBrand !== '全部' && selectedGrade !== '全部' && p.grade !== selectedGrade)
        return false;

      if (tokens.length > 0) {
        const haystack = [
          p.brand,
          p.modelType,
          p.setType,
          p.inverterType,
          p.grade,
          p.name,
          p.environment || '',
          p.climateMode,
          p.capacityKw,
          p.pipeSize,
          p.indoorDim,
          p.outdoorDim,
          p.note || '',
          String(p.price),
        ]
          .join(' ')
          .toLowerCase();

        return tokens.every((token) => haystack.includes(token));
      }
      return true;
    });
  }, [
    products,
    selectedBrand,
    selectedModelType,
    selectedEnvironment,
    selectedSetType,
    selectedInverter,
    selectedGrade,
    searchQuery,
  ]);

  const handleCopyName = async (product: HvacProduct) => {
    try {
      await navigator.clipboard.writeText(getProductMainName(product.name));
      setCopiedId(product.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === product.id ? null : prev));
      }, 1500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let imported: HvacProduct[] = [];
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          imported = parsed.map((item, idx) => ({
            id: item.id || `json-${Date.now()}-${idx}`,
            brand: item.brand || item['品牌'] || '未分類',
            modelType: item.modelType || item['機型'] || '壁掛',
            setType: (item.setType || item['組合種類']) === '多聯' ? '多聯' : '整組',
            inverterType: (item.inverterType || item['變頻定速']) === '定速' ? '定速' : '變頻',
            grade: item.grade || item['階級'] || item['備註'] || '標準',
            name: item.name || item['產品名稱'] || item['型號'] || `機型 ${idx + 1}`,
            environment: item.environment || item['環境'] || '',
            climateMode: (item.climateMode || item['冷暖'] || '').includes('暖')
              ? '冷暖'
              : '冷氣',
            capacityKw: item.capacityKw || item['能力'] || '—',
            pipeSize: item.pipeSize || item['管徑'] || '2分 / 3分',
            indoorDim: item.indoorDim || item['內機尺寸'] || '—',
            outdoorDim: item.outdoorDim || item['外機尺寸'] || '—',
            price: Number(item.price || item['單價'] || 0) || 0,
            note: item.note || item['補充備註'] || '',
          }));
        }
      } else {
        imported = parseCsvProducts(text);
      }

      if (imported.length === 0) {
        setImportMessage('未解析到有效產品資料，請確認欄位格式是否符合範本。');
      } else {
        onImportProducts(imported, importMode);
        setImportMessage(`成功匯入 ${imported.length} 筆機型資料。`);
        setSelectedBrand('全部');
        setSelectedGrade('全部');
      }
    } catch {
      setImportMessage('檔案讀取失敗，請確認檔案為 UTF-8 CSV 或 JSON 格式。');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const sampleRows = [
      CSV_TEMPLATE_HEADER,
      '日立,壁掛,整組,變頻,頂級,RAS-28NJP1 / RAC-28JP1,冷暖,2.8 kW,2分 / 3分,810 × 300 × 215 mm,730 × 600 × 290 mm,27900,頂級變頻冷暖',
      '金鼎,落地,整組,定速,定速商用,JDF-72C / JDFO-72C,冷氣,7.2 kW,3分 / 5分,540 × 1780 × 320 mm,890 × 840 × 330 mm,36500,工廠餐飲耐操款',
    ].join('\n');
    const blob = new Blob(['\uFEFF' + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '空調品牌價目表匯入範本.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-3 pb-24 pt-3 sm:px-6 sm:pt-5">
      {/* 上方區塊：鎖定的固定式選擇按鈕 + 右側關鍵字搜尋 */}
      <section
        aria-label="固定式篩選與搜尋區"
        className="bento-card p-3 lg:sticky lg:top-[57px] lg:z-20 lg:p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
          {/* 左側：1~4 選擇按鈕 */}
          <div className="flex-1 space-y-2 sm:space-y-2.5">
            {/* 1. 品牌 (全部顯示並用顏色區分) */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="w-12 shrink-0 text-[11px] font-bold text-[#6E5C52] sm:w-14 sm:text-xs">1. 品牌</span>
              <button
                type="button"
                onClick={() => handleSelectBrand('全部')}
                className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                  selectedBrand === '全部'
                    ? 'border-[#3B312C] bg-[#4A3F3A] text-[#FFF8EE]'
                    : 'border-[#D2BEB0] bg-[#FFFDF9] text-[#4A3F3A] hover:bg-[#F5E6D5]'
                }`}
              >
                全部 ({products.length})
              </button>
              {brands.map((brand) => {
                const theme = getBrandTheme(brand);
                const isActive = selectedBrand === brand;
                const count = products.filter((p) => p.brand === brand).length;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => handleSelectBrand(isActive ? '全部' : brand)}
                    className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                      isActive
                        ? `${theme.activeBg} ${theme.activeText} border-transparent ring-2 ${theme.activeRing}`
                        : `${theme.bg} ${theme.text} ${theme.border}`
                    }`}
                  >
                    {brand} ({count})
                  </button>
                );
              })}
            </div>

            {/* 2. 機型 */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="w-12 shrink-0 text-[11px] font-bold text-[#6E5C52] sm:w-14 sm:text-xs">2. 機型</span>
              <button
                type="button"
                onClick={() => setSelectedModelType('全部')}
                className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                  selectedModelType === '全部'
                    ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                    : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#5C4F49] hover:bg-[#EED9C4]'
                }`}
              >
                全部
              </button>
              {modelTypes.map((type) => {
                const isActive = selectedModelType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedModelType(isActive ? '全部' : type)}
                    className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                      isActive
                        ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                        : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#5C4F49] hover:bg-[#EED9C4]'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            {/* 3. 環境 */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="w-12 shrink-0 text-[11px] font-bold text-[#6E5C52] sm:w-14 sm:text-xs">3. 環境</span>
              {(['全部', ...ENVIRONMENT_TYPES] as const).map((environment) => (
                <button
                  key={environment}
                  type="button"
                  onClick={() => setSelectedEnvironment(environment)}
                  className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                    selectedEnvironment === environment
                      ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                      : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#5C4F49] hover:bg-[#EED9C4]'
                  }`}
                >
                  {environment}
                </button>
              ))}
            </div>

            {/* 4. 種類 (整組 or 多聯) AND (變頻 or 定速) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-4">
              <div className="flex flex-wrap items-center gap-1">
                <span className="w-12 shrink-0 text-[11px] font-bold text-[#6E5C52] sm:w-14 sm:text-xs">4. 種類</span>
                {(['全部', '整組', '多聯'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedSetType(opt)}
                    className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                      selectedSetType === opt
                        ? 'border-[#3B312C] bg-[#4A3F3A] text-[#FFF8EE]'
                        : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#5C4F49] hover:bg-[#EED9C4]'
                    }`}
                  >
                    {opt === '全部' ? '組合:全部' : opt}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {(['全部', '變頻', '定速'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedInverter(opt)}
                    className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                      selectedInverter === opt
                        ? 'border-[#3C634F] bg-[#4E7C64] text-[#FFF8EE]'
                        : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#5C4F49] hover:bg-[#EED9C4]'
                    }`}
                  >
                    {opt === '全部' ? '壓縮機:全部' : opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. 階級 (品牌選擇後再篩選"備註"中的分類) */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="w-12 shrink-0 text-[11px] font-bold text-[#6E5C52] sm:w-14 sm:text-xs">5. 階級</span>
              {selectedBrand === '全部' ? (
                <span className="text-xs text-[#8E7A6E]">
                  請先於上方點選「品牌」，即會展開該品牌「備註」中的階級分類按鈕
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedGrade('全部')}
                    className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                      selectedGrade === '全部'
                        ? 'border-[#A84732] bg-[#D16047] text-[#FFF8EE]'
                        : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#5C4F49] hover:bg-[#EED9C4]'
                    }`}
                  >
                    全部階級
                  </button>
                  {availableGrades.map((grade) => {
                    const isActive = selectedGrade === grade;
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => setSelectedGrade(isActive ? '全部' : grade)}
                        className={`min-h-8 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs ${
                          isActive
                            ? 'border-[#A84732] bg-[#D16047] text-[#FFF8EE]'
                            : 'border-[#E6BE8A] bg-[#FDF1DB] text-[#7D4B16] hover:bg-[#FAE4BE]'
                        }`}
                      >
                        {grade}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* 右側：6. 無順序不限大小寫關鍵字搜尋 + 匯入附件 */}
          <div className="w-full shrink-0 space-y-2 border-t border-[#E6D3C3] pt-2 sm:space-y-2.5 lg:w-80 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E7A6E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="關鍵字搜尋 (如: 28 日立 頂級)"
                className="w-full rounded-xl border-2 border-[#D2BEB0] bg-[#F6E9DA] py-2 pl-9 pr-8 text-[13px] text-[#3B312C] placeholder:text-[#8E7A6E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="清除搜尋"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#7A665B] hover:bg-[#E4D1BF] hover:text-[#3B312C]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] leading-snug text-[#7A665B]">
              支援空格分隔多關鍵字，免分前後順序與大小寫（可搜型號、能力、管徑、備註）。
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <span className="font-mono-tabular text-xs font-semibold text-[#6E5C52]">
                符合 <strong className="text-[#3B312C]">{filteredProducts.length}</strong> 筆
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#D2BEB0] bg-[#FFFDF9] px-2 py-1 text-[11px] font-semibold text-[#5C4F49] hover:bg-[#F5E6D5] whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  重設
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportMessage(null);
                    setShowImportModal(true);
                  }}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#C68934] bg-[#F6BE6B] px-2 py-1 text-[11px] font-bold text-[#3B312C] hover:bg-[#F3AF48] whitespace-nowrap shrink-0 sm:min-h-0 sm:px-2.5 sm:text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  匯入價目附件
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 下方區塊：產品清單式顯示 (左到右：勾選、名稱、管徑、內機尺寸、外機尺寸、單價) */}
      <section aria-label="產品清單" className="bento-card mt-4 overflow-hidden">
        <div className="divide-y divide-[#EAD9C8] md:hidden">
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-bold text-[#3B312C]">找不到符合條件的空調機型</p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-3 rounded-lg border border-[#4A3F3A] bg-[#F6BE6B] px-3 py-1.5 text-xs font-bold text-[#3B312C]"
              >
                顯示全部機型
              </button>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isChecked = selectedIdSet.has(product.id);
              const brandTheme = getBrandTheme(product.brand);
              const isHeating = product.climateMode === '冷暖';
              const isCopied = copiedId === product.id;
              return (
                <div
                  key={product.id}
                  className={`px-3 py-2.5 ${isChecked ? 'bg-[#FDF0D5]' : 'bg-[#FFF8EE]'}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleQuoteItem(product)}
                      aria-label={`勾選 ${getProductMainName(product.name)}`}
                      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                        isChecked
                          ? 'border-[#3B312C] bg-[#F6BE6B] text-[#3B312C]'
                          : 'border-[#CBB5A5] bg-[#FFFDF9] text-transparent'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap gap-1">
                            <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${brandTheme.badgeBg} ${brandTheme.badgeText}`}>
                              {product.brand}
                            </span>
                            <span className="rounded bg-[#F2E2D1] px-1 py-0.5 text-[10px] font-semibold text-[#5C4F49]">
                              {product.modelType}
                            </span>
                            {product.grade && (
                              <span className="rounded bg-[#FDF1DB] px-1 py-0.5 text-[10px] font-bold text-[#9C5B18]">
                                {product.grade}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyName(product)}
                            className="flex min-w-0 items-center gap-1 text-left"
                          >
                            {isHeating ? (
                              <Sun className="h-3.5 w-3.5 shrink-0 text-[#D16047]" />
                            ) : (
                              <Snowflake className="h-3.5 w-3.5 shrink-0 text-[#2F6E94]" />
                            )}
                            <span className="truncate text-xs font-extrabold text-[#3B312C]">
                              {getProductMainName(product.name)}
                            </span>
                            {isCopied ? (
                              <Check className="h-3 w-3 shrink-0 text-[#3B6851]" />
                            ) : (
                              <Copy className="h-3 w-3 shrink-0 text-[#8E7A6E]" />
                            )}
                          </button>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono-tabular text-xs font-extrabold text-[#3B312C]">
                            {formatProductPrice(product.price)}
                          </div>
                          <div className="mt-1 text-[10px] font-semibold text-[#6E5C52]">
                            {product.pipeSize}
                          </div>
                        </div>
                      </div>

                      <div className="mt-1.5 grid grid-cols-2 gap-x-2 text-[10px] text-[#6E5C52]">
                        <span className="truncate">內：{product.indoorDim}</span>
                        <span className="truncate text-right">外：{product.outdoorDim}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#D2BEB0] bg-[#F5E6D5] text-xs font-bold text-[#4A3F3A]">
                <th className="w-12 px-3 py-3 text-center">勾選</th>
                <th className="px-4 py-3">名稱</th>
                <th className="w-32 px-3 py-3">管徑</th>
                <th className="w-44 px-3 py-3">內機尺寸</th>
                <th className="w-44 px-3 py-3">外機尺寸</th>
                <th className="w-32 px-4 py-3 text-right">單價</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAD9C8] text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-sm font-bold text-[#3B312C]">找不到符合條件的空調機型</p>
                    <p className="mt-1 text-xs text-[#7A665B]">
                      請嘗試放寬篩選條件、清除關鍵字，或匯入您的最新價目表附件。
                    </p>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-[#4A3F3A] bg-[#F6BE6B] px-4 py-1.5 text-xs font-bold text-[#3B312C] hover:bg-[#F3AF48]"
                    >
                      顯示全部機型
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isChecked = selectedIdSet.has(product.id);
                  const brandTheme = getBrandTheme(product.brand);
                  const isHeating = product.climateMode === '冷暖';
                  const isCopied = copiedId === product.id;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-[#FDF0D5] hover:bg-[#FBE7BF]' : 'hover:bg-[#F6E9DA]/60'
                      }`}
                    >
                      {/* 1. 勾選圖式 */}
                      <td className="px-3 py-3.5 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => onToggleQuoteItem(product)}
                          aria-label={`勾選 ${getProductMainName(product.name)}`}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                            isChecked
                              ? 'border-[#3B312C] bg-[#F6BE6B] text-[#3B312C]'
                              : 'border-[#CBB5A5] bg-[#FFFDF9] text-transparent hover:border-[#4A3F3A]'
                          }`}
                        >
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        </button>
                      </td>

                      {/* 2. 名稱 (上方小字泡泡 + 左邊太陽/雪花 + 產品名稱主體 + 後面複製圖示) */}
                      <td className="px-4 py-3 align-middle">
                        {/* 上方易於分辨的小字泡泡 */}
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${brandTheme.badgeBg} ${brandTheme.badgeText}`}
                          >
                            {product.brand}
                          </span>
                          <span className="inline-block rounded-md bg-[#F2E2D1] px-1.5 py-0.5 text-[11px] font-semibold text-[#5C4F49]">
                            {product.modelType}
                          </span>
                          <span className="inline-block rounded-md bg-[#F2E2D1] px-1.5 py-0.5 text-[11px] font-semibold text-[#5C4F49]">
                            {product.inverterType}
                          </span>
                          <span className="inline-block rounded-md bg-[#F2E2D1] px-1.5 py-0.5 text-[11px] font-medium text-[#7A665B]">
                            {product.setType}
                          </span>
                          {product.grade && (
                            <span className="inline-block rounded-md bg-[#FDF1DB] px-1.5 py-0.5 text-[11px] font-bold text-[#9C5B18]">
                              {product.grade}
                            </span>
                          )}
                        </div>

                        {/* 主體：左邊太陽/雪花圖示 + 產品名稱 + 後面複製圖示 */}
                        <div className="flex items-center gap-2">
                          <span
                            title={isHeating ? '冷暖 (暖氣/冷氣)' : '單冷 (冷氣)'}
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                              isHeating
                                ? 'bg-[#FCE8D5] text-[#D16047]'
                                : 'bg-[#E3EEF4] text-[#2F6E94]'
                            }`}
                          >
                            {isHeating ? (
                              <Sun className="h-4 w-4" aria-label="暖氣/冷暖" />
                            ) : (
                              <Snowflake className="h-4 w-4" aria-label="冷氣" />
                            )}
                          </span>

                          <span className="font-bold text-[#3B312C]">
                            {getProductMainName(product.name)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyName(product)}
                            title="快速複製產品名稱"
                            className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors ${
                              isCopied
                                ? 'bg-[#E5F1EA] text-[#3B6851]'
                                : 'text-[#8E7A6E] hover:bg-[#F2E2D1] hover:text-[#3B312C]'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>已複製</span>
                              </>
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {product.note && (
                          <p className="mt-0.5 pl-8 text-xs text-[#7A665B]">{product.note}</p>
                        )}
                      </td>

                      {/* 3. 管徑 */}
                      <td className="font-mono-tabular px-3 py-3.5 align-middle text-xs font-semibold text-[#5C4F49] whitespace-nowrap">
                        {product.pipeSize}
                      </td>

                      {/* 4. 內機尺寸 */}
                      <td className="font-mono-tabular px-3 py-3.5 align-middle text-xs text-[#6E5C52] whitespace-nowrap">
                        {product.indoorDim}
                      </td>

                      {/* 5. 外機尺寸 */}
                      <td className="font-mono-tabular px-3 py-3.5 align-middle text-xs text-[#6E5C52] whitespace-nowrap">
                        {product.outdoorDim}
                      </td>

                      {/* 6. 單價 */}
                      <td className="font-mono-tabular px-4 py-3.5 text-right align-middle font-bold text-[#3B312C] whitespace-nowrap">
                        {formatProductPrice(product.price)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 右下浮動按鈕區：「製作報價單」與「空間規劃」 */}
      <div className="fixed bottom-3 right-3 z-30 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        {quoteItems.length > 0 && (
          <button
            type="button"
            onClick={onOpenQuotePage}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#3B312C] bg-[#4A3F3A] px-3 py-2 text-xs font-bold text-[#FFF8EE] shadow-[0_4px_0_rgba(59,49,44,0.3)] transition-transform duration-150 hover:scale-[1.03] hover:bg-[#3E3430] sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm"
          >
            <ShoppingBag className="h-4 w-4 text-[#F6BE6B]" />
            <span>製作報價單</span>
            <span className="font-mono-tabular rounded-full bg-[#F6BE6B] px-2.5 py-0.5 text-xs font-extrabold text-[#3B312C]">
              {quoteItems.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSpacePlanning}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#3B312C] bg-[#F6BE6B] px-3 py-2 text-xs font-extrabold text-[#3B312C] shadow-[0_4px_0_rgba(59,49,44,0.3)] transition-transform duration-150 hover:scale-[1.03] hover:bg-[#F3AF48] sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm"
        >
          <LayoutGrid className="h-4 w-4 text-[#3B312C]" />
          <span>空間規劃</span>
          {quoteItems.length > 0 && (
            <span className="font-mono-tabular rounded-full bg-[#4A3F3A] px-2.5 py-0.5 text-xs font-extrabold text-[#FFF8EE]">
              {quoteItems.length}
            </span>
          )}
        </button>
      </div>

      {/* 匯入價目附件 Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B312C]/55 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-lg rounded-3xl border-2 border-[#4A3F3A] bg-[#FFF8EE] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6BE6B] text-[#3B312C]">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <h2 className="text-base font-bold text-[#3B312C]">匯入品牌價目表附件</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1 text-[#7A665B] hover:bg-[#F5E6D5] hover:text-[#3B312C]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2.5 text-xs leading-relaxed text-[#6E5C52]">
              可將您的 Excel 價目表另存為 <strong>UTF-8 CSV</strong> 或 <strong>JSON</strong>{' '}
              檔案上傳，系統將自動偵測所有品牌、機型與「備註」中的階級分類並立即顯示於上方按鈕區。
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-bold text-[#4A3F3A]">匯入方式：</span>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                  importMode === 'append'
                    ? 'border-[#3B312C] bg-[#4A3F3A] text-[#FFF8EE]'
                    : 'border-[#D2BEB0] bg-[#FFFDF9] text-[#5C4F49]'
                }`}
              >
                附加至現有資料
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                  importMode === 'replace'
                    ? 'border-[#3B312C] bg-[#4A3F3A] text-[#FFF8EE]'
                    : 'border-[#D2BEB0] bg-[#FFFDF9] text-[#5C4F49]'
                }`}
              >
                取代全部現有資料
              </button>
            </div>

            <div className="mt-4 rounded-2xl border-2 border-dashed border-[#CBB5A5] bg-[#F6E9DA] p-5 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="hvac-csv-upload"
              />
              <label
                htmlFor="hvac-csv-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#3B312C] bg-[#4A3F3A] px-4 py-2 text-xs font-bold text-[#FFF8EE] hover:bg-[#3B312C]"
              >
                <Upload className="h-4 w-4 text-[#F6BE6B]" />
                選擇 CSV / JSON 檔案
              </label>
              <p className="mt-2 text-[11px] text-[#7A665B]">
                欄位順序：{CSV_TEMPLATE_HEADER}
              </p>
            </div>

            {importMessage && (
              <div className="mt-3 rounded-xl border border-[#C68934] bg-[#FDF1DB] px-3 py-2 text-xs font-semibold text-[#6E4412]">
                {importMessage}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-[#E6D3C3] pt-4">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A65B1E] hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                下載標準 CSV 範本
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-xl border-2 border-[#D2BEB0] bg-[#F5E6D5] px-4 py-1.5 text-xs font-bold text-[#4A3F3A] hover:bg-[#EAD7C4]"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
