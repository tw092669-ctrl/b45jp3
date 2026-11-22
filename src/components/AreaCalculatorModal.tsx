import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

interface AreaCalculatorModalProps {
  onClose: () => void;
}

type Operator = '+' | '-';

const AREA_ROWS = [0, 1, 2] as const;

export default function AreaCalculatorModal({ onClose }: AreaCalculatorModalProps) {
  const [dimensions, setDimensions] = useState(['', '', '', '', '', '']);
  const [operators, setOperators] = useState<Record<number, Operator>>({ 0: '+', 1: '+' });

  const ping = useMemo(() => {
    const areas = AREA_ROWS.map((row) => {
      const length = Number.parseFloat(dimensions[row * 2]);
      const width = Number.parseFloat(dimensions[row * 2 + 1]);
      return (Number.isFinite(length) ? length : 0) * (Number.isFinite(width) ? width : 0);
    });

    return (areas[0] +
      (operators[0] === '+' ? areas[1] : -areas[1]) +
      (operators[1] === '+' ? areas[2] : -areas[2])) / 32400;
  }, [dimensions, operators]);

  const updateDimension = (index: number, value: string) => {
    setDimensions((previous) => previous.map((dimension, i) => (i === index ? value : dimension)));
  };

  const toggleOperator = (index: number, value: Operator) => {
    setOperators((previous) => ({ ...previous, [index]: value }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B312C]/55 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="area-calculator-title"
        className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-[#4A3F3A] bg-[#FFF8EE] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b-2 border-[#3B312C] bg-[#4A3F3A] px-5 py-4">
          <div>
            <h2 id="area-calculator-title" className="text-base font-bold text-[#FFF8EE]">
              坪數計算
            </h2>
            <p className="mt-0.5 text-xs text-[#E2CFC0]">輸入長、寬（公分），自動加總換算</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉坪數計算"
            className="rounded-lg p-1.5 text-[#E2CFC0] hover:bg-[#5E5049] hover:text-[#FFF8EE]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 px-5 py-5">
          {AREA_ROWS.map((row) => (
            <div key={row}>
              <div className="mb-1.5 text-xs font-bold text-[#7A675B]">第 {row + 1} 區</div>
              <div className="grid grid-cols-2 gap-3">
                {(['長', '寬'] as const).map((label, column) => {
                  const index = row * 2 + column;
                  return (
                    <label
                      key={label}
                      className="rounded-2xl border-2 border-[#DFCBB9] bg-[#F6E9DA] p-3"
                    >
                      <span className="mb-1 block text-xs font-bold text-[#7A675B]">
                        {label}（cm）
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        value={dimensions[index]}
                        onChange={(event) => updateDimension(index, event.target.value)}
                        aria-label={`第 ${row + 1} 區${label}（公分）`}
                        className="font-mono-tabular w-full bg-transparent text-lg font-bold text-[#3B312C] outline-none placeholder:text-[#B89F8D]"
                      />
                    </label>
                  );
                })}
              </div>
              {row < AREA_ROWS.length - 1 && (
                <div className="flex justify-center py-2">
                  <div
                    className="inline-flex rounded-xl border border-[#CBB5A5] bg-[#F6E9DA] p-1"
                    role="group"
                    aria-label={`第 ${row + 1} 區與第 ${row + 2} 區的運算符號`}
                  >
                    {(['+', '-'] as const).map((operator) => (
                      <button
                        key={operator}
                        type="button"
                        aria-label={`選擇${operator === '+' ? '加' : '減'}法`}
                        aria-pressed={operators[row] === operator}
                        onClick={() => toggleOperator(row, operator)}
                        className={`h-8 w-10 rounded-lg text-base font-bold transition-colors ${
                          operators[row] === operator
                            ? 'bg-[#4E7C64] text-[#FFF8EE]'
                            : 'text-[#4A3F3A] hover:bg-[#EAD6C2]'
                        }`}
                      >
                        {operator}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t-2 border-[#DFCBB9] bg-[#F6E9DA] px-5 py-4">
          <span className="text-sm font-bold text-[#3B312C]">計算結果</span>
          <span className="font-mono-tabular text-2xl font-bold text-[#3B6851]">
            {ping.toFixed(2)} <span className="text-base">坪</span>
          </span>
        </div>
      </div>
    </div>
  );
}
