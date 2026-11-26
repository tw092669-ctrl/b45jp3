import { useMemo, useState } from 'react';
import { Layers, Search } from 'lucide-react';
import { MULTI_SPLIT_OUTDOOR_UNITS } from '../data/multiSplitData';
import { getBrandTheme } from '../data/productsData';

const BRANDS = ['全部', '日立', '大金', '國際', '三菱重工'] as const;

export default function MultiSplitLookup() {
  const [keyword, setKeyword] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<(typeof BRANDS)[number]>('全部');

  const filteredUnits = useMemo(() => {
    const keywords = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return MULTI_SPLIT_OUTDOOR_UNITS
      .filter((unit) => {
        const matchesBrand = selectedBrand === '全部' || unit.brand === selectedBrand;
        const searchable = `${unit.brand} ${unit.model} ${unit.series} ${unit.presets.flatMap((preset) => [preset.label, ...preset.indoorCodes]).join(' ')}`.toLowerCase();
        return matchesBrand && keywords.every((part) => searchable.includes(part));
      })
      .sort((a, b) => a.ratedCoolingKw - b.ratedCoolingKw || a.model.localeCompare(b.model, 'zh-TW'));
  }, [keyword, selectedBrand]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 pb-12 pt-3 sm:px-6 sm:pb-16 sm:pt-5">
      <section className="bento-card p-3 sm:p-5">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#4A3F3A] text-[#F6BE6B] sm:h-9 sm:w-9">
                <Layers className="h-4 w-4" />
              </span>
              <h1 className="text-base font-extrabold text-[#3B312C] sm:text-lg">多聯組合表</h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-[#7A675B] sm:mt-1">
              室外機型號、額定冷房能力與室內機級數組合；清單依 kW 能力遞增排列
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <span className="col-span-3 text-xs font-bold text-[#7A675B] sm:col-span-1 sm:mr-1">品牌</span>
            {BRANDS.map((brand) => {
              const isActive = selectedBrand === brand;
              const theme = brand === '全部' ? null : getBrandTheme(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrand(brand)}
                  className={`min-h-9 rounded-xl border px-2 py-1.5 text-xs font-extrabold transition-colors sm:min-h-0 sm:px-3 sm:py-2 ${
                    isActive
                      ? theme
                        ? `${theme.activeBg} ${theme.activeText} ${theme.border}`
                        : 'border-[#3B312C] bg-[#4A3F3A] text-[#F6BE6B]'
                      : theme
                      ? `${theme.bg} ${theme.text} ${theme.border}`
                      : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#3B312C] hover:bg-[#EAD6C2]'
                  }`}
                >
                  {brand}
                </button>
              );
            })}

            <label className="relative col-span-3 mt-0.5 block sm:col-span-1 sm:ml-1 sm:mt-0 sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A48F7E]" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜尋型號或級數"
                className="h-10 w-full rounded-xl border border-[#CBB5A5] bg-[#FFFDF9] pl-9 pr-3 text-base font-semibold text-[#3B312C] outline-none placeholder:text-[#A48F7E] focus:border-[#D4973D] sm:w-52 sm:text-sm"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mt-2 grid grid-cols-1 gap-2 sm:mt-5 sm:gap-4 xl:grid-cols-2">
        {filteredUnits.map((unit) => (
          <article key={unit.id} className="bento-card overflow-hidden">
            <div className="border-b border-[#E8D8C8] bg-[#F6E9DA]">
              <div className="flex items-start justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[#7A675B] sm:text-xs">室內機／室外機</div>
                  <div className="mt-0.5 text-xs font-extrabold text-[#3B312C]">
                    {unit.brand}
                    <span className="ml-1.5 font-medium text-[#7A675B]">{unit.series}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] font-bold text-[#7A675B] sm:text-xs">額定冷房</div>
                  <div className="mt-0.5 text-xs font-extrabold text-[#D16047] sm:text-sm">
                    {unit.ratedCoolingKw.toFixed(1)} kW
                  </div>
                </div>
              </div>
              <div className="flex items-center border-t border-[#DFCBB9] px-3 py-2 sm:px-4">
                <span className="mr-3 text-[10px] font-bold text-[#7A675B] sm:text-xs">室外機型號</span>
                <span className="font-mono-tabular text-sm font-extrabold text-[#D16047] sm:text-base">
                  {unit.model}
                </span>
              </div>
            </div>

            <div className="p-2.5 sm:p-4">
              {unit.presets.map((preset) => (
                <div key={preset.label} className="mb-2.5 last:mb-0 sm:mb-3.5 sm:last:mb-0">
                  <div className="mb-1.5 flex items-center justify-between border-b border-[#E8D8C8] pb-1.5 sm:mb-2 sm:pb-2">
                    <h2 className="text-xs font-extrabold text-[#3B312C] sm:text-sm">室內機搭配組合</h2>
                    <span className="rounded-lg bg-[#4A3F3A] px-2 py-0.5 text-xs font-extrabold text-[#F6BE6B] sm:px-2.5 sm:py-1">
                      {preset.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {preset.indoorCodes.map((combination) => (
                      <div
                        key={combination}
                        className="font-mono-tabular min-h-9 rounded-lg border border-[#DFCBB9] bg-[#FFFDF9] px-1 py-1.5 text-center text-[11px] font-extrabold text-[#3B312C] sm:min-h-10 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
                      >
                        {combination}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {filteredUnits.length === 0 && (
        <div className="bento-card mt-5 p-8 text-center text-sm font-bold text-[#7A675B]">
          找不到符合條件的室外機組合
        </div>
      )}
    </div>
  );
}
