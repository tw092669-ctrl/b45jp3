import { useState } from 'react';
import { Calculator, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import {
  PIPE_CATALOG,
  POWER_CABLE_CATALOG,
  SIGNAL_CABLE_CATALOG,
  PipeGauge,
  PowerCableType,
  SignalCableType,
} from '../data/pipeWireCatalog';
import { PipingRunItem, SiteSurveyRecord } from '../types/hvac';
import ConfirmDialog from './ConfirmDialog';

interface PipingCalculatorProps {
  surveys: SiteSurveyRecord[];
  initialRuns?: PipingRunItem[];
}

const PIPE_GAUGES: PipeGauge[] = PIPE_CATALOG.map((spec) => spec.name);
const SIGNAL_CABLE_TYPES: SignalCableType[] = SIGNAL_CABLE_CATALOG.map((spec) => spec.name);
const POWER_CABLE_TYPES: PowerCableType[] = POWER_CABLE_CATALOG.map((spec) => spec.name);

const PIPE_UNIT_PRICES = Object.fromEntries(
  PIPE_CATALOG.map(({ name, unitPrice }) => [name, unitPrice])
) as Record<PipeGauge, number>;
const SIGNAL_CABLE_UNIT_PRICES = Object.fromEntries(
  SIGNAL_CABLE_CATALOG.map(({ name, unitPrice }) => [name, unitPrice])
) as Record<SignalCableType, number>;
const POWER_CABLE_UNIT_PRICES = Object.fromEntries(
  POWER_CABLE_CATALOG.map(({ name, unitPrice }) => [name, unitPrice])
) as Record<PowerCableType, number>;

const DEFAULT_RUNS: PipingRunItem[] = [
  {
    id: 'run-1',
    label: '',
    pipeGauge: '2/3 管路',
    lengthM: '',
    signalCableType: '1.25*4C訊號線',
    signalCableLengthM: '',
    powerCableType: '2.0mm電源線',
    powerCableLengthM: '',
  },
];

function getRunTotal(run: PipingRunItem): number {
  const pipeLength = Number(run.lengthM) || 0;
  const signalCableLength = Number(run.signalCableLengthM) || 0;
  const powerCableLength = Number(run.powerCableLengthM) || 0;

  return (
    pipeLength * PIPE_UNIT_PRICES[run.pipeGauge] +
    signalCableLength * SIGNAL_CABLE_UNIT_PRICES[run.signalCableType] +
    powerCableLength * POWER_CABLE_UNIT_PRICES[run.powerCableType]
  );
}

export default function PipingCalculator({ surveys, initialRuns }: PipingCalculatorProps) {
  const [runs, setRuns] = useState<PipingRunItem[]>(
    initialRuns && initialRuns.length > 0 ? initialRuns : DEFAULT_RUNS
  );
  const [pendingDeleteRun, setPendingDeleteRun] = useState<PipingRunItem | null>(null);

  const addRun = () => {
    setRuns((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        label: '',
        pipeGauge: '2/3 管路',
        lengthM: '',
        signalCableType: '1.25*4C訊號線',
        signalCableLengthM: '',
        powerCableType: '2.0mm電源線',
        powerCableLengthM: '',
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
        pingNum >= 9 ? '2/5 管路' : pingNum >= 6 ? '2/4 管路' : '2/3 管路';

      return {
        id: `srv-${Date.now()}-${idx}`,
        label: room.area || `空間 #${idx + 1}`,
        pipeGauge: guessedGauge,
        lengthM: totalPipe > 0 ? Number(totalPipe.toFixed(1)) : '',
        signalCableType: '1.25*4C訊號線',
        signalCableLengthM: '',
        powerCableType: '2.0mm電源線',
        powerCableLengthM: '',
      };
    });
    if (mapped.length > 0) {
      setRuns(mapped);
    }
  };

  const totalAmount = runs.reduce((sum, run) => sum + getRunTotal(run), 0);

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
              分別輸入各空間的銅管、控制線與電源線長度，即時計算迴路金額及總金額。
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

      <div className="mt-5 grid grid-cols-1 gap-5">
        {/* 左側：迴路管線明細表 */}
        <section className="space-y-4">
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
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#DFCBB9] bg-[#F5E6D5] text-xs font-bold text-[#3B312C]">
                    <th className="w-48 px-3 py-2.5">空間名稱</th>
                    <th className="w-36 px-2 py-2.5">銅管管徑</th>
                    <th className="w-28 px-2 py-2.5">銅管長(m)</th>
                    <th className="w-44 px-2 py-2.5">控制線</th>
                    <th className="w-28 px-2 py-2.5">控制線長(m)</th>
                    <th className="w-44 px-2 py-2.5">電源線</th>
                    <th className="w-28 px-2 py-2.5">電源線長(m)</th>
                    <th className="w-36 px-2 py-2.5 text-right">總金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3D5] bg-[#FFFDF9]">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-[#F6E9DA]/50">
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={run.label}
                            placeholder="空間名稱"
                            onChange={(e) => updateRun(run.id, { label: e.target.value })}
                            className="w-full min-w-0 rounded-lg border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-xs font-semibold text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setPendingDeleteRun(run)}
                            disabled={runs.length <= 1}
                            aria-label={`刪除${run.label || '未命名空間'}`}
                            className="shrink-0 rounded-lg p-1.5 text-[#8A7567] hover:bg-[#FDECE7] hover:text-[#D16047] disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
                          step="any"
                          value={run.lengthM}
                          onChange={(e) =>
                            updateRun(run.id, {
                              lengthM: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#F6E9DA] px-2 py-1.5 text-xs font-bold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <select
                          value={run.signalCableType}
                          onChange={(e) =>
                            updateRun(run.id, {
                              signalCableType: e.target.value as PipingRunItem['signalCableType'],
                            })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#FFFDF9] px-2 py-1.5 text-xs font-semibold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                        >
                          {SIGNAL_CABLE_TYPES.map((cable) => (
                            <option key={cable} value={cable}>
                              {cable}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={run.signalCableLengthM}
                          onChange={(e) =>
                            updateRun(run.id, {
                              signalCableLengthM: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#F6E9DA] px-2 py-1.5 text-xs font-bold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <select
                          value={run.powerCableType}
                          onChange={(e) =>
                            updateRun(run.id, {
                              powerCableType: e.target.value as PipingRunItem['powerCableType'],
                            })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#FFFDF9] px-2 py-1.5 text-xs font-semibold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                        >
                          {POWER_CABLE_TYPES.map((cable) => (
                            <option key={cable} value={cable}>
                              {cable}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={run.powerCableLengthM}
                          onChange={(e) =>
                            updateRun(run.id, {
                              powerCableLengthM: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          className="font-mono-tabular w-full rounded-lg border border-[#DFCBB9] bg-[#F6E9DA] px-2 py-1.5 text-xs font-bold text-[#3B312C] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono-tabular text-xs font-bold text-[#3B6851]">
                        NT$ {getRunTotal(run).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#4A3F3A] bg-[#EAF3EC] text-sm font-extrabold text-[#2F5B44]">
                    <td colSpan={7} className="px-3 py-3 text-right">
                      全部迴路總金額
                    </td>
                    <td className="px-2 py-3 text-right font-mono-tabular">
                      NT$ {totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
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
