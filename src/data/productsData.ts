import { ClimateMode, HvacProduct, InverterType, SetType } from '../types/hvac';

export interface BrandColorTheme {
  bg: string;
  text: string;
  border: string;
  activeBg: string;
  activeText: string;
  activeRing: string;
  badgeBg: string;
  badgeText: string;
}

const DEFAULT_BRAND_THEME: BrandColorTheme = {
  bg: 'bg-slate-50 hover:bg-slate-100',
  text: 'text-slate-700',
  border: 'border-slate-300',
  activeBg: 'bg-slate-800',
  activeText: 'text-white',
  activeRing: 'ring-slate-600/30',
  badgeBg: 'bg-slate-100',
  badgeText: 'text-slate-700',
};

export const BRAND_COLOR_MAP: Record<string, BrandColorTheme> = {
  日立: {
    bg: 'bg-rose-50 hover:bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    activeBg: 'bg-rose-700',
    activeText: 'text-white',
    activeRing: 'ring-rose-500/30',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
  },
  國際: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    activeBg: 'bg-blue-700',
    activeText: 'text-white',
    activeRing: 'ring-blue-500/30',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
  },
  大金: {
    bg: 'bg-sky-50 hover:bg-sky-100',
    text: 'text-sky-800',
    border: 'border-sky-300',
    activeBg: 'bg-sky-700',
    activeText: 'text-white',
    activeRing: 'ring-sky-500/30',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
  },
  金鼎: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    activeBg: 'bg-amber-700',
    activeText: 'text-white',
    activeRing: 'ring-amber-500/30',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
  },
  三菱重工: {
    bg: 'bg-teal-50 hover:bg-teal-100',
    text: 'text-teal-800',
    border: 'border-teal-300',
    activeBg: 'bg-teal-700',
    activeText: 'text-white',
    activeRing: 'ring-teal-500/30',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
  },
  富士通: {
    bg: 'bg-indigo-50 hover:bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-300',
    activeBg: 'bg-indigo-700',
    activeText: 'text-white',
    activeRing: 'ring-indigo-500/30',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
  },
  東元: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    activeBg: 'bg-emerald-700',
    activeText: 'text-white',
    activeRing: 'ring-emerald-500/30',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
  },
};

const EXTRA_THEMES: BrandColorTheme[] = [
  {
    bg: 'bg-cyan-50 hover:bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-300',
    activeBg: 'bg-cyan-700',
    activeText: 'text-white',
    activeRing: 'ring-cyan-500/30',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
  },
  {
    bg: 'bg-orange-50 hover:bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    activeBg: 'bg-orange-700',
    activeText: 'text-white',
    activeRing: 'ring-orange-500/30',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
  },
];

export function getBrandTheme(brand: string): BrandColorTheme {
  if (BRAND_COLOR_MAP[brand]) {
    return BRAND_COLOR_MAP[brand];
  }
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % (EXTRA_THEMES.length + 1);
  return idx < EXTRA_THEMES.length ? EXTRA_THEMES[idx] : DEFAULT_BRAND_THEME;
}

export const INITIAL_HVAC_PRODUCTS: HvacProduct[] = [
  // 日立 HITACHI
  {
    id: 'hit-1',
    brand: '日立',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '尊榮',
    name: 'RAS-28NTB / RAC-28NP (2.8kW 尊榮冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '820 × 300 × 245 mm',
    outdoorDim: '730 × 600 × 290 mm',
    price: 31800,
    note: '尊榮 · 凍結洗淨2.0 · R32',
  },
  {
    id: 'hit-2',
    brand: '日立',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '頂級',
    name: 'RAS-28NJP1 / RAC-28JP1 (2.8kW 頂級冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '810 × 300 × 215 mm',
    outdoorDim: '730 × 600 × 290 mm',
    price: 27900,
    note: '頂級 · 日本壓縮機 · R32',
  },
  {
    id: 'hit-3',
    brand: '日立',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '旗艦',
    name: 'RAS-36YKP / RAC-36KP (3.6kW 旗艦冷氣)',
    climateMode: '冷氣',
    capacityKw: '3.6 kW (4-6坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '810 × 295 × 215 mm',
    outdoorDim: '730 × 600 × 290 mm',
    price: 29200,
    note: '旗艦 · 單冷專 · R32',
  },
  {
    id: 'hit-4',
    brand: '日立',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '頂級',
    name: 'RAS-50NJP1 / RAC-50JP1 (5.0kW 頂級冷暖)',
    climateMode: '冷暖',
    capacityKw: '5.0 kW (7-8坪)',
    pipeSize: '2分 / 4分',
    indoorDim: '950 × 300 × 230 mm',
    outdoorDim: '810 × 685 × 300 mm',
    price: 41500,
    note: '頂級 · 大坪數客廳 · R32',
  },
  {
    id: 'hit-5',
    brand: '日立',
    modelType: '埋入',
    setType: '整組',
    inverterType: '變頻',
    grade: '頂級',
    name: 'RAD-50NJP / RAC-50JP1 (5.0kW 埋入吊隱冷暖)',
    climateMode: '冷暖',
    capacityKw: '5.0 kW (7-8坪)',
    pipeSize: '2分 / 4分',
    indoorDim: '900 × 235 × 630 mm',
    outdoorDim: '810 × 685 × 300 mm',
    price: 44800,
    note: '頂級 · 低靜壓超薄型',
  },
  {
    id: 'hit-6',
    brand: '日立',
    modelType: '埋入',
    setType: '多聯',
    inverterType: '變頻',
    grade: '頂級',
    name: 'RAD-28NJP (2.8kW 多聯埋入室內機)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '720 × 235 × 630 mm',
    outdoorDim: '— (搭配 RAM 室外機)',
    price: 16200,
    note: '頂級 · 一對多專用內機',
  },
  {
    id: 'hit-7',
    brand: '日立',
    modelType: '壁掛',
    setType: '多聯',
    inverterType: '變頻',
    grade: '尊榮',
    name: 'RAS-36NTB (3.6kW 多聯壁掛室內機)',
    climateMode: '冷暖',
    capacityKw: '3.6 kW (4-6坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '820 × 300 × 245 mm',
    outdoorDim: '— (搭配 RAM 室外機)',
    price: 17900,
    note: '尊榮 · 一對多專用內機',
  },
  {
    id: 'hit-8',
    brand: '日立',
    modelType: '窗型',
    setType: '整組',
    inverterType: '變頻',
    grade: '窗型雙吹',
    name: 'RA-28QV1 (2.8kW 變頻窗型左吹冷氣)',
    climateMode: '冷氣',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '— (一體式)',
    indoorDim: '600 × 400 × 710 mm',
    outdoorDim: '— (一體式機身)',
    price: 22900,
    note: '窗型雙吹 · 變頻R32',
  },
  {
    id: 'hit-9',
    brand: '日立',
    modelType: '窗型',
    setType: '整組',
    inverterType: '定速',
    grade: '窗型定速',
    name: 'RA-22WK (2.2kW 定速窗型右吹冷氣)',
    climateMode: '冷氣',
    capacityKw: '2.2 kW (2-3坪)',
    pipeSize: '— (一體式)',
    indoorDim: '560 × 370 × 670 mm',
    outdoorDim: '— (一體式機身)',
    price: 15800,
    note: '窗型定速 · 經典耐用',
  },

  // 國際 Panasonic
  {
    id: 'pan-1',
    brand: '國際',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: 'UX極致',
    name: 'CS-UX28BA2 / CU-UX28BHA2 (2.8kW UX極致冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '870 × 295 × 255 mm',
    outdoorDim: '780 × 540 × 289 mm',
    price: 30500,
    note: 'UX極致 · nanoeX 100倍',
  },
  {
    id: 'pan-2',
    brand: '國際',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: 'PX旗艦',
    name: 'CS-PX36FA2 / CU-PX36FHA2 (3.6kW PX旗艦冷暖)',
    climateMode: '冷暖',
    capacityKw: '3.6 kW (4-6坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '870 × 295 × 235 mm',
    outdoorDim: '780 × 540 × 289 mm',
    price: 32400,
    note: 'PX旗艦 · 1級能效',
  },
  {
    id: 'pan-3',
    brand: '國際',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: 'LJ標準',
    name: 'CS-LJ28BA2 / CU-LJ28BCA2 (2.8kW LJ標準冷氣)',
    climateMode: '冷氣',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '799 × 290 × 209 mm',
    outdoorDim: '780 × 540 × 289 mm',
    price: 22800,
    note: 'LJ標準 · 單冷專',
  },
  {
    id: 'pan-4',
    brand: '國際',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: 'PX旗艦',
    name: 'CS-PX63FA2 / CU-PX63FHA2 (6.3kW PX旗艦冷暖)',
    climateMode: '冷暖',
    capacityKw: '6.3 kW (9-11坪)',
    pipeSize: '2分 / 5分',
    indoorDim: '1040 × 295 × 244 mm',
    outdoorDim: '880 × 795 × 340 mm',
    price: 51200,
    note: 'PX旗艦 · 客餐廳大坪數',
  },
  {
    id: 'pan-5',
    brand: '國際',
    modelType: '埋入',
    setType: '整組',
    inverterType: '變頻',
    grade: 'K商用',
    name: 'CS-K50FA2D / CU-K50FHA2 (5.0kW 埋入吊隱冷暖)',
    climateMode: '冷暖',
    capacityKw: '5.0 kW (7-8坪)',
    pipeSize: '2分 / 4分',
    indoorDim: '900 × 200 × 620 mm',
    outdoorDim: '824 × 619 × 299 mm',
    price: 39600,
    note: 'K商用 · 超薄20cm機身',
  },
  {
    id: 'pan-6',
    brand: '國際',
    modelType: '四方吹',
    setType: '整組',
    inverterType: '變頻',
    grade: 'K商用',
    name: 'S-71PU2H5 / U-71PS2H5 (7.1kW 四方吹嵌入冷暖)',
    climateMode: '冷暖',
    capacityKw: '7.1 kW (10-12坪)',
    pipeSize: '3分 / 5分',
    indoorDim: '840 × 256 × 840 mm',
    outdoorDim: '900 × 795 × 320 mm',
    price: 58900,
    note: 'K商用 · 商業空間四方吹',
  },
  {
    id: 'pan-7',
    brand: '國際',
    modelType: '壁掛',
    setType: '多聯',
    inverterType: '變頻',
    grade: 'K多聯',
    name: 'CS-K22FA2 (2.2kW 一對多壁掛室內機)',
    climateMode: '冷暖',
    capacityKw: '2.2 kW (2-3坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '799 × 290 × 209 mm',
    outdoorDim: '— (搭配 CU-2J/3J/4J)',
    price: 11800,
    note: 'K多聯 · 一對多內機',
  },

  // 大金 DAIKIN
  {
    id: 'dai-1',
    brand: '大金',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '橫綱V',
    name: 'FTXM28VVLT / RXM28VVLT (2.8kW 橫綱V冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '825 × 295 × 272 mm',
    outdoorDim: '765 × 550 × 285 mm',
    price: 32900,
    note: '橫綱V · 閃流放電 · 溫濕雙控',
  },
  {
    id: 'dai-2',
    brand: '大金',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '大關U',
    name: 'FTXV36UVLT / RXV36UVLT (3.6kW 大關U冷暖)',
    climateMode: '冷暖',
    capacityKw: '3.6 kW (4-6坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '770 × 285 × 223 mm',
    outdoorDim: '765 × 550 × 285 mm',
    price: 31200,
    note: '大關U · 1級能效主力機',
  },
  {
    id: 'dai-3',
    brand: '大金',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '經典V',
    name: 'FTHF28VAVLT / RHF28VAVLT (2.8kW 經典V冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '770 × 285 × 223 mm',
    outdoorDim: '695 × 550 × 285 mm',
    price: 25400,
    note: '經典V · 高CP值',
  },
  {
    id: 'dai-4',
    brand: '大金',
    modelType: '埋入',
    setType: '整組',
    inverterType: '變頻',
    grade: '大關吊隱',
    name: 'CDXM50RVLT / RXM50VVLT (5.0kW 埋入吊隱冷暖)',
    climateMode: '冷暖',
    capacityKw: '5.0 kW (7-8坪)',
    pipeSize: '2分 / 4分',
    indoorDim: '900 × 200 × 620 mm',
    outdoorDim: '850 × 695 × 320 mm',
    price: 46500,
    note: '大關吊隱 · 靜音馬達',
  },
  {
    id: 'dai-5',
    brand: '大金',
    modelType: '壁掛',
    setType: '多聯',
    inverterType: '變頻',
    grade: '多聯R32',
    name: 'CTXM28RVLT (2.8kW 多聯壁掛室內機)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '770 × 285 × 223 mm',
    outdoorDim: '— (搭配 2MXM/3MXM/4MXM)',
    price: 15200,
    note: '多聯R32 · 一對多內機',
  },
  {
    id: 'dai-6',
    brand: '大金',
    modelType: '落地',
    setType: '整組',
    inverterType: '變頻',
    grade: '商用箱型',
    name: 'FVQ100BVMT / RZF100CVMT (10.0kW 落地箱型冷暖)',
    climateMode: '冷暖',
    capacityKw: '10.0 kW (15-18坪)',
    pipeSize: '3分 / 5分',
    indoorDim: '600 × 1850 × 270 mm',
    outdoorDim: '940 × 990 × 320 mm',
    price: 82500,
    note: '商用箱型 · 門市辦公室適用',
  },

  // 金鼎 JINDING
  {
    id: 'jd-1',
    brand: '金鼎',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '變頻旗艦',
    name: 'JD-28IV / JDO-28IV (2.8kW 金鼎變頻冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '790 × 275 × 200 mm',
    outdoorDim: '715 × 540 × 255 mm',
    price: 16800,
    note: '變頻旗艦 · 工程實惠首選',
  },
  {
    id: 'jd-2',
    brand: '金鼎',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '變頻標準',
    name: 'JD-36IC / JDO-36IC (3.6kW 金鼎變頻冷氣)',
    climateMode: '冷氣',
    capacityKw: '3.6 kW (4-6坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '820 × 280 × 205 mm',
    outdoorDim: '760 × 550 × 275 mm',
    price: 18900,
    note: '變頻標準 · 單冷租屋工程款',
  },
  {
    id: 'jd-3',
    brand: '金鼎',
    modelType: '埋入',
    setType: '整組',
    inverterType: '變頻',
    grade: '商用埋入',
    name: 'JDD-50IV / JDO-50IV (5.0kW 金鼎吊隱變頻冷氣)',
    climateMode: '冷氣',
    capacityKw: '5.0 kW (7-8坪)',
    pipeSize: '2分 / 4分',
    indoorDim: '920 × 210 × 635 mm',
    outdoorDim: '845 × 695 × 310 mm',
    price: 27400,
    note: '商用埋入 · 高靜壓訂製',
  },
  {
    id: 'jd-4',
    brand: '金鼎',
    modelType: '落地',
    setType: '整組',
    inverterType: '定速',
    grade: '定速商用',
    name: 'JDF-72C / JDFO-72C (7.2kW 定速落地箱型冷氣)',
    climateMode: '冷氣',
    capacityKw: '7.2 kW (10-12坪)',
    pipeSize: '3分 / 5分',
    indoorDim: '540 × 1780 × 320 mm',
    outdoorDim: '890 × 840 × 330 mm',
    price: 36500,
    note: '定速商用 · 工廠餐飲耐操款',
  },
  {
    id: 'jd-5',
    brand: '金鼎',
    modelType: '窗型',
    setType: '整組',
    inverterType: '定速',
    grade: '窗型定速',
    name: 'JDW-28C (2.8kW 定速窗型右吹冷氣)',
    climateMode: '冷氣',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '— (一體式)',
    indoorDim: '560 × 380 × 660 mm',
    outdoorDim: '— (一體式機身)',
    price: 12500,
    note: '窗型定速 · 套房快速替換',
  },

  // 三菱重工 MHI
  {
    id: 'mhi-1',
    brand: '三菱重工',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: 'ZSXT極致',
    name: 'DXK28ZSXT-W / DXC28ZSXT-W (2.8kW 極致冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '920 × 305 × 220 mm',
    outdoorDim: '780 × 595 × 290 mm',
    price: 33500,
    note: 'ZSXT極致 · 靜音19dB',
  },
  {
    id: 'mhi-2',
    brand: '三菱重工',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: 'ZST頂級',
    name: 'DXK50ZST-W / DXC50ZST-W (5.0kW 頂級冷暖)',
    climateMode: '冷暖',
    capacityKw: '5.0 kW (7-8坪)',
    pipeSize: '2分 / 4分',
    indoorDim: '870 × 290 × 230 mm',
    outdoorDim: '800 × 640 × 290 mm',
    price: 42800,
    note: 'ZST頂級 · 強勁氣流',
  },
  {
    id: 'mhi-3',
    brand: '三菱重工',
    modelType: '埋入',
    setType: '多聯',
    inverterType: '變頻',
    grade: '多聯SRR',
    name: 'SRR35ZS-W (3.5kW 隱藏式單向吹室內機)',
    climateMode: '冷暖',
    capacityKw: '3.5 kW (4-6坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '750 × 200 × 500 mm',
    outdoorDim: '— (搭配 SCM 室外機)',
    price: 18500,
    note: '多聯SRR · 超靜音吊隱',
  },

  // 富士通 FUJITSU
  {
    id: 'fuj-1',
    brand: '富士通',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '優級',
    name: 'ASCG028KMTB / AOCG028KMTB (2.8kW 優級冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '834 × 270 × 222 mm',
    outdoorDim: '663 × 541 × 290 mm',
    price: 25600,
    note: '優級 · 10年全機保固登錄',
  },
  {
    id: 'fuj-2',
    brand: '富士通',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: '經典',
    name: 'ASCG041CMTA / AOCG041CMTA (4.1kW 經典冷氣)',
    climateMode: '冷氣',
    capacityKw: '4.1 kW (5-7坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '840 × 270 × 203 mm',
    outdoorDim: '799 × 542 × 290 mm',
    price: 27900,
    note: '經典 · 單冷高CP值',
  },

  // 東元 TECO
  {
    id: 'teco-1',
    brand: '東元',
    modelType: '壁掛',
    setType: '整組',
    inverterType: '變頻',
    grade: 'HS旗艦',
    name: 'MS28IH-HS / MA28IH-HS (2.8kW HS雲端冷暖)',
    climateMode: '冷暖',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '2分 / 3分',
    indoorDim: '805 × 285 × 194 mm',
    outdoorDim: '770 × 555 × 300 mm',
    price: 19800,
    note: 'HS旗艦 · 燦金防鏽',
  },
  {
    id: 'teco-2',
    brand: '東元',
    modelType: '窗型',
    setType: '整組',
    inverterType: '定速',
    grade: '窗型定速',
    name: 'MW28FR1 (2.8kW 定速窗型右吹冷氣)',
    climateMode: '冷氣',
    capacityKw: '2.8 kW (3-5坪)',
    pipeSize: '— (一體式)',
    indoorDim: '560 × 380 × 680 mm',
    outdoorDim: '— (一體式機身)',
    price: 13900,
    note: '窗型定速 · 高效冷媒',
  },
];

export const CSV_TEMPLATE_HEADER =
  '品牌,機型,組合種類,變頻定速,階級備註,產品名稱,冷暖,能力,管徑,內機尺寸,外機尺寸,單價,補充備註';

export function parseCsvProducts(csvText: string): HvacProduct[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const header = splitCsvLine(lines[0]);
  const findIdx = (keywords: string[], fallback: number) => {
    const idx = header.findIndex((h) => keywords.some((k) => h.includes(k)));
    return idx >= 0 ? idx : fallback;
  };

  const iBrand = findIdx(['品牌'], 0);
  const iModelType = findIdx(['機型', '型式'], 1);
  const iSetType = findIdx(['組合', '整組', '多聯'], 2);
  const iInverter = findIdx(['變頻', '定速'], 3);
  const iGrade = findIdx(['階級', '備註'], 4);
  const iName = findIdx(['名稱', '型號', '品名'], 5);
  const iClimate = findIdx(['冷暖', '冷氣', '暖氣'], 6);
  const iCap = findIdx(['能力', '噸數', 'kW'], 7);
  const iPipe = findIdx(['管徑'], 8);
  const iInDim = findIdx(['內機'], 9);
  const iOutDim = findIdx(['外機'], 10);
  const iPrice = findIdx(['單價', '價格', '售價'], 11);
  const iNote = findIdx(['補充', '說明'], 12);

  const parsed: HvacProduct[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    if (cols.length < 3) continue;
    const brand = cols[iBrand] || '未分類';
    const name = cols[iName] || `未命名機型 #${r}`;
    const rawSet = cols[iSetType] || '整組';
    const setType: SetType = rawSet.includes('多聯') ? '多聯' : '整組';
    const rawInv = cols[iInverter] || '變頻';
    const inverterType: InverterType = rawInv.includes('定速') ? '定速' : '變頻';
    const rawClim = cols[iClimate] || '冷暖';
    const climateMode: ClimateMode =
      rawClim.includes('暖') || rawClim.includes('太陽') ? '冷暖' : '冷氣';
    const rawPrice = Number((cols[iPrice] || '0').replace(/[^0-9.]/g, '')) || 0;

    parsed.push({
      id: `imp-${Date.now()}-${r}`,
      brand,
      modelType: cols[iModelType] || '壁掛',
      setType,
      inverterType,
      grade: cols[iGrade] || '標準',
      name,
      climateMode,
      capacityKw: cols[iCap] || '—',
      pipeSize: cols[iPipe] || '2分 / 3分',
      indoorDim: cols[iInDim] || '—',
      outdoorDim: cols[iOutDim] || '—',
      price: rawPrice,
      note: cols[iNote] || cols[iGrade] || '',
    });
  }
  return parsed;
}
