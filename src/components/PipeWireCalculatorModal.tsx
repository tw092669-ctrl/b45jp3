import { useMemo, useState } from 'react';
import { Minus, Plus, X, Zap } from 'lucide-react';
import { PIPE_WIRE_CATALOG, PipeWireSpec } from '../data/pipeWireCatalog';
import { ConstructionLineItem } from '../types/hvac';
import ConfirmDialog from './ConfirmDialog';

interface PipeWireCalculatorModalProps {
  isOpen: boolean;
  initialItems: ConstructionLineItem[];
  onClose: () => void;
  onConfirm: (calculatedItems: ConstructionLineItem[]) => void;
}

export default function PipeWireCalculatorModal({
  isOpen,
  initialItems,
  onClose,
  onConfirm,
}: PipeWireCalculatorModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    PIPE_WIRE_CATALOG.forEach((spec) => {
      const existing = initialItems.find((item) => item.sourceKey === spec.key);
      init[spec.key] = existing && typeof existing.quantity === 'number' ? existing.quantity : 0;
    });
    return init;
  });
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const totalAmount = useMemo(() => {
    return PIPE_WIRE_CATALOG.reduce((sum, spec) => {
      const qty = quantities[spec.key] || 0;
      return sum + qty * spec.unitPrice;
    }, 0);
  }, [quantities]);

  if (!isOpen) return null;

  const updateQty = (key: string, nextValue: number) => {
    setQuantities((prev) => ({
      ...prev,
      [key]: Math.max(0, nextValue),
    }));
  };

  const handleClear = () => {
    const cleared: Record<string, number> = {};
    PIPE_WIRE_CATALOG.forEach((s) => {
      cleared[s.key] = 0;
    });
    setQuantities(cleared);
  };

  const handleConfirm = () => {
    const result: ConstructionLineItem[] = PIPE_WIRE_CATALOG.filter(
      (spec) => (quantities[spec.key] || 0) > 0
    ).map((spec) => ({
      id: `calc-${spec.key}-${Date.now()}`,
      name: spec.name,
      spec: spec.unitLabel,
      quantity: quantities[spec.key],
      unitPrice: spec.unitPrice,
      sourceKey: spec.key,
    }));
    onConfirm(result);
    onClose();
  };

  const groups: {
    title: PipeWireSpec['category'];
    dotClass: string;
  }[] = [
    { title: '管路規格', dotClass: 'bg-[#4E7C64]' },
    { title: '訊號線', dotClass: 'bg-[#F6BE6B]' },
    { title: '電源線', dotClass: 'bg-[#D16047]' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B312C]/55 p-4 backdrop-blur-[1px]">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-[#4A3F3A] bg-[#FFF8EE] shadow-2xl">
        {/* 頂部可可深色標題列 */}
        <div className="flex items-center justify-between border-b-2 border-[#3B312C] bg-[#4A3F3A] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F6BE6B] text-[#3B312C] shadow-xs">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#FFF8EE]">管路電線計算器</h2>
              <p className="text-xs text-[#E2CFC0]">快速計算管路與電線費用</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉計算器"
            className="rounded-lg p-1.5 text-[#E2CFC0] hover:bg-[#5E5049] hover:text-[#FFF8EE]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 可滾動規格清單 */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {groups.map((group) => {
            const items = PIPE_WIRE_CATALOG.filter((s) => s.category === group.title);
            return (
              <div key={group.title} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${group.dotClass}`} />
                  <h3 className="text-xs font-bold text-[#4A3F3A]">{group.title}</h3>
                </div>

                <div className="space-y-2">
                  {items.map((spec) => {
                    const qty = quantities[spec.key] || 0;
                    return (
                      <div
                        key={spec.key}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#3B312C]">{spec.name}</p>
                          <p className="font-mono-tabular text-xs text-[#7A665B]">
                            ${spec.unitPrice}/{spec.unitLabel}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateQty(spec.key, qty - 1)}
                            aria-label={`減少 ${spec.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBB5A5] bg-[#FFF8EE] text-[#4A3F3A] hover:bg-[#F6BE6B]/30"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={qty === 0 ? '' : qty}
                            placeholder=""
                            onChange={(e) => {
                              const parsed = parseFloat(e.target.value);
                              updateQty(spec.key, Number.isNaN(parsed) ? 0 : parsed);
                            }}
                            className="font-mono-tabular h-8 w-16 rounded-lg border border-[#CBB5A5] bg-[#FFF8EE] px-2 text-center text-sm font-bold text-[#3B312C] focus:border-[#D9822B] focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => updateQty(spec.key, qty + 1)}
                            aria-label={`增加 ${spec.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBB5A5] bg-[#FFF8EE] text-[#4A3F3A] hover:bg-[#F6BE6B]/30"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 總計金額卡 */}
          <div className="flex items-center justify-between rounded-2xl border-2 border-[#4E7C64] bg-[#EAF3EE] px-4 py-3.5">
            <span className="text-sm font-bold text-[#3B312C]">總計金額</span>
            <span className="font-mono-tabular text-xl font-bold text-[#3B6851]">
              ${totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 底部操作列：清除 + 確認計算 */}
        <div className="grid grid-cols-2 gap-3 border-t-2 border-[#DFCBB9] bg-[#F6E9DA] px-5 py-4">
          <button
            type="button"
            onClick={() => {
              const hasAnyQty = Object.values(quantities).some((q) => q > 0);
              if (hasAnyQty) {
                setConfirmClearOpen(true);
              }
            }}
            className="rounded-xl border-2 border-[#CBB5A5] bg-[#FFF8EE] py-2.5 text-sm font-bold text-[#4A3F3A] transition-colors hover:bg-[#EAD7C4]"
          >
            清除
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl border-2 border-[#3C634F] bg-[#4E7C64] py-2.5 text-sm font-bold text-[#FFF8EE] transition-colors hover:bg-[#416A55]"
          >
            確認計算
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="確認清除計算數量"
        message="確定要清除所有已輸入的管路與電線數量嗎？"
        confirmLabel="確定清除"
        onConfirm={() => {
          setConfirmClearOpen(false);
          handleClear();
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
