import type {
  PipeGauge,
  PowerCableType,
  SignalCableType,
} from '../data/pipeWireCatalog';

export type ModuleId = 'home' | 'price' | 'survey' | 'multisplit' | 'piping' | 'quote' | 'space';

export type SetType = '整組' | '多聯';
export type InverterType = '變頻' | '定速';
export type ClimateMode = '冷暖' | '冷氣';

export interface HvacProduct {
  id: string;
  brand: string;
  modelType: string; // e.g., 壁掛, 埋入, 窗型, 落地, 四方吹
  setType: SetType; // 整組 or 多聯
  inverterType: InverterType; // 變頻 or 定速
  grade: string; // 備註中的階級分類, e.g., 尊榮, 頂級, 旗艦, 標準, 商用
  name: string; // 產品型號與名稱
  environment?: string; // 內機、暖氣或冷氣等環境分類
  climateMode: ClimateMode; // 太陽(冷暖) or 雪花(冷氣)
  capacityKw: string; // e.g., 2.8 kW / 4-5坪
  pipeSize: string; // 管徑 e.g., 2分 / 3分
  indoorDim: string; // 內機尺寸 (寬×高×深 mm)
  outdoorDim: string; // 外機尺寸 (寬×高×深 mm)
  price: number; // 單價 (NTD)
  note?: string; // 備註補充
}

export interface QuoteCartItem {
  lineId: string;
  product: HvacProduct;
  quantity: number;
  location?: string;
  remark?: string;
  customPrice?: number;
  priceDelta?: number;
  mergedItems?: QuoteCartItem[];
}

export interface ConstructionLineItem {
  id: string;
  name: string;
  spec: string;
  quantity: number | '';
  unitPrice: number | '';
  sourceKey?: string;
  isCustomName?: boolean;
}

export interface QuotationDraft {
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  quoteDate: string;
  pricePercent: number;
  constructionItems: ConstructionLineItem[];
}

export type HeatSourceType = '無' | '西曬' | '頂樓';

export interface RoomSurveyEntry {
  id: string;
  area: string; // 客廳, 主臥, 次臥, 書房, 或自訂
  location: string; // 位置
  ping: string; // 坪數
  heatSource: HeatSourceType | string; // 無, 西曬, 頂樓
  drainage: string; // 排水
  indoorPipeLength: string; // 室內銅管長度 (m)
  outdoorPipeLength: string; // 室外銅管長度 (m)
  note: string; // 備註
}

export interface FloorPlanColorZone {
  id: number;
  name: string;
  color: string;
}

export interface FloorPlanRect {
  id: string;
  colorIdx: number;
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  shapeCells?: { r: number; c: number }[];
  mergedFrom?: FloorPlanRect[];
}

export interface FloorPlanData {
  gridSize: number; // default 80 (80x80)
  cellSizeCm: number; // default 20 (20cm per square)
  compassAngle: number; // 0-359 degrees
  palette: FloorPlanColorZone[]; // 8 customizable color zones
  cells: Record<string, number>; // "row,col" -> palette index (0..7)
  rects?: FloorPlanRect[]; // Explicitly drawn rectangles; never auto-merges by color
}

export interface SiteSurveyRecord {
  id: string;
  projectOrAddress: string; // 建案 or 地址
  designer: string; // 設計師
  ductBeautification: boolean; // 美化管槽
  wallCoreDrilling: boolean; // 牆體洗孔
  wallChasing: boolean; // 切溝鑿牆
  rooms: RoomSurveyEntry[];
  floorPlan?: FloorPlanData;
  updatedAt: string;
}

export interface MultiSplitIndoorOption {
  code: string; // e.g. '22', '28', '36', '40', '50', '63', '71'
  kw: number;
  pingRange: string;
  pipeSize: string;
  wallModelPrefix: string;
  ductModelPrefix: string;
}

export interface MultiSplitPresetCombo {
  label: string;
  roomSummary: string;
  indoorCodes: string[];
  note: string;
}

export interface MultiSplitOutdoorUnit {
  id: string;
  brand: '日立' | '大金' | '國際' | '三菱重工';
  series: string;
  model: string;
  ratedCoolingKw: number;
  ratedHeatingKw: number;
  minRooms: number;
  maxRooms: number;
  minTotalKw: number;
  maxTotalKw: number;
  maxOverloadRatio: number; // e.g., 1.3 (130%)
  portSpecs: string[]; // e.g., ['2分/3分', '2分/3分', '2分/4分']
  maxSinglePipeM: number;
  maxTotalPipeM: number;
  maxHeightDiffM: number;
  dimensions: string;
  powerSupply: string;
  allowedCodes: string[];
  presets: MultiSplitPresetCombo[];
}

export interface PipingRunItem {
  id: string;
  label: string;
  pipeGauge: PipeGauge;
  lengthM: number | '';
  signalCableType: SignalCableType;
  signalCableLengthM: number | '';
  powerCableType: PowerCableType;
  powerCableLengthM: number | '';
}
