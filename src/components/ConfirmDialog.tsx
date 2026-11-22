import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title = '確認刪除',
  message,
  confirmLabel = '確定刪除',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#3B312C]/55 p-4 backdrop-blur-[1px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-[#4A3F3A] bg-[#FFF8EE] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D16047]/30 bg-[#FBEAE5] text-[#D16047]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-[#3B312C]">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[#6D5B51] break-words">{message}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[42px] rounded-xl border-2 border-[#D2BEB0] bg-[#F5E6D5] px-4 py-2 text-sm font-bold text-[#4A3F3A] transition-colors hover:bg-[#EAD6C1]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className="min-h-[42px] rounded-xl border-2 border-[#A84732] bg-[#D16047] px-4 py-2 text-sm font-bold text-[#FFF8EE] transition-colors hover:bg-[#BA5039]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
