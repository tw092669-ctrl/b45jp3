import { ClimateMode, HvacProduct, InverterType, SetType } from '../types/hvac';

const SPREADSHEET_ID = '1_-nf2oUtNDKDZ60ad4BDDpRK9l7U0TQmt9a_It6urok';
const SHEET_GID = '0';
const LOAD_TIMEOUT_MS = 20_000;

interface GoogleSheetCell {
  v?: string | number | null;
}

interface GoogleSheetResponse {
  status?: string;
  errors?: Array<{ message?: string }>;
  table?: {
    cols?: Array<{ id?: string; label?: string }>;
    rows?: Array<{ c?: Array<GoogleSheetCell | null> }>;
  };
}

function parseCsvRows(csvText: string): string[][] {
  const text = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += character;
      }
    } else if (character === '"' && value === '') {
      quoted = true;
    } else if (character === ',') {
      row.push(value.trim());
      value = '';
    } else if (character === '\n' || character === '\r') {
      row.push(value.trim());
      value = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      if (character === '\r' && text[index + 1] === '\n') index += 1;
    } else {
      value += character;
    }
  }

  if (value !== '' || row.length > 0) {
    row.push(value.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  return rows;
}

function getProductRows(response: GoogleSheetResponse): HvacProduct[] {
  if (response.status !== 'ok' || !response.table?.cols || !response.table.rows) {
    const message = response.errors?.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || '試算表回傳了無效資料。');
  }

  const headers = response.table.cols.map((column) => column.label || column.id || '');
  const findColumn = (...names: string[]) =>
    headers.findIndex((header) => names.some((name) => header.includes(name)));

  const brandIndex = findColumn('品牌');
  const nameIndex = findColumn('產品名稱', '品名', '型號');
  const styleIndex = findColumn('樣式', '機型', '型式');
  const typeIndex = findColumn('種類', '組合種類', '組合');
  const pipeIndex = findColumn('管徑');
  const environmentIndex = findColumn('環境', '冷暖');
  const indoorDimensionIndex = findColumn('室內機尺寸', '內機尺寸');
  const outdoorDimensionIndex = findColumn('室外機尺寸', '外機尺寸');
  const priceIndex = findColumn('價格', '單價', '售價');
  const gradeIndex = findColumn('備註', '階級');
  const capacityIndex = findColumn('能力', '規格');

  if (brandIndex < 0 || nameIndex < 0 || priceIndex < 0) {
    throw new Error('試算表缺少必要欄位（產品名稱、品牌或價格）。');
  }

  const cellValue = (row: { c?: Array<GoogleSheetCell | null> }, index: number) => {
    if (index < 0) return '';
    const value = row.c?.[index]?.v;
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  };
  const formatDimension = (value: string) =>
    value && value !== '—' && !/mm$/i.test(value) ? `${value} mm` : value || '—';
  const formatPipeSize = (value: string) => {
    const simplePair = value.match(/^(\d+)\s*\/\s*(\d+)$/);
    return simplePair ? `${simplePair[1]}分 / ${simplePair[2]}分` : value || '—';
  };

  const products = response.table.rows.flatMap((row, rowIndex) => {
    const rawName = cellValue(row, nameIndex);
    const rawBrand = cellValue(row, brandIndex);
    if (!rawName || !rawBrand) return [];

    const brand = rawBrand
      .replace(/\s*[（(][^）)]*[）)]\s*/g, ' ')
      .trim()
      .replace(/^國際牌$/, '國際');
    const rawStyle = cellValue(row, styleIndex);
    const modelType =
      rawStyle === '壁掛型'
        ? '壁掛'
        : rawStyle === '埋入型'
          ? '埋入'
          : rawStyle === '落地型'
            ? '落地'
            : rawStyle || '壁掛';
    const setType: SetType =
      rawStyle.includes('一對多') || rawStyle.includes('多聯') ? '多聯' : '整組';
    const inverterType: InverterType = cellValue(row, typeIndex).includes('定速')
      ? '定速'
      : '變頻';
    const environment = cellValue(row, environmentIndex);
    const climateMode: ClimateMode = environment.includes('冷氣') ? '冷氣' : '冷暖';
    const grade = cellValue(row, gradeIndex) || '標準';
    const rawPrice = cellValue(row, priceIndex);
    const priceValues = rawPrice.match(/-?\d[\d,]*(?:\.\d+)?/g) || [];
    const amounts = priceValues.map((value) => Number(value.replace(/,/g, '')));
    const price =
      amounts.length === 1
        ? amounts[0]
        : rawPrice.includes('/') && amounts.length === 2
          ? amounts[0] + amounts[1]
          : Number.NaN;
    if (amounts.length > 1 && !(rawPrice.includes('/') && amounts.length === 2)) {
      console.warn(`產品價格包含多個金額，無法作為單一價格匯入：${rawName}（${rawPrice}）`);
    }

    return [
      {
        id: `google-sheet-${rowIndex + 1}`,
        brand: brand || rawBrand,
        modelType,
        setType,
        inverterType,
        grade,
        name: rawName,
        environment,
        climateMode,
        capacityKw: cellValue(row, capacityIndex) || '—',
        pipeSize: formatPipeSize(cellValue(row, pipeIndex)),
        indoorDim: formatDimension(cellValue(row, indoorDimensionIndex)),
        outdoorDim: formatDimension(cellValue(row, outdoorDimensionIndex)),
        price: Number.isFinite(price) ? price : 0,
        note: grade,
      },
    ];
  });

  if (products.length === 0) {
    throw new Error('試算表中沒有可載入的產品資料。');
  }
  return products;
}

export async function loadGoogleSheetProducts(): Promise<HvacProduct[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

  try {
    const url = new URL(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export`);
    url.searchParams.set('format', 'csv');
    url.searchParams.set('gid', SHEET_GID);

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`無法連線至 Google 試算表（HTTP ${response.status}）。`);
    }

    const [headers, ...dataRows] = parseCsvRows(await response.text());
    if (!headers || dataRows.length === 0) {
      throw new Error('試算表中沒有可載入的產品資料。');
    }

    return getProductRows({
      status: 'ok',
      table: {
        cols: headers.map((label) => ({ label })),
        rows: dataRows.map((values) => ({ c: values.map((value) => ({ v: value })) })),
      },
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('讀取 Google 試算表逾時。');
    }
    if (error instanceof TypeError) {
      throw new Error('無法連線至 Google 試算表。');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
