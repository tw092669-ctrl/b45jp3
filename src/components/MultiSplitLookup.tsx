import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, Plus, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { MULTI_SPLIT_INDOOR_OPTIONS, MULTI_SPLIT_OUTDOOR_UNITS } from '../data/multiSplitData';
import { getBrandTheme } from '../data/productsData';
import { MultiSplitOutdoorUnit } from '../types/hvac';

interface PortConfig {
  code: string | null;
  indoorStyle: '壁掛' | '吊隱';
}

const BRANDS = ['全部', '日立', '大金', '國際', '三菱重工'] as const;

export default function MultiSplitLookup() {
  const [selectedBrand, setSelectedBrand] = useState<(typeof BRANDS)[number]>('全部');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(MULTI_SPLIT_OUTDOOR_UNITS[0].id);

  // Room requirement reverse-lookup filter (optional quick target capacities)
  const [targetCodes, setTargetCodes] = useState<string[]>([]);

  // Active simulator port configuration
  const [ports, setPorts] = useState<PortConfig[]>([
    { code: '22', indoorStyle: '壁掛' },
    { code: '28', indoorStyle: '壁掛' },
    { code: null, indoorStyle: '壁掛' },
    { code: null, indoorStyle: '壁掛' },
  ]);

  const checkUnitSupportsTarget = (unit: MultiSplitOutdoorUnit, codes: string[]): boolean => {
    if (codes.length === 0) return true;
    if (codes.length < unit.minRooms || codes.length > unit.maxRooms) return false;
    const allAllowed = codes.every((c) => unit.allowedCodes.includes(c));
    if (!allAllowed) return false;
    const totalKw = codes.reduce((sum, c) => {
      const opt = MULTI_SPLIT_INDOOR_OPTIONS.find((o) => o.code === c);
      return sum + (opt ? opt.kw : 0);
    }, 0);
    return totalKw >= unit.minTotalKw && totalKw <= unit.maxTotalKw;
  };

  const filteredUnits = useMemo(() => {
    return MULTI_SPLIT_OUTDOOR_UNITS.filter((unit) => {
      if (selectedBrand !== '全部' && unit.brand !== selectedBrand) return false;
      if (targetCodes.length > 0 && !checkUnitSupportsTarget(unit, targetCodes)) return false;
      return true;
    });
  }, [selectedBrand, targetCodes]);

  const activeUnit = useMemo(() => {
    const found = filteredUnits.find((u) => u.id === selectedUnitId);
    return found || filteredUnits[0] || MULTI_SPLIT_OUTDOOR_UNITS[0];
  }, [filteredUnits, selectedUnitId]);

  const handleSelectUnit = (unit: MultiSplitOutdoorUnit) => {
    setSelectedUnitId(unit.id);
    // Load first official preset if available
    if (unit.presets.length > 0) {
      const preset = unit.presets[0].indoorCodes;
      setPorts(
        Array.from({ length: 4 }, (_, idx) => ({
          code: idx < preset.length ? preset[idx] : null,
          indoorStyle: '壁掛',
        }))
      );
    }
  };

  const applyPreset = (codes: string[]) => {
    setPorts(
      Array.from({ length: 4 }, (_, idx) => ({
        code: idx < codes.length ? codes[idx] : null,
        indoorStyle: ports[idx]?.indoorStyle || '壁掛',
      }))
    );
  };

  const activePorts = ports.slice(0, activeUnit.maxRooms);
  const configuredPorts = activePorts.filter((p) => p.code !== null);

  const totalIndoorKw = useMemo(() => {
    return configuredPorts.reduce((sum, p) => {
      const opt = MULTI_SPLIT_INDOOR_OPTIONS.find((o) => o.code === p.code);
      return sum + (opt ? opt.kw : 0);
    }, 0);
  }, [configuredPorts]);

  const loadRatio =
    activeUnit.ratedCoolingKw > 0 ? totalIndoorKw / activeUnit.ratedCoolingKw : 0;

  const roomCountValid =
    configuredPorts.length >= activeUnit.minRooms &&
    configuredPorts.length <= activeUnit.maxRooms;

  const capacityValid =
    totalIndoorKw >= activeUnit.minTotalKw && totalIndoorKw <= activeUnit.maxTotalKw;

  const isOverallValid = roomCountValid && capacityValid;

  const toggleTargetCode = (code: string) => {
    if (targetCodes.length >= 4) return;
    setTargetCodes((prev) => [...prev, code]);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6">
      {/* 上方品牌選擇與「依房間需求反查主機」 */}
      <section className="bento-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-[#3B312C]">一對多室外機組合查詢與負載試算</h1>
            <p className="mt-0.5 text-xs text-[#7A675B]">
              依各廠牌多聯式室外機容量級距，檢核室內機組合台數、總連接負載率與同時全開實際出力。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {BRANDS.map((brand) => {
              const isActive = selectedBrand === brand;
              const theme = brand === '全部' ? null : getBrandTheme(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrand(brand)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                    isActive
                      ? theme
                        ? `${theme.activeBg} ${theme.activeText} border-transparent`
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
          </div>
        </div>

        {/* 需求反查列 */}
        <div className="mt-4 flex flex-col gap-2.5 border-t border-[#E8D8C8] pt-3.5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#7A675B]">快速反查（點選所需房間級數）：</span>
            {MULTI_SPLIT_INDOOR_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => toggleTargetCode(opt.code)}
                disabled={targetCodes.length >= 4}
                className="inline-flex items-center gap-1 rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1 text-xs font-semibold text-[#3B312C] hover:border-[#D4973D] hover:bg-[#FDF0D5] disabled:opacity-40"
              >
                <Plus className="h-3 w-3 text-[#C68934]" />
                <span>
                  {opt.code}級 ({opt.pingRange})
                </span>
              </button>
            ))}
          </div>

          {targetCodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-[#7A4A0B]">已選需求：</span>
              {targetCodes.map((c, idx) => (
                <button
                  key={`${c}-${idx}`}
                  type="button"
                  onClick={() => setTargetCodes((prev) => prev.filter((_, i) => i !== idx))}
                  className="font-mono-tabular inline-flex items-center gap-1 rounded-lg border border-[#3B312C] bg-[#4A3F3A] px-2 py-0.5 text-xs font-bold text-[#F6BE6B] hover:bg-[#3B312C]"
                >
                  {c}級 ×
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTargetCodes([])}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#7A675B] hover:text-[#3B312C]"
              >
                <RotateCcw className="h-3 w-3" />
                清除反查
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 主體雙欄：左側室外機清單 + 右側組合試算與官方推薦組合 */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 左側：室外機型號清單 */}
        <aside className="space-y-2.5 lg:col-span-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold text-[#3B312C]">
              可搭配室外機型號 ({filteredUnits.length})
            </h2>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="bento-card p-6 text-center">
              <p className="text-sm font-bold text-[#3B312C]">無單一主機符合此房間組合</p>
              <p className="mt-1 text-xs text-[#7A675B]">
                總需求超出單台一對多主機上限，建議拆分為「兩組一對二」或「一對一 + 一對多」配置。
              </p>
              <button
                type="button"
                onClick={() => setTargetCodes([])}
                className="mt-3 rounded-xl border border-[#CBB5A5] bg-[#F6E9DA] px-3 py-1.5 text-xs font-bold text-[#3B312C] hover:bg-[#EAD6C2]"
              >
                重設需求反查
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredUnits.map((unit) => {
                const isSelected = unit.id === activeUnit.id;
                const theme = getBrandTheme(unit.brand);
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => handleSelectUnit(unit)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-[#4A3F3A] bg-[#FDF0D5] shadow-[0_4px_0_rgba(74,63,58,0.16)]'
                        : 'border-[#CBB5A5] bg-[#FFF8EE] hover:border-[#A89180]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${theme.badgeBg} ${theme.badgeText}`}
                      >
                        {unit.brand} · {unit.series}
                      </span>
                      <span className="font-mono-tabular text-xs font-bold text-[#7A675B]">
                        1對{unit.minRooms === unit.maxRooms ? unit.maxRooms : `${unit.minRooms}~${unit.maxRooms}`}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h3 className="font-mono-tabular text-base font-extrabold text-[#3B312C]">
                        {unit.model}
                      </h3>
                      <span className="font-mono-tabular text-sm font-extrabold text-[#B36B16]">
                        {unit.ratedCoolingKw.toFixed(1)} kW
                      </span>
                    </div>

                    <div className="font-mono-tabular mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-[#7A675B]">
                      <span>
                        總接上限 {unit.minTotalKw}~{unit.maxTotalKw} kW
                      </span>
                      <span>·</span>
                      <span>最高落差 {unit.maxHeightDiffM}m</span>
                      <span>·</span>
                      <span>總管長 {unit.maxTotalPipeM}m</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* 右側：即時試算組合器 & 官方推薦組合表 */}
        <main className="space-y-5 lg:col-span-8">
          {/* 室外機技術規格摘要 + 檢核結果 */}
          <div className="bento-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E8D8C8] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#4A3F3A] text-[#F6BE6B]">
                    <Layers className="h-4 w-4" />
                  </span>
                  <h2 className="font-mono-tabular text-xl font-extrabold text-[#3B312C]">
                    {activeUnit.brand} {activeUnit.model}
                  </h2>
                </div>
                <p className="mt-1 text-xs font-medium text-[#7A675B]">
                  {activeUnit.series} · 電源 {activeUnit.powerSupply} · 外機尺寸 {activeUnit.dimensions}
                </p>
              </div>

              <div className="font-mono-tabular grid grid-cols-3 gap-2.5 text-right">
                <div className="rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-3 py-2">
                  <div className="text-[11px] font-bold text-[#7A675B]">額定冷/暖</div>
                  <div className="text-sm font-extrabold text-[#3B312C]">
                    {activeUnit.ratedCoolingKw} / {activeUnit.ratedHeatingKw} kW
                  </div>
                </div>
                <div className="rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-3 py-2">
                  <div className="text-[11px] font-bold text-[#7A675B]">總接許可範圍</div>
                  <div className="text-sm font-extrabold text-[#3B312C]">
                    {activeUnit.minTotalKw}–{activeUnit.maxTotalKw} kW
                  </div>
                </div>
                <div className="rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-3 py-2">
                  <div className="text-[11px] font-bold text-[#7A675B]">最長單管/總管</div>
                  <div className="text-sm font-extrabold text-[#3B312C]">
                    {activeUnit.maxSinglePipeM}m / {activeUnit.maxTotalPipeM}m
                  </div>
                </div>
              </div>
            </div>

            {/* 孔位試配器 */}
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#3B312C]">
                  室內機孔位模擬配置（可接 {activeUnit.minRooms} 至 {activeUnit.maxRooms} 台）
                </h3>
                <span className="text-xs font-medium text-[#7A675B]">點選各孔位級數即可即時計算負載比</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activePorts.map((port, idx) => {
                  const selectedOpt = MULTI_SPLIT_INDOOR_OPTIONS.find((o) => o.code === port.code);
                  const proratedKw =
                    selectedOpt && totalIndoorKw > 0
                      ? totalIndoorKw > activeUnit.ratedCoolingKw
                        ? (selectedOpt.kw / totalIndoorKw) * activeUnit.ratedCoolingKw
                        : selectedOpt.kw
                      : 0;

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border-2 p-3.5 transition-colors ${
                        port.code
                          ? 'border-[#CBB5A5] bg-[#F6E9DA]/80'
                          : 'border-dashed border-[#DFCBB9] bg-[#FFFDF9]'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular rounded-lg bg-[#4A3F3A] px-2 py-0.5 text-[11px] font-bold text-[#F6BE6B]">
                            孔位 {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="font-mono-tabular text-[11px] font-semibold text-[#7A675B]">
                            外機閥門 {activeUnit.portSpecs[idx] || '2分/3分'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {(['壁掛', '吊隱'] as const).map((style) => (
                            <button
                              key={style}
                              type="button"
                              onClick={() =>
                                setPorts((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, indoorStyle: style } : p
                                  )
                                )
                              }
                              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                                port.indoorStyle === style
                                  ? 'bg-[#4E7C64] text-[#FFF8EE]'
                                  : 'bg-[#EAD6C2] text-[#7A675B]'
                              }`}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setPorts((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, code: null } : p))
                            )
                          }
                          className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                            port.code === null
                              ? 'border-[#3B312C] bg-[#4A3F3A] text-[#FFF8EE]'
                              : 'border-[#DFCBB9] bg-[#FFFDF9] text-[#7A675B] hover:bg-[#F5E6D5]'
                          }`}
                        >
                          空接
                        </button>
                        {MULTI_SPLIT_INDOOR_OPTIONS.filter((o) =>
                          activeUnit.allowedCodes.includes(o.code)
                        ).map((opt) => (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() =>
                              setPorts((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, code: opt.code } : p))
                              )
                            }
                            className={`font-mono-tabular rounded-lg border px-2 py-1 text-xs font-bold transition-colors ${
                              port.code === opt.code
                                ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                                : 'border-[#DFCBB9] bg-[#FFFDF9] text-[#3B312C] hover:border-[#D4973D]'
                            }`}
                          >
                            {opt.code}
                          </button>
                        ))}
                      </div>

                      {selectedOpt ? (
                        <div className="mt-2.5 flex items-center justify-between border-t border-[#DFCBB9] pt-2 text-xs">
                          <span className="font-semibold text-[#3B312C]">
                            {port.indoorStyle === '壁掛'
                              ? selectedOpt.wallModelPrefix
                              : selectedOpt.ductModelPrefix}{' '}
                            ({selectedOpt.pingRange})
                          </span>
                          <span className="font-mono-tabular font-bold text-[#4E7C64]">
                            額定 {selectedOpt.kw}kW
                            {totalIndoorKw > activeUnit.ratedCoolingKw && (
                              <span className="text-[#B36B16]">
                                {' '}
                                → 全開實得 {proratedKw.toFixed(2)}kW
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2.5 text-xs text-[#A48F7E]">未配置室內機</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 檢核儀表條 */}
              <div
                className={`mt-4 rounded-2xl border-2 p-4 ${
                  !isOverallValid
                    ? 'border-[#D16047] bg-[#FDECE7]'
                    : loadRatio > 1.05
                    ? 'border-[#D4973D] bg-[#FDF0D5]'
                    : 'border-[#4E7C64] bg-[#EAF3EC]'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    {!isOverallValid ? (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#D16047]" />
                    ) : loadRatio > 1.05 ? (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#C68934]" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#4E7C64]" />
                    )}

                    <div>
                      <p className="text-sm font-extrabold text-[#3B312C]">
                        {!roomCountValid
                          ? `台數不符合規範（本機最少需接 ${activeUnit.minRooms} 台，目前 ${configuredPorts.length} 台）`
                          : !capacityValid
                          ? `總能力 ${totalIndoorKw.toFixed(1)} kW 超出原廠允許範圍（${activeUnit.minTotalKw}–${activeUnit.maxTotalKw} kW）`
                          : loadRatio > 1.05
                          ? `合法超配組合（負載率 ${Math.round(loadRatio * 100)}%）— 適合日夜錯峰使用`
                          : `標準滿載組合（負載率 ${Math.round(loadRatio * 100)}%）— 全室同時開機不衰減`}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-[#5C4E45]">
                        室內機合計{' '}
                        <strong className="font-mono-tabular">{totalIndoorKw.toFixed(1)} kW</strong>{' '}
                        / 室外機額定{' '}
                        <strong className="font-mono-tabular">
                          {activeUnit.ratedCoolingKw.toFixed(1)} kW
                        </strong>
                        {totalIndoorKw > activeUnit.ratedCoolingKw && isOverallValid
                          ? '（若全室同時開冷氣，系統將依各室內機比例自動分流能力）'
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="font-mono-tabular shrink-0 text-right">
                    <span className="text-2xl font-extrabold text-[#3B312C]">
                      {Math.round(loadRatio * 100)}%
                    </span>
                    <span className="block text-[11px] font-bold text-[#7A675B]">
                      連接負載率 (上限 {Math.round(activeUnit.maxOverloadRatio * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 原廠常見搭配組合範例 */}
          <div className="bento-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#C68934]" />
              <h3 className="text-sm font-extrabold text-[#3B312C]">
                {activeUnit.model} 常見現場搭配組合一覽
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#DFCBB9]">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#DFCBB9] bg-[#F5E6D5] text-xs font-bold text-[#3B312C]">
                    <th className="px-3 py-2.5">方案</th>
                    <th className="px-3 py-2.5">適用空間配置</th>
                    <th className="px-3 py-2.5">室內機級數組合</th>
                    <th className="px-3 py-2.5">工程備註</th>
                    <th className="px-3 py-2.5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3D5] bg-[#FFFDF9]">
                  {activeUnit.presets.map((preset, idx) => (
                    <tr key={idx} className="hover:bg-[#F6E9DA]/55">
                      <td className="px-3 py-3 font-bold text-[#3B312C] whitespace-nowrap">
                        {preset.label}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#5C4E45]">{preset.roomSummary}</td>
                      <td className="font-mono-tabular px-3 py-3 text-xs font-extrabold text-[#4E7C64] whitespace-nowrap">
                        {preset.indoorCodes.map((c) => `${c}型`).join(' + ')}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#7A675B]">{preset.note}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => applyPreset(preset.indoorCodes)}
                          className="rounded-xl border border-[#C68934] bg-[#F6BE6B] px-3 py-1 text-xs font-bold text-[#3B312C] hover:bg-[#F3AF48]"
                        >
                          套用試算
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
