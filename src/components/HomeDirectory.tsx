import { ArrowRight, Calculator, ClipboardList, Layers, Sparkles, Tag } from 'lucide-react';
import { ModuleId } from '../types/hvac';
import MascotBadge from './MascotBadge';

interface HomeDirectoryProps {
  onNavigate: (module: ModuleId) => void;
  productCount: number;
  quoteCount: number;
  surveyCount: number;
  activeSurveyRoomCount: number;
}

export default function HomeDirectory({
  onNavigate,
  productCount,
  quoteCount,
  surveyCount,
  activeSurveyRoomCount,
}: HomeDirectoryProps) {
  const modules: {
    id: ModuleId;
    index: string;
    title: string;
    subtitle: string;
    description: string;
    statLabel: string;
    icon: typeof Tag;
    accentClass: string;
  }[] = [
    {
      id: 'price',
      index: '01',
      title: '品牌價格查詢',
      subtitle: '多品牌機型規格與報價選配',
      description:
        '固定式多維篩選按鈕（品牌色碼、機型、整組/多聯、變頻/定速、階級備註）與無順序關鍵字搜尋，支援冷暖圖示識別、單鍵複製名稱、附件匯入及勾選製作報價單。',
      statLabel: `資料庫 ${productCount} 筆機型${quoteCount > 0 ? ` · 已選 ${quoteCount} 項` : ''}`,
      icon: Tag,
      accentClass: 'text-[#3B312C] bg-[#F6BE6B] border-[#D99D44]',
    },
    {
      id: 'survey',
      index: '02',
      title: '案場紀錄清單',
      subtitle: '現場工程條件與分室管線登錄',
      description:
        '鎖定案場資訊與施工項目（美化管槽、牆體洗孔、切溝鑿牆），快速新增各空間坪數、熱源、排水與內外銅管長度，搭配立體平面方格圖，一鍵匯出清單或 JPG 工程表格。',
      statLabel: `已存 ${surveyCount} 份案場 · 本案 ${activeSurveyRoomCount} 個空間`,
      icon: ClipboardList,
      accentClass: 'text-[#FFF8EE] bg-[#4E7C64] border-[#3C634F]',
    },
    {
      id: 'multisplit',
      index: '03',
      title: '多聯組合表',
      subtitle: '室外機型號與室內機組合一覽',
      description:
        '依附件整理一對多室外機型號、冷房容量及室內機級數組合，以品牌按鈕及 kW 遞增清單方式快速查詢，涵蓋冷暖型與冷專型。',
      statLabel: '支援 1對2 至 1對5 組合清單',
      icon: Layers,
      accentClass: 'text-[#FFF8EE] bg-[#D16047] border-[#B44C35]',
    },
    {
      id: 'piping',
      index: '04',
      title: '管路計算系統',
      subtitle: '銅管、控制線與電源線長度及金額計算',
      description:
        '依空間設定管徑與銅管、控制線、電源線長度，自動計算各迴路金額及總金額。',
      statLabel: '支援從案場紀錄清單一鍵帶入管長',
      icon: Calculator,
      accentClass: 'text-[#FFF8EE] bg-[#5C4F49] border-[#3B312C]',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:py-10">
      {/* 風格主視覺 Bento 歡迎看板（深可可底 + 奶油白卡片 + 蜜糖金點綴） */}
      <section className="bento-dark mb-4 overflow-hidden p-4 sm:mb-6 sm:p-7">
        <div className="grid grid-cols-1 items-center gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="flex flex-row items-center gap-3 sm:gap-4 lg:col-span-8">
            <MascotBadge size="lg" />
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F6BE6B] px-3 py-0.5 text-xs font-bold text-[#3B312C]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>小隼空調助手ver_4</span>
              </div>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-[#FFF8EE] text-balance sm:mt-2 sm:text-3xl">
                主頁目錄
              </h1>
              <p className="mt-1 max-w-xl line-clamp-2 text-xs leading-relaxed text-[#E5D3C5] sm:mt-1.5 sm:line-clamp-none sm:text-sm">
                整合冷氣品牌價目篩選、工地場勘平面圖與紀錄匯出、一對多組合試算及銅管冷媒計算，讓現場師傅在手機與平板上也能輕鬆完成報價與施作規劃。
              </p>
            </div>
          </div>

          {/* 右側奶油白狀態摘要卡 */}
          <div className="rounded-2xl border-2 border-[#D4BCAE] bg-[#FFF8EE] p-3 text-[#3B312C] sm:p-4 lg:col-span-4">
            <div className="flex items-center justify-between border-b border-[#E7D6C7] pb-2 sm:pb-2.5">
              <span className="text-xs font-bold text-[#7A665B]">今日現場作業概況</span>
              <span className="font-mono-tabular rounded-md bg-[#F5E6D5] px-2 py-0.5 text-[11px] font-bold text-[#4A3F3A]">
                READY
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center sm:mt-3">
              <div className="rounded-xl bg-[#F6E8D7] px-1.5 py-1.5 sm:px-2 sm:py-2">
                <div className="font-mono-tabular text-base font-bold text-[#3B312C] sm:text-lg">
                  {productCount}
                </div>
                <div className="text-[10px] font-medium text-[#7A665B] sm:text-[11px]">機型庫存</div>
              </div>
              <div className="rounded-xl bg-[#F6E8D7] px-1.5 py-1.5 sm:px-2 sm:py-2">
                <div className="font-mono-tabular text-base font-bold text-[#3B312C] sm:text-lg">
                  {surveyCount}
                </div>
                <div className="text-[10px] font-medium text-[#7A665B] sm:text-[11px]">案場清單</div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(quoteCount > 0 ? 'quote' : 'price')}
                className="rounded-xl bg-[#F6BE6B] px-1.5 py-1.5 transition-colors hover:bg-[#F3AF48] sm:px-2 sm:py-2"
              >
                <div className="font-mono-tabular text-base font-bold text-[#3B312C] sm:text-lg">
                  {quoteCount}
                </div>
                <div className="text-[10px] font-bold text-[#3B312C] sm:text-[11px]">
                  {quoteCount > 0 ? '前往報價' : '待選報價'}
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2x2 功能 Bento 卡片區 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onNavigate(mod.id)}
              className="bento-card group flex flex-col justify-between p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#4A3F3A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A3F3A] sm:p-6"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 shadow-[0_2px_0_rgba(59,49,44,0.12)] sm:h-12 sm:w-12 ${mod.accentClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <span className="font-mono-tabular text-[11px] font-bold text-[#917B6F] sm:text-xs">
                        {mod.index}.
                      </span>
                      <h2 className="text-base font-bold text-[#3B312C] transition-colors group-hover:text-[#B46326] sm:text-lg">
                        {mod.title}
                      </h2>
                    </div>
                  </div>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E6D5] text-[#5C4F49] transition-all group-hover:bg-[#F6BE6B] group-hover:text-[#3B312C] sm:h-8 sm:w-8">
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </div>

                <p className="mt-2 text-xs font-semibold text-[#5C4F49] sm:mt-3.5 sm:text-sm">
                  {mod.subtitle}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#7A665B] sm:mt-1.5 sm:line-clamp-none sm:text-sm">
                  {mod.description}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[#E8D7C8] pt-3 text-[11px] sm:mt-5 sm:pt-4 sm:text-xs">
                <span className="font-mono-tabular font-medium text-[#7A665B]">
                  {mod.statLabel}
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-lg bg-[#4A3F3A] px-2.5 py-1 font-bold text-[#FFF8EE] transition-colors group-hover:bg-[#F6BE6B] group-hover:text-[#3B312C] sm:px-3">
                  進入系統
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
