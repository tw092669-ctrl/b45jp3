import { useState } from 'react';
import {
  Calculator,
  Check,
  Copy,
  Download,
  FileImage,
  FileText,
  FolderPlus,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { HeatSourceType, RoomSurveyEntry, SiteSurveyRecord as SurveyRecordType } from '../types/hvac';
import ConfirmDialog from './ConfirmDialog';
import FloorPlanGridSection, {
  createDefaultFloorPlan,
  renderFloorPlanCanvas,
} from './FloorPlanGridSection';
import AreaCalculatorModal from './AreaCalculatorModal';

interface SiteSurveyRecordProps {
  surveys: SurveyRecordType[];
  activeSurveyId: string;
  onSelectSurvey: (id: string) => void;
  onCreateSurvey: () => void;
  onDeleteSurvey: (id: string) => void;
  onUpdateSurvey: (updated: SurveyRecordType) => void;
  onSendToPiping?: (survey: SurveyRecordType) => void;
}

const PRESET_AREAS = ['客廳', '主臥', '次臥', '書房'] as const;
const HEAT_SOURCES: HeatSourceType[] = ['無', '西曬', '頂樓'];

export function createEmptyRoom(): RoomSurveyEntry {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    area: '客廳',
    location: '',
    ping: '',
    heatSource: '無',
    drainage: '',
    indoorPipeLength: '',
    outdoorPipeLength: '',
    note: '',
  };
}

export default function SiteSurveyRecord({
  surveys,
  activeSurveyId,
  onSelectSurvey,
  onCreateSurvey,
  onDeleteSurvey,
  onUpdateSurvey,
  onSendToPiping,
}: SiteSurveyRecordProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAreaCalculator, setShowAreaCalculator] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const activeSurvey = surveys.find((s) => s.id === activeSurveyId) || surveys[0];

  const updateField = <K extends keyof SurveyRecordType>(key: K, value: SurveyRecordType[K]) => {
    onUpdateSurvey({
      ...activeSurvey,
      [key]: value,
      updatedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
    });
  };

  const updateRoom = (roomId: string, patch: Partial<RoomSurveyEntry>) => {
    const updatedRooms = activeSurvey.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r));
    updateField('rooms', updatedRooms);
  };

  const addRoom = () => {
    const nextRoom = createEmptyRoom();
    // Smart default area progression
    const count = activeSurvey.rooms.length;
    if (count === 1) nextRoom.area = '主臥';
    else if (count === 2) nextRoom.area = '次臥';
    else if (count === 3) nextRoom.area = '書房';
    else nextRoom.area = '';
    updateField('rooms', [...activeSurvey.rooms, nextRoom]);
  };

  const duplicateRoom = (room: RoomSurveyEntry) => {
    const copy: RoomSurveyEntry = {
      ...room,
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const idx = activeSurvey.rooms.findIndex((r) => r.id === room.id);
    const next = [...activeSurvey.rooms];
    next.splice(idx + 1, 0, copy);
    updateField('rooms', next);
  };

  const removeRoom = (roomId: string) => {
    if (activeSurvey.rooms.length <= 1) return;
    updateField(
      'rooms',
      activeSurvey.rooms.filter((r) => r.id !== roomId)
    );
  };

  const buildPlainTextReport = () => {
    const flags = [
      `美化管槽: ${activeSurvey.ductBeautification ? '☑ 是' : '☐ 否'}`,
      `牆體洗孔: ${activeSurvey.wallCoreDrilling ? '☑ 是' : '☐ 否'}`,
      `切溝鑿牆: ${activeSurvey.wallChasing ? '☑ 是' : '☐ 否'}`,
    ].join('  |  ');

    const totalIndoor = activeSurvey.rooms.reduce(
      (s, r) => s + (parseFloat(r.indoorPipeLength) || 0),
      0
    );
    const totalOutdoor = activeSurvey.rooms.reduce(
      (s, r) => s + (parseFloat(r.outdoorPipeLength) || 0),
      0
    );

    const fp = activeSurvey.floorPlan;
    const fpLines: string[] = [];
    if (fp && Object.keys(fp.cells).length > 0) {
      const counts = new Array(8).fill(0);
      for (const key in fp.cells) {
        const idx = fp.cells[key];
        if (idx >= 0 && idx < 8) counts[idx]++;
      }
      const cellCm2 = fp.cellSizeCm * fp.cellSizeCm;
      fpLines.push('────────────────────────────────────────');
      fpLines.push(
        `【平面方格坪數統計】(每格 ${fp.cellSizeCm}×${fp.cellSizeCm} cm | 指南針 ${fp.compassAngle}°)`
      );
      fp.palette.forEach((zone) => {
        if (counts[zone.id] > 0) {
          const ping = ((counts[zone.id] * cellCm2) / 32400).toFixed(1);
          fpLines.push(`  ■ ${zone.name}：${counts[zone.id]} 格 ≈ ${ping} 坪`);
        }
      });
    }

    const lines: string[] = [
      '════════════════════════════════════════',
      '【空調案場紀錄清單】',
      `建案 / 地址：${activeSurvey.projectOrAddress || '（未填寫）'}`,
      `設計師：${activeSurvey.designer || '（未填寫）'}`,
      `施作項目：${flags}`,
      `紀錄時間：${activeSurvey.updatedAt}`,
      '────────────────────────────────────────',
      ...activeSurvey.rooms.map((r, i) => {
        return [
          `#${i + 1} 區域：${r.area || '未填'}  |  位置：${r.location || '—'}  |  坪數：${
            r.ping ? `${r.ping}坪` : '—'
          }  |  熱源：${r.heatSource || '無'}`,
          `    排水：${r.drainage || '—'}  |  室內銅管：${
            r.indoorPipeLength ? `${r.indoorPipeLength}m` : '—'
          }  |  室外銅管：${r.outdoorPipeLength ? `${r.outdoorPipeLength}m` : '—'}`,
          r.note ? `    備註：${r.note}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      }),
      '────────────────────────────────────────',
      `銅管長度統計：室內合計 ${totalIndoor.toFixed(1)} m  /  室外合計 ${totalOutdoor.toFixed(
        1
      )} m  /  總長 ${(totalIndoor + totalOutdoor).toFixed(1)} m`,
      ...fpLines,
      '════════════════════════════════════════',
    ];
    return lines.join('\n');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainTextReport());
      setCopiedText(true);
      setTimeout(() => {
        setCopiedText(false);
        setShowExportMenu(false);
      }, 1200);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownloadTxt = () => {
    const content = buildPlainTextReport();
    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `案場紀錄清單_${activeSurvey.projectOrAddress || '未命名案場'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // High-resolution JPG table export using HTML5 Canvas 2D API (no external DOM capture bugs)
  const handleExportJpg = () => {
    const fp = activeSurvey.floorPlan;
    const hasFloorPlan = Boolean(fp && Object.keys(fp.cells).length > 0);
    const scale = 2;
    const width = 1280;
    const rowHeight = 54;
    const headerHeight = 190;
    const tableHeaderHeight = 46;
    const footerHeight = 76;
    const floorPlanBlockHeight = hasFloorPlan ? 580 : 0;
    const totalHeight =
      headerHeight +
      tableHeaderHeight +
      activeSurvey.rooms.length * rowHeight +
      footerHeight +
      floorPlanBlockHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = totalHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, totalHeight);

    // Top banner bar
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, 64);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('空調工程 — 案場紀錄清單', 32, 41);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px "JetBrains Mono", "Noto Sans TC", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`更新時間：${activeSurvey.updatedAt}`, width - 32, 38);
    ctx.textAlign = 'left';

    // Project Info Box
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(32, 82, width - 64, 92);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(32, 82, width - 64, 92);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(`建案 / 地址：${activeSurvey.projectOrAddress || '（未填寫）'}`, 52, 114);
    ctx.fillText(`設計師：${activeSurvey.designer || '（未填寫）'}`, 760, 114);

    const drawCheck = (label: string, checked: boolean, x: number, y: number) => {
      ctx.strokeStyle = checked ? '#0369A1' : '#64748B';
      ctx.fillStyle = checked ? '#0369A1' : '#FFFFFF';
      ctx.fillRect(x, y - 14, 16, 16);
      ctx.strokeRect(x, y - 14, 16, 16);
      if (checked) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 3, y - 6);
        ctx.lineTo(x + 7, y - 2);
        ctx.lineTo(x + 13, y - 11);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = '15px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(label, x + 24, y);
    };

    drawCheck('美化管槽', activeSurvey.ductBeautification, 52, 154);
    drawCheck('牆體洗孔', activeSurvey.wallCoreDrilling, 210, 154);
    drawCheck('切溝鑿牆', activeSurvey.wallChasing, 368, 154);

    // Table columns
    const cols = [
      { label: '項次', w: 54 },
      { label: '區域', w: 110 },
      { label: '位置', w: 160 },
      { label: '坪數', w: 80 },
      { label: '熱源', w: 90 },
      { label: '排水', w: 170 },
      { label: '室內銅管(m)', w: 120 },
      { label: '室外銅管(m)', w: 120 },
      { label: '備註', w: width - 64 - (54 + 110 + 160 + 80 + 90 + 170 + 120 + 120) },
    ];

    let curY = headerHeight;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(32, curY, width - 64, tableHeaderHeight);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(32, curY, width - 64, tableHeaderHeight);

    let curX = 32;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    cols.forEach((col) => {
      ctx.fillText(col.label, curX + 10, curY + 28);
      curX += col.w;
    });

    curY += tableHeaderHeight;

    activeSurvey.rooms.forEach((room, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      ctx.fillRect(32, curY, width - 64, rowHeight);
      ctx.strokeStyle = '#CBD5E1';
      ctx.strokeRect(32, curY, width - 64, rowHeight);

      const values = [
        `${idx + 1}`,
        room.area || '—',
        room.location || '—',
        room.ping ? `${room.ping}坪` : '—',
        room.heatSource || '無',
        room.drainage || '—',
        room.indoorPipeLength ? `${room.indoorPipeLength} m` : '—',
        room.outdoorPipeLength ? `${room.outdoorPipeLength} m` : '—',
        room.note || '—',
      ];

      let cx = 32;
      ctx.fillStyle = '#1E293B';
      ctx.font = '14px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      values.forEach((val, cIdx) => {
        ctx.beginPath();
        ctx.moveTo(cx, curY);
        ctx.lineTo(cx, curY + rowHeight);
        ctx.strokeStyle = '#E2E8F0';
        ctx.stroke();

        const maxChars = Math.floor((cols[cIdx].w - 16) / 13);
        const text = val.length > maxChars ? val.slice(0, Math.max(2, maxChars - 1)) + '…' : val;
        ctx.fillText(text, cx + 10, curY + 32);
        cx += cols[cIdx].w;
      });

      curY += rowHeight;
    });

    // Summary Footer
    const totalIndoor = activeSurvey.rooms.reduce(
      (s, r) => s + (parseFloat(r.indoorPipeLength) || 0),
      0
    );
    const totalOutdoor = activeSurvey.rooms.reduce(
      (s, r) => s + (parseFloat(r.outdoorPipeLength) || 0),
      0
    );

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 15px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(
      `空間總數：${activeSurvey.rooms.length} 處   |   室內銅管合計：${totalIndoor.toFixed(
        1
      )} m   |   室外銅管合計：${totalOutdoor.toFixed(1)} m   |   預估總銅管：${(
        totalIndoor + totalOutdoor
      ).toFixed(1)} m`,
      32,
      curY + 42
    );

    if (hasFloorPlan && fp) {
      const fpStartY = curY + footerHeight;
      ctx.strokeStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.moveTo(32, fpStartY);
      ctx.lineTo(width - 32, fpStartY);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(
        `平面立體方格圖（每格 ${fp.cellSizeCm}×${fp.cellSizeCm} cm | 指南針方位 ${fp.compassAngle}°）`,
        32,
        fpStartY + 34
      );

      // Render floorplan graphic
      const fpSize = 500;
      const fpX = 32;
      const fpY = fpStartY + 52;
      const rotation = (fp.compassAngle * Math.PI) / 180;
      const fitScale = 1 / (Math.abs(Math.cos(rotation)) + Math.abs(Math.sin(rotation)));
      ctx.save();
      ctx.translate(fpX, fpY);
      ctx.translate(fpSize / 2, fpSize / 2);
      ctx.rotate(rotation);
      ctx.scale(fitScale, fitScale);
      ctx.translate(-fpSize / 2, -fpSize / 2);
      renderFloorPlanCanvas(ctx, fpSize, fpSize, fp);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, fpSize, fpSize);
      ctx.restore();

      // Draw compact compass badge on exported image
      ctx.save();
      ctx.translate(fpX + fpSize - 42, fpY + 42);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(5, 0);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(5, 0);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#E11D48';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('北', 0, -18);
      ctx.restore();

      // Zone ping breakdown next to floorplan
      const counts = new Array(8).fill(0);
      let totalCells = 0;
      for (const k in fp.cells) {
        const idx = fp.cells[k];
        if (idx >= 0 && idx < 8) {
          counts[idx]++;
          totalCells++;
        }
      }
      const cellCm2 = fp.cellSizeCm * fp.cellSizeCm;
      let legY = fpY + 24;
      const legX = fpX + fpSize + 40;
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(
        `分區坪數統計（總計 ${((totalCells * cellCm2) / 32400).toFixed(1)} 坪）`,
        legX,
        legY
      );
      legY += 32;

      fp.palette.forEach((zone) => {
        const count = counts[zone.id];
        if (count <= 0) return;
        const ping = ((count * cellCm2) / 32400).toFixed(1);
        ctx.fillStyle = zone.color;
        ctx.fillRect(legX, legY - 14, 18, 18);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(legX, legY - 14, 18, 18);

        ctx.fillStyle = '#1E293B';
        ctx.font = '15px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
        ctx.fillText(`${zone.name}：${ping} 坪 (${count} 格)`, legX + 28, legY);
        legY += 34;
      });
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `案場紀錄清單_${activeSurvey.projectOrAddress || '未命名案場'}.jpg`;
    a.click();
    setShowExportMenu(false);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-3 pb-24 pt-3 sm:px-6 sm:pt-5">
      {/* 案場快速切換列 */}
      <div className="mb-2 flex flex-col gap-1.5 sm:mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x sm:flex-wrap sm:overflow-visible">
          {surveys.map((s) => {
            const isActive = s.id === activeSurvey.id;
            return (
              <div key={s.id} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => onSelectSurvey(s.id)}
                  className={`rounded-xl border-2 px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap sm:px-3.5 ${
                    isActive
                      ? 'border-[#3B312C] bg-[#4A3F3A] text-[#F6BE6B] shadow-[0_2px_0_rgba(59,49,44,0.2)]'
                      : 'border-[#CBB5A5] bg-[#FFF8EE] text-[#3B312C] hover:bg-[#F5E6D5]'
                  }`}
                >
                  {s.projectOrAddress.trim() || '未命名案場'} ({s.rooms.length})
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onCreateSurvey}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-dashed border-[#CBB5A5] bg-[#FFF8EE]/80 px-2.5 py-1.5 text-xs font-bold text-[#7A675B] hover:border-[#D9822B] hover:text-[#3B312C] whitespace-nowrap sm:px-3"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            新案場
          </button>
        </div>

        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto overscroll-x-contain sm:gap-2 sm:overflow-visible">
          {onSendToPiping && (
            <button
              type="button"
              onClick={() => onSendToPiping(activeSurvey)}
              className="shrink-0 rounded-xl border-2 border-[#C68934] bg-[#F6BE6B] px-2.5 py-1.5 text-xs font-bold text-[#3B312C] shadow-[0_2px_0_rgba(59,49,44,0.16)] hover:bg-[#F3AF48] whitespace-nowrap sm:px-3.5"
            >
              帶入管路計算系統
            </button>
          )}
          {surveys.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setPendingDelete({
                  title: '確認刪除案場',
                  message: `確定要刪除「${activeSurvey.projectOrAddress.trim() || '未命名案場'}」的所有案場紀錄嗎？`,
                  onConfirm: () => {
                    setPendingDelete(null);
                    onDeleteSurvey(activeSurvey.id);
                  },
                })
              }
              className="shrink-0 rounded-xl border-2 border-[#E6B0A3] bg-[#FDECE7] px-2.5 py-1.5 text-xs font-bold text-[#A43B24] hover:bg-[#FAD7CD] whitespace-nowrap sm:px-3"
            >
              刪除此案場
            </button>
          )}
        </div>
      </div>

      {/* 上方固定顯示區塊：建案or地址、設計師、美化管槽、牆體洗孔、切溝鑿牆 + 右上匯出 */}
      <section
        aria-label="案場基本資料與施作勾選"
        className="bento-card p-3 backdrop-blur-sm sm:p-4 lg:sticky lg:top-[64px] lg:z-20"
      >
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-12">
            {/* 建案 or 地址 */}
            <div className="col-span-2 lg:col-span-5">
              <label className="mb-1 block text-xs font-bold text-[#7A675B]">
                建案 or 地址
              </label>
              <input
                type="text"
                value={activeSurvey.projectOrAddress}
                onChange={(e) => updateField('projectOrAddress', e.target.value)}
                placeholder="輸入建案名稱或工地地址"
                className="w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:px-3 sm:py-2"
              />
            </div>

            {/* 設計師 */}
            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-bold text-[#7A675B]">設計師</label>
              <input
                type="text"
                value={activeSurvey.designer}
                onChange={(e) => updateField('designer', e.target.value)}
                placeholder="輸入設計師 / 聯絡人"
                className="w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1.5 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:px-3 sm:py-2"
              />
            </div>

            {/* 美化管槽、牆體洗孔、切溝鑿牆 (用框框打勾) */}
            <div className="col-span-2 flex flex-wrap items-end gap-x-3 gap-y-2 sm:col-span-2 sm:gap-4 lg:col-span-4 lg:pb-1.5">
              {(
                [
                  { key: 'ductBeautification', label: '美化管槽' },
                  { key: 'wallCoreDrilling', label: '牆體洗孔' },
                  { key: 'wallChasing', label: '切溝鑿牆' },
                ] as const
              ).map(({ key, label }) => {
                const checked = activeSurvey[key];
                return (
                  <label
                    key={key}
                    className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs font-bold text-[#3B312C] sm:gap-2 sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => updateField(key, e.target.checked)}
                      className="sr-only"
                    />
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-md border-2 transition-colors sm:h-5 sm:w-5 ${
                        checked
                          ? 'border-[#3B312C] bg-[#4E7C64] text-[#FFF8EE]'
                          : 'border-[#B89F8D] bg-[#FFFDF9] text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3] sm:h-3.5 sm:w-3.5" />
                    </span>
                    <span className="whitespace-nowrap">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 右上「匯出」圖示與選單 */}
          <div className="relative shrink-0 self-end lg:self-center">
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#3B312C] bg-[#4A3F3A] px-3 py-2 text-sm font-bold text-[#F6BE6B] shadow-[0_2px_0_rgba(59,49,44,0.2)] transition-colors hover:bg-[#3B312C] whitespace-nowrap sm:px-4 sm:py-2.5"
            >
              <Share2 className="h-4 w-4" />
              <span>匯出</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border-2 border-[#4A3F3A] bg-[#FFF8EE] p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-[#3B312C] hover:bg-[#F5E6D5]"
                >
                  {copiedText ? (
                    <Check className="h-4 w-4 text-[#4E7C64]" />
                  ) : (
                    <Copy className="h-4 w-4 text-[#7A675B]" />
                  )}
                  <span>{copiedText ? '已複製文字清單' : '複製純文字清單'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-[#3B312C] hover:bg-[#F5E6D5]"
                >
                  <FileText className="h-4 w-4 text-[#7A675B]" />
                  <span>匯出文字檔 (.txt)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJpg}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-[#7A4A0B] hover:bg-[#FDF0D5]"
                >
                  <FileImage className="h-4 w-4 text-[#C68934]" />
                  <span>匯出表格圖片 (.jpg)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 下方：可自行輸入文字的泡泡群組 */}
      <section aria-label="案場紀錄清單列表" className="mt-3 space-y-3 sm:mt-5 sm:space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowAreaCalculator(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#3C634F] bg-[#4E7C64] px-3 py-2 text-sm font-bold text-[#FFF8EE] shadow-[0_2px_0_rgba(59,49,44,0.16)] transition-colors hover:bg-[#416A55]"
          >
            <Calculator className="h-4 w-4" />
            坪數計算
          </button>
        </div>
        {activeSurvey.rooms.map((room, index) => (
          <div
            key={room.id}
            className="bento-card p-3 transition-colors hover:border-[#B69D8B] sm:p-5"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8D8C8] pb-2 sm:mb-4 sm:pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono-tabular inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[#3B312C] bg-[#4A3F3A] text-xs font-bold text-[#F6BE6B] sm:h-7 sm:w-7">
                  {index + 1}
                </span>
                <span className="text-sm font-bold text-[#3B312C]">
                  {room.area ? `${room.area}` : `空間 #${index + 1}`}
                  {room.ping ? ` · ${room.ping} 坪` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => duplicateRoom(room)}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#CBB5A5] bg-[#F6E9DA] px-2 py-1 text-xs font-bold text-[#3B312C] hover:bg-[#EAD6C2] sm:px-2.5"
                >
                  <Download className="h-3 w-3 rotate-180" />
                  複製一組
                </button>
                {activeSurvey.rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({
                        title: '確認移除空間紀錄',
                        message: `確定要刪除「${room.area || `空間 #${index + 1}`}」這筆空間紀錄嗎？`,
                        onConfirm: () => {
                          setPendingDelete(null);
                          removeRoom(room.id);
                        },
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E6B0A3] bg-[#FDECE7] px-2 py-1 text-xs font-bold text-[#A43B24] hover:bg-[#FAD7CD] sm:px-2.5"
                  >
                    <Trash2 className="h-3 w-3" />
                    移除
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
              {/* 區域 (客廳、主臥、次臥、書房 + 自訂輸入) */}
              <div className="col-span-2 lg:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[#7A675B] sm:mb-1.5">區域</label>
                <div className="flex flex-wrap items-center gap-1">
                  {PRESET_AREAS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateRoom(room.id, { area: preset })}
                      className={`rounded-lg border px-2 py-1 text-xs font-bold transition-colors whitespace-nowrap sm:px-2.5 sm:py-1.5 ${
                        room.area === preset
                          ? 'border-[#C68934] bg-[#F6BE6B] text-[#3B312C]'
                          : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#3B312C] hover:bg-[#EAD6C2]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={room.area}
                    onChange={(e) => updateRoom(room.id, { area: e.target.value })}
                    placeholder="或自行輸入區域名稱"
                    className="min-w-[120px] flex-1 rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:min-w-[140px] sm:px-3 sm:py-1.5"
                  />
                </div>
              </div>

              {/* 位置 */}
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7A675B] sm:mb-1.5">位置</label>
                <input
                  type="text"
                  value={room.location}
                  onChange={(e) => updateRoom(room.id, { location: e.target.value })}
                  placeholder="例：窗簾盒左側樑下"
                  className="w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:px-3 sm:py-1.5"
                />
              </div>

              {/* 坪數 */}
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7A675B] sm:mb-1.5">坪數</label>
                <div className="relative">
                  <input
                    type="text"
                    value={room.ping}
                    onChange={(e) => updateRoom(room.id, { ping: e.target.value })}
                    placeholder="例：6.5"
                    className="font-mono-tabular w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1 pr-9 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:px-3 sm:py-1.5"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A7567]">
                    坪
                  </span>
                </div>
              </div>

              {/* 熱源 (無、西曬、頂樓) */}
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7A675B] sm:mb-1.5">熱源</label>
                <div className="flex items-center gap-1.5">
                  {HEAT_SOURCES.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => updateRoom(room.id, { heatSource: src })}
                      className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                        room.heatSource === src
                          ? src === '無'
                            ? 'border-[#3B312C] bg-[#4A3F3A] text-[#FFF8EE]'
                            : 'border-[#A43B24] bg-[#D16047] text-[#FFF8EE]'
                          : 'border-[#DFCBB9] bg-[#F6E9DA] text-[#3B312C] hover:bg-[#EAD6C2]'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              {/* 排水 */}
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7A675B] sm:mb-1.5">排水</label>
                <input
                  type="text"
                  value={room.drainage}
                  onChange={(e) => updateRoom(room.id, { drainage: e.target.value })}
                  placeholder="例：陽台地排 / 需加裝排水器"
                  className="w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:px-3 sm:py-1.5"
                />
              </div>

              {/* 室內銅管長度 */}
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7A675B] sm:mb-1.5">
                  室內銅管長度
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={room.indoorPipeLength}
                    onChange={(e) => updateRoom(room.id, { indoorPipeLength: e.target.value })}
                    placeholder="例：5.5"
                    className="font-mono-tabular w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1 pr-9 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:px-3 sm:py-1.5"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A7567]">
                    m
                  </span>
                </div>
              </div>

              {/* 室外銅管長度 */}
              <div>
                <label className="mb-1 block text-xs font-bold text-[#7A675B] sm:mb-1.5">
                  室外銅管長度
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={room.outdoorPipeLength}
                    onChange={(e) => updateRoom(room.id, { outdoorPipeLength: e.target.value })}
                    placeholder="例：3.5"
                    className="font-mono-tabular w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1 pr-9 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:px-3 sm:py-1.5"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A7567]">
                    m
                  </span>
                </div>
              </div>

              {/* 備註 */}
              <div className="col-span-2 md:col-span-2 lg:col-span-4">
                <label className="mb-1 block text-xs font-bold text-[#7A675B] sm:mb-1.5">備註</label>
                <input
                  type="text"
                  value={room.note}
                  onChange={(e) => updateRoom(room.id, { note: e.target.value })}
                  placeholder="電源位置、迴風空間、洗孔尺寸或特殊裝潢配合事項..."
                  className="w-full rounded-xl border border-[#DFCBB9] bg-[#F6E9DA] px-2.5 py-1 text-sm text-[#3B312C] placeholder:text-[#A48F7E] focus:border-[#D9822B] focus:bg-[#FFFDF9] focus:outline-none sm:px-3 sm:py-1.5"
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* 最下方新增區塊：80x80 灰底棋盤式立體空間方格與指南針 */}
      <FloorPlanGridSection
        floorPlan={activeSurvey.floorPlan ?? createDefaultFloorPlan()}
        onChange={(nextFloorPlan) => updateField('floorPlan', nextFloorPlan)}
      />

      {showAreaCalculator && (
        <AreaCalculatorModal onClose={() => setShowAreaCalculator(false)} />
      )}

      {/* 右下浮動的「+」圖示，點擊後新增一組新的 */}
      <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={addRoom}
          aria-label="新增一組空間紀錄"
          title="新增一組空間紀錄"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#3B312C] bg-[#F6BE6B] text-[#3B312C] shadow-[0_6px_0_rgba(59,49,44,0.28)] transition-transform duration-150 hover:scale-105 hover:bg-[#F3AF48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B312C] sm:h-14 sm:w-14"
        >
          <Plus className="h-6 w-6 stroke-[2.5] sm:h-7 sm:w-7" />
        </button>
      </div>
      {/* 刪除確認提醒視窗 */}
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={pendingDelete?.title}
        message={pendingDelete?.message ?? ''}
        onConfirm={() => pendingDelete?.onConfirm()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
