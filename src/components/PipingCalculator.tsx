import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  ClipboardCheck,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { PipingRunItem, SiteSurveyRecord } from '../types/hvac';
import ConfirmDialog from './ConfirmDialog';

interface PipingCalculatorProps {
  surveys: SiteSurveyRecord[];
  initialRuns?: PipingRunItem[];
}

const PIPE_GAUGES: PipingRunItem['pipeGauge'][] = [
  '2分/3分',
  '2分/4分',
  '2分/5分',
  '3分/5分',
  '3分/6分',
];

const CABLE_TYPES: PipingRunItem['cableType'][] = [
  '3C 2.0mm',
  '4C 2.0mm',
  '4C 1.25mm',
  '3C 3.5mm',
];

const DEFAULT_RUNS: PipingRunItem[] = [
  {
    id: 'run-1',
    label: '客廳',
    pipeGauge: '2分/4分',
    lengthM: 12,
    drainLengthM: 8,
    cableType: '3C 2.0mm',
    heightDiffM: 3,
  },
  {
    id: 'run-2',
    label: '主臥',
    pipeGauge: '2分/3分',
    lengthM: 8.5,
    drainLengthM: 6,
    cableType: '3C 2.0mm',
    heightDiffM: 2.5,
  },
];

export default function PipingCalculator({ surveys, initialRuns }: PipingCalculatorProps) {
  const [runs, setRuns] = useState<PipingRunItem[]>(
    initialRuns && initialRuns.length > 0 ? initialRuns : DEFAULT_RUNS
  );

  // Unit pricing for copper pipe per meter (editable by contractor)
  const [unitPriceMap, setUnitPriceMap] = useState<Record<PipingRunItem['pipeGauge'], number>>({
    '2分/3分': 350,
    '2分/4分': 450,
    '2分/5分': 550,
    '3分/5分': 650,
    '3分/6分': 780,
  });

  // Refrigerant extra charge calculator
  const [refrigerantType, setRefrigerantType] = useState<'R32' | 'R410A'>('R32');
  const [liquidPipeDia, setLiquidPipeDia] = useState<'2分' | '3分'>('2分');
  const [preChargedLengthM, setPreChargedLengthM] = useState<number>(15);

  // Uploaded custom file preview state (prepared for user's future design file)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedRows, setUploadedRows] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDeleteRun, setPendingDeleteRun] = useState<PipingRunItem | null>(null);

  const addRun = () => {
    setRuns((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        label: `空間 #${prev.length + 1}`,
        pipeGauge: '2分/3分',
        lengthM: 6,
        drainLengthM: 4,
        cableType: '3C 2.0mm',
        heightDiffM: 2,
      },
    ]);
  };

  const updateRun = (id: string, patch: Partial<PipingRunItem>) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRun = (id: string) => {
    if (runs.length <= 1) return;
    setRuns((prev) => prev.filter((r) => r.id !== id));
  };

  const importFromSurvey = (survey: SiteSurveyRecord) => {
    const mapped: PipingRunItem[] = survey.rooms.map((room, idx) => {
      const totalPipe =
        (parseFloat(room.indoorPipeLength) || 0) + (parseFloat(room.outdoorPipeLength) || 0);
      const pingNum = parseFloat(room.ping) || 0;
      const guessedGauge: PipingRunItem['pipeGauge'] =
        pingNum >= 9 ? '2分/5分' : pingNum >= 6 ? '2分/4分' : '2分/3分';

      return {
        id: `srv-${Date.now()}-${idx}`,
        label: room.area || `空間 #${idx + 1}`,
        pipeGauge: guessedGauge,
        lengthM: totalPipe > 0 ? Number(totalPipe.toFixed(1)) : 6,
        drainLengthM: totalPipe > 0 ? Number((totalPipe * 0.7).toFixed(1)) : 4,
        cableType: '3C 2.0mm',
        heightDiffM: 2.5,
      };
    });
    if (mapped.length > 0) {
      setRuns(mapped);
    }
  };

  const summary = useMemo(() => {
    const byGauge: Record<PipingRunItem['pipeGauge'], number> = {
      '2分/3分': 0,
      '2分/4分': 0,
      '2分/5分': 0,
      '3分/5分': 0,
      '3分/6分': 0,
    };
    let totalPipeM = 0;
    let totalDrainM = 0;
    let totalCableM = 0;
    let estimatedPipeCost = 0;
    let oilTrapNeededCount = 0;

    runs.forEach((r) => {
      const len = Math.max(0, Number(r.lengthM) || 0);
      const drain = Math.max(0, Number(r.drainLengthM) || 0);
      byGauge[r.pipeGauge] += len;
      totalPipeM += len;
      totalDrainM += drain;
      totalCableM += len + 1.5; // +1.5m terminal slack
      estimatedPipeCost += len * (unitPriceMap[r.pipeGauge] || 0);
      if ((Number(r.heightDiffM) || 0) >= 6) {
        oilTrapNeededCount += 1;
      }
    });

    // Refrigerant extra charge estimation
    const extraMeters = Math.max(0, totalPipeM - preChargedLengthM);
    const gramsPerMeter =
      refrigerantType === 'R32'
        ? liquidPipeDia === '2分'
          ? 20
          : 40
        : liquidPipeDia === '2分'
        ? 25
        : 50;
    const extraRefrigerantGrams = extraMeters * gramsPerMeter;

    return {
      byGauge,
      totalPipeM,
      totalDrainM,
      totalCableM,
      estimatedPipeCost,
      oilTrapNeededCount,
      extraMeters,
      gramsPerMeter,
      extraRefrigerantGrams,
    };
  }, [runs, unitPriceMap, preChargedLengthM, refrigerantType, liquidPipeDia]);

  const handleUploadDesignFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadedFileName(file.name);

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 30);
    const rows = lines.map((line) => line.split(',').map((cell) => cell.trim()));
    setUploadedRows(rows);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-6">
      {/* 上方標題與帶入場勘按鈕 */}
      <section className="bento-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#4A3F3A] text-[#F6BE6B]">
                <Calculator className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-extrabold text-[#3B312C]">管路計算系統</h1>
            </div>
            <p className="mt-1 text-xs text-[#7A675B]">
              計算各管徑被覆銅管總長與捲數（20m/捲）、排水管與控制線備料、冷媒追加量及高落差存油彎提醒，並支援匯入自訂設計規範檔。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {surveys.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-[#7A675B]">從場勘帶入：</span>
                {surveys.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => importFromSurvey(s)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#A7C9B5] bg-[#EAF3EC] px-3 py-1.5 text-xs font-bold text-[#2F5B44] hover:bg-[#D5E7DA] whitespace-nowrap"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {s.projectOrAddress.trim() || '未命名案場'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 左側：迴路管線明細表 */}
        <section className="space-y-4 lg:col-span-8">
          <div className="bento-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#3B312C]">管路迴路明細 ({runs.length} 組)</h2>
              <button
                type="button"
                onClick={addRun}
                className="inline-flex items-center gap-1 rounded-xl border border-[#3B312C] bg-[#4A3F3A] px-3 py-1.5 text-xs font-bold text-[#F6BE6B] hover:bg-[#3B312C]"
              >
                <Plus className="h-3.5 w-3.5" />
                新增管路迴路
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#DFCBB9]">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#DFCBB9] bg-[#F5E6D5] text-xs font-bold text-[#3B312C]">
                    <th className="px-3 py-2.5">空間 / 迴路名稱</th>
                    <th className="w-32 px-2 py-2.5">銅管管徑</th>
                    <th className="w-24 px-2 py-2.5">銅管長(m)</th>
                    <th className="w-24 px-2 py-2.5">排水管(m)</th>
                    <th className="w-32 px-2 py-2.5">控制線</th>
                    <th className="w-24 px-2 py-2.5">高落差(m)</th>
                    <th className="w-12 px-2 py-2.5 text-center">刪</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3D5] bg-[#FFFDF9]">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-[#F6E9DA]/50">
                      <td className="px-2 py-2.5">
                        <input
                          type="text"
                          value={run.label}
                          onChange={(e) => updateRun(run.id, { label: e.target.value })}
                          className="w-full rounded-lg border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-xs font-semibold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <select
                          value={run.pipeGauge}
                          onChange={(e) =>
                            updateRun(run.id, {
                              pipeGauge: e.target.value as PipingRunItem['pipeGauge'],
                            })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#FFFDF9] px-2 py-1.5 text-xs font-bold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                        >
                          {PIPE_GAUGES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={run.lengthM}
                          onChange={(e) =>
                            updateRun(run.id, { lengthM: parseFloat(e.target.value) || 0 })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#F6E9DA] px-2 py-1.5 text-xs font-bold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={run.drainLengthM}
                          onChange={(e) =>
                            updateRun(run.id, { drainLengthM: parseFloat(e.target.value) || 0 })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#F6E9DA] px-2 py-1.5 text-xs font-semibold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <select
                          value={run.cableType}
                          onChange={(e) =>
                            updateRun(run.id, {
                              cableType: e.target.value as PipingRunItem['cableType'],
                            })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#FFFDF9] px-2 py-1.5 text-xs font-semibold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                        >
                          {CABLE_TYPES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={run.heightDiffM}
                          onChange={(e) =>
                            updateRun(run.id, { heightDiffM: parseFloat(e.target.value) || 0 })
                          }
                          className={`font-mono-tabular w-full rounded-lg border px-2 py-1.5 text-xs font-bold focus:outline-none ${
                            run.heightDiffM >= 6
                              ? 'border-[#D4973D] bg-[#FDF0D5] text-[#7A4A0B]'
                              : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9]'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteRun(run)}
                          disabled={runs.length <= 1}
                          aria-label="刪除此管路迴路"
                          className="rounded-lg p-1.5 text-[#8A7567] hover:bg-[#FDECE7] hover:text-[#D16047] disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary.oilTrapNeededCount > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#D4973D] bg-[#FDF0D5] px-3.5 py-2.5 text-xs font-bold text-[#7A4A0B]">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#C68934]" />
                <span>
                  偵測到 {summary.oilTrapNeededCount} 條迴路高低落差 ≥ 6m，若室外機高於室內機，建議每隔 6–8m 設置存油彎 (Oil Trap)。
                </span>
              </div>
            )}
          </div>

          {/* 預留：自訂設計規範檔上傳區 (待使用者附件上傳) */}
          <div className="bento-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF0D5] text-[#C68934]">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-[#3B312C]">
                    自訂管路設計表 / 附件匯入區
                  </h2>
                  <p className="text-xs text-[#7A675B]">
                    可先上傳您設計好的 CSV / TXT 規範表（或於後續對話直接提供附件進行深度整合）。
                  </p>
                </div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.json"
                  onChange={handleUploadDesignFile}
                  className="hidden"
                  id="piping-custom-file"
                />
                <label
                  htmlFor="piping-custom-file"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#C68934] bg-[#F6BE6B] px-3.5 py-2 text-xs font-bold text-[#3B312C] hover:bg-[#F3AF48]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  上傳設計檔案
                </label>
              </div>
            </div>

            {uploadedFileName && uploadedRows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-[#DFCBB9]">
                <div className="bg-[#F5E6D5] px-3 py-2 text-xs font-bold text-[#3B312C]">
                  已載入：{uploadedFileName}（預覽前 {uploadedRows.length} 列）
                </div>
                <table className="w-full border-collapse text-left text-xs">
                  <tbody className="divide-y divide-[#EFE3D5] bg-[#FFFDF9]">
                    {uploadedRows.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx === 0 ? 'bg-[#F6E9DA] font-bold' : ''}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5 text-[#3B312C]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* 右側：材料統計與冷媒追加試算 */}
        <aside className="space-y-4 lg:col-span-4">
          {/* 銅管分徑統計 */}
          <div className="bento-card p-5">
            <h2 className="text-sm font-extrabold text-[#3B312C]">銅管備料與金額估算</h2>
            <div className="mt-3 space-y-2.5">
              {PIPE_GAUGES.map((gauge) => {
                const meters = summary.byGauge[gauge];
                if (meters <= 0) return null;
                const rolls20 = Math.ceil(meters / 20);
                const subtotal = meters * unitPriceMap[gauge];
                return (
                  <div
                    key={gauge}
                    className="rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-[#3B312C]">
                      <span className="font-mono-tabular">{gauge} 被覆銅管</span>
                      <span className="font-mono-tabular text-[#B36B16]">
                        {meters.toFixed(1)} m（約 {rolls20} 捲 / 20m捲）
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[#7A675B]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">單價/m</span>
                        <input
                          type="number"
                          min={0}
                          value={unitPriceMap[gauge]}
                          onChange={(e) =>
                            setUnitPriceMap((prev) => ({
                              ...prev,
                              [gauge]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="font-mono-tabular w-20 rounded-lg border border-[#CBB5A5] bg-[#FFFDF9] px-2 py-0.5 text-right text-xs font-bold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                        />
                      </div>
                      <span className="font-mono-tabular font-extrabold text-[#3B312C]">
                        NT$ {Math.round(subtotal).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-[#E8D8C8] pt-3 text-xs">
              <div className="flex justify-between text-[#7A675B]">
                <span>銅管總長度合計</span>
                <span className="font-mono-tabular font-bold text-[#3B312C]">
                  {summary.totalPipeM.toFixed(1)} m
                </span>
              </div>
              <div className="flex justify-between text-[#7A675B]">
                <span>PVC 排水管合計</span>
                <span className="font-mono-tabular font-bold text-[#3B312C]">
                  {summary.totalDrainM.toFixed(1)} m
                </span>
              </div>
              <div className="flex justify-between text-[#7A675B]">
                <span>控制電纜預估 (含接線餘長)</span>
                <span className="font-mono-tabular font-bold text-[#3B312C]">
                  {summary.totalCableM.toFixed(1)} m
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E8D8C8] pt-2 text-sm font-extrabold text-[#3B312C]">
                <span>銅管施工預估小計</span>
                <span className="font-mono-tabular text-[#4E7C64]">
                  NT$ {Math.round(summary.estimatedPipeCost).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 冷媒追加充填試算 */}
          <div className="bento-card p-5">
            <h2 className="text-sm font-extrabold text-[#3B312C]">冷媒追加充填量試算</h2>
            <p className="mt-0.5 text-xs text-[#7A675B]">
              當配管總長超過主機原廠免充填基準長度時使用。
            </p>

            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#3B312C]">冷媒種類</span>
                <div className="flex gap-1.5">
                  {(['R32', 'R410A'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRefrigerantType(r)}
                      className={`font-mono-tabular rounded-lg border px-3 py-1 font-bold ${
                        refrigerantType === r
                          ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                          : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#3B312C]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#3B312C]">液管管徑</span>
                <div className="flex gap-1.5">
                  {(['2分', '3分'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setLiquidPipeDia(d)}
                      className={`rounded-lg border px-3 py-1 font-bold ${
                        liquidPipeDia === d
                          ? 'border-[#3B312C] bg-[#4A3F3A] text-[#F6BE6B]'
                          : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#3B312C]'
                      }`}
                    >
                      {d} ({d === '2分' ? 'Ø6.35' : 'Ø9.52'})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#3B312C]">原廠基準免充長度 (m)</span>
                <input
                  type="number"
                  min={0}
                  value={preChargedLengthM}
                  onChange={(e) => setPreChargedLengthM(parseFloat(e.target.value) || 0)}
                  className="font-mono-tabular w-24 rounded-lg border border-[#CBB5A5] bg-[#F6E9DA] px-2.5 py-1 text-right font-bold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border-2 border-[#4E7C64] bg-[#EAF3EC] p-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-extrabold text-[#2F5B44]">需追加冷媒量</span>
                <span className="font-mono-tabular text-xl font-extrabold text-[#2F5B44]">
                  {summary.extraRefrigerantGrams.toFixed(0)} g
                  <span className="ml-1.5 text-xs font-bold text-[#4E7C64]">
                    ({(summary.extraRefrigerantGrams / 1000).toFixed(2)} kg)
                  </span>
                </span>
              </div>
              <p className="font-mono-tabular mt-1 text-[11px] font-medium text-[#2F5B44]/85">
                超出長度 {summary.extraMeters.toFixed(1)} m × 每米 {summary.gramsPerMeter} g ({refrigerantType} / {liquidPipeDia}液管)
              </p>
            </div>
          </div>
        </aside>
      </div>
      <ConfirmDialog
        isOpen={pendingDeleteRun !== null}
        title="確認刪除管路迴路"
        message={`確定要刪除迴路「${pendingDeleteRun?.label.trim() || '未命名迴路'}」嗎？`}
        onConfirm={() => {
          if (pendingDeleteRun) {
            removeRun(pendingDeleteRun.id);
          }
          setPendingDeleteRun(null);
        }}
        onCancel={() => setPendingDeleteRun(null)}
      />
    </div>
  );
}
