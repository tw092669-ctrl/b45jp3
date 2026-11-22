import { useMemo, useState } from 'react';
import { Layers, Search } from 'lucide-react';
import { MULTI_SPLIT_OUTDOOR_UNITS } from '../data/multiSplitData';
import { getBrandTheme } from '../data/productsData';

const BRANDS = ['全部', '日立', '大金', '國際', '三菱重工'] as const;

export default function MultiSplitLookup() {
  const [keyword, setKeyword] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<(typeof BRANDS)[number]>('全部');

  const filteredUnits = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return MULTI_SPLIT_OUTDOOR_UNITS
      .filter((unit) => {
        const matchesBrand = selectedBrand === '全部' || unit.brand === selectedBrand;
        const searchable = `${unit.brand} ${unit.model} ${unit.series} ${unit.presets.flatMap((preset) => preset.indoorCodes).join(' ')}`.toLowerCase();
        return matchesBrand && (!normalizedKeyword || searchable.includes(normalizedKeyword));
      })
      .sort((a, b) => a.ratedCoolingKw - b.ratedCoolingKw || a.model.localeCompare(b.model, 'zh-TW'));
  }, [keyword, selectedBrand]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6">
      <section className="bento-card p-5">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#4A3F3A] text-[#F6BE6B]">
                <Layers className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-extrabold text-[#3B312C]">多聯組合表</h1>
            </div>
            <p className="mt-1 text-xs font-medium text-[#7A675B]">
              室外機型號、額定冷房能力與室內機級數組合；清單依 kW 能力遞增排列
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold text-[#7A675B]">品牌</span>
            {BRANDS.map((brand) => {
              const isActive = selectedBrand === brand;
              const theme = brand === '全部' ? null : getBrandTheme(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrand(brand)}
                  className={`rounded-xl border px-3 py-2 text-xs font-extrabold transition-colors ${
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

            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A48F7E]" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜尋型號或級數"
                className="h-10 w-full rounded-xl border border-[#CBB5A5] bg-[#FFFDF9] pl-9 pr-3 text-sm font-semibold text-[#3B312C] outline-none placeholder:text-[#A48F7E] focus:border-[#D4973D] sm:w-52"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filteredUnits.map((unit) => (
          <article key={unit.id} className="bento-card overflow-hidden">
            <div className="grid grid-cols-[132px_1fr] border-b border-[#E8D8C8] bg-[#F6E9DA]">
              <div className="border-r border-[#DFCBB9] px-4 py-3 text-xs font-bold text-[#7A675B]">
                室內機／室外機
              </div>
              <div className="px-4 py-3 text-xs font-bold text-[#3B312C]">
                {unit.brand} {unit.series}
              </div>
              <div className="border-r border-t border-[#DFCBB9] px-4 py-3 text-xs font-bold text-[#7A675B]">
                型式／容量
              </div>
              <div className="border-t border-[#DFCBB9] px-4 py-3">
                <span className="font-mono-tabular text-base font-extrabold text-[#D16047]">
                  {unit.model}
                </span>
                <span className="ml-3 text-xs font-bold text-[#7A675B]">
                  {unit.ratedCoolingKw.toFixed(1)} kW
                </span>
              </div>
            </div>

            <div className="p-4">
              {unit.presets.map((preset) => (
                <div key={preset.label} className="mb-3 last:mb-0">
                  <div className="mb-2 flex items-center justify-between border-b border-[#E8D8C8] pb-2">
                    <h2 className="text-sm font-extrabold text-[#3B312C]">室內機搭配組合</h2>
                    <span className="rounded-lg bg-[#4A3F3A] px-2.5 py-1 text-xs font-extrabold text-[#F6BE6B]">
                      {preset.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {preset.indoorCodes.map((combination) => (
                      <div
                        key={combination}
                        className="font-mono-tabular rounded-xl border border-[#DFCBB9] bg-[#FFFDF9] px-3 py-2 text-center text-sm font-extrabold text-[#3B312C]"
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
